# Terminal 101: Interactive Linux Terminal Tutorial

**Date:** 2026-03-18
**Status:** Approved
**Package:** `packages/terminal-101`
**Deploy slug:** `2026-03-18-terminal-101`

## Overview

An interactive browser-based Linux terminal tutorial embedded in a metafunctor.com blog post. Users type real shell commands into a virtual POSIX filesystem powered by dagshell (Python) running via Pyodide (WebAssembly). Five guided lessons teach filesystem navigation, file manipulation, text processing, and pipe composition in ~10-15 minutes.

## Decisions

- **Layout:** Terminal only. No sidebar, no split pane. Lessons and output render inline in the terminal.
- **Audience:** Complete beginners who have never opened a terminal.
- **Structure:** Guided sequential lessons with validation. Users can type `freeplay` to drop into open sandbox.
- **Duration:** 10-15 minutes, 5 lessons of 2-3 minutes each.
- **Engine:** Pyodide running the real dagshell Python package. No TypeScript rewrite of filesystem logic.
- **Integration point:** `CommandParser` + `CommandExecutor` + `DagShell` directly, bypassing `TerminalSession` (avoids readline, atexit, getpass dependencies).
- **Mobile:** Out of scope for v1. Desktop browsers only.

## Package Structure

```
packages/terminal-101/
  src/
    index.ts          # Entry point, Pyodide loader
    terminal.ts       # Terminal UI (input, output, scrolling, prompt)
    lessons.ts        # Lesson definitions, validation, progression
    bridge.ts         # JS <-> Pyodide bridge
    styles.css        # Terminal styling
  post/
    index.md          # Hugo blog post with <!-- inject:style --> and <!-- inject:script -->
  python/
    bridge.py         # Python-side API (loaded into Pyodide)
    seed.py           # Filesystem seed script (creates tutorial files)
  tests/
    lessons.test.ts   # Lesson validation logic tests
  package.json        # name: @explorables/terminal-101, deploy.slug
```

## Data Flow

```
User keystroke
  -> terminal.ts captures input, handles line editing
  -> On Enter: check for special commands (freeplay, lessons, reset) in lessons.ts
  -> If not special: bridge.ts calls pyodide.globals.get('execute')(cmd)
  -> Python: parser.parse(cmd) -> executor.execute(parsed) -> {text, exit_code}
  -> bridge.ts returns result object to terminal.ts
  -> terminal.ts renders output lines
  -> lessons.ts checks validation condition
  -> If lesson task complete: print next task prompt
  -> If all tasks in lesson done: print lesson summary + philosophy, start next lesson
```

## Python Bridge

### bridge.py (loaded into Pyodide at startup)

```python
from dagshell.dagshell_fluent import DagShell
from dagshell.command_parser import CommandParser
from dagshell.terminal import CommandExecutor

shell = DagShell()
executor = CommandExecutor(shell)
parser = CommandParser()

def execute(cmd):
    try:
        parsed = parser.parse(cmd)
        result = executor.execute(parsed)
        return {'text': result.text or '', 'exit_code': result.exit_code}
    except Exception as e:
        return {'text': f"Error: {e}", 'exit_code': 1}

def get_cwd():
    return shell._cwd

def fs_exists(path):
    return shell.fs.exists(path)

def read_file(path):
    try:
        return shell.fs.read(path).decode('utf-8', errors='replace')
    except Exception:
        return None
```

### seed.py (creates tutorial filesystem)

