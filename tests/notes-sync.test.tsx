import { webcrypto } from "node:crypto";
import { act, cleanup, renderHook, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import type { User } from "firebase/auth";
import { NotesProvider, useNotes, type Note } from "@/context/NotesContext";

type Snapshot = { docs: { id: string; data: () => Note }[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } };
const fake = vi.hoisted(() => ({
  auth: undefined as unknown as (user: User | null) => void,
  snapshots: [] as ((snapshot: Snapshot) => void)[],
  errors: [] as ((error: Error) => void)[],
  unsubscribe: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  signOut: vi.fn(), query: vi.fn(), transaction: vi.fn(),
  nextId: 0,
}));
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_: unknown, callback: typeof fake.auth) => { fake.auth = callback; return vi.fn(); },
  createUserWithEmailAndPassword: vi.fn(), signInWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(), signInWithPopup: vi.fn(), signOut: fake.signOut,
}));
vi.mock("firebase/firestore", () => ({
  collection: () => "notes", where: (...args: unknown[]) => args,
  query: fake.query,
  doc: (_: unknown, collection?: string, id?: string) => ({ id: id ?? `cloud-${++fake.nextId}` }),
  onSnapshot: (_: unknown, options: unknown, callback: (snapshot: Snapshot) => void, error: (error: Error) => void) => {
    fake.snapshots.push(callback); fake.errors.push(error); return fake.unsubscribe;
  },
  setDoc: fake.setDoc, updateDoc: fake.updateDoc, deleteDoc: fake.deleteDoc,
  runTransaction: fake.transaction,
}));

const user = (uid: string) => ({ uid, email: `${uid}@example.com` }) as User;
const note = (id: string, content = "original"): Note => ({
  id, title: "A note", content, tags: [], is_pinned: false, is_daily_note: false,
  created_at: "2026-09-03T00:00:00Z", updated_at: "2026-09-03T00:00:00Z",
});
function snapshot(notes: Note[], fromCache = false, hasPendingWrites = false, index = fake.snapshots.length - 1) {
  fake.snapshots[index]({ docs: notes.map(item => ({ id: item.id, data: () => item })), metadata: { fromCache, hasPendingWrites } });
}
function mount(uid: string | null = "alice") {
  const hook = renderHook(useNotes, { wrapper: NotesProvider });
  act(() => fake.auth(uid ? user(uid) : null));
  return hook;
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks(); fake.snapshots = []; fake.errors = []; fake.nextId = 0;
  localStorage.clear();
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  fake.setDoc.mockImplementation(() => new Promise(() => {}));
  fake.updateDoc.mockImplementation(() => new Promise(() => {}));
  fake.deleteDoc.mockImplementation(() => new Promise(() => {}));
});
afterEach(cleanup);

