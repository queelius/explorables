declare function loadPyodide(config?: any): Promise<any>;

export interface ExecResult {
  text: string;
  exitCode: number;
}

export type BridgeState = 'loading' | 'ready' | 'error';

export class Bridge {
  private pyodide: any = null;
  private _state: BridgeState = 'loading';
  private _error: string = '';

  get state(): BridgeState { return this._state; }
  get error(): string { return this._error; }

  async init(onProgress?: (msg: string) => void): Promise<void> {
    try {
      onProgress?.('Loading Python runtime...');

      // Dynamically load Pyodide script if not already present
      if (typeof loadPyodide === 'undefined') {
        await this.loadScript('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js');
      }

      onProgress?.('Initializing Python...');
      this.pyodide = await loadPyodide();

      onProgress?.('Loading filesystem engine...');
      this.loadDagshellFiles();

      onProgress?.('Setting up virtual filesystem...');
      this.pyodide.runPython(BRIDGE_PY);
      this.pyodide.runPython(SEED_PY);

      this._state = 'ready';
    } catch (e) {
      this._state = 'error';
      this._error = String(e);
      throw e;
    }
  }

  execute(cmd: string): ExecResult {
    const result = this.pyodide.globals.get('execute')(cmd);
    const text = result.get('text') as string;
    const exitCode = result.get('exit_code') as number;
    result.destroy();
    return { text, exitCode };
  }

  getCwd(): string {
    return this.pyodide.globals.get('get_cwd')() as string;
  }

  fsExists(path: string): boolean {
    return this.pyodide.globals.get('fs_exists')(path) as boolean;
  }

  async reset(): Promise<void> {
    this.pyodide.runPython(`
shell = DagShell()
executor = CommandExecutor(shell)
`);
    this.pyodide.runPython(SEED_PY);
  }

  private loadDagshellFiles(): void {
    const pyFS = this.pyodide.FS;
    // Create parent directories (may already exist)
    try { pyFS.mkdir('/lib'); } catch (_) { /* exists */ }
    try { pyFS.mkdir('/lib/python'); } catch (_) { /* exists */ }
    try { pyFS.mkdir('/lib/python/dagshell'); } catch (_) { /* exists */ }
    for (const [path, content] of Object.entries(DAGSHELL_FILES)) {
      pyFS.writeFile(`/lib/python/${path}`, content);
    }
    this.pyodide.runPython("import sys; sys.path.insert(0, '/lib/python')");
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${url}`));
      document.head.appendChild(s);
    });
  }
}

// These constants are populated at BUILD TIME by the build script.
const DAGSHELL_FILES: Record<string, string> = {
  'dagshell/__init__.py': DAGSHELL_INIT,
  'dagshell/dagshell.py': DAGSHELL_CORE,
  'dagshell/dagshell_fluent.py': DAGSHELL_FLUENT,
  'dagshell/command_parser.py': DAGSHELL_PARSER,
  'dagshell/terminal.py': DAGSHELL_TERMINAL,
};

// Placeholder constants - replaced by esbuild define at build time
declare const DAGSHELL_INIT: string;
declare const DAGSHELL_CORE: string;
declare const DAGSHELL_FLUENT: string;
declare const DAGSHELL_PARSER: string;
declare const DAGSHELL_TERMINAL: string;
declare const BRIDGE_PY: string;
declare const SEED_PY: string;
