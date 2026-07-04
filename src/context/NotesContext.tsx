"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db, auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

export interface Note {
  id: string; // Will represent Firestore doc ID or local ID
  title: string;
  content: string;
  is_pinned: boolean;
  is_daily_note: boolean;
  daily_date?: string; // yyyy-mm-dd
  created_at: string;
  updated_at: string;
  tags: string[];
}



interface Backlink {
  noteId: string;
  noteTitle: string;
}

interface NotesContextType {
  notes: Note[];
  activeNote: Note | null;
  setActiveNote: (note: Note | null) => void;
  loading: boolean;
  user: FirebaseUser | null;
  syncState: "local" | "syncing" | "synced" | "error";
  theme: "reflect" | "granola" | "solar";
  setTheme: (theme: "reflect" | "granola" | "solar") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: "all" | "daily";
  setActiveTab: (tab: "all" | "daily") => void;
  selectedDate: string; // yyyy-mm-dd
  setSelectedDate: (date: string) => void;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  leftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  rightSidebarCollapsed: boolean;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  

  
  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Auth Operations
  signUp: (email: string, password: string) => Promise<{ user?: FirebaseUser; error?: any }>;
  signIn: (email: string, password: string) => Promise<{ user?: FirebaseUser; error?: any }>;
  signInWithGoogle: () => Promise<{ user?: FirebaseUser; error?: any }>;
  signOut: () => Promise<void>;
  
  // Note Operations
  createNote: (options?: Partial<Note>) => Promise<Note>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  togglePin: (noteId: string) => Promise<void>;
  findOrCreateNoteByTitle: (title: string) => Promise<Note>;
  