```python
# Set starting directory
shell.cd('/home/user')

# Pre-seed files
shell.echo('Welcome to the terminal!').out('/home/user/notes.txt')
shell.mkdir('/home/user/projects')
shell.mkdir('/home/user/projects/src')
shell.echo('My first project').out('/home/user/projects/README.md')
shell.echo("print('hello world')").out('/home/user/projects/src/hello.py')

# Server log for Lessons 4 and 5
log_lines = """2026-03-01 08:12:04 INFO  Server started on port 8080
2026-03-01 08:12:05 INFO  Database connection established
2026-03-01 08:15:22 INFO  User alice logged in
2026-03-01 08:17:41 WARN  Slow query detected (2.3s)
2026-03-01 08:22:10 INFO  Processing batch job #1042
2026-03-01 08:23:55 ERROR Connection refused to cache server
2026-03-01 08:24:01 WARN  Falling back to direct database queries
2026-03-01 08:30:12 INFO  User bob logged in
2026-03-01 08:31:44 INFO  Batch job #1042 completed
2026-03-01 08:45:03 WARN  Memory usage at 85%
2026-03-01 08:52:18 ERROR Disk write failed: /var/log/app.log
2026-03-01 09:01:30 INFO  Scheduled backup started
2026-03-01 09:05:44 INFO  Backup completed successfully
2026-03-01 09:12:07 ERROR Timeout waiting for API response (gateway)
2026-03-01 09:15:00 INFO  Health check passed""".strip()

shell.echo(log_lines).out('/home/user/projects/server.log')

# Reset cwd to home
shell.cd('/home/user')
```

## Loading dagshell into Pyodide

The dagshell package is 5 Python files (~250KB total). The scheme_interpreter.py (40KB) is not needed.

**Strategy:** Inline the Python source files as JavaScript string constants in bridge.ts. At startup, write them into Pyodide's in-memory filesystem, then import.

```typescript
// bridge.ts pseudocode
const DAGSHELL_FILES = {
  'dagshell/__init__.py': `...`,      // Stubbed: only import dagshell, dagshell_fluent, command_parser, terminal
  'dagshell/dagshell.py': `...`,       // ~40KB
  'dagshell/dagshell_fluent.py': `...`, // ~84KB
  'dagshell/command_parser.py': `...`,  // ~16KB
  'dagshell/terminal.py': `...`,        // ~68KB
};

// Write to Pyodide's virtual FS
pyodide.FS.mkdir('/lib/python/dagshell');
for (const [path, content] of Object.entries(DAGSHELL_FILES)) {
  pyodide.FS.writeFile(`/lib/python/${path}`, content);
}
// Add to sys.path
pyodide.runPython("import sys; sys.path.insert(0, '/lib/python')");
```

A **stubbed `__init__.py`** is used to avoid importing `scheme_interpreter.py`:

```python
# Stubbed __init__.py for Pyodide
from .dagshell import FileSystem, FileNode, DirNode, DeviceNode, Mode, FileHandle, Node
from .dagshell_fluent import DagShell, CommandResult
from .command_parser import Command, CommandParser, Pipeline, CommandGroup, Redirect, RedirectType
from .terminal import CommandExecutor
```

The Python source is embedded at build time. The build script reads the `.py` files from the dagshell repo and inlines them as template literals. A build-time script or esbuild plugin handles this.

## Pyodide Loading Strategy

1. Page loads -> render terminal frame with blinking cursor and "Booting virtual filesystem..." text
2. Dynamically inject `<script src="https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js">` and wait for load
3. Call `loadPyodide()` with progress callback updating the loading message
4. Write dagshell Python files into Pyodide's in-memory filesystem
5. Run bridge.py to create shell + executor + parser
6. Run seed.py to create the tutorial filesystem
7. Clear terminal, print Lesson 1 intro
8. Enable input

**Timing:** ~3-5s first load (Pyodide ~7MB gzipped, cached after). Instant on revisit.

**Error handling:** If Pyodide fetch fails after 15 seconds, show: "Couldn't load the terminal engine. Check your connection and refresh to try again." No automatic retry (user can refresh).

## TypeScript Components

### terminal.ts (~200 lines)
- Renders a `<div>` styled as a terminal (dark background, monospace font)
- Handles keyboard input: printable chars, backspace, Enter, Up/Down for history
- Maintains output buffer (array of styled line objects), renders with auto-scroll
- Line styles: `normal` (white), `lesson` (cyan), `error` (red), `philosophy` (yellow italic), `success` (green)
- Command history (up/down arrows) stored in JS array
- Prompt displays `user@dagshell:CWD$ ` fetched from bridge
- Exposes `writeLine(text, style)`, `getInput(): Promise<string>`, `clear()`

