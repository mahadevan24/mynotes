"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNotes, Note } from "@/context/NotesContext";
import {
  Pin,
  Eye,
  Edit3,
  Hash,
  X,
  Plus,
  BookOpen,
  Calendar,
  CloudLightning,
  Sparkles,
  Maximize2,
  Minimize2,
  FileCode,
  Info,
  ChevronLeft
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export const Editor: React.FC = () => {
  const {
    activeNote,
    updateNote,
    notes,
    theme,
    syncState,
    setActiveNote,
    isFocusMode,
    toggleFocusMode,
    findOrCreateNoteByTitle,
    rightSidebarCollapsed,
    setRightSidebarCollapsed,
  } = useNotes();

  const [editMode, setEditMode] = useState<"edit" | "preview">("edit");
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Link autocomplete states
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Switch to edit mode when active note changes
  useEffect(() => {
    setEditMode("edit");
    setShowTagInput(false);
    setNewTag("");
    setShowLinkSuggestions(false);
  }, [activeNote?.id]);

  if (!activeNote) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-8 bg-[#050505]/20 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl h-full select-none">
        <div className="relative mb-6">
          <BookOpen className="h-12 w-12 text-zinc-700 stroke-[1.2] animate-pulse" />
          <div className="absolute -inset-4 rounded-full bg-zinc-500/5 blur-xl -z-10" />
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">No active document selected</h3>
        <p className="mt-1.5 text-zinc-500 max-w-xs text-[11px] leading-relaxed">
          Select a note from the sidebar, click calendar dates to write journal notes, or open the Command Center <kbd className="border border-white/10 px-1 py-0.2 rounded font-sans text-[9px] bg-white/5">⌘K</kbd> to launch actions.
        </p>
      </div>
    );
  }

  // Handle word & char count
  const charCount = activeNote.content.length;
  const wordCount = activeNote.content.trim() === "" ? 0 : activeNote.content.trim().split(/\s+/).length;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNote(activeNote.id, { title: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setCursorPosition(pos);
    updateNote(activeNote.id, { content: val });

    // Check for "[[ " pattern trigger
    const textBeforeCursor = val.substring(0, pos);
    const doubleBracketIndex = textBeforeCursor.lastIndexOf("[[");

    if (doubleBracketIndex !== -1 && doubleBracketIndex >= textBeforeCursor.length - 20) {
      const query = textBeforeCursor.substring(doubleBracketIndex + 2);
      if (!query.includes("]")) {
        setLinkQuery(query);
        setShowLinkSuggestions(true);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    setShowLinkSuggestions(false);
  };

  // Autocomplete key triggers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showLinkSuggestions) {
      const filteredSuggestions = getFilteredSuggestions();
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredSuggestions[selectedSuggestionIndex]) {
          insertLink(filteredSuggestions[selectedSuggestionIndex].title);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowLinkSuggestions(false);
      }
    }
  };

  const getFilteredSuggestions = () => {
    return notes
      .filter((n) => n.id !== activeNote.id)
      .filter((n) => n.title.toLowerCase().includes(linkQuery.toLowerCase()))
      .slice(0, 5);
  };

  const insertLink = (linkedNoteTitle: string) => {
    if (!textareaRef.current) return;

    const val = activeNote.content;
    const pos = cursorPosition;
    const textBeforeCursor = val.substring(0, pos);
    const doubleBracketIndex = textBeforeCursor.lastIndexOf("[[");

    if (doubleBracketIndex !== -1) {
      const start = val.substring(0, doubleBracketIndex);
      const end = val.substring(pos);
      const insertedText = `[[${linkedNoteTitle}]]`;
      const newContent = start + insertedText + end;
      
      updateNote(activeNote.id, { content: newContent });
      setShowLinkSuggestions(false);

      const newCursorPos = doubleBracketIndex + insertedText.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    }
  };


  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (tag && !activeNote.tags.includes(tag)) {
      updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    }
    setNewTag("");
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateNote(activeNote.id, {
      tags: activeNote.tags.filter((t) => t !== tagToRemove),
    });
  };



  return (
    <div 
      className={cn(
        "relative flex flex-1 flex-col overflow-hidden rounded-2xl border transition-all duration-300 h-full",
        isFocused ? (
          theme === "reflect" ? "aura-border-reflect" : 
          theme === "granola" ? "aura-border-granola" : 
          "aura-border-solar"
        ) : "border-white/5",
        "bg-[#050505]/40 backdrop-blur-xl"
      )}
    >
      {/* 1. Header controls bar */}
      <div className="flex h-11 items-center justify-between border-b border-white/5 bg-neutral-950/20 px-4 shrink-0">
        {/* Left window actions */}
        <div className="flex items-center gap-1.5 group/dots">
          <button
            onClick={() => setActiveNote(null)}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-rose-500/80 border border-rose-600/30 text-rose-950 hover:bg-rose-500 transition-colors cursor-pointer"
            title="Close Active Note"
          >
            <span className="text-[8px] font-extrabold opacity-0 group-hover/dots:opacity-100 transition-opacity pointer-events-none">×</span>
          </button>
          <button
            onClick={toggleFocusMode}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/80 border border-emerald-600/30 text-emerald-950 hover:bg-emerald-500 transition-colors cursor-pointer"
            title={isFocusMode ? "Exit Zen Mode" : "Zen Focus Mode"}
          >
            <span className="text-[8px] font-extrabold opacity-0 group-hover/dots:opacity-100 transition-opacity pointer-events-none">⤢</span>
          </button>
        </div>

        {/* Center: Write/Preview Toggle */}
        <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/5">
          <button
            onClick={() => setEditMode("edit")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.8 text-[10px] font-bold rounded transition-all",
              editMode === "edit"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Edit3 className="h-3 w-3" />
            <span>Write</span>
          </button>
          <button
            onClick={() => setEditMode("preview")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.8 text-[10px] font-bold rounded transition-all",
              editMode === "preview"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          {rightSidebarCollapsed && (
            <button
              onClick={() => setRightSidebarCollapsed(false)}
              className="rounded p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Expand Right Panel"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          )}
          {/* Zen Toggle Button */}
          <button
            onClick={toggleFocusMode}
            className="rounded p-1 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            title={isFocusMode ? "Exit Zen Mode" : "Zen Mode"}
          >
            {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => updateNote(activeNote.id, { is_pinned: !activeNote.is_pinned })}
            className={cn(
              "rounded p-1 transition-colors",
              activeNote.is_pinned
                ? "text-purple-400 bg-purple-500/10 border border-purple-500/20"
                : "text-zinc-500 hover:text-white hover:bg-white/5"
            )}
            title="Pin Note"
          >
            <Pin className={cn("h-3.5 w-3.5 rotate-45", activeNote.is_pinned && "rotate-0 fill-purple-400")} />
          </button>
        </div>
      </div>

      {/* 2. Editor Core Workspace */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar flex flex-col">
        
        {/* Breadcrumb line & tags */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 mb-4 select-none shrink-0">
          {activeNote.is_daily_note ? (
            <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase tracking-wider">
              <Calendar className="h-3 w-3" />
              <span>Journal Log</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase tracking-wider">
              <BookOpen className="h-3 w-3" />
              <span>Standard Note</span>
            </div>
          )}

          <span>•</span>
          <span>Updated {new Date(activeNote.updated_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}</span>

          {/* Tags view */}
          <div className="flex flex-wrap items-center gap-1 ml-auto">
            {activeNote.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold text-zinc-300 transition-colors hover:border-rose-500/30 hover:text-rose-400 cursor-pointer"
                onClick={() => handleRemoveTag(tag)}
              >
                <Hash className="h-2 w-2 text-zinc-500" />
                <span>{tag}</span>
                <X className="h-2 w-2 text-zinc-500 ml-0.5 shrink-0" />
              </span>
            ))}

            {showTagInput ? (
              <form onSubmit={handleAddTagSubmit} className="inline-block">
                <input
                  type="text"
                  autoFocus
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onBlur={() => setShowTagInput(false)}
                  placeholder="name..."
                  className="rounded-full bg-neutral-900 border border-purple-500/30 px-2 py-0.5 text-[9px] font-bold text-white placeholder-zinc-600 outline-none w-16"
                />
              </form>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="flex items-center gap-0.5 rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[9px] font-bold text-zinc-500 hover:border-purple-500/40 hover:text-purple-400 transition-all cursor-pointer"
              >
                <Plus className="h-2 w-2" />
                <span>Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Title Block */}
        <input
          type="text"
          value={activeNote.title}
          onChange={handleTitleChange}
          placeholder="Untitled Note"
          className="w-full bg-transparent text-2xl font-bold text-zinc-100 placeholder-zinc-800 outline-none mb-4 border-b border-transparent focus:border-white/5 pb-2 transition-colors font-sans shrink-0"
        />


        {/* Main Editor Text / Markdown Preview */}
        {editMode === "edit" ? (
          <div className="relative flex flex-1 flex-col min-h-0">
            <textarea
              ref={textareaRef}
              value={activeNote.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Write in markdown (e.g., # header, - [ ] checkbox task, or [[Note Link]] wiki connectors)..."
              className="w-full flex-1 resize-none bg-transparent text-sm text-zinc-300 placeholder-zinc-800 outline-none font-sans leading-relaxed min-h-[250px] custom-scrollbar focus:ring-0"
            />

            {/* Wiki Links suggestions overlay */}
            {showLinkSuggestions && getFilteredSuggestions().length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-20 w-52 rounded-lg border border-white/10 bg-neutral-950 p-1 shadow-2xl backdrop-blur-xl animate-fade-in"
                style={{
                  top: textareaRef.current
                    ? Math.min(textareaRef.current.selectionEnd / 4.5 + 40, 240)
                    : 100,
                  left: 10,
                }}
              >
                <div className="px-2 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  <span>Insert note link</span>
                </div>
                <div className="p-0.5 space-y-0.5 mt-1">
                  {getFilteredSuggestions().map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => insertLink(suggestion.title)}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-1 text-[11px] font-semibold transition-all truncate block",
                        index === selectedSuggestionIndex
                          ? "bg-purple-600 text-white"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {suggestion.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 text-sm text-zinc-300 leading-relaxed prose prose-invert max-w-none custom-scrollbar overflow-y-auto pr-2">
            {activeNote.content.trim() === "" ? (
              <div className="flex items-center gap-2 text-zinc-600 italic text-xs py-8">
                <Info className="h-4 w-4 text-zinc-700" />
                <span>Document body is empty. Type something in Write mode first!</span>
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-zinc-100 mt-5 mb-2.5 pb-1 border-b border-white/5">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold text-zinc-100 mt-4 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold text-zinc-100 mt-3.5 mb-1.5">{children}</h3>,
                  p: ({ children }) => <p className="mb-3.5 text-zinc-400 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-3.5 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3.5 space-y-1">{children}</ol>,
                  li: ({ children, checked, ...props }: any) => {
                    if (checked !== undefined) {
                      return (
                        <li className="flex items-center gap-2 list-none -ml-5 mb-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-0 focus:ring-offset-0 cursor-default"
                          />
                          <span className={cn("text-zinc-300 font-semibold", checked && "line-through text-zinc-600")}>
                            {children}
                          </span>
                        </li>
                      );
                    }
                    return <li className="text-zinc-300 font-medium">{children}</li>;
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-purple-500 bg-white/[0.02] pl-3 py-1 my-3 italic text-zinc-500 rounded-r-md">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-white/5 border border-white/10 px-1 py-0.2 font-mono text-xs text-pink-400">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-xs text-zinc-300 overflow-x-auto my-3">
                      {children}
                    </pre>
                  ),
                  // Clickable bidirectional Note Link protocol implementation
                  a: ({ href, children }) => {
                    const isNoteProtocol = href?.startsWith("#note-");
                    console.log("ReactMarkdown Link component rendered:", { href, isNoteProtocol });
                    const handleLinkClick = (e: React.MouseEvent) => {
                      console.log("ReactMarkdown Link clicked!", { href, isNoteProtocol });
                      if (isNoteProtocol && href) {
                        e.preventDefault();
                        const decodedTitle = decodeURIComponent(href.replace("#note-", ""));
                        console.log("Navigating to note title:", decodedTitle);
                        findOrCreateNoteByTitle(decodedTitle);
                      }
                    };

                    return (
                      <span 
                        onClick={handleLinkClick}
                        className={cn(
                          "font-bold transition-colors underline underline-offset-4 cursor-pointer select-none",
                          theme === "reflect" && "text-purple-400 hover:text-purple-300",
                          theme === "granola" && "text-emerald-400 hover:text-emerald-300",
                          theme === "solar" && "text-amber-400 hover:text-amber-300"
                        )}
                      >
                        {children}
                      </span>
                    );
                  }
                }}
              >
                {/* Parse standard markdown, but also preprocess note-links [[Title]] into standard links */}
                {activeNote.content.replace(/\[\[(.*?)\]\]/g, (match, title) => {
                  return `[${title}](#note-${encodeURIComponent(title)})`;
                })}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>

      {/* 3. Editor Footer Stats */}
      <div className="flex h-9 items-center justify-between border-t border-white/5 bg-neutral-950/20 px-4 text-[9px] text-zinc-500 font-bold uppercase tracking-wider shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span>{wordCount} Words</span>
          <span>{charCount} Characters</span>
        </div>

        <div className="flex items-center gap-1.5">
          {syncState === "synced" ? (
            <>
              <CloudLightning className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-purple-400/80">Cloud secure</span>
            </>
          ) : syncState === "syncing" ? (
            <>
              <div className="h-3 w-3 rounded-full border border-t-transparent border-zinc-400 animate-spin" />
              <span>Saving draft...</span>
            </>
          ) : (
            <>
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              <span>Local draft saved</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
