"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  type User, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collection, doc, onSnapshot, query, where, setDoc, updateDoc, deleteDoc,
  runTransaction, type DocumentData,
} from "firebase/firestore";

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_daily_note: boolean;
  daily_kind?: "journal" | "note" | "todo";
  daily_date?: string;
  is_completed?: boolean;
  todo_order?: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

type SyncState = "local" | "syncing" | "synced" | "offline" | "error";
type AuthResult = Promise<{ user?: User; error?: Error }>;
type Mutation = { note: Note; kind: "create" | "update" | "delete"; patch?: Partial<Note>; failed?: boolean; acknowledged?: boolean };

const DAILY_JOURNAL_TEMPLATE = [
  "What am I grateful for?",
  "Where am I winning?",
  "What do I need / want to let go of?",
  "What does my ideal day ahead look like?",
  "How can I be of highest service / What do I want to be remembered for?",
].map((question, index) => `**${index + 1}. ${question}**\n\n\n\n`).join("");

interface NotesContextType {
  notes: Note[];
  activeNote: Note | null;
  setActiveNote: (note: Note | null) => void;
  loading: boolean;
  user: User | null;
  syncState: SyncState;
  syncError: string | null;
  localNotesCount: number;
  importing: boolean;
  importLocalNotes: () => Promise<void>;
  retrySync: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: "all" | "daily" | "daily-notes" | "daily-todos";
  setActiveTab: (tab: "all" | "daily" | "daily-notes" | "daily-todos") => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  leftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  rightSidebarCollapsed: boolean;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  signUp: (email: string, password: string) => AuthResult;
  signIn: (email: string, password: string) => AuthResult;
  signInWithGoogle: () => AuthResult;
  signOut: () => Promise<void>;
  createNote: (options?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  findOrCreateNoteByTitle: (title: string) => Promise<Note>;
  backlinks: { noteId: string; noteTitle: string }[];
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);
export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) throw new Error("useNotes must be used within a NotesProvider");
  return context;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function decodeNote(id: string, data: DocumentData): Note {
  return {
    id, title: data.title ?? "Untitled Note", content: data.content ?? "",
    is_pinned: data.is_pinned ?? false, is_daily_note: data.is_daily_note ?? false,
    daily_kind: data.daily_kind === "todo" ? "todo" : data.daily_kind === "note" ? "note" : "journal",
    is_completed: data.is_completed === true,
    todo_order: typeof data.todo_order === "number" ? data.todo_order : undefined,
    daily_date: data.daily_date ?? undefined, tags: data.tags ?? [],
    created_at: data.created_at ?? new Date(0).toISOString(),
    updated_at: data.updated_at ?? new Date(0).toISOString(),
  };
}

function encodeNote(note: Note, uid: string) {
  return {
    userId: uid, title: note.title, content: note.content, tags: note.tags,
    is_pinned: note.is_pinned, is_daily_note: note.is_daily_note,
    daily_kind: note.daily_kind ?? "journal",
    is_completed: note.is_completed ?? false,
    todo_order: note.todo_order ?? null,
    daily_date: note.daily_date ?? null, created_at: note.created_at, updated_at: note.updated_at,
  };
}

