import React from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkPreserveLines } from "@/lib/remark-preserve-lines";

afterEach(cleanup);

function preview(content: string) {
  return render(<ReactMarkdown remarkPlugins={[remarkGfm, remarkPreserveLines]}>{content}</ReactMarkdown>).container;
}

it("preserves single enters and Markdown emphasis", () => {
  const root = preview("**Question**\nAnswer\nMore");
  expect(root.querySelector("strong")?.textContent).toBe("Question");
  expect(root.querySelectorAll("br")).toHaveLength(2);
});

it.each([2, 3, 5])("preserves %i enters between paragraphs", (enters) => {
  const root = preview(`First${"\n".repeat(enters)}Second`);
  expect(root.querySelectorAll("p")).toHaveLength(2);
  expect(root.querySelector('[aria-hidden="true"]')?.getAttribute("style")).toBe(`height: ${enters - 1}lh;`);
});

it("preserves leading and trailing empty lines", () => {
  const root = preview("\n\nText\n\n");
  expect([...root.querySelectorAll('[aria-hidden="true"]')].map(node => node.getAttribute("style"))).toEqual(["height: 2lh;", "height: 2lh;"]);
});

it("keeps code, lists, links and explicit Markdown breaks working", () => {
  const root = preview("A  \nB\n\n- [x] Task\n- [Link](https://example.com)\n\n```txt\nOne\n\nTwo\n```");
  expect(root.querySelectorAll("br")).toHaveLength(1);
  expect(root.querySelectorAll("li")).toHaveLength(2);
  expect(root.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
  expect(root.querySelector("pre")?.textContent).toBe("One\n\nTwo\n");
});
