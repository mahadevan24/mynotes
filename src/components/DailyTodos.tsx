"use client";

import { useRef, useState } from "react";
import { Check, CheckSquare, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useNotes, type Note } from "@/context/NotesContext";
import { cn } from "@/lib/utils";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DailyTodos() {
  const { notes, selectedDate, setSelectedDate, createNote, updateNote, deleteNote, syncState, syncError, retrySync } = useNotes();
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Completed">("All");
  const input = useRef<HTMLInputElement>(null);
  const tasks = notes.filter(note => note.daily_kind === "todo" && note.daily_date === selectedDate)
    .sort((a, b) => Number(!!a.is_completed) - Number(!!b.is_completed) || a.created_at.localeCompare(b.created_at));
  const completed = tasks.filter(task => task.is_completed).length;
  const visible = tasks.filter(task => filter === "All" || (filter === "Completed" ? task.is_completed : !task.is_completed));
  const shiftDate = (offset: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + offset);
    setSelectedDate(dateKey(date));
  };

  return <section aria-label="Daily ToDos" className="flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-[#050505]/60 p-5 backdrop-blur-xl sm:p-8 custom-scrollbar">
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-zinc-400"><CheckSquare className="h-4 w-4" /> A little progress, every day</span>
        <span role="status" className="text-xs text-zinc-500">{{ local: "Saved on this device", synced: "Saved to Firebase", syncing: "Syncing…", offline: "Offline · Sync pending", error: "Save needs attention" }[syncState]}</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-white">Daily ToDos</h1>
      <p className="mt-2 text-sm text-zinc-400">Make room for what matters today.</p>
      <div className="my-6 flex flex-wrap items-center gap-2">
        <button aria-label="Previous day" onClick={() => shiftDate(-1)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
        <input aria-label="Task date" type="date" value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); }} className="min-w-0 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-zinc-200 [color-scheme:dark]" />
        <button aria-label="Next day" onClick={() => shiftDate(1)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        <button onClick={() => setSelectedDate(dateKey(new Date()))} className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white">Today</button>
      </div>
      <form onSubmit={event => {
        event.preventDefault();
        const title = draft.trim();
        if (!title) return;
        void createNote({ title, content: "", is_daily_note: true, daily_kind: "todo", daily_date: selectedDate, is_completed: false });
        setDraft("");
        setFilter("All");
        input.current?.focus();
      }} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] p-2 shadow-lg shadow-black/20 focus-within:border-white/35">
        <Plus className="ml-2 h-4 w-4 shrink-0 text-zinc-500" />
        <input ref={input} aria-label="New todo" placeholder="What needs to get done?" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-zinc-500" />
        <button disabled={!draft.trim()} className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-30">Add</button>
      </form>
      {syncError && <div role="alert" className="mt-3 text-sm text-amber-300">{syncError} <button onClick={retrySync} className="underline">Retry save</button></div>}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1" aria-label="Filter tasks">{(["All", "Active", "Completed"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={cn("rounded-lg px-3 py-1.5 text-xs transition-colors", filter === value ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white")}>{value}</button>)}</div>
        <span aria-live="polite" className="text-xs text-zinc-500">{completed} of {tasks.length} done</span>
      </div>
      <div role="progressbar" aria-label="Daily completion" aria-valuenow={tasks.length ? Math.round(completed / tasks.length * 100) : 0} aria-valuemin={0} aria-valuemax={100} className="my-4 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-emerald-400/70 transition-all duration-300" style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /></div>
      <ul className="space-y-2">{visible.map(task => <TodoRow key={task.id} task={task} onUpdate={updateNote} onDelete={deleteNote} />)}</ul>
      {!visible.length && <div className="py-16 text-center"><CheckSquare className="mx-auto mb-4 h-8 w-8 text-zinc-600" /><p className="text-sm text-zinc-300">{!tasks.length ? "A fresh start." : filter === "Active" ? "All done. Enjoy the breathing room." : "No completed tasks yet."}</p><p className="mt-2 text-xs text-zinc-500">{!tasks.length ? "Add your first task above. Small is a good start." : filter === "Completed" ? "Check off a task and it will appear here." : "You can add another task whenever you need."}</p></div>}
      {!!tasks.length && <p className="mt-6 text-center text-[11px] text-zinc-600">Click a task to edit · Enter to save · Escape to cancel</p>}
    </div>
  </section>;
}

function TodoRow({ task, onUpdate, onDelete }: { task: Note; onUpdate: (id: string, patch: Partial<Note>) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const save = () => {
    if (title.trim() && title.trim() !== task.title) void onUpdate(task.id, { title: title.trim() });
    setEditing(false);
  };
  return <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-3 hover:border-white/10">
    <button role="checkbox" aria-checked={!!task.is_completed} aria-label={`Complete ${task.title}`} onClick={() => void onUpdate(task.id, { is_completed: !task.is_completed })} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", task.is_completed ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" : "border-zinc-600 hover:border-white")}>{task.is_completed && <Check className="h-3.5 w-3.5" />}</button>
    {editing ? <input autoFocus aria-label="Edit task" value={title} onChange={event => setTitle(event.target.value)} onBlur={save} onKeyDown={event => { if (event.nativeEvent.isComposing) return; if (event.key === "Enter") { event.preventDefault(); save(); } if (event.key === "Escape") setEditing(false); }} className="min-w-0 flex-1 rounded bg-white/5 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-white/30" /> : <button onClick={() => { setTitle(task.title); setEditing(true); }} className={cn("min-w-0 flex-1 break-words text-left text-sm", task.is_completed ? "text-zinc-600 line-through" : "text-zinc-200")}>{task.title}</button>}
    <button aria-label={`Delete ${task.title}`} onClick={() => void onDelete(task.id)} className="shrink-0 rounded-lg p-2 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
  </li>;
}
