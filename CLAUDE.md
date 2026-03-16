# Explorables

Interactive explorable explanations for [metafunctor.com](https://metafunctor.com).

## Architecture

Each explorable lives in `packages/<name>/` with:
- `src/index.ts` — entry point (imports other modules)
- `src/styles.css` — widget CSS
- `post/index.md` — Hugo blog post template with `<!-- inject:style -->` and `<!-- inject:script -->` markers
- `tests/` — vitest tests
- `package.json` — metadata including `deploy.slug` (target directory in metafunctor)

## Build & Deploy

```bash
# Install dependencies
npm install

# Build all packages (or one: node scripts/build.mjs regex-machines)
npm run build

# Deploy to metafunctor blog
node scripts/deploy.mjs regex-machines

# Run tests
npm test

# Type check
npm run typecheck
```

### Build pipeline

1. **esbuild** bundles `src/index.ts` → IIFE (single file, no imports)
2. Build script reads `src/styles.css` and `post/index.md`
3. Replaces `<!-- inject:style -->` and `<!-- inject:script -->` markers
4. Outputs `dist/index.md` — a self-contained Hugo post with inline CSS/JS

### Deploy

Copies `dist/index.md` to `~/github/repos/metafunctor/content/post/<slug>/index.md`.

## Adding a new explorable

```bash
mkdir -p packages/my-widget/{src,post,tests}
```

Create `src/index.ts`, `src/styles.css`, `post/index.md` (with inject markers), and `package.json` with a `deploy.slug`.

## Conventions

- All DOM manipulation uses safe methods (`textContent`, `createElement`, `appendChild`). No `innerHTML` with dynamic content.
- Each widget wraps its code in an IIFE to avoid polluting global scope.
- CSS is scoped via a unique container ID (e.g., `#nfa-sim`).
- esbuild target is ES2020 — no IE11 support needed.
