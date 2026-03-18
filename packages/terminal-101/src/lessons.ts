export interface Task {
  prompt: string;
  /** Returns true if task is complete. Args: (commandOutput, cwd, freeplay) */
  validate: (output: string, cwd: string, freeplay: boolean) => boolean;
}

export interface Lesson {
  title: string;
  intro: string[];
  tasks: Task[];
  philosophy: string;
}

export const lessons: Lesson[] = [
  // Lesson 1: Where Am I?
  {
    title: 'Lesson 1: Where Am I?',
    intro: [
      'Every time you open a terminal, you land somewhere in the filesystem.',
      'The filesystem is a tree of folders and files, starting at the root: /',
      '',
      "Let's find out where you are.",
    ],
    tasks: [
      { prompt: 'Type `pwd` to see where you are.', validate: (out) => out.includes('/home/user') },
      { prompt: "Type `ls` to see what's here.", validate: (out) => out.includes('notes.txt') },
      { prompt: 'Read notes.txt with `cat notes.txt`', validate: (out) => out.includes('Welcome') },
      { prompt: 'Go into projects with `cd projects`', validate: (_out, cwd) => cwd === '/home/user/projects' },
      { prompt: 'Look around with `ls`', validate: (out) => out.includes('README.md') },
      { prompt: 'Go back with `cd ..`', validate: (_out, cwd) => cwd === '/home/user' },
    ],
    philosophy: "The terminal is a conversation. You ask questions (commands), the computer answers (output). `pwd` = where am I? `ls` = what's here? `cd` = go there.",
  },
  // Lesson 2: Making Things
  {
    title: 'Lesson 2: Making Things',
    intro: [
      "Now that you can look around, let's create something.",
      "You'll make a directory, write files, and read them back.",
    ],
    tasks: [
      { prompt: 'Create a journal directory: `mkdir journal`', validate: (_out, _cwd, freeplay) => freeplay },
      { prompt: 'Go into it: `cd journal`', validate: (_out, cwd) => cwd.includes('journal') },
      { prompt: 'Write your first entry: `echo "Day 1: learned the terminal" > day1.txt`', validate: (_out, _cwd, freeplay) => freeplay },
      { prompt: 'Read it back: `cat day1.txt`', validate: (out) => out.includes('Day 1') },
      { prompt: 'Write another: `echo "Day 2: made my own files" > day2.txt`', validate: (_out, _cwd, freeplay) => freeplay },
    ],
    philosophy: "Every command is a verb. `mkdir` = make directory. `echo` = say something. `cat` = show me what's inside. The terminal is just English abbreviations.",
  },
  // Lesson 3: Moving and Copying
  {
    title: 'Lesson 3: Moving and Copying',
    intro: [
      'Files can be copied, renamed, and deleted.',
      'But be careful: there is no trash can in the terminal.',
    ],
    tasks: [
      { prompt: 'Copy day1.txt: `cp day1.txt backup.txt`', validate: (_out, _cwd, freeplay) => freeplay },
      { prompt: 'Rename it: `mv backup.txt day1_backup.txt`', validate: (_out, _cwd, freeplay) => freeplay },
      { prompt: 'Delete day2.txt: `rm day2.txt`', validate: (_out, _cwd, freeplay) => freeplay },
      { prompt: 'Go home: `cd ~`', validate: (_out, cwd) => cwd === '/home/user' },
      { prompt: 'See everything: `tree projects`', validate: (out) => out.includes('src') && out.includes('hello.py') },
    ],
    philosophy: 'There is no trash can. `rm` is permanent. In a real terminal, this is the most important lesson: think before you delete.',
  },
  // Lesson 4: Finding and Filtering
  {
    title: 'Lesson 4: Finding and Filtering',
    intro: [
      'The real power of the terminal is working with text.',
      "Let's look at a server log file and learn to search it.",
    ],
    tasks: [
      { prompt: 'Look at the server log: `cat projects/server.log`', validate: (out) => out.includes('INFO') },
      { prompt: 'See just the first 5 lines: `head -5 projects/server.log`', validate: (out) => out.length > 0 },
      { prompt: 'Find the errors: `grep ERROR projects/server.log`', validate: (out) => out.includes('ERROR') },
      { prompt: 'Count the log: `wc projects/server.log`', validate: (out) => /\d+\s+\d+\s+\d+/.test(out) },
    ],
    philosophy: "You just searched a log file without opening an editor. `grep` is one of the most powerful commands in Unix. It finds patterns in text. System administrators use it thousands of times a day.",
  },
  // Lesson 5: Pipes
  {
    title: 'Lesson 5: Pipes',
    intro: [
      "Here's the secret that makes the terminal powerful:",
      'you can connect commands together with | (the pipe).',
      'The output of one command becomes the input of the next.',
    ],
    tasks: [
      { prompt: 'Filter warnings: `cat projects/server.log | grep WARN`', validate: (out) => out.includes('WARN') },
      { prompt: 'Count the errors: `cat projects/server.log | grep ERROR | wc -l`', validate: (out) => /\d+/.test(out) },
      { prompt: 'Sort your journal: `ls ~/journal | sort`', validate: (out) => out.length > 0 },
      { prompt: "Try combining any commands with `|`. Type `freeplay` when you're done.", validate: () => true },
    ],
    philosophy: 'This is the Unix philosophy: build small tools that do one thing well, then connect them with pipes. Each command is a building block. `|` is the glue.',
  },
];

export const COMPLETION_TEXT = [
  '',
  'Congratulations: you just learned the terminal!',
  '',
  'In 5 lessons you navigated a filesystem, created files, searched',
  'text, and composed tools with pipes. These same commands work on',
  'every Linux server, every Mac, and every cloud machine in the world.',
  '',
  'The virtual filesystem you used is dagshell, a real',
  'Python implementation running in your browser via WebAssembly.',
  '',
  '  github.com/queelius/dagshell    (the full source code)',
  "  Type 'freeplay' to keep exploring, or 'reset' to start over.",
];
