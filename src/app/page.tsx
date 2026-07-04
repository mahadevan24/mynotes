"use client";

import React, { useState, useEffect, useRef } from "react";
import { NotesProvider, useNotes, Note } from "@/context/NotesContext";
import { ThemeGlow } from "@/components/ThemeGlow";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { RightPanel } from "@/components/RightPanel";
import { AuthOverlay } from "@/components/AuthOverlay";
import { 
  Loader2, 
  Search, 
  Terminal, 
  Sparkles, 
  Command,
  FileText, 
  Clock, 
  Layers, 
  CheckSquare, 
  Calendar, 
  Sliders, 
  Key,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    notes,
    setActiveNote,
    setActiveTab,
    createNote,
    isFocusMode,
    toggleFocusMode,
  } = useNotes();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [commandPaletteOpen]);

  // Filter items based on search query
  const searchItems = () => {
    const list: Array<{
      type: "action" | "note";
      id: string;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      handler: () => void;
    }> = [];

    // 1. Actions list
    const actions = [
      {
        id: "action-new-note",
        title: "Create Standard Note",
        subtitle: "Add a new markdown text note",
        icon: <FileText className="h-4 w-4 text-zinc-400" />,
        handler: async () => {
          setActiveTab("all");
          const note = await createNote({ is_daily_note: false });
          setActiveNote(note);
        }
      },
      {
        id: "action-new-journal",
        title: "Create Daily Journal Entry",
        subtitle: "Start writing today's log",
        icon: <Calendar className="h-4 w-4 text-zinc-400" />,
        handler: async () => {
          setActiveTab("daily");
          const todayStr = new Date().toISOString().split("T")[0];
          const match = notes.find((n) => n.is_daily_note && n.daily_date === todayStr);
          if (match) {
            setActiveNote(match);
          } else {
            const note = await createNote({
              is_daily_note: true,
              daily_date: todayStr,
              title: `Daily Note — ${new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`,
            });
            setActiveNote(note);
          }
        }
      },
      {
        id: "action-toggle-focus",
        title: isFocusMode ? "Exit Zen Focus Mode" : "Enter Zen Focus Mode",
        subtitle: "Toggle minimalist workspace panels view",
        icon: <Sparkles className="h-4 w-4 text-zinc-400" />,
        handler: () => {
          toggleFocusMode();
        }
      }
    ];

    actions.forEach(action => {
      if (
        action.title.toLowerCase().includes(query.toLowerCase()) ||
        action.subtitle.toLowerCase().includes(query.toLowerCase())
      ) {
        list.push({
          type: "action",
          id: action.id,
          title: action.title,
          subtitle: action.subtitle,
          icon: action.icon,
          handler: action.handler
        });
      }
    });

    // 2. Add notes matching search query
    const filteredNotes = notes.filter(note => 
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content.toLowerCase().includes(query.toLowerCase())
    );

    filteredNotes.forEach(note => {
      list.push({
        type: "note",
        id: note.id,
        title: note.title || "Untitled Note",
        subtitle: note.content ? note.content.slice(0, 60).replace(/[#*`_\[\]-]/g, "") : "Empty note content",
        icon: <FileText className="h-4 w-4 text-zinc-400" />,
        handler: () => {
          setActiveTab(note.is_daily_note ? "daily" : "all");
          setActiveNote(note);
        }
      });
    });

    return list;
  };

  const items = searchItems();

  // Scroll index into view
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
    if (!activeEl) return;

    const containerHeight = scrollContainerRef.current.clientHeight;
    const elOffsetTop = activeEl.offsetTop;
    const elHeight = activeEl.clientHeight;

    if (elOffsetTop + elHeight > scrollContainerRef.current.scrollTop + containerHeight) {
      scrollContainerRef.current.scrollTop = elOffsetTop + elHeight - containerHeight;
    } else if (elOffsetTop < scrollContainerRef.current.scrollTop) {
      scrollContainerRef.current.scrollTop = elOffsetTop;
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].handler();
          setCommandPaletteOpen(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, items, selectedIndex]);

  if (!commandPaletteOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        className="w-full max-w-xl rounded-xl border border-white/10 bg-neutral-950/80 shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] shadow-white/5 backdrop-blur-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input area */}
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5">
          <Search className="h-4.5 w-4.5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, shortcuts, timers..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            <span>ESC</span>
          </div>
        </div>

        {/* Results area */}
        <div 
          ref={scrollContainerRef}
          className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar"
        >
          {items.length > 0 ? (
            items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  item.handler();
                  setCommandPaletteOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-left transition-all",
                  index === selectedIndex
                    ? "bg-white/10 text-white border border-white/20 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                )}
              >
                <div className="shrink-0">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate text-zinc-100">{item.title}</div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{item.subtitle}</div>
                </div>
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest shrink-0 font-bold">
                  {item.type}
                </span>
              </button>
            ))
          ) : (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No matches found for <span className="text-zinc-300 font-semibold font-mono">"{query}"</span>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-2 bg-neutral-950/40 text-[9px] font-semibold text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="border border-white/10 bg-white/5 rounded px-1 text-[8px] font-sans">↑↓</span> Navigate</span>
            <span className="flex items-center gap-1"><span className="border border-white/10 bg-white/5 rounded px-1 text-[8px] font-sans">ENTER</span> Select</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-zinc-600">
            <Command className="h-2.5 w-2.5" />
            <span>Command Center</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceContent() {
  const { 
    loading, 
    activeTab, 
    isFocusMode, 
    leftSidebarCollapsed, 
    rightSidebarCollapsed, 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    user,
    signOut
  } = useNotes();
  const [authOpen, setAuthOpen] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // cmd+k or ctrl+k to toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-white">
        <ThemeGlow />
        <div className="relative flex flex-col items-center">
          {/* Logo container */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950 border border-white/15 text-white font-bold shadow-[0_0_40px_rgba(255,255,255,0.05)] mb-6 animate-pulse">
            <span className="text-xl font-mono tracking-tighter">mn</span>
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-zinc-500 to-white opacity-10 blur-sm -z-10" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mb-2.5" />
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
            Initializing secure workspace
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-black p-4 font-sans text-zinc-200 antialiased select-none transition-all duration-300">
      {/* Dynamic ambient background glow */}
      <ThemeGlow />

      {/* 1. Left Sidebar - Folders & Notes Feed */}
      <div 
        className={cn(
          "h-full rounded-2xl glass-panel shadow-2xl flex flex-col shrink-0 transition-all duration-500 ease-in-out",
          isFocusMode 
            ? "w-0 opacity-0 border-0 pointer-events-none p-0 m-0 overflow-hidden" 
            : leftSidebarCollapsed 
              ? "w-16 mr-2 overflow-visible" 
              : "w-80 mr-4 overflow-hidden"
        )}
      >
        <Sidebar 
          onOpenAuth={() => setAuthOpen(true)} 
          showProfilePopover={showProfilePopover}
          setShowProfilePopover={setShowProfilePopover}
        />
      </div>

      {/* 2. Middle Editor or consolidated dashboard */}
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <Editor />
      </main>

      {/* 3. Right Sidebar - Pomodoro Timer, Backlinks & Calendar */}
      <div 
        className={cn(
          "h-full rounded-2xl glass-panel overflow-hidden shadow-2xl flex flex-col shrink-0 transition-all duration-500 ease-in-out",
          isFocusMode || rightSidebarCollapsed 
            ? "w-0 opacity-0 border-0 pointer-events-none p-0 m-0" 
            : "w-80 ml-4"
        )}
      >
        <RightPanel />
      </div>

      {/* Settings Popover rendered at root page level to completely bypass absolute overflow clipping */}
      {showProfilePopover && (
        <>
          {/* Click-outside listener overlay */}
          <div 
            className="fixed inset-0 z-40 cursor-default" 
            onClick={() => setShowProfilePopover(false)}
          />
          {/* Compact Settings Popover */}
          <div 
            className={cn(
              "absolute bottom-[72px] z-50 rounded-xl border border-white/10 bg-neutral-950/95 p-3.5 shadow-2xl backdrop-blur-xl animate-fade-in-up shadow-white/5",
              leftSidebarCollapsed ? "left-6 w-64" : "left-6 w-[288px]"
            )}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {user ? "Account Settings" : "Guest Settings"}
              </span>
              <button 
                onClick={() => setShowProfilePopover(false)}
                className="text-[9px] font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {!user && (
              <button
                onClick={() => {
                  setShowProfilePopover(false);
                  setAuthOpen(true);
                }}
                className="w-full mb-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-bold text-black transition-all hover:scale-[1.01] active:scale-95 shadow-md cursor-pointer bg-white hover:bg-zinc-200"
              >
                <span>Sign In / Sync Notes</span>
              </button>
            )}



            {user && (
              <button
                onClick={async () => {
                  await signOut();
                  setShowProfilePopover(false);
                }}
                className="w-full flex items-center justify-center py-2 text-[10px] font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 transition-all rounded-lg cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        </>
      )}

      {/* Cloud Authentication Overlay Dialog */}
      <AuthOverlay isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Raycast-style Command Center Modal */}
      <CommandPalette />
    </div>
  );
}

export default function Home() {
  return (
    <NotesProvider>
      <WorkspaceContent />
    </NotesProvider>
  );
}
