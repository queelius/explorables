import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const metafunctorContent = join(homedir(), 'github/repos/metafunctor/content/post');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/deploy.mjs <package-name>');
  process.exit(1);
}

const pkgDir = join(root, 'packages', target);
const pkgJson = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const slug = pkgJson.deploy?.slug || target;
const distFile = join(pkgDir, 'dist', 'index.md');

if (!existsSync(distFile)) {
  console.error('No dist/index.md found. Run build first.');
  process.exit(1);
}

const destDir = join(metafunctorContent, slug);
mkdirSync(destDir, { recursive: true });
copyFileSync(distFile, join(destDir, 'index.md'));
console.log(`Deployed ${target} → ${destDir}/index.md`);
