import { Terminal } from './terminal';

export function init(): void {
  const root = document.getElementById('terminal-101');
  if (!root) return;

  const terminal = new Terminal(root);
  terminal.writeLine('Booting virtual filesystem...', 'lesson');
  terminal.enable();

  // Temporary: echo input back (will be replaced by bridge in Task 3)
  (async () => {
    while (true) {
      const input = await terminal.getInput();
      terminal.writeLine(`echo: ${input}`, 'normal');
    }
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
