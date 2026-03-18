import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const packagesDir = join(root, 'packages');

const target = process.argv[2];
const packages = target
  ? [target]
  : readdirSync(packagesDir).filter(d =>
      existsSync(join(packagesDir, d, 'package.json'))
    );

for (const pkg of packages) {
  const pkgDir = join(packagesDir, pkg);
  const srcEntry = join(pkgDir, 'src', 'index.ts');
  const cssFile = join(pkgDir, 'src', 'styles.css');
  const postTemplate = join(pkgDir, 'post', 'index.md');
  const distDir = join(pkgDir, 'dist');

  if (!existsSync(srcEntry)) {
    console.warn(`Skipping ${pkg}: no src/index.ts`);
    continue;
  }

  mkdirSync(distDir, { recursive: true });

  let define = {};
  if (pkg === 'terminal-101') {
    const dagshellDir = join(homedir(), 'github/alpha/dagshell/dagshell');
    const pythonDir = join(pkgDir, 'python');

    define = {
      DAGSHELL_INIT: JSON.stringify(readFileSync(join(pythonDir, '__init__.py'), 'utf8')),
      DAGSHELL_CORE: JSON.stringify(readFileSync(join(dagshellDir, 'dagshell.py'), 'utf8')),
      DAGSHELL_FLUENT: JSON.stringify(readFileSync(join(dagshellDir, 'dagshell_fluent.py'), 'utf8')),
      DAGSHELL_PARSER: JSON.stringify(readFileSync(join(dagshellDir, 'command_parser.py'), 'utf8')),
      DAGSHELL_TERMINAL: JSON.stringify(readFileSync(join(dagshellDir, 'terminal.py'), 'utf8')),
      BRIDGE_PY: JSON.stringify(readFileSync(join(pythonDir, 'bridge.py'), 'utf8')),
      SEED_PY: JSON.stringify(readFileSync(join(pythonDir, 'seed.py'), 'utf8')),
    };
  }

  // Bundle TypeScript → IIFE
  await build({
    entryPoints: [srcEntry],
    bundle: true,
    format: 'iife',
    minify: true,
    outfile: join(distDir, 'bundle.js'),
    target: 'es2020',
    define,
  });

  const js = readFileSync(join(distDir, 'bundle.js'), 'utf8');
  const css = existsSync(cssFile) ? readFileSync(cssFile, 'utf8') : '';

  if (existsSync(postTemplate)) {
    let post = readFileSync(postTemplate, 'utf8');
    post = post.replace('<!-- inject:style -->', css ? `<style>\n${css}\n</style>` : '');
    post = post.replace('<!-- inject:script -->', `<script>\n${js}\n</script>`);
    writeFileSync(join(distDir, 'index.md'), post);
    console.log(`  ${pkg} → dist/index.md`);
  } else {
    console.log(`  ${pkg} → dist/bundle.js (no post template)`);
  }
}
