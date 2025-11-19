In Claude Code, there is a hook system that allows you to run custom scripts before and after certain actions.

It's defined in the `./claude/settings.json` file.

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ]
      }
    ]
  }
}
```

Now, you need to do below things:


## Initialize the hook that trigger 

Upsert the hook to the `./claude/settings.json` file

```json
{
  "hooks": {
    "Notification": [
      {
        // if this `hooks` key is existed, append the new hook to the end of the array, if not, create it.
        "hooks": [
          {
            "__ccmate__": true,
            "type": "command",
            "command": "curl -X POST http://localhost:59948/claude_code/hooks -H 'Content-Type: application/json' --data-binary @-"
          }
        ]
      },
      
    ],
   "Stop": [
      {
        // if this `Stop[].hooks` key is existed, append the new hook to the end of the array. If not, create it.
        "hooks": [
          {
            "__ccmate__": true,
            "type": "command",
            "command": "curl -X POST http://localhost:59948/claude_code/hooks -H 'Content-Type: application/json' --data-binary @-"
          }
        ]
      },
    ],

    "PreToolUse": [
      {
        // if this `Stop[].hooks` key is existed, append the new hook to the end of the array. If not, create it.
        "hooks": [
          {
            "__ccmate__": true,
            "type": "command",
            "command": "curl -X POST http://localhost:59948/claude_code/hooks -H 'Content-Type: application/json' --data-binary @-"
          }
        ]
      },
    ],
  }
}
```

You need to implement two functions: 

1. add_claude_code_hook
2. remove_claude_code_hook

remove_claude_code_hook should remove the hook from the `./claude/settings.json` file, based on checking the `__ccmate__` key

## Implement a simple rust server that can be used to receive the hook

1. the server should listen to `localhost:59948`

2. add a route to POST `/claude_code/hooks`

it receive a json object like this:

```json
{
  // Common fields
  session_id: string
  transcript_path: string  // Path to conversation JSON
  cwd: string              // The current working directory when the hook is invoked

  // Event-specific fields
  hook_event_name: string
  ...
}
```

3. on the route, match the hook_event_name

for now every hook_event_name just print the json object to the console