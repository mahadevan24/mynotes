import React, { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RightPanel } from "@/components/RightPanel";

const mocks = vi.hoisted(() => ({ open: vi.fn(), create: vi.fn() }));
vi.mock("@/context/NotesContext", () => ({
  useNotes: () => {
    const [selectedDate, setSelectedDate] = useState("2026-09-05");
    return {
      selectedDate, setSelectedDate, activeNote: null, backlinks: [],
      setActiveNote: mocks.open, createNote: mocks.create,
      setRightSidebarCollapsed: vi.fn(),
      notes: [
        { id: "1", title: "First note", content: "Preview", created_at: new Date(2026, 8, 3, 0, 15).toISOString() },
        { id: "2", title: "Second note", content: "", created_at: new Date(2026, 8, 3, 18).toISOString() },
        { id: "3", title: "Other date", content: "", created_at: new Date(2026, 8, 4, 12).toISOString() },
      ],
    };
  },
}));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
it("lists notes by local creation date and opens only the chosen note", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 5, 12));
  render(<RightPanel />);
  fireEvent.click(screen.getByRole("button", { name: "September 3, 2026" }));
  const list = within(screen.getByRole("region", { name: "Notes added on selected date" }));
  expect(list.getAllByRole("button").map(button => button.textContent)).toEqual(["Second noteEmpty note", "First notePreview"]);
  expect(list.queryByText("Other date")).toBeNull();
  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  fireEvent.click(list.getByRole("button", { name: /First note/ }));
  expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
  fireEvent.click(screen.getByRole("button", { name: "September 2, 2026" }));
  expect(list.getByText("No notes added on this date.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  fireEvent.click(screen.getByRole("button", { name: "August 3, 2026" }));
  expect(list.getByText("August 3, 2026")).toBeTruthy();
});