describe("Firebase note synchronization", () => {
  it("keeps a daily journal selected when its save finishes before the snapshot arrives", async () => {
    const write = deferred(); fake.setDoc.mockReturnValueOnce(write.promise);
    const { result } = mount();
    act(() => snapshot([]));
    let created!: Note;
    await act(async () => {
      result.current.setActiveTab("daily");
      created = await result.current.createNote({ is_daily_note: true, daily_date: "2026-09-03" });
    });
    expect(result.current.activeNote?.id).toBe(created.id);
    await act(async () => write.resolve());
    expect(result.current.notes).toEqual([created]);
    expect(result.current.activeNote?.id).toBe(created.id);
    expect(result.current.syncState).toBe("syncing");
    act(() => snapshot([created]));
    expect(result.current.activeNote?.id).toBe(created.id);
    expect(result.current.syncState).toBe("synced");
    act(() => snapshot([]));
    expect(result.current.activeNote).toBeNull();
  });

  it("uses the final cloud ID immediately and keeps rapid creates and edits", async () => {
    const { result } = mount();
    act(() => snapshot([]));
    let created!: Note;
    await act(async () => {
      created = await result.current.createNote();
      await result.current.updateNote(created.id, { content: "typed immediately" });
      await result.current.createNote({ title: "Second" });
    });
    expect(created.id).toBe("cloud-1");
    expect(result.current.notes).toHaveLength(2);
    expect(result.current.notes.find(n => n.id === created.id)?.content).toBe("typed immediately");
    expect(fake.setDoc.mock.calls[1][0].id).toBe(created.id);
    expect(fake.setDoc.mock.calls[1][1].content).toBe("typed immediately");
    expect(localStorage.getItem("mynotes-data")).toBeNull();
    expect(result.current.syncState).toBe("syncing");
  });

  it("finishes syncing when the saved journal snapshot arrives before acknowledgement", async () => {
    const write = deferred(); fake.setDoc.mockReturnValueOnce(write.promise);
    const { result } = mount();
    act(() => snapshot([]));
    let created!: Note;
    await act(async () => {
      created = await result.current.createNote({ is_daily_note: true, daily_date: "2026-09-03" });
    });
    act(() => snapshot([created]));
    await act(async () => write.resolve());
    expect(result.current.activeNote).toEqual(created);
    expect(result.current.syncState).toBe("synced");
    await act(() => result.current.signOut());
    expect(fake.signOut).toHaveBeenCalledOnce();
  });

  it("keeps acknowledged journal edits over stale cached snapshots until the server catches up", async () => {
    const write = deferred(); fake.updateDoc.mockReturnValueOnce(write.promise);
    const { result } = mount();
    const original = { ...note("journal"), is_daily_note: true, daily_date: "2026-09-03" };
    act(() => { snapshot([original]); result.current.setActiveNote(original); });
    await act(() => result.current.updateNote(original.id, { content: "Today's entry" }));
    await act(async () => write.resolve());
    act(() => snapshot([original], true));
    expect(result.current.activeNote?.content).toBe("Today's entry");
    expect(result.current.syncState).toBe("syncing");
    // A later edit from another device is authoritative, even if it differs
    // from the acknowledged write. Do not retain the optimistic draft forever.
    act(() => snapshot([{ ...original, content: "Edited on another device" }]));
    expect(result.current.activeNote?.content).toBe("Edited on another device");
    expect(result.current.syncState).toBe("synced");
  });

  it("does not revive a deleted journal while waiting for its removal snapshot", async () => {
    const write = deferred(); fake.deleteDoc.mockReturnValueOnce(write.promise);
    const { result } = mount();
    act(() => snapshot([note("journal")]));
    await act(() => result.current.deleteNote("journal"));
    await act(async () => write.resolve());
    expect(result.current.notes).toEqual([]);
    act(() => snapshot([]));
    expect(result.current.syncState).toBe("synced");
  });

  it("keeps a newer edit when an earlier journal write is acknowledged", async () => {
    const firstWrite = deferred(); fake.setDoc.mockReturnValueOnce(firstWrite.promise);
    const secondWrite = deferred(); fake.setDoc.mockReturnValueOnce(secondWrite.promise);
    const { result } = mount();
    act(() => snapshot([]));
    let created!: Note;
    await act(async () => {
      created = await result.current.createNote({ is_daily_note: true, daily_date: "2026-09-03" });
      await result.current.updateNote(created.id, { content: "Started writing" });
    });
    await act(async () => firstWrite.resolve());
    act(() => snapshot([created]));
    expect(result.current.activeNote?.content).toBe("Started writing");
    const edited = result.current.activeNote!;
    await act(async () => secondWrite.resolve());
    expect(result.current.activeNote).toEqual(edited);
    act(() => snapshot([edited]));
    expect(result.current.activeNote).toEqual(edited);
    expect(result.current.syncState).toBe("synced");
  });

  it("receives remote edits, pins, daily metadata and deletes without a reload", async () => {
    const { result } = mount();
    act(() => { snapshot([note("one")]); result.current.setActiveNote(note("one")); });
    act(() => snapshot([{ ...note("one", "from another device"), is_pinned: true, is_daily_note: true, daily_date: "2026-09-03", tags: ["work"] }]));
    expect(result.current.activeNote?.content).toBe("from another device");
    expect(result.current.activeNote?.is_pinned).toBe(true);
    expect(result.current.activeNote?.daily_date).toBe("2026-09-03");
    expect(result.current.syncState).toBe("synced");
    act(() => snapshot([]));
    expect(result.current.activeNote).toBeNull();
  });

  it("does not report cached or pending data as synced", () => {
    const { result } = mount();
    act(() => snapshot([], true));
    expect(result.current.syncState).toBe("syncing");
    act(() => snapshot([note("one")], false, true));
    expect(result.current.syncState).toBe("syncing");
    act(() => snapshot([note("one")]));
    expect(result.current.syncState).toBe("synced");
    Object.defineProperty(navigator, "onLine", { value: false });
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current.syncState).toBe("offline");
  });

  it("keeps failed edits, shows the error, and retries without exposing them as guest notes", async () => {
    const failure = deferred(); fake.updateDoc.mockReturnValueOnce(failure.promise);
    const { result } = mount();
    act(() => snapshot([note("one")]));
    await act(() => result.current.updateNote("one", { content: "unsaved edit", is_daily_note: true, daily_date: "2026-09-04" }));
    await act(async () => failure.reject(new Error("permission-denied")));
    act(() => snapshot([note("one")]));
    expect(result.current.notes[0].content).toBe("unsaved edit");
    expect(result.current.syncState).toBe("error");
    expect(result.current.syncError).toContain("permission-denied");
    expect(localStorage.getItem("mynotes-recovery:alice")).toContain("unsaved edit");
    act(() => result.current.retrySync());
    expect(fake.updateDoc).toHaveBeenCalledTimes(2);
    expect(fake.updateDoc.mock.calls[1][1]).toMatchObject({ content: "unsaved edit", daily_date: "2026-09-04" });
    expect(localStorage.getItem("mynotes-data")).toBeNull();
  });

  it("does not let a late write or listener from one account change another account", async () => {
    const write = deferred(); fake.setDoc.mockReturnValueOnce(write.promise);
    const { result } = mount();
    act(() => snapshot([]));
    await act(() => result.current.createNote({ content: "Alice private" }));
    act(() => fake.auth(user("bob")));
    expect(result.current.notes).toEqual([]);
    act(() => snapshot([note("bob")]));
    act(() => snapshot([note("alice", "private")], false, false, 0));
    await act(async () => write.reject(new Error("late failure")));
    expect(result.current.notes.map(n => n.id)).toEqual(["bob"]);
    expect(result.current.syncState).toBe("synced");
    expect(fake.unsubscribe).toHaveBeenCalled();
    expect(fake.query.mock.calls.at(-1)?.[1]).toEqual(["userId", "==", "bob"]);
  });

  it("does not fall back to guest notes when cloud permissions fail", () => {
    localStorage.setItem("mynotes-data", JSON.stringify([note("guest")]));
    const { result } = mount();
    act(() => fake.errors[0](new Error("permission-denied")));
    expect(result.current.notes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.syncState).toBe("error");
  });

  it("imports local notes once, preserves the backup, and never overwrites an imported cloud note", async () => {
    localStorage.setItem("mynotes-data", JSON.stringify([note("legacy")]));
    const stored = new Map<string, unknown>();
    const transactionSet = vi.fn((ref: { id: string }, data: unknown) => stored.set(ref.id, data));
    fake.transaction.mockImplementation(async (_db, callback) => callback({
      get: async (ref: { id: string }) => ({ exists: () => stored.has(ref.id) }), set: transactionSet,
    }));
    const { result } = mount();
    act(() => snapshot([]));
    expect(result.current.localNotesCount).toBe(1);
    await act(() => result.current.importLocalNotes());
    expect(result.current.localNotesCount).toBe(0);
    expect(transactionSet).toHaveBeenCalledTimes(1);
    expect(transactionSet.mock.calls[0][1]).toMatchObject({ userId: "alice", content: "original", daily_date: null });
    expect(localStorage.getItem("mynotes-data")).toContain("legacy");
    localStorage.removeItem("mynotes-imported:alice");
    await act(() => result.current.importLocalNotes());
    expect(transactionSet).toHaveBeenCalledTimes(1);
  });

  it("preserves local notes when an import fails", async () => {
    localStorage.setItem("mynotes-data", JSON.stringify([note("legacy")]));
    fake.transaction.mockRejectedValueOnce(new Error("permission-denied"));
    const { result } = mount();
    act(() => snapshot([]));
    await act(() => result.current.importLocalNotes());
    expect(result.current.localNotesCount).toBe(1);
    expect(result.current.syncState).toBe("error");
    expect(result.current.importing).toBe(false);
    expect(localStorage.getItem("mynotes-imported:alice")).toBeNull();
    expect(localStorage.getItem("mynotes-data")).toContain("legacy");
    act(() => snapshot([]));
    expect(result.current.syncState).toBe("error");
    expect(result.current.syncError).toContain("upload failed");
  });

  it("does not erase an unreadable legacy backup when retrying local storage", async () => {
    localStorage.setItem("mynotes-data", "broken backup");
    const { result } = mount(null);
    expect(result.current.syncState).toBe("error");
    act(() => result.current.retrySync());
    await act(() => result.current.createNote());
    expect(localStorage.getItem("mynotes-data")).toBe("broken backup");
    expect(result.current.syncState).toBe("error");
  });

  it("prevents sign out while a write is pending", async () => {
    const { result } = mount();
    act(() => snapshot([]));
    await act(() => result.current.createNote());
    await act(() => result.current.signOut());
    expect(fake.signOut).not.toHaveBeenCalled();
    expect(result.current.syncError).toContain("finish syncing");
  });
});


