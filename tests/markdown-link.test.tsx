import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { MarkdownLink } from "@/components/MarkdownLink";

afterEach(cleanup);

it("opens web links in a new tab", () => {
  render(
    <MarkdownLink href="https://example.com/article" onOpenNote={vi.fn()}>
      Article
    </MarkdownLink>,
  );

  const link = screen.getByRole("link", { name: "Article" });
  expect(link.getAttribute("href")).toBe("https://example.com/article");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
});

it("keeps wiki links inside the notes app", () => {
  const onOpenNote = vi.fn();
  render(
    <MarkdownLink href="#note-Project%20Orion" onOpenNote={onOpenNote}>
      Project Orion
    </MarkdownLink>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Project Orion" }));
  expect(onOpenNote).toHaveBeenCalledWith("Project Orion");
});
