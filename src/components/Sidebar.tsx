"use client";

import React, { useState } from "react";
import { useNotes, Note } from "@/context/NotesContext";
import {
  Search,
  Calendar,
  Layers,
  CheckSquare,
  Plus,
  Pin,
  Trash2,
  Cloud,
  CloudOff,
  Sparkles,
  Command,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onOpenAuth: () => void;
  showProfilePopover: boolean;
  setShowProfilePopover: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onOpenAuth, 
  showProfilePopover, 
  setShowProfilePopover 
}) => {
  const {
    notes,
    activeNote,
    setActiveNote,
    theme,
    setTheme,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    createNote,
    deleteNote,
    togglePin,
    user,
    syncState,
    setCommandPaletteOpen,
    signOut,
    leftSidebarCollapsed,
    setLeftSidebarCollapsed,
  } = useNotes();

  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  // Formats date to a readable format
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  // Filter notes based on active tab & search query
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeTab === "daily") return note.is_daily_note;
    return true; // 'all' tab shows both standard and daily notes
  });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const regularNotes = filteredNotes.filter((n) => !n.is_pinned);

  const handleDailyNotesClick = async () => {
    setActiveTab("daily");
    const todayStr = new Date().toISOString().split("T")[0];
    const match = notes.find((n) => n.is_daily_note && n.daily_date === todayStr);

    if (match) {
      setActiveNote(match);
    } else {
      const newDaily = await createNote({
        is_daily_note: true,
        daily_date: todayStr,
        title: `Daily Note — ${new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
      });
      setActiveNote(newDaily);
    }
  };

  const handleNewNote = async () => {
    setActiveTab("all");
    const newNote = await createNote({
      is_daily_note: false,
    });
    setActiveNote(newNote);
  };





  return (
    <aside className={cn(
      "flex h-full w-full flex-col bg-[#050505]/40 backdrop-blur-xl select-none transition-all duration-300",
      leftSidebarCollapsed ? "p-2 items-center" : "p-4"
    )}>
      {/* Scrollable Container for Top Content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-0.5 pb-2 w-full",
        leftSidebarCollapsed ? "items-center" : ""
      )}>
        {/* Brand Header */}
        <div className={cn(
          "flex items-center justify-between pb-3.5 border-b border-white/5 w-full",
          leftSidebarCollapsed ? "flex-col gap-2.5 pb-3" : ""
        )}>
          {leftSidebarCollapsed ? (
            <>
              {/* Expand Button */}
              <button
                onClick={() => setLeftSidebarCollapsed(false)}
                className="rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
              {/* Logo */}
              <div 
                onClick={() => setCommandPaletteOpen(true)}
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-white/10 text-white font-mono text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95",
                  theme === "reflect" && "border-purple-500/30 shadow-purple-500/5",
                  theme === "granola" && "border-emerald-500/30 shadow-emerald-500/5",
                  theme === "solar" && "border-amber-500/30 shadow-amber-500/5"
                )}
                title="Command Center"
              >
                <span>mn</span>
                <div className="absolute -inset-0.5 -z-10 rounded-lg opacity-25 blur-sm" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {/* Logo */}
                <div 
                  onClick={() => setCommandPaletteOpen(true)}
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 border border-white/10 text-white font-mono text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95",
                    theme === "reflect" && "border-purple-500/30 shadow-purple-500/5",
                    theme === "granola" && "border-emerald-500/30 shadow-emerald-500/5",
                    theme === "solar" && "border-amber-500/30 shadow-amber-500/5"
                  )}
                >
                  <span>mn</span>
                  <div className="absolute -inset-0.5 -z-10 rounded-lg opacity-25 blur-sm" />
                </div>
                <span className="font-extrabold tracking-tight text-white font-sans text-sm">
                  mynotes
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Collapse Button */}
                <button
                  onClick={() => setLeftSidebarCollapsed(true)}
                  className="rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Click-to-Search Command Palette Launcher / Search Icon */}
        {leftSidebarCollapsed ? (
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="mt-3.5 w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center text-zinc-500 hover:bg-white/[0.04] hover:text-white transition-all cursor-pointer shrink-0"
            title="Search or Command (⌘K)"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <div 
            onClick={() => setCommandPaletteOpen(true)}
            className="relative mt-3.5 group cursor-pointer w-full"
          >
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <div className="w-full rounded-lg border border-white/5 bg-white/[0.02] py-2 pl-9 pr-4 text-xs text-zinc-500 font-semibold select-none group-hover:bg-white/[0.04] transition-all flex items-center justify-between">
              <span>Search or command...</span>
              <div className="flex items-center gap-0.5 border border-white/10 bg-white/5 px-1 py-0.2 rounded text-[9px] text-zinc-500">
                <Command className="h-2 w-2" />
                <span>K</span>
              </div>
            </div>
          </div>
        )}

        {/* Primary Navigation tabs */}
        <nav className={cn("mt-4 space-y-2 w-full", leftSidebarCollapsed ? "flex flex-col items-center" : "")}>
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center transition-all border border-transparent cursor-pointer justify-center rounded-lg",
              leftSidebarCollapsed 
                ? "w-8 h-8 p-0" 
                : "w-full justify-between px-2.5 py-2 text-xs font-semibold",
              activeTab === "all"
                ? theme === "reflect" ? "bg-purple-950/20 text-white border-purple-950/40" 
                  : theme === "granola" ? "bg-emerald-950/20 text-white border-emerald-950/40"
                  : "bg-amber-950/20 text-white border-amber-950/40"
                : "text-zinc-400 hover:bg-white/[0.02] hover:text-white"
            )}
            title="All Documents"
          >
            <Layers className="h-3.5 w-3.5" />
            {!leftSidebarCollapsed && (
              <>
                <span className="ml-2">All Documents</span>
                <span className="ml-auto rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] text-zinc-500 font-mono">
                  {notes.length}
                </span>
              </>
            )}
          </button>

          <button
            onClick={handleDailyNotesClick}
            className={cn(
              "flex items-center transition-all border border-transparent cursor-pointer justify-center rounded-lg",
              leftSidebarCollapsed 
                ? "w-8 h-8 p-0" 
                : "w-full justify-between px-2.5 py-2 text-xs font-semibold",
              activeTab === "daily"
                ? theme === "reflect" ? "bg-purple-950/20 text-white border-purple-950/40" 
                  : theme === "granola" ? "bg-emerald-950/20 text-white border-emerald-950/40"
                  : "bg-amber-950/20 text-white border-amber-950/40"
                : "text-zinc-400 hover:bg-white/[0.02] hover:text-white"
            )}
            title="Daily Journal"
          >
            <Calendar className="h-3.5 w-3.5" />
            {!leftSidebarCollapsed && (
              <>
                <span className="ml-2">Daily Journal</span>
                <span className="ml-auto rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-[9px] text-zinc-500 font-mono">
                  {notes.filter((n) => n.is_daily_note).length}
                </span>
              </>
            )}
          </button>
        </nav>

        {/* Section Header or Quick Add Button */}
        {leftSidebarCollapsed ? (
          activeTab !== "daily" && (
            <button
              onClick={handleNewNote}
              className={cn(
                "mt-4 flex h-8 w-8 items-center justify-center rounded-lg text-black shadow transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shrink-0",
                theme === "reflect" && "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
                theme === "granola" && "bg-gradient-to-r from-emerald-400 to-teal-500 text-neutral-950",
                theme === "solar" && "bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950"
              )}
              title="Create Note"
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        ) : (
          <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3.5 w-full">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              {activeTab === "daily" ? "Journal Feed" : "Documents"}
            </span>
            {activeTab !== "daily" && (
              <button
                onClick={handleNewNote}
                className={cn(
                  "flex items-center gap-0.5 rounded px-2 py-0.8 text-[10px] font-bold text-black shadow transition-all hover:scale-[1.03] active:scale-95 cursor-pointer",
                  theme === "reflect" && "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
                  theme === "granola" && "bg-gradient-to-r from-emerald-400 to-teal-500 text-neutral-950",
                  theme === "solar" && "bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950"
                )}
              >
                <Plus className="h-3 w-3" />
                <span>Note</span>
              </button>
            )}
          </div>
        )}

        {/* Note List Scroll Area (Only visible when expanded) */}
        {!leftSidebarCollapsed && (
          <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 custom-scrollbar min-h-[140px] w-full">
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Pin className="h-2.5 w-2.5 fill-zinc-500 text-zinc-500 rotate-45" />
                  <span>Pinned</span>
                </div>
                {pinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    activeNote={activeNote}
                    onSelect={setActiveNote}
                    onDelete={deleteNote}
                    onTogglePin={togglePin}
                    hoveredNoteId={hoveredNoteId}
                    setHoveredNoteId={setHoveredNoteId}
                    theme={theme}
                    formatDate={formatDate}
                  />
                ))}
                <div className="h-px bg-white/5 my-2" />
              </div>
            )}

            {/* Regular Notes Section */}
            {regularNotes.length > 0 ? (
              regularNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  activeNote={activeNote}
                  onSelect={setActiveNote}
                  onDelete={deleteNote}
                  onTogglePin={togglePin}
                  hoveredNoteId={hoveredNoteId}
                  setHoveredNoteId={setHoveredNoteId}
                  theme={theme}
                  formatDate={formatDate}
                />
              ))
            ) : pinnedNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-600">
                <Layers className="h-7 w-7 stroke-[1.2] mb-2 opacity-35" />
                <p className="text-[10px] font-medium leading-relaxed max-w-[140px]">
                  No documents found. Start by creating a note.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom Profile & Sync Operations */}
      <div className="mt-auto shrink-0 border-t border-white/5 pt-3.5 space-y-2.5 relative w-full flex flex-col items-center">
        {/* Sync Status block & User profile */}
        {leftSidebarCollapsed ? (
          <div className="flex flex-col items-center">
            {/* User profile avatar */}
            <button
              onClick={() => setShowProfilePopover(!showProfilePopover)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-400 cursor-pointer hover:text-white hover:border-white/20 transition-all mb-1",
                theme === "reflect" && "hover:border-purple-500/20",
                theme === "granola" && "hover:border-emerald-500/20",
                theme === "solar" && "hover:border-amber-500/20"
              )}
              title="Settings"
            >
              {user?.email ? user.email.slice(0, 2).toUpperCase() : "G"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowProfilePopover(!showProfilePopover)}
            className="flex items-center justify-start rounded-lg bg-neutral-950/60 p-2 border border-white/5 w-full hover:opacity-85 transition-opacity cursor-pointer text-left"
            title="Settings"
          >
            <div className="flex items-center gap-2 overflow-hidden w-full">
              <div className={cn(
                "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-400 transition-all",
                theme === "reflect" && "border-purple-500/20",
                theme === "granola" && "border-emerald-500/20",
                theme === "solar" && "border-amber-500/20"
              )}>
                {user?.email ? user.email.slice(0, 2).toUpperCase() : "G"}
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-[10px] font-bold text-white truncate">
                  {user ? user.email : "Guest Mode"}
                </span>
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                  {syncState === "synced" ? "Cloud Backup Active" : "Local Database Only"}
                </span>
              </div>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
};

// Item subcomponent
interface NoteListItemProps {
  note: Note;
  activeNote: Note | null;
  onSelect: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  hoveredNoteId: string | null;
  setHoveredNoteId: (id: string | null) => void;
  theme: "reflect" | "granola" | "solar";
  formatDate: (str: string) => string;
}

const NoteListItem: React.FC<NoteListItemProps> = ({
  note,
  activeNote,
  onSelect,
  onDelete,
  onTogglePin,
  hoveredNoteId,
  setHoveredNoteId,
  theme,
  formatDate,
}) => {
  const isSelected = activeNote?.id === note.id;

  return (
    <div
      onMouseEnter={() => setHoveredNoteId(note.id)}
      onMouseLeave={() => setHoveredNoteId(null)}
      onClick={() => onSelect(note)}
      className={cn(
        "group relative flex flex-col gap-1 rounded-lg p-2.5 text-left transition-all cursor-pointer border border-transparent",
        isSelected
          ? theme === "reflect"
            ? "bg-purple-950/10 text-white border-purple-500/30 shadow-lg shadow-purple-500/5"
            : theme === "granola"
            ? "bg-emerald-950/10 text-white border-emerald-500/30 shadow-lg shadow-emerald-500/5"
            : "bg-amber-950/10 text-white border-amber-500/30 shadow-lg shadow-amber-500/5"
          : "text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200"
      )}
    >
      {/* Dynamic Theme Glow Border on Selection */}
      {isSelected && (
        <div
          className={cn(
            "absolute -left-px top-1/4 h-1/2 w-1 rounded-r-full blur-[0.5px]",
            theme === "reflect" && "bg-purple-400 shadow-[0_0_6px_#a78bfa]",
            theme === "granola" && "bg-emerald-400 shadow-[0_0_6px_#34d399]",
            theme === "solar" && "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
          )}
        />
      )}

      {/* Note Header Title */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold truncate text-zinc-100 leading-tight">
          {note.title || "Untitled Note"}
        </h4>
        {note.is_pinned && !isSelected && (
          <Pin className="h-2.5 w-2.5 fill-zinc-600 text-zinc-600 rotate-45 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Preview Snippet */}
      <p className="text-[10px] text-zinc-500 truncate line-clamp-1">
        {note.content ? note.content.replace(/[#*`_\[\]-]/g, "") : "Empty content"}
      </p>

      {/* Date Footer and Actions */}
      <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-600 font-medium">
        <span>{formatDate(note.updated_at)}</span>
        
        {/* Quick controls on hover or active */}
        <div
          className={cn(
            "flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
            isSelected && "opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onTogglePin(note.id)}
            className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            title={note.is_pinned ? "Unpin Note" : "Pin Note"}
          >
            <Pin
              className={cn(
                "h-2.5 w-2.5 rotate-45",
                note.is_pinned && "fill-purple-400 text-purple-400 rotate-0"
              )}
            />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-0.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete Note"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