describe("daily sections", () => {
  it("opens categorized journal questions with slash and inserts the selected question", async () => {
    const journal = { ...note("journal", ""), is_daily_note: true, daily_kind: "journal" as const, daily_date: "2026-09-05" };
    localStorage.setItem("mynotes-data", JSON.stringify([journal]));
    localStorage.setItem("mynotes-active-id", journal.id);

    render(<NotesProvider><Editor /></NotesProvider>);
    act(() => fake.auth(null));
    fireEvent.click(screen.getByRole("button", { name: "Write" }));
    const editor = screen.getByPlaceholderText("Type / to choose a journal question, then write your answer...");

    fireEvent.change(editor, { target: { value: "/", selectionStart: 1 } });
    expect(screen.getByRole("listbox", { name: "Journal questions" })).toBeTruthy();
    expect(screen.getByText("Daily reflection")).toBeTruthy();
    expect(screen.getByText("Engineering judgment")).toBeTruthy();

    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyDown(editor, { key: "Enter" });
    expect((editor as HTMLTextAreaElement).value).toBe("**What am I grateful for?**\n\n");
  });

  it("creates multiple journal entries and separate daily notes from the sidebar", async () => {
    render(<NotesProvider><Sidebar onOpenAuth={() => {}} showProfilePopover={false} setShowProfilePopover={() => {}} /></NotesProvider>);
    act(() => fake.auth(null));
    fireEvent.click(screen.getByTitle("Expand Sidebar"));
    fireEvent.click(screen.getByTitle("Daily Journal"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "New entry" })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "New entry" })); });
    expect(screen.getAllByRole("heading")).toHaveLength(2);
    fireEvent.click(screen.getByTitle("Daily Notes"));
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "New note" })); });
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    const saved = JSON.parse(localStorage.getItem("mynotes-data")!) as Note[];
    expect(saved.filter(n => n.daily_kind === "journal")).toHaveLength(2);
    expect(saved.filter(n => n.daily_kind === "note")).toHaveLength(1);
    expect(saved.every(n => n.content === "")).toBe(true);
    fireEvent.click(screen.getByTitle("Daily Journal"));
    expect(screen.getAllByRole("heading")).toHaveLength(2);
    fireEvent.click(screen.getByTitle("Collapse Sidebar"));
    expect(screen.getByTitle("New journal entry")).toBeTruthy();
  });

  it("retains daily-note categories through Firebase snapshots", async () => {
    const { result } = mount();
    act(() => snapshot([{ ...note("legacy"), is_daily_note: true }, { ...note("daily-note"), is_daily_note: true, daily_kind: "note" }]));
    expect(result.current.notes.find(n => n.id === "legacy")?.daily_kind).toBe("journal");
    act(() => result.current.setActiveNote(result.current.notes.find(n => n.id === "daily-note")!));
    expect(result.current.activeTab).toBe("daily-notes");
    await act(() => result.current.createNote({ is_daily_note: true, daily_kind: "note", daily_date: "2026-09-05" }));
    expect(fake.setDoc.mock.calls[0][1]).toMatchObject({ daily_kind: "note", daily_date: "2026-09-05" });
  });
});
