export type LineStyle = 'normal' | 'lesson' | 'error' | 'philosophy' | 'success' | 'prompt';

export class Terminal {
  private container: HTMLElement;
  private output: HTMLElement;
  private inputLine: HTMLElement;
  private promptSpan: HTMLSpanElement;
  private inputSpan: HTMLSpanElement;
  private cursorSpan: HTMLSpanElement;

  private inputBuffer: string = '';
  private history: string[] = [];
  private historyIndex: number = -1;
  private savedInput: string = '';
  private promptText: string = '$ ';
  private enabled: boolean = false;

  private resolveInput: ((value: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.classList.add('terminal-101');
    this.container.setAttribute('tabindex', '0');

    // Output area
    this.output = document.createElement('div');
    this.output.className = 'term-output';
    this.container.appendChild(this.output);

    // Input line
    this.inputLine = document.createElement('div');
    this.inputLine.className = 'term-input-line disabled';

    this.promptSpan = document.createElement('span');
    this.promptSpan.className = 'term-prompt-text';
    this.promptSpan.textContent = this.promptText;

    this.inputSpan = document.createElement('span');
    this.inputSpan.className = 'term-input';

    this.cursorSpan = document.createElement('span');
    this.cursorSpan.className = 'term-cursor';

    this.inputLine.appendChild(this.promptSpan);
    this.inputLine.appendChild(this.inputSpan);
    this.inputLine.appendChild(this.cursorSpan);
    this.container.appendChild(this.inputLine);

    // Event listeners
    this.container.addEventListener('click', () => this.container.focus());
    this.container.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  writeLine(text: string, style: LineStyle = 'normal'): void {
    const line = document.createElement('div');
    line.className = `term-line term-${style}`;
    line.textContent = text;
    this.output.appendChild(line);
    this.scrollToBottom();
  }

  writeLines(lines: Array<{ text: string; style: LineStyle }>): void {
    for (const { text, style } of lines) {
      this.writeLine(text, style);
    }
  }

  clear(): void {
    while (this.output.firstChild) {
      this.output.removeChild(this.output.firstChild);
    }
  }

  setPrompt(prompt: string): void {
    this.promptText = prompt;
    this.promptSpan.textContent = prompt;
  }

  enable(): void {
    this.enabled = true;
    this.inputLine.classList.remove('disabled');
    this.container.focus();
  }

  disable(): void {
    this.enabled = false;
    this.inputLine.classList.add('disabled');
  }

  getInput(): Promise<string> {
    return new Promise<string>((resolve) => {
      this.resolveInput = resolve;
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.enabled || !this.resolveInput) return;

    if (e.key === 'Enter') {
      const value = this.inputBuffer;
      // Echo the prompt + input as a prompt-styled line
      this.writeLine(this.promptText + value, 'prompt');
      // Add non-empty entries to history
      if (value.trim()) {
        this.history.push(value);
      }
      // Reset input state
      this.inputBuffer = '';
      this.inputSpan.textContent = '';
      this.historyIndex = -1;
      this.savedInput = '';
      // Resolve the promise
      const resolver = this.resolveInput;
      this.resolveInput = null;
      resolver(value);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this.inputSpan.textContent = this.inputBuffer;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.history.length === 0) return;
      if (this.historyIndex === -1) {
        // Save current input before navigating
        this.savedInput = this.inputBuffer;
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex -= 1;
      }
      this.inputBuffer = this.history[this.historyIndex];
      this.inputSpan.textContent = this.inputBuffer;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex === -1) return;
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex += 1;
        this.inputBuffer = this.history[this.historyIndex];
      } else {
        // Past the end: restore saved input
        this.historyIndex = -1;
        this.inputBuffer = this.savedInput;
      }
      this.inputSpan.textContent = this.inputBuffer;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // No action
    } else if (e.key.length === 1) {
      this.inputBuffer += e.key;
      this.inputSpan.textContent = this.inputBuffer;
    }
    // All other keys: ignore
  }

  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }
}
