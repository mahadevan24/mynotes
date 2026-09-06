"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Flame, TimerReset } from "lucide-react";

const LINE_LIFETIME_MS = 10_000;
const FADE_DURATION_MS = 500;

type DumpLine = {
  id: string;
  text: string;
  expiresAt: number | null;
};

function makeLine(): DumpLine {
  return {
    id: crypto.randomUUID(),
    text: "",
    expiresAt: null,
  };
}

export function DumpZone() {
  const [lines, setLines] = useState<DumpLine[]>(() => [makeLine()]);
  const [now, setNow] = useState(0);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const focusAfterUpdate = useRef<string | null>(null);

  const focusLine = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const input = inputRefs.current.get(id);
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focusAfterUpdate.current) return;
    focusLine(focusAfterUpdate.current);
    focusAfterUpdate.current = null;
  }, [lines, focusLine]);

  useEffect(() => {
    const expiredIds = new Set(
      lines.filter((line) => line.expiresAt !== null && line.expiresAt <= now).map((line) => line.id),
    );
    if (expiredIds.size === 0) return;

    setLines((current) => {
      const firstExpiredIndex = current.findIndex((line) => expiredIds.has(line.id));
      const remaining = current.filter((line) => !expiredIds.has(line.id));
      if (remaining.length === 0) {
        const blank = makeLine();
        focusAfterUpdate.current = blank.id;
        return [blank];
      }
      const targetIndex = Math.max(0, Math.min(firstExpiredIndex - 1, remaining.length - 1));
      focusAfterUpdate.current = remaining[targetIndex].id;
      return remaining;
    });
  }, [now, lines]);

  const updateLine = (id: string, text: string, eventTime: number) => {
    const expiresAt = text ? eventTime + LINE_LIFETIME_MS : null;
    setLines((current) => current.map((line) => line.id === id ? { ...line, text, expiresAt } : line));
    setNow(eventTime);
  };

  const addLineAfter = (id: string) => {
    const next = makeLine();
    setLines((current) => {
      const index = current.findIndex((line) => line.id === id);
      return [...current.slice(0, index + 1), next, ...current.slice(index + 1)];
    });
    focusAfterUpdate.current = next.id;
  };

  const removeBlankLine = (id: string) => {
    setLines((current) => {
      if (current.length === 1) return current;
      const index = current.findIndex((line) => line.id === id);
      const target = current[Math.max(0, index - 1)];
      focusAfterUpdate.current = target.id;
      return current.filter((line) => line.id !== id);
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl glass-panel">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-7 py-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Flame className="h-4 w-4 text-orange-300" />
            <h1 className="text-sm font-bold tracking-tight text-white">Dump zone</h1>
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-zinc-500">Write it. Release it. Every line disappears 10 seconds after your last edit.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-orange-300/15 bg-orange-300/[0.06] px-3 py-1.5 text-[10px] font-bold text-orange-200/80">
          <TimerReset className="h-3 w-3" />
          <span>10s</span>
        </div>
      </header>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-7 py-8" onClick={() => focusLine(lines.at(-1)!.id)}>
        <div className="mx-auto max-w-3xl space-y-1" onClick={(event) => event.stopPropagation()}>
          {lines.map((line, index) => {
            const remaining = line.expiresAt === null ? LINE_LIFETIME_MS : Math.max(0, line.expiresAt - now);
            const fading = line.expiresAt !== null && remaining <= FADE_DURATION_MS;
            return (
              <div
                key={line.id}
                className={`group grid grid-cols-[2rem_1fr_3rem] items-center overflow-hidden border-b border-white/[0.035] transition-all duration-500 ease-in-out ${fading ? "max-h-0 -translate-y-2 opacity-0" : "max-h-14 opacity-100"}`}
              >
                <span className="select-none text-right font-mono text-[10px] text-zinc-700">{String(index + 1).padStart(2, "0")}</span>
                <input
                  ref={(node) => {
                    if (node) inputRefs.current.set(line.id, node);
                    else inputRefs.current.delete(line.id);
                  }}
                  value={line.text}
                  onChange={(event) => updateLine(line.id, event.target.value, event.timeStamp)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addLineAfter(line.id);
                    } else if (event.key === "Backspace" && line.text === "") {
                      event.preventDefault();
                      removeBlankLine(line.id);
                    } else if (event.key === "ArrowUp" && index > 0) {
                      event.preventDefault();
                      focusLine(lines[index - 1].id);
                    } else if (event.key === "ArrowDown" && index < lines.length - 1) {
                      event.preventDefault();
                      focusLine(lines[index + 1].id);
                    }
                  }}
                  autoFocus={index === 0}
                  aria-label={`Dump zone line ${index + 1}`}
                  placeholder={index === 0 && !line.text ? "Start typing…" : ""}
                  className="h-12 min-w-0 bg-transparent px-4 font-mono text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-700"
                />
                <span className="text-right font-mono text-[9px] tabular-nums text-zinc-700 transition-colors group-focus-within:text-orange-200/60">
                  {line.expiresAt === null ? "—" : `${Math.ceil(remaining / 1000)}s`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
