import { Terminal } from './terminal';
import { Bridge } from './bridge';

export function init(): void {
  const root = document.getElementById('terminal-101');
  if (!root) return;

  const terminal = new Terminal(root);
  terminal.writeLine('Booting virtual filesystem...', 'lesson');
  terminal.disable();

  const bridge = new Bridge();

  bridge.init((msg) => {
    terminal.writeLine(msg, 'lesson');
  }).then(() => {
    terminal.writeLine('Ready.', 'success');
    terminal.setPrompt(`${bridge.getCwd()} $ `);
    terminal.enable();

    (async () => {
      while (true) {
        const input = await terminal.getInput();
        if (!input.trim()) continue;
        const result = bridge.execute(input);
        if (result.text) {
          for (const line of result.text.split('\n')) {
            terminal.writeLine(line, result.exitCode === 0 ? 'normal' : 'error');
          }
        }
        terminal.setPrompt(`${bridge.getCwd()} $ `);
      }
    })();
  }).catch((e) => {
    terminal.writeLine(`Failed to initialize: ${e}`, 'error');
    terminal.enable();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
