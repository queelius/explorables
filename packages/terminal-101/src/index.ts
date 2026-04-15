import { Terminal } from './terminal';
import { Bridge } from './bridge';
import { LessonEngine } from './engine';

export async function init(): Promise<void> {
  const root = document.getElementById('terminal-101');
  if (!root) return;

  const terminal = new Terminal(root);
  const bridge = new Bridge();

  terminal.writeLine('Booting virtual filesystem...', 'lesson');

  try {
    await bridge.init((msg) => {
      terminal.clear();
      terminal.writeLine(msg, 'lesson');
    });
  } catch (e) {
    terminal.writeLine('', 'normal');
    terminal.writeLine("Could not load the terminal engine.", 'error');
    terminal.writeLine(String(e), 'error');
    terminal.writeLine('Check your connection and refresh to try again.', 'error');
    return;
  }

  terminal.clear();
  terminal.setPrompt('user@dagshell:~$ ');
  terminal.enable();

  const engine = new LessonEngine(terminal, bridge);
  engine.run();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