### bridge.ts (~100 lines)
- Dynamically loads Pyodide from CDN
- Writes dagshell Python files into Pyodide's virtual FS
- Runs bridge.py and seed.py
- Exposes typed API: `execute(cmd): Promise<{text: string, exitCode: number}>`, `getCwd(): string`, `fsExists(path): boolean`, `readFile(path): string | null`
- Handles Pyodide JsProxy → JS type conversions
- Loading state management (loading, ready, error)

### lessons.ts (~300 lines)
- Defines 5 lessons, each with:
  - `intro`: array of styled lines printed when lesson starts
  - `tasks`: array of `{ prompt: string, validate: (output: string, bridge: Bridge) => boolean }`
  - `philosophy`: callout text printed after all tasks complete
- Lesson engine: tracks `currentLesson`, `currentTask`
- After each command execution, calls current task's `validate(output, bridge)`
- If validate returns true: print completion message, advance to next task
- Special commands intercepted BEFORE bridge: `freeplay` exits lesson mode, `lessons` re-enters at current position, `reset` re-runs seed.py and restarts at Lesson 1
- Completion screen after Lesson 5

### index.ts (~15 lines)
- Standard explorable entry: `DOMContentLoaded` -> `init()`
- `init()` creates terminal, starts bridge load, wires up command handler, starts lesson 1

## Course Curriculum

### Pre-seeded Filesystem

See seed.py above for exact contents. The filesystem after seeding:

```
/home/user/              (cwd)
  notes.txt              "Welcome to the terminal!"
  projects/
    README.md            "My first project"
    src/
      hello.py           "print('hello world')"
    server.log           15 lines (3 ERROR, 3 WARN, 9 INFO)
```

Plus standard DagShell directories: `/etc`, `/tmp`, `/dev`.

### Lesson 1: Where Am I? (orientation)

Commands taught: `pwd`, `ls`, `cd`, `cat`

Tasks:
1. "Type `pwd` to see where you are." -> validate: output contains '/home/user'
2. "Type `ls` to see what's here." -> validate: output contains 'notes.txt'
3. "Read notes.txt with `cat notes.txt`" -> validate: output contains 'Welcome'
4. "Go into projects with `cd projects`" -> validate: cwd == '/home/user/projects'
5. "Look around with `ls`" -> validate: output contains 'README.md'
6. "Go back with `cd ..`" -> validate: cwd == '/home/user'

Philosophy: "The terminal is a conversation. You ask questions (commands), the computer answers (output). `pwd` = where am I? `ls` = what's here? `cd` = go there."

### Lesson 2: Making Things

Commands taught: `mkdir`, `echo > file`, `cat`

Tasks:
1. "Create a journal directory: `mkdir journal`" -> validate: fsExists('/home/user/journal')
2. "Go into it: `cd journal`" -> validate: cwd contains 'journal'
3. "Write your first entry: `echo \"Day 1: learned the terminal\" > day1.txt`" -> validate: fsExists('/home/user/journal/day1.txt')
4. "Read it back: `cat day1.txt`" -> validate: output contains 'Day 1'
5. "Write another: `echo \"Day 2: made my own files\" > day2.txt`" -> validate: fsExists('/home/user/journal/day2.txt')

Philosophy: "Every command is a verb. `mkdir` = make directory. `echo` = say something. `cat` = show me what's inside. The terminal is just English abbreviations."

### Lesson 3: Moving and Copying

Commands taught: `cp`, `mv`, `rm`, `tree`

Tasks:
1. "Copy day1.txt: `cp day1.txt backup.txt`" -> validate: fsExists('backup.txt' in cwd)
2. "Rename it: `mv backup.txt day1_backup.txt`" -> validate: fsExists('day1_backup.txt') AND NOT fsExists('backup.txt')
3. "Delete day2.txt: `rm day2.txt`" -> validate: NOT fsExists('day2.txt')
4. "Go home: `cd ~`" -> validate: cwd == '/home/user'
5. "See everything: `tree projects`" -> validate: output contains 'src' AND output contains 'hello.py'

Philosophy: "There is no trash can. `rm` is permanent. In a real terminal, this is the most important lesson: think before you delete."

