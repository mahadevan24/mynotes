"use client";

import { useNotes } from "@/context/NotesContext";
import { isFirebaseConfigured } from "@/lib/firebase";

export function SyncStatus({ onSignIn }: { onSignIn: () => void }) {
  const { user, syncState, syncError, localNotesCount, importing, importLocalNotes, retrySync } = useNotes();
  const labels = {
    local: "Notes are saved on this device. Sign in to sync across devices.",
    syncing: "Syncing with Firebase…",
    synced: "Saved to Firebase",
    offline: "Offline · Changes will upload when you reconnect",
    error: "Sync needs attention",
  };
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-neutral-950/70 px-4 py-2 text-xs text-zinc-400">
      <div role="status" aria-live="polite" className="min-w-0 flex-1">
        <p className={syncError ? "text-amber-300" : ""}>
          {syncError ?? (!isFirebaseConfigured ? "Cloud sync is not configured yet. Notes stay on this device." : labels[syncState])}
        </p>
        {user && <p className="mt-1 truncate text-[10px] text-zinc-500">{user.email}</p>}
      </div>
      {!user && isFirebaseConfigured && <button onClick={onSignIn} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-black">Sign in to sync</button>}
      {user && localNotesCount > 0 && (
        <button onClick={() => void importLocalNotes()} disabled={importing || syncState === "offline"} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-black disabled:opacity-50">
          {importing ? "Uploading…" : `Upload ${localNotesCount} local ${localNotesCount === 1 ? "note" : "notes"}`}
        </button>
      )}
      {syncError && <button onClick={retrySync} className="rounded-lg border border-white/20 px-3 py-1.5 text-white">Retry sync</button>}
    </div>
  );
}
