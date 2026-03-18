import { Terminal } from './terminal';
import { Bridge } from './bridge';
import { lessons, COMPLETION_TEXT, type Lesson, type Task } from './lessons';

export class LessonEngine {
  private terminal: Terminal;
  private bridge: Bridge;
  private lessonIdx = 0;
  private taskIdx = 0;
  private freeplay = false;

  constructor(terminal: Terminal, bridge: Bridge) {
    this.terminal = terminal;
    this.bridge = bridge;
  }

  async run(): Promise<void> {
    this.startLesson(this.lessonIdx);

    while (true) {
      const input = await this.terminal.getInput();
      const trimmed = input.trim();

      if (!trimmed) continue;

      // Special commands (intercepted BEFORE bridge)
      if (trimmed === 'freeplay') {
        this.freeplay = true;
        this.terminal.writeLine('Freeplay mode. Type `lessons` to resume, `reset` to restart.', 'lesson');
        continue;
      }
      if (trimmed === 'lessons') {
        this.freeplay = false;
        this.printCurrentTask();
        continue;
      }
      if (trimmed === 'reset') {
        await this.bridge.reset();
        this.lessonIdx = 0;
        this.taskIdx = 0;
        this.freeplay = false;
        this.terminal.clear();
        this.startLesson(0);
        continue;
      }

      // Execute command via bridge
      const result = this.bridge.execute(trimmed);
      if (result.text) {
        this.terminal.writeLine(result.text, result.exitCode !== 0 ? 'error' : 'normal');
      }

      // Update prompt with new cwd
      this.terminal.setPrompt(this.makePrompt());

      // Check lesson validation (unless in freeplay)
      if (!this.freeplay && this.lessonIdx < lessons.length) {
        this.checkValidation(result.text);
      }
    }
  }

  private startLesson(idx: number): void {
    const lesson = lessons[idx];
    this.terminal.writeLine('', 'normal');
    this.terminal.writeLine(`-- ${lesson.title} --`, 'success');
    for (const line of lesson.intro) {
      this.terminal.writeLine(line, 'lesson');
    }
    this.terminal.writeLine('', 'normal');
    this.printCurrentTask();
  }

  private printCurrentTask(): void {
    if (this.lessonIdx >= lessons.length) return;
    const task = lessons[this.lessonIdx].tasks[this.taskIdx];
    this.terminal.writeLine(task.prompt, 'lesson');
  }

  private checkValidation(output: string): void {
    const lesson = lessons[this.lessonIdx];
    const task = lesson.tasks[this.taskIdx];
    const cwd = this.bridge.getCwd();

    // Try text/cwd-based validation first
    let valid = task.validate(output, cwd, false);
    if (!valid) {
      // For tasks that create/move/delete files, check filesystem state
      valid = this.checkFsValidation(this.lessonIdx, this.taskIdx);
    }

    if (valid) {
      this.taskIdx++;
      if (this.taskIdx >= lesson.tasks.length) {
        // Lesson complete
        this.terminal.writeLine('', 'normal');
        this.terminal.writeLine(`  ${lesson.philosophy}`, 'philosophy');
        this.terminal.writeLine('', 'normal');
        this.lessonIdx++;
        this.taskIdx = 0;
        if (this.lessonIdx < lessons.length) {
          this.startLesson(this.lessonIdx);
        } else {
          this.showCompletion();
        }
      } else {
        this.terminal.writeLine('', 'normal');
        this.printCurrentTask();
      }
    }
  }

  private checkFsValidation(lessonIdx: number, taskIdx: number): boolean {
    // Lesson 2 and 3 tasks that need filesystem state checks
    const checks: Record<string, () => boolean> = {
      '1-0': () => this.bridge.fsExists('/home/user/journal'),
      '1-2': () => this.bridge.fsExists('/home/user/journal/day1.txt'),
      '1-4': () => this.bridge.fsExists('/home/user/journal/day2.txt'),
      '2-0': () => this.bridge.fsExists(this.bridge.getCwd() + '/backup.txt'),
      '2-1': () => this.bridge.fsExists(this.bridge.getCwd() + '/day1_backup.txt') && !this.bridge.fsExists(this.bridge.getCwd() + '/backup.txt'),
      '2-2': () => !this.bridge.fsExists(this.bridge.getCwd() + '/day2.txt'),
    };
    const key = `${lessonIdx}-${taskIdx}`;
    return checks[key]?.() ?? false;
  }

  private showCompletion(): void {
    for (const line of COMPLETION_TEXT) {
      this.terminal.writeLine(line, 'success');
    }
    this.freeplay = true;
  }

  private makePrompt(): string {
    const cwd = this.bridge.getCwd();
    const display = cwd.replace('/home/user', '~') || '~';
    return `user@dagshell:${display}$ `;
  }
}
