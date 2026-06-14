import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ToolInvocationMessage,
  getToolMessage,
} from "../ToolInvocationMessage";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getToolMessage: str_replace_editor ---

test("getToolMessage describes a file being created", () => {
  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "create", path: "/components/Card.jsx" },
      false
    )
  ).toBe("Creating Card.jsx");

  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "create", path: "/components/Card.jsx" },
      true
    )
  ).toBe("Created Card.jsx");
});

test("getToolMessage describes a file being edited via str_replace", () => {
  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "str_replace", path: "/App.jsx" },
      false
    )
  ).toBe("Editing App.jsx");

  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "str_replace", path: "/App.jsx" },
      true
    )
  ).toBe("Edited App.jsx");
});

test("getToolMessage describes an insert as an edit", () => {
  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "insert", path: "/App.jsx" },
      true
    )
  ).toBe("Edited App.jsx");
});

test("getToolMessage describes viewing a file", () => {
  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "view", path: "/App.jsx" },
      false
    )
  ).toBe("Viewing App.jsx");
});

test("getToolMessage describes reverting changes", () => {
  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "undo_edit", path: "/App.jsx" },
      true
    )
  ).toBe("Reverted changes to App.jsx");
});

test("getToolMessage uses only the file name, not the full path", () => {
  expect(
    getToolMessage(
      "str_replace_editor",
      { command: "create", path: "/a/deeply/nested/Button.tsx" },
      true
    )
  ).toBe("Created Button.tsx");
});

test("getToolMessage falls back gracefully when path is missing", () => {
  expect(
    getToolMessage("str_replace_editor", { command: "create" }, false)
  ).toBe("Creating file");
});

// --- getToolMessage: file_manager ---

test("getToolMessage describes renaming a file", () => {
  expect(
    getToolMessage(
      "file_manager",
      { command: "rename", path: "/Old.jsx", new_path: "/New.jsx" },
      false
    )
  ).toBe("Renaming Old.jsx to New.jsx");

  expect(
    getToolMessage(
      "file_manager",
      { command: "rename", path: "/Old.jsx", new_path: "/New.jsx" },
      true
    )
  ).toBe("Renamed Old.jsx to New.jsx");
});

test("getToolMessage describes deleting a file", () => {
  expect(
    getToolMessage("file_manager", { command: "delete", path: "/Old.jsx" }, true)
  ).toBe("Deleted Old.jsx");
});

// --- getToolMessage: unknown tool ---

test("getToolMessage falls back for unknown tools", () => {
  expect(getToolMessage("mystery_tool", {}, false)).toBe(
    "Running mystery_tool"
  );
  expect(getToolMessage("mystery_tool", {}, true)).toBe(
    "mystery_tool complete"
  );
});

test("getToolMessage handles undefined args", () => {
  expect(getToolMessage("str_replace_editor", undefined, true)).toBe(
    "Updated file"
  );
});

// --- ToolInvocationMessage component ---

test("ToolInvocationMessage renders a friendly completed message", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/components/Card.jsx" },
    state: "result",
    result: "Success",
  };

  render(<ToolInvocationMessage toolInvocation={toolInvocation} />);

  expect(screen.getByText("Created Card.jsx")).toBeDefined();
});

test("ToolInvocationMessage shows a spinner while in progress", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
    state: "call",
  };

  const { container } = render(
    <ToolInvocationMessage toolInvocation={toolInvocation} />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});

test("ToolInvocationMessage shows a status dot when complete", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "Success",
  };

  const { container } = render(
    <ToolInvocationMessage toolInvocation={toolInvocation} />
  );

  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
