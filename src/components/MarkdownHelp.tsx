"use client";

import { useId, useRef, useState } from "react";
import { Check, CircleHelp, Copy, Search, X } from "lucide-react";

const examples = [
  { group: "Essentials", title: "Headings", syntax: "# Heading 1\n## Heading 2\n### Heading 3", hint: "Start a line with # and a space. Use up to six levels." },
  { group: "Essentials", title: "Bold, italic & strikethrough", syntax: "**bold** · *italic* · ~~strikethrough~~", hint: "Emphasize an idea or mark something as crossed out." },
  { group: "Essentials", title: "Bulleted list", syntax: "- First idea\n- Another idea\n  - A nested idea", hint: "Indent with two spaces to nest a bullet." },
  { group: "Essentials", title: "Numbered list", syntax: "1. First step\n2. Next step", hint: "Use numbered lists for sequences and instructions." },
  { group: "Essentials", title: "Task list", syntax: "- [ ] To do\n- [x] Done", hint: "Use x inside the brackets to mark a task complete." },
  { group: "Links & media", title: "Note link", syntax: "[[Note title]]", hint: "Type [[ to find a note. Open the link in Preview to navigate." },
  { group: "Links & media", title: "Web link", syntax: "[Link text](https://example.com)", hint: "Put the label in brackets and the URL in parentheses." },
  { group: "Links & media", title: "Image", syntax: "![Image description](https://example.com/image.png)", hint: "Use a direct image URL; the description is alternative text." },
  { group: "More formatting", title: "Quote", syntax: "> A thought worth keeping.", hint: "Start a line with > and a space." },
  { group: "More formatting", title: "Inline code", syntax: "Use `const` for a constant.", hint: "Wrap code or a command in single backticks." },
  { group: "More formatting", title: "Code block", syntax: "```javascript\nconst idea = \"Keep writing\";\n```", hint: "Place triple backticks on lines before and after your code." },
  { group: "More formatting", title: "Table", syntax: "| Idea | Status |\n| --- | --- |\n| My note | Draft |", hint: "Separate columns with pipes; keep the header divider row." },
  { group: "More formatting", title: "Divider", syntax: "\n---\n", hint: "Leave a blank line before three dashes to separate sections." },
  { group: "More formatting", title: "Literal characters", syntax: "\\*This is not italic\\*", hint: "Add a backslash before a Markdown symbol to show it as text." },
];

export function MarkdownHelp() {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const filtered = examples.filter((example) =>
    `${example.title} ${example.group} ${example.hint} ${example.syntax}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function copyExample(title: string, syntax: string) {
    try {
      await navigator.clipboard.writeText(syntax);
      setCopied(title);
      setStatus(`${title} copied. Paste it into your note.`);
    } catch {
      setCopied(null);
      setStatus("Could not copy. Select the syntax and copy it manually.");
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label="Markdown help"
        title="Markdown help"
        className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-purple-500/10 hover:text-purple-300 focus-visible:outline-2 focus-visible:outline-purple-400"
        onClick={() => {
          const panel = panelRef.current;
          const trigger = triggerRef.current;
          if (!panel || !trigger || panel.matches(":popover-open")) return;
          const rect = trigger.getBoundingClientRect();
          panel.style.left = `${Math.max(12, Math.min(rect.right - 400, window.innerWidth - 412))}px`;
          panel.style.top = `${Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 280))}px`;
          setQuery("");
          setCopied(null);
          setStatus("");
        }}
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        onToggle={(event) => {
          if (event.newState === "open") searchRef.current?.focus();
        }}
        className="fixed m-0 w-[400px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/15 bg-[#141217] p-0 text-zinc-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)]"
      >
        <div className="flex max-h-[min(560px,65dvh)] flex-col">
          <div className="shrink-0 border-b border-white/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`${id}-title`} className="text-sm font-semibold text-white">Markdown, at a glance</h2>
                <p className="mt-1 text-xs text-zinc-400">A little syntax. More expressive notes.</p>
              </div>
              <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Close Markdown help" className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-purple-400">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-purple-400/60">
              <Search className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search Markdown syntax" placeholder="Find lists, links, code…" className="min-w-0 flex-1 bg-transparent py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-500" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 custom-scrollbar">
            {filtered.map((example, index) => (
              <div key={example.title}>
                {(index === 0 || filtered[index - 1].group !== example.group) && <h3 className="pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-purple-300">{example.group}</h3>}
                <div className="border-b border-white/5 py-3 last:border-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-zinc-200">{example.title}</h4>
                    <button type="button" aria-label={`Copy ${example.title} syntax`} onClick={() => void copyExample(example.title, example.syntax)} className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-zinc-400 hover:bg-white/10 hover:text-purple-300 focus-visible:outline-2 focus-visible:outline-purple-400">
                      {copied === example.title ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === example.title ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg border border-white/5 bg-black/25 p-2.5 text-[11px] leading-relaxed text-purple-200"><code>{example.syntax}</code></pre>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{example.hint}</p>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-8 text-center text-xs text-zinc-400">No matching syntax. Try “list” or “code”.</p>}
          </div>
          <div className="shrink-0 border-t border-white/10 px-4 py-3 text-[11px] text-zinc-400">
            <p role="status" aria-live="polite">{status || "Copy an example, paste into your note, then select Preview."}</p>
            <p className="mt-1 text-[10px] text-zinc-500">Esc or click outside to dismiss</p>
          </div>
        </div>
      </div>
    </>
  );
}
