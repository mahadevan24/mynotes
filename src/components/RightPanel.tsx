"use client";

import React, { useState } from "react";
import { useNotes, Note } from "@/context/NotesContext";
import {
  Calendar as CalendarIcon,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export const RightPanel: React.FC = () => {
  const {
    notes,
    activeNote,
    setActiveNote,
    selectedDate,
    setSelectedDate,
    setActiveTab,
    createNote,
    theme,
    backlinks,
    setRightSidebarCollapsed,
  } = useNotes();

  // Calendar states
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper calendar functions
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (() => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon is 0, Sun is 6
  })();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const dayHasNotes = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    return notes.some((note) => {
      if (note.is_daily_note && note.daily_date === dateStr) {
        return true;
      }
      const noteDate = note.created_at.split("T")[0];
      return noteDate === dateStr;
    });
  };

  const handleDayClick = async (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setActiveTab("daily");

    const match = notes.find((n) => n.is_daily_note && n.daily_date === dateStr);
    if (match) {
      setActiveNote(match);
    } else {
      const dateObj = new Date(year, month, dayNum);
      const newDaily = await createNote({
        is_daily_note: true,
        daily_date: dateStr,
        title: `Daily Note — ${dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      });
      setActiveNote(newDaily);
    }
  };



  const handleBacklinkClick = (linkedNoteId: string) => {
    const match = notes.find((n) => n.id === linkedNoteId);
    if (match) {
      setActiveNote(match);
    }
  };
  return (
    <aside className="flex h-full w-full flex-col bg-[#050505]/40 p-4 backdrop-blur-xl select-none overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-end pb-3 border-b border-white/5 mb-1 shrink-0">
        <button
          onClick={() => setRightSidebarCollapsed(true)}
          className="rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* SECTION 2: Calendar widget */}
      <div className="rounded-xl border border-white/5 bg-neutral-950/40 p-3.5 shadow-md mt-4 shrink-0">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest">
              {monthNames[month]} {year}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrevMonth}
              className="rounded p-0.8 text-zinc-600 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="rounded p-0.8 text-zinc-600 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[8px] font-bold text-zinc-600 mb-1">
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>
        </div>

        {/* Calendar grid items */}
        <div className="grid grid-cols-7 text-center gap-y-0.5">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-6" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = new Date().toISOString().split("T")[0] === dateStr;
            const isSelected = selectedDate === dateStr;
            const hasNotes = dayHasNotes(dayNum);

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => handleDayClick(dayNum)}
                className={cn(
                  "relative h-6 w-6 rounded-md text-[10px] font-bold flex flex-col items-center justify-center transition-all mx-auto cursor-pointer",
                  isSelected
                    ? theme === "reflect"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-extrabold"
                      : theme === "granola"
                      ? "bg-emerald-600 text-neutral-950 shadow-md shadow-emerald-600/30 font-extrabold"
                      : "bg-amber-600 text-neutral-950 shadow-md shadow-amber-600/30 font-extrabold"
                    : isToday
                    ? "border border-zinc-700 text-white font-bold"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <span>{dayNum}</span>
                
                {/* Note Indicator dot */}
                {hasNotes && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 h-0.8 w-0.8 rounded-full",
                      isSelected
                        ? "bg-white"
                        : theme === "reflect"
                        ? "bg-purple-400 shadow-[0_0_4px_#a78bfa]"
                        : theme === "granola"
                        ? "bg-emerald-400 shadow-[0_0_4px_#34d399]"
                        : "bg-amber-400 shadow-[0_0_4px_#fbbf24]"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Backlinks Panel */}
      <div className="mt-4 flex flex-col rounded-xl border border-white/5 bg-neutral-950/40 p-3.5 shadow-md min-h-[120px] shrink-0">
        <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2.5">
          <div className="flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest">
              Backlinks
            </span>
          </div>
          <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] font-bold text-zinc-500 font-mono">
            {backlinks.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
          {backlinks.length > 0 ? (
            backlinks.map((link) => (
              <button
                key={link.noteId}
                onClick={() => handleBacklinkClick(link.noteId)}
                className="w-full text-left rounded-lg border border-white/5 bg-white/[0.01] px-2.5 py-2 text-[10px] font-bold text-zinc-400 hover:border-purple-500/20 hover:text-white transition-all truncate block cursor-pointer"
              >
                {link.noteTitle}
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-600">
              <Info className="h-5 w-5 stroke-[1.2] mb-1.5 opacity-35" />
              <p className="text-[9px] leading-relaxed max-w-[170px] text-zinc-500">
                No note references. Use <code className="text-zinc-400 font-mono text-[8px]">[[Note Title]]</code> in other notes to link.
              </p>
            </div>
          )}
        </div>
      </div>


    </aside>
  );
};