  // Computed Properties
  backlinks: Backlink[];
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
};

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [syncState, setSyncState] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [theme, setTheme] = useState<"reflect" | "granola" | "solar">("reflect");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "daily">("all");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const toggleFocusMode = () => setIsFocusMode((prev) => !prev);

  const [leftSidebarCollapsed, setLeftSidebarCollapsedState] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsedState] = useState(false);

  const setLeftSidebarCollapsed = (collapsed: boolean) => {
    setLeftSidebarCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("mynotes-left-sidebar-collapsed", JSON.stringify(collapsed));
    }
  };

  const setRightSidebarCollapsed = (collapsed: boolean) => {
    setRightSidebarCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("mynotes-right-sidebar-collapsed", JSON.stringify(collapsed));
    }
  };

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const isClient = typeof window !== "undefined";

  // Check auth session on mount
  useEffect(() => {
    if (!isClient) return;

    // Load active theme choice
    const savedTheme = localStorage.getItem("mynotes-theme") as "reflect" | "granola" | "solar";
    if (savedTheme) {
      setTheme(savedTheme);
    }

    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setSyncState(firebaseUser ? "synced" : "local");
        loadNotes(firebaseUser);
      });
      return () => unsubscribe();
    } else {
      setSyncState("local");
      loadNotes(null);
    }

    const savedLeftSidebar = localStorage.getItem("mynotes-left-sidebar-collapsed");
    if (savedLeftSidebar !== null) {
      setLeftSidebarCollapsedState(JSON.parse(savedLeftSidebar));
    }

    const savedRightSidebar = localStorage.getItem("mynotes-right-sidebar-collapsed");
    if (savedRightSidebar !== null) {
      setRightSidebarCollapsedState(JSON.parse(savedRightSidebar));
    }
  }, []);

  // Save theme selection
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("mynotes-theme", theme);
    }
  }, [theme]);

  // Automatically switch tab when standard note is activated in daily tab
  useEffect(() => {
    if (activeNote && !activeNote.is_daily_note && activeTab === "daily") {
      setActiveTab("all");
    }
  }, [activeNote, activeTab]);



  // Fetch notes from Firestore
  const loadNotes = async (currentUser: FirebaseUser | null) => {
    setLoading(true);
    if (isFirebaseConfigured && db && currentUser) {
      try {
        setSyncState("syncing");
        const notesRef = collection(db, "notes");
        const q = query(notesRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);

        const list: Note[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || "Untitled",
            content: data.content || "",
            is_pinned: data.is_pinned || false,
            is_daily_note: data.is_daily_note || false,
            daily_date: data.daily_date || undefined,
            tags: data.tags || [],
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        });

        // Sort: Pinned first, then updated_at descending
        const sortedNotes = list.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          return b.updated_at.localeCompare(a.updated_at);
        });

        setNotes(sortedNotes);

        // Restore active selection
        const savedActiveId = localStorage.getItem("mynotes-active-id");
        if (savedActiveId) {
          const match = sortedNotes.find((n) => n.id === savedActiveId);
          if (match) setActiveNote(match);
        }

        setSyncState("synced");
      } catch (err) {
        console.error("Error loading notes from Firestore:", err);
        setSyncState("error");
        loadLocalNotes();
      }
    } else {
      loadLocalNotes();
    }
    setLoading(false);
  };

  const loadLocalNotes = () => {
    if (!isClient) return;
    const local = localStorage.getItem("mynotes-data");
    if (local) {
      try {
        const parsed = JSON.parse(local) as Note[];
        setNotes(parsed);
        
        const savedActiveId = localStorage.getItem("mynotes-active-id");
        if (savedActiveId) {
          const match = parsed.find((n) => n.id === savedActiveId);
          if (match) setActiveNote(match);
        }
      } catch (e) {
        console.error("Failed to parse local notes", e);
      }
    }
    setSyncState("local");
  };

  const syncLocal = (updatedNotes: Note[]) => {
    if (!isClient) return;
    localStorage.setItem("mynotes-data", JSON.stringify(updatedNotes));
  };

  // Auth Operations
  const signUp = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      return { error: new Error("Firebase is not configured.") };
    }
    try {
      setSyncState("syncing");
      const res = await createUserWithEmailAndPassword(auth, email, password);
      setSyncState("synced");
      return { user: res.user };
    } catch (err: any) {
      setSyncState("error");
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      return { error: new Error("Firebase is not configured.") };
    }
    try {
      setSyncState("syncing");
      const res = await signInWithEmailAndPassword(auth, email, password);
      setSyncState("synced");
      return { user: res.user };
    } catch (err: any) {
      setSyncState("error");
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      return { error: new Error("Firebase is not configured.") };
    }
    try {
      setSyncState("syncing");
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      setSyncState("synced");
      return { user: res.user };
    } catch (err: any) {
      setSyncState("error");
      return { error: err };
    }
  };

  const signOut = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setActiveNote(null);
    setNotes([]);
    if (isClient) {
      localStorage.removeItem("mynotes-active-id");
      localStorage.removeItem("mynotes-data");
    }
    setSyncState("local");
  };

  // CRUD Operations
  const createNote = async (options?: Partial<Note>) => {
    const timestamp = new Date().toISOString();
    const tempId = Math.random().toString(36).substring(2, 15);
    const newNote: Note = {
      id: tempId,
      title: options?.is_daily_note
        ? `Daily Note - ${options.daily_date}`
        : "Untitled Note",
      content: "",
      is_pinned: false,
      is_daily_note: false,
      tags: [],
      created_at: timestamp,
      updated_at: timestamp,
      ...options,
    };

    const newNotesList = [newNote, ...notes];
    setNotes(newNotesList);
    setActiveNote(newNote);
    if (isClient) {
      localStorage.setItem("mynotes-active-id", newNote.id);
    }
    syncLocal(newNotesList);

    if (isFirebaseConfigured && db && user) {
      try {
        setSyncState("syncing");
        const docRef = doc(collection(db, "notes")); // Generates a unique document ID
        await setDoc(docRef, {
          userId: user.uid,
          title: newNote.title,
          content: newNote.content,
          is_pinned: newNote.is_pinned,
          is_daily_note: newNote.is_daily_note,
          daily_date: newNote.daily_date || null,
          tags: newNote.tags,
          created_at: timestamp,
          updated_at: timestamp,
        });

        // Swap the client temporary ID with Firestore ID
        const updatedList = newNotesList.map((n) =>
          n.id === tempId ? { ...n, id: docRef.id } : n
        );
        setNotes(updatedList);
        if (activeNote?.id === tempId) {
          setActiveNote({ ...newNote, id: docRef.id });
        }
        syncLocal(updatedList);
        setSyncState("synced");
      } catch (err) {
        console.error("Error creating note on Firestore:", err);
        setSyncState("error");
      }
    }

    return newNote;
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    const timestamp = new Date().toISOString();
    let updatedNote: Note | null = null;

    const newNotesList = notes.map((note) => {
      if (note.id === noteId) {
        updatedNote = {
          ...note,
          ...updates,
          updated_at: timestamp,
        };
        return updatedNote;
      }
      return note;
    });

    setNotes(newNotesList);
    if (activeNote && activeNote.id === noteId) {
      setActiveNote(updatedNote);
    }
    syncLocal(newNotesList);

    if (isFirebaseConfigured && db && user && updatedNote) {
      try {
        setSyncState("syncing");
        const docRef = doc(db, "notes", noteId);
        const patchUpdates: any = { updated_at: timestamp };
        if (updates.title !== undefined) patchUpdates.title = updates.title;
        if (updates.content !== undefined) patchUpdates.content = updates.content;
        if (updates.is_pinned !== undefined) patchUpdates.is_pinned = updates.is_pinned;
        if (updates.tags !== undefined) patchUpdates.tags = updates.tags;

        await updateDoc(docRef, patchUpdates);
        setSyncState("synced");
      } catch (err) {
        console.error("Error updating note on Firestore:", err);
        setSyncState("error");
      }
    }
  };

  const deleteNote = async (noteId: string) => {
    const newNotesList = notes.filter((n) => n.id !== noteId);
    setNotes(newNotesList);

    if (activeNote && activeNote.id === noteId) {
      const nextNote = newNotesList[0] || null;
      setActiveNote(nextNote);
      if (isClient) {
        if (nextNote) {
          localStorage.setItem("mynotes-active-id", nextNote.id);
        } else {
          localStorage.removeItem("mynotes-active-id");
        }
      }
    }

    syncLocal(newNotesList);

    if (isFirebaseConfigured && db && user) {
      try {
        setSyncState("syncing");
        await deleteDoc(doc(db, "notes", noteId));
        setSyncState("synced");
      } catch (err) {
        console.error("Error deleting note on Firestore:", err);
        setSyncState("error");
      }
    }
  };

  const togglePin = async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      await updateNote(noteId, { is_pinned: !note.is_pinned });
    }
  };

  const findOrCreateNoteByTitle = async (title: string) => {
    const formattedTitle = title.trim();
    console.log("findOrCreateNoteByTitle called with:", formattedTitle);
    console.log("Current list of notes:", notes.map(n => ({ id: n.id, title: n.title, is_daily_note: n.is_daily_note })));
    const existing = notes.find((n) => n.title.toLowerCase() === formattedTitle.toLowerCase());
    console.log("Existing note found:", existing);
    if (existing) {
      console.log("Setting active note to existing:", existing);
      setActiveNote(existing);
      if (isClient) {
        localStorage.setItem("mynotes-active-id", existing.id);
      }
      return existing;
    }
    console.log("No existing note found. Creating new note with title:", formattedTitle);
    const newNote = await createNote({
      title: formattedTitle,
      is_daily_note: false,
    });
    console.log("New note created:", newNote);
    return newNote;
  };

  const handleSetActiveNote = (note: Note | null) => {
    setActiveNote(note);
    if (isClient) {
      if (note) {
        localStorage.setItem("mynotes-active-id", note.id);
      } else {
        localStorage.removeItem("mynotes-active-id");
      }
    }
  };



  const backlinks: Backlink[] = React.useMemo(() => {
    if (!activeNote) return [];
    const activeTitleEscaped = activeNote.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const linkRegex = new RegExp(`\\[\\[${activeTitleEscaped}\\]\\]`, "i");

    return notes
      .filter((n) => n.id !== activeNote.id)
      .filter((n) => linkRegex.test(n.content))
      .map((n) => ({
        noteId: n.id,
        noteTitle: n.title,
      }));
  }, [notes, activeNote]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeNote,
        setActiveNote: handleSetActiveNote,
        loading,
        user,
        syncState,
        theme,
        setTheme,
        searchQuery,
        setSearchQuery,
        activeTab,
        setActiveTab,
        selectedDate,
        setSelectedDate,
        isFocusMode,
        toggleFocusMode,
        leftSidebarCollapsed,
        setLeftSidebarCollapsed,
        rightSidebarCollapsed,
        setRightSidebarCollapsed,
        commandPaletteOpen,
        setCommandPaletteOpen,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        createNote,
        updateNote,
        deleteNote,
        togglePin,
        findOrCreateNoteByTitle,
        backlinks,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