### Lesson 4: Finding and Filtering

Commands taught: `head`, `grep`, `wc`

Tasks:
1. "Look at the server log: `cat projects/server.log`" -> validate: output contains 'INFO'
2. "See just the first 5 lines: `head -5 projects/server.log`" -> validate: output length > 0
3. "Find the errors: `grep ERROR projects/server.log`" -> validate: output contains 'ERROR'
4. "Count the log: `wc projects/server.log`" -> validate: output matches /\d+\s+\d+\s+\d+/

Philosophy: "You just searched a log file without opening an editor. `grep` is one of the most powerful commands in Unix -- it finds patterns in text. System administrators use it thousands of times a day."

### Lesson 5: Pipes -- The Big Idea

Commands taught: `|` (pipe operator)

Tasks:
1. "Filter warnings: `cat projects/server.log | grep WARN`" -> validate: output contains 'WARN'
2. "Count the errors: `cat projects/server.log | grep ERROR | wc -l`" -> validate: output matches /\d+/
3. "Sort your journal: `ls ~/journal | sort`" -> validate: output length > 0
4. Free prompt: "Try combining any commands with `|`. Type `freeplay` when you're done exploring." -> validate: always true (user types freeplay to advance)

Philosophy: "This is the Unix philosophy: build small tools that do one thing well, then connect them with pipes. Each command is a building block. `|` is the glue."

### Completion

```
Congratulations -- you just learned the terminal!

In 5 lessons you navigated a filesystem, created files, searched
text, and composed tools with pipes. These same commands work on
every Linux server, every Mac, and every cloud machine in the world.

The virtual filesystem you've been using is dagshell -- a real
Python implementation running in your browser via WebAssembly.

  github.com/queelius/dagshell    -- the full source code
  Type 'freeplay' to keep exploring, or 'reset' to start over.
```

## Styling

- Background: #1a1a2e (dark navy)
- Font: system monospace stack (`'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace`)
- Prompt: #50fa7b (green) for `user@dagshell:`, #f8f8f2 (white) for the `$`
- Normal output: #e0e0e0 (light gray)
- Lesson text: #66d9ef (cyan), preceded by a blank line
- Philosophy callouts: #e6db74 (gold), italic, indented 2 spaces, preceded by blank line
- Error text: #f92672 (red)
- Success/completion: #a6e22e (green)
- Terminal container: rounded corners, subtle box-shadow, min-height 70vh

## Blog Post Structure (post/index.md)

```markdown
---
title: "Terminal 101: Learn Linux in Your Browser"
date: 2026-03-18
draft: false
description: "Type real commands into a virtual filesystem. Five lessons from 'where am I?' to piping tools together."
tags: [linux, terminal, interactive, tutorial]
categories: [computer-science]
---

You've seen developers type cryptic commands into black screens. It looks like magic -- or maybe like an artifact from the 1970s that refuses to die. But the terminal is neither. It's a conversation with your computer, and it takes about 10 minutes to learn the basics.

Below is a real terminal. It runs a virtual filesystem in your browser -- no installation, nothing to break. Type the commands it suggests, and by the end you'll understand what all those black screens are about.

<script src="https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js"></script>

<div id="terminal-101"></div>

<!-- inject:style -->
<!-- inject:script -->

*The terminal above runs [dagshell](https://github.com/queelius/dagshell), a Python implementation of a POSIX filesystem, compiled to WebAssembly via [Pyodide](https://pyodide.org).*
```

## What's NOT in Scope

- Tab completion (async round-trip per keystroke)
- Multiple users / permissions exercises
- Scheme interpreter
- Real filesystem access (save/load/import/export)
- Network commands
- Process management (ps, kill, bg, fg)
- Mobile / touch input (v1 is desktop only)

## Testing Strategy

- `lessons.test.ts`: Test validation functions with mocked bridge responses
- dagshell Python tests: 877 tests / 88% coverage (browser readiness verified)
- Manual testing: Walk through all 5 lessons in Chrome, Firefox, Safari
- Pyodide integration: Test that bridge.py loads and execute returns correct results
