when hook receive, use tauri notification to show a notification, use exa, use context7:

title: <hook_event_name>
description: see below


## hook_event_name === "Stop"

description: "Completed"

## hook_event_name === "PreToolUse"

input example:
```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  }
}
```

description: <input.tool_name> is going to be used

## hook_event_name === "Notification"

example input:

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "Notification",
  "message": "Task completed successfully"
}
```

description: <input.message>