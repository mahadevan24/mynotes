import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DumpZone } from "@/components/DumpZone";
import { NotesProvider } from "@/context/NotesContext";

vi.mock("@/lib/firebase", () => ({ auth: null, db: null }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("keeps the cursor on the same line when an earlier line expires", async () => {
  vi.useFakeTimers();
  render(<NotesProvider><DumpZone /></NotesProvider>);

  const first = screen.getByRole("textbox", { name: "Dump zone line 1" });
  fireEvent.change(first, { target: { value: "First" } });
  fireEvent.keyDown(first, { key: "Enter" });
  act(() => vi.advanceTimersByTime(1_000));

  const second = screen.getByRole("textbox", { name: "Dump zone line 2" });
  fireEvent.change(second, { target: { value: "Second" } });
  fireEvent.keyDown(second, { key: "Enter" });
  act(() => vi.advanceTimersByTime(1));

  const third = screen.getByRole("textbox", { name: "Dump zone line 3" });
  third.focus();
  expect(document.activeElement).toBe(third);

  act(() => vi.advanceTimersByTime(9_000));

  expect(screen.getAllByRole("textbox")).toHaveLength(2);
  expect((screen.getByRole("textbox", { name: "Dump zone line 1" }) as HTMLInputElement).value).toBe("Second");
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Dump zone line 2" }));
});

it("shows the standard close and Zen controls", () => {
  render(<NotesProvider><DumpZone /></NotesProvider>);

  expect(screen.getByTitle("Close Dump Zone")).toBeTruthy();
  expect(screen.getByTitle("Zen Focus Mode")).toBeTruthy();
});