function readLocalNotes(): Note[] {
  const raw = localStorage.getItem("mynotes-data");
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.some(note => !note || typeof note.id !== "string" || typeof note.content !== "string")) {
    throw new Error("The local notes backup could not be read. It has been kept unchanged.");
  }
  return data.map(note => decodeNote(note.id, note));
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const notesRef = useRef<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [localNotesCount, setLocalNotesCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const importingRef = useRef(false);
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);
  const pending = useRef(new Map<string, Mutation>());
  const remoteNotes = useRef<Note[]>([]);
  const metadata = useRef({ fromCache: true, hasPendingWrites: false });
  const listenerError = useRef<string | null>(null);
  const importError = useRef<string | null>(null);
  const localReadError = useRef<string | null>(null);
  const session = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "daily" | "daily-notes" | "daily-todos">("all");
  const [selectedDate, setSelectedDate] = useState(() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; });
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const activeNote = notes.find(note => note.id === activeId) ?? null;

  function publish(list: Note[]) {
    notesRef.current = [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.updated_at.localeCompare(a.updated_at));
    setNotes(notesRef.current);
  }

  function refreshCloudView() {
    const list = new Map(remoteNotes.current.map(note => [note.id, note]));
    pending.current.forEach(({ note, kind, patch }) => {
      if (kind === "delete") list.delete(note.id);
      else if (kind === "update") list.set(note.id, { ...(list.get(note.id) ?? note), ...patch });
      else list.set(note.id, note);
    });
    publish([...list.values()]);
    const failed = [...pending.current.values()].some(mutation => mutation.failed);
    if (listenerError.current || importError.current || localReadError.current || failed) setSyncState("error");
    else if (!navigator.onLine) setSyncState("offline");
    else if (metadata.current.fromCache || metadata.current.hasPendingWrites || pending.current.size || importingRef.current) setSyncState("syncing");
    else {
      setSyncState("synced");
      setSyncError(null);
    }
  }

  function saveRecovery(uid: string, completedId?: string) {
    try {
      const key = `mynotes-recovery:${uid}`;
      const saved: Mutation[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      const failed = new Map(saved.map(mutation => [mutation.note.id, mutation]));
      if (completedId) failed.delete(completedId);
      pending.current.forEach(mutation => {
        if (mutation.failed) failed.set(mutation.note.id, mutation);
      });
      // An acknowledgement in this tab must not clear another tab's failed drafts.
      localStorage.setItem(key, JSON.stringify([...failed.values()]));
    } catch {
      setSyncError("Save failed and a recovery copy could not be stored. Keep this tab open and retry.");
    }
  }

  useEffect(() => {
    let unsubscribeNotes: (() => void) | undefined;
    const changeUser = (currentUser: User | null) => {
      const currentSession = ++session.current;
      unsubscribeNotes?.();
      pending.current.clear();
      remoteNotes.current = [];
      listenerError.current = null;
      importError.current = null;
      localReadError.current = null;
      metadata.current = { fromCache: true, hasPendingWrites: false };
      userRef.current = currentUser;
      setUser(currentUser);
      setSyncError(null);
      publish([]);
      setLoading(true);
      setImporting(false);
      importingRef.current = false;
      try {
        setActiveId(localStorage.getItem(currentUser ? `mynotes-active-id:${currentUser.uid}` : "mynotes-active-id"));
        const local = readLocalNotes();
        const imported: string[] = currentUser ? JSON.parse(localStorage.getItem(`mynotes-imported:${currentUser.uid}`) ?? "[]") : [];
        setLocalNotesCount(local.filter(note => !imported.includes(note.id)).length);
        if (!currentUser || !db) {
          publish(local);
          setSyncState("local");
          setLoading(false);
          return;
        }
        const recovery: Mutation[] = JSON.parse(localStorage.getItem(`mynotes-recovery:${currentUser.uid}`) ?? "[]");
        recovery.forEach(mutation => pending.current.set(mutation.note.id, { ...mutation, failed: true }));
        if (recovery.length) setSyncError("Some edits have not been saved to Firebase. Retry to upload them.");
      } catch (error) {
        localReadError.current = asError(error).message;
        setSyncError(asError(error).message);
        setSyncState("error");
        if (!currentUser) { setLoading(false); return; }
      }
      if (!db || !currentUser) return;
      setSyncState("syncing");
      unsubscribeNotes = onSnapshot(
        query(collection(db, "notes"), where("userId", "==", currentUser.uid)),
        { includeMetadataChanges: true },
        snapshot => {
          if (session.current !== currentSession) return;
          remoteNotes.current = snapshot.docs.map(snap => decodeNote(snap.id, snap.data()));
          metadata.current = snapshot.metadata;
          // A server snapshot delivered after acknowledgement is authoritative,
          // including intervening edits or deletions from another device.
          if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
            pending.current.forEach((mutation, id) => {
              if (mutation.acknowledged) pending.current.delete(id);
            });
          }
          refreshCloudView();
          setLoading(false);
        },
        error => {
          if (session.current !== currentSession) return;
          listenerError.current = error.message;
          setSyncError(`Firebase sync failed: ${error.message}`);
          setSyncState("error");
          setLoading(false);
        },
      );
    };
    const unsubscribeAuth = auth ? onAuthStateChanged(auth, changeUser, error => {
      setSyncError(error.message);
      setSyncState("error");
      setLoading(false);
    }) : undefined;
    if (!auth) changeUser(null);
    const updateConnection = () => { if (userRef.current) refreshCloudView(); };
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      // This is a session counter, not a DOM ref; invalidate all old callbacks.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      session.current++;
      unsubscribeAuth?.();
      unsubscribeNotes?.();
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
    // Subscription callbacks use refs; retry explicitly replaces the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionVersion]);

  function setActiveNote(note: Note | null) {
    setActiveId(note?.id ?? null);
    try {
      const key = userRef.current ? `mynotes-active-id:${userRef.current.uid}` : "mynotes-active-id";
      if (note) localStorage.setItem(key, note.id);
      else localStorage.removeItem(key);
    } catch { /* Selection persistence is optional. */ }
    if (note?.daily_kind === "todo" && note.daily_date) setSelectedDate(note.daily_date);
    if (note) setActiveTab(note.is_daily_note ? (note.daily_kind === "todo" ? "daily-todos" : note.daily_kind === "note" ? "daily-notes" : "daily") : "all");
  }

  async function authenticate(operation: () => Promise<{ user: User }>): AuthResult {
    if (!auth) return { error: new Error("Firebase is not configured.") };
    try { return { user: (await operation()).user }; }
    catch (error) { return { error: asError(error) }; }
  }

  async function signOut() {
    if (pending.current.size || importingRef.current || metadata.current.hasPendingWrites) {
      setSyncError("Wait for your notes to finish syncing before signing out.");
      return;
    }
    try { if (auth) await firebaseSignOut(auth); }
    catch (error) { setSyncError(asError(error).message); }
  }

  function persistLocal(list: Note[]) {
    publish(list);
    if (localReadError.current) {
      setSyncState("error");
      setSyncError(localReadError.current);
      return;
    }
    try {
      localStorage.setItem("mynotes-data", JSON.stringify(list));
      setLocalNotesCount(list.length);
      setSyncState("local");
      setSyncError(null);
    } catch {
      setSyncState("error");
      setSyncError("This browser could not save your notes. Keep this tab open and retry.");
    }
  }

  function writeMutation(mutation: Mutation) {
    const currentUser = userRef.current;
    if (!db || !currentUser) return;
    const currentSession = session.current;
    mutation.acknowledged = false;
    pending.current.set(mutation.note.id, mutation);
    refreshCloudView();
    const ref = doc(db, "notes", mutation.note.id);
    const operation = mutation.kind === "delete" ? deleteDoc(ref)
      : mutation.kind === "create" ? setDoc(ref, encodeNote(mutation.note, currentUser.uid))
      : updateDoc(ref, mutation.patch!);
    void operation.then(() => {
      if (session.current !== currentSession || pending.current.get(mutation.note.id) !== mutation) return;
      // The write promise can resolve before onSnapshot delivers the new list.
      // Keep the optimistic note until the listener can take over, or the
      // selected journal disappears (and edits can revert) in that gap.
      mutation.acknowledged = true;
      const remote = remoteNotes.current.find(note => note.id === mutation.note.id);
      const expected = mutation.kind === "update" ? mutation.patch! : mutation.note;
      const reflected = mutation.kind === "delete" ? !remote : remote &&
        Object.entries(expected).every(([key, value]) =>
          JSON.stringify(remote[key as keyof Note]) === JSON.stringify(value));
      if (!metadata.current.fromCache && !metadata.current.hasPendingWrites && reflected) {
        pending.current.delete(mutation.note.id);
      }
      saveRecovery(currentUser.uid, mutation.note.id);
      refreshCloudView();
    }).catch(error => {
      if (session.current !== currentSession || pending.current.get(mutation.note.id) !== mutation) return;
      mutation.failed = true;
      saveRecovery(currentUser.uid);
      setSyncError(`Not saved to Firebase: ${asError(error).message}`);
      refreshCloudView();
    });
  }

  async function createNote(options?: Partial<Note>): Promise<Note> {
    const timestamp = new Date().toISOString();
    const note: Note = {
      title: options?.is_daily_note ? `Daily Note - ${options.daily_date}` : "Untitled Note",
      is_pinned: false, is_completed: false, is_daily_note: false, daily_kind: "journal", tags: [], ...options,
      content: options?.content ?? (options?.is_daily_note && options.daily_kind !== "note" && options.daily_kind !== "todo" ? DAILY_JOURNAL_TEMPLATE : ""),
      // Allocate the final ID before the editor can issue its first update.
      id: db && userRef.current ? doc(collection(db, "notes")).id : crypto.randomUUID(),
      created_at: timestamp, updated_at: timestamp,
    };
    if (userRef.current && db) writeMutation({ note, kind: "create" });
    else persistLocal([note, ...notesRef.current]);
    if (note.daily_kind === "todo") setActiveTab("daily-todos");
    else setActiveNote(note);
    return note;
  }

  async function updateNote(id: string, updates: Partial<Note>) {
    const current = notesRef.current.find(note => note.id === id);
    if (!current) return;
    const patch: Partial<Note> = { updated_at: new Date().toISOString() };
    for (const key of ["title", "content", "tags", "is_pinned", "is_daily_note", "daily_kind", "daily_date", "is_completed", "todo_order"] as const) {
      if (updates[key] !== undefined) Object.assign(patch, { [key]: updates[key] });
    }
    const note = { ...current, ...patch };
    if (userRef.current && db) {
      const previous = pending.current.get(id);
      writeMutation({ note, kind: previous?.kind === "create" ? "create" : "update", patch: { ...previous?.patch, ...patch } });
    } else persistLocal(notesRef.current.map(item => item.id === id ? note : item));
  }

  async function deleteNote(id: string) {
    const note = notesRef.current.find(item => item.id === id);
    if (!note) return;
    if (userRef.current && db) writeMutation({ note, kind: "delete" });
    else persistLocal(notesRef.current.filter(item => item.id !== id));
    if (activeId === id) setActiveNote(null);
  }

  function retrySync() {
    if (!userRef.current) { persistLocal(notesRef.current); return; }
    if (listenerError.current) {
      pending.current.forEach(mutation => { mutation.failed = true; });
      saveRecovery(userRef.current.uid);
      setSubscriptionVersion(version => version + 1);
      return;
    }
    if (importError.current) { void importLocalNotes(); return; }
    setSyncError(null);
    [...pending.current.values()].filter(mutation => mutation.failed).forEach(mutation => writeMutation({ ...mutation, failed: false }));
    refreshCloudView();
  }

  async function importLocalNotes() {
    const currentUser = userRef.current;
    const firestore = db;
    if (!currentUser || !firestore || importingRef.current) return;
    const currentSession = session.current;
    importingRef.current = true;
    importError.current = null;
    setImporting(true);
    setSyncError(null);
    refreshCloudView();
    try {
      const key = `mynotes-imported:${currentUser.uid}`;
      const imported = new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]"));
      const local = readLocalNotes();
      for (const note of local) {
        if (session.current !== currentSession) return;
        if (imported.has(note.id)) continue;
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${currentUser.uid}:${note.id}`));
        const importId = `import_${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("")}`;
        const ref = doc(firestore, "notes", importId);
        // Stable IDs and a transaction make retries safe without overwriting cloud edits.
        await runTransaction(firestore, async transaction => {
          const existing = await transaction.get(ref);
          if (!existing.exists()) transaction.set(ref, encodeNote(note, currentUser.uid));
        });
        imported.add(note.id);
        localStorage.setItem(key, JSON.stringify([...imported]));
        if (session.current === currentSession) setLocalNotesCount(local.filter(item => !imported.has(item.id)).length);
      }
    } catch (error) {
      if (session.current === currentSession) {
        importError.current = `Local notes upload failed: ${asError(error).message}. The local backup is unchanged.`;
        setSyncError(importError.current);
        setSyncState("error");
      }
      return;
    } finally {
      if (session.current === currentSession) {
        importingRef.current = false;
        setImporting(false);
      }
    }
    if (session.current === currentSession) refreshCloudView();
  }

  async function togglePin(id: string) {
    const note = notesRef.current.find(item => item.id === id);
    if (note) await updateNote(id, { is_pinned: !note.is_pinned });
  }

  async function findOrCreateNoteByTitle(title: string) {
    const existing = notesRef.current.find(note => note.title.toLowerCase() === title.trim().toLowerCase());
    if (existing) { setActiveNote(existing); return existing; }
    return createNote({ title: title.trim(), is_daily_note: false });
  }

  const backlinks = React.useMemo(() => {
    if (!activeNote) return [];
    const escaped = activeNote.title.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = new RegExp(`\\[\\[${escaped}\\]\\]`, "i");
    return notes.filter(note => note.id !== activeNote.id && pattern.test(note.content))
      .map(note => ({ noteId: note.id, noteTitle: note.title }));
  }, [notes, activeNote]);

  return <NotesContext.Provider value={{
    notes, activeNote, setActiveNote, loading, user, syncState, syncError,
    localNotesCount, importing, importLocalNotes, retrySync,
    searchQuery, setSearchQuery, activeTab, setActiveTab, selectedDate, setSelectedDate,
    isFocusMode, toggleFocusMode: () => setIsFocusMode(value => !value),
    leftSidebarCollapsed, setLeftSidebarCollapsed, rightSidebarCollapsed, setRightSidebarCollapsed,
    commandPaletteOpen, setCommandPaletteOpen,
    signUp: (email, password) => authenticate(() => createUserWithEmailAndPassword(auth!, email, password)),
    signIn: (email, password) => authenticate(() => signInWithEmailAndPassword(auth!, email, password)),
    signInWithGoogle: () => authenticate(() => signInWithPopup(auth!, new GoogleAuthProvider())),
    signOut, createNote, updateNote, deleteNote, togglePin, findOrCreateNoteByTitle, backlinks,
  }}>{children}</NotesContext.Provider>;
}

