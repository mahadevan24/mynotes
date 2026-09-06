import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarkdownLinkProps = {
  href?: string;
  children: ReactNode;
  onOpenNote: (title: string) => void;
};

const linkClassName = "font-bold transition-colors underline underline-offset-4 cursor-pointer text-zinc-300 hover:text-white";

export function MarkdownLink({ href, children, onOpenNote }: MarkdownLinkProps) {
  const isNoteLink = href?.startsWith("#note-");

  if (isNoteLink && href) {
    return (
      <button
        type="button"
        onClick={() => onOpenNote(decodeURIComponent(href.slice("#note-".length)))}
        className={cn(linkClassName, "select-none")}
      >
        {children}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
      {children}
    </a>
  );
}
