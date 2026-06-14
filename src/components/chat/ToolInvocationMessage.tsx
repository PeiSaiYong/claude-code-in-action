"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationMessageProps {
  toolInvocation: ToolInvocation;
}

function fileName(path?: string): string {
  if (!path) return "file";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function getToolMessage(
  toolName: string,
  args: Record<string, unknown> | undefined,
  isComplete: boolean
): string {
  const command = typeof args?.command === "string" ? args.command : undefined;
  const path = typeof args?.path === "string" ? args.path : undefined;
  const newPath = typeof args?.new_path === "string" ? args.new_path : undefined;
  const name = fileName(path);

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return isComplete ? `Created ${name}` : `Creating ${name}`;
      case "str_replace":
      case "insert":
        return isComplete ? `Edited ${name}` : `Editing ${name}`;
      case "view":
        return isComplete ? `Viewed ${name}` : `Viewing ${name}`;
      case "undo_edit":
        return isComplete
          ? `Reverted changes to ${name}`
          : `Reverting changes to ${name}`;
      default:
        return isComplete ? `Updated ${name}` : `Updating ${name}`;
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return isComplete
          ? `Renamed ${name} to ${fileName(newPath)}`
          : `Renaming ${name} to ${fileName(newPath)}`;
      case "delete":
        return isComplete ? `Deleted ${name}` : `Deleting ${name}`;
      default:
        return isComplete ? `Updated ${name}` : `Updating ${name}`;
    }
  }

  return isComplete ? `${toolName} complete` : `Running ${toolName}`;
}

export function ToolInvocationMessage({
  toolInvocation,
}: ToolInvocationMessageProps) {
  const isComplete = toolInvocation.state === "result";
  const message = getToolMessage(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, unknown> | undefined,
    isComplete
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
