"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotes, type Note } from "@/context/NotesContext";
import { cn } from "@/lib/utils";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const order = (note: Note) => note.todo_order ?? new Date(note.created_at).getTime();

export function DailyTodos() {
  const { notes, selectedDate, setSelectedDate, createNote, updateNote, deleteNote, syncState, syncError, retrySync } = useNotes();
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const blank = useRef<HTMLTextAreaElement>(null);
  const tasks = notes.filter(note => note.daily_kind === "todo" && note.daily_date === selectedDate)
    .sort((a, b) => order(a) - order(b) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const focus = (id?: string, position = 0) => {
    const input = id ? inputs.current.get(id) : blank.current;
    input?.focus();
    input?.setSelectionRange(position, position);
  };
  const insert = (index: number, title = "") => {
    const lines = title.split(/\r?\n/);
    const before = tasks[index];
    const after = tasks[index + 1];
    let created!: Promise<Note>;
    flushSync(() => {
      // Normalize legacy rows so even tasks created in the same millisecond have a stable order.
      tasks.forEach((task, i) => { void updateNote(task.id, { todo_order: i * 2 }); });
      lines.forEach((line, offset) => {
        created = createNote({ title: line, content: "", is_daily_note: true, daily_kind: "todo", daily_date: selectedDate,
          is_completed: false, todo_order: (before ? index * 2 : after ? -2 : 0) + (offset + 1) / (lines.length + 1) });
      });
    });
    void created.then(note => focus(note.id, note.title.length));
  };
  const shiftDate = (offset: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + offset);
    setSelectedDate(dateKey(date));
  };
  const resize = (input: HTMLTextAreaElement) => {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  };

  return <section aria-label="Daily ToDos" className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#050505]/20 shadow-2xl backdrop-blur-xl">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
      <div className="flex items-center gap-2">
        <button aria-label="Previous day" onClick={() => shiftDate(-1)} className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
        <input aria-label="Task date" type="date" value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); }} className="min-w-0 bg-transparent text-xs text-zinc-400 outline-none [color-scheme:dark]" />
        <button aria-label="Next day" onClick={() => shiftDate(1)} className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
        <button onClick={() => setSelectedDate(dateKey(new Date()))} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-white/5 hover:text-white">Today</button>
      </div>
      <span role="status" className="text-[10px] text-zinc-500">{{ local: "Saved on this device", synced: "Saved to Firebase", syncing: "Syncing…", offline: "Offline · Sync pending", error: "Save needs attention" }[syncState]}</span>
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 custom-scrollbar">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-white">Daily ToDos</h1>
        {syncError && <div role="alert" className="mb-4 text-sm text-amber-300">{syncError} <button onClick={retrySync} className="underline">Retry save</button></div>}
        <div role="list" aria-label="Todo note" className="min-h-64">
          {tasks.map((task, index) => <div role="listitem" key={task.id} className="flex items-start gap-3 py-1">
            <button role="checkbox" aria-checked={!!task.is_completed} aria-label={`Complete ${task.title || "empty todo"}`} onClick={() => void updateNote(task.id, { is_completed: !task.is_completed })} className={cn("mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border focus-visible:outline-2 focus-visible:outline-white", task.is_completed ? "border-zinc-600 bg-white/10 text-zinc-500" : "border-zinc-600 hover:border-zinc-300")}>
              {task.is_completed && <Check className="h-3 w-3" />}
            </button>
            <textarea ref={element => { if (element) { inputs.current.set(task.id, element); resize(element); } else inputs.current.delete(task.id); }} rows={1} aria-label={`Todo line ${index + 1}`} value={task.title} placeholder="To-do" onChange={event => { const lines = event.target.value.split(/\r?\n/); void updateNote(task.id, { title: lines[0] }); if (lines.length > 1) insert(index, lines.slice(1).join("\n")); resize(event.target); }} onKeyDown={event => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Enter") {
                event.preventDefault();
                const start = event.currentTarget.selectionStart;
                const end = event.currentTarget.selectionEnd;
                void updateNote(task.id, { title: task.title.slice(0, start) });
                insert(index, task.title.slice(end));
              } else if (event.key === "Backspace" && !task.title) {
                event.preventDefault();
                void deleteNote(task.id);
                focus(tasks[index - 1]?.id, tasks[index - 1]?.title.length ?? 0);
              } else if (event.key === "ArrowUp" && event.currentTarget.selectionStart === 0 && index > 0) {
                event.preventDefault(); focus(tasks[index - 1].id, tasks[index - 1].title.length);
              } else if (event.key === "ArrowDown" && event.currentTarget.selectionStart === task.title.length) {
                event.preventDefault(); focus(tasks[index + 1]?.id);
              }
            }} className={cn("min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-sm leading-6 outline-none placeholder:text-zinc-700", task.is_completed ? "text-zinc-600 line-through" : "text-zinc-200")} />
          </div>)}
          <div className="flex items-start gap-3 py-1">
            <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded border border-zinc-700" />
            <textarea key={selectedDate} ref={blank} rows={1} aria-label="New todo" placeholder={tasks.length ? "To-do" : "Write a to-do…"} value="" onChange={event => { if (event.target.value) insert(tasks.length - 1, event.target.value); }} onKeyDown={event => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === "Enter") { event.preventDefault(); insert(tasks.length - 1); } if (event.key === "ArrowUp" && tasks.length) { event.preventDefault(); focus(tasks.at(-1)?.id, tasks.at(-1)?.title.length); } }} className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-700" />
          </div>
        </div>
      </div>
    </div>
    <div className="border-t border-white/5 px-5 py-2 text-[10px] text-zinc-600">Enter for a new checkbox · Backspace on an empty line to remove it</div>
  </section>;
}

