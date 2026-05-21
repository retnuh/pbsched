import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

describe('PWA config — paths must be relative to deploy base', () => {
  // vite.config.js sets base: './' so the app can be deployed at any subpath
  // (e.g. GitHub Pages /pbsched/). Absolute paths beginning with '/' resolve
  // against the origin and break in any non-root deployment.

  it('manifest.json start_url and scope are relative', () => {
    const manifest = JSON.parse(
      readFileSync(join(projectRoot, 'public', 'manifest.json'), 'utf8')
    );
    expect(manifest.start_url).not.toMatch(/^\//);
    expect(manifest.scope).not.toMatch(/^\//);
  });

  it('manifest.json icon sources are relative', () => {
    const manifest = JSON.parse(
      readFileSync(join(projectRoot, 'public', 'manifest.json'), 'utf8')
    );
    for (const icon of manifest.icons) {
      expect(icon.src, `icon src "${icon.src}"`).not.toMatch(/^\//);
    }
  });

  it('sw.js precache list and offline fallback are relative', () => {
    const sw = readFileSync(join(projectRoot, 'public', 'sw.js'), 'utf8');
    // Match any quoted path beginning with a single leading slash followed by
    // a path char (excludes regex literals like '/^\//' and comments).
    const absoluteLiterals = sw.match(/['"`]\/[A-Za-z0-9_.-][^'"`]*['"`]/g);
    expect(absoluteLiterals, 'absolute path literals in sw.js').toBeNull();
  });

  it('main.js registers the service worker with a relative URL', () => {
    const main = readFileSync(join(projectRoot, 'src', 'main.js'), 'utf8');
    expect(main).not.toMatch(/serviceWorker\.register\(\s*['"`]\/sw\.js/);
  });
});
