import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string, base = d): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p, base) : [p.slice(base.length + 1).split('\\').join('/')];
  });

// Injects the list of built files into the service worker so everything is cached on first load.
const precache = (): Plugin => ({
  name: 'flow-precache',
  apply: 'build',
  closeBundle() {
    const files = walk('dist').filter((f) => f !== 'sw.js').map((f) => './' + f);
    files.push('./');
    const p = join('dist', 'sw.js');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace('__PRECACHE__', JSON.stringify(files)).replace('__V__', String(Date.now()))
    );
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), precache()],
  build: { target: 'es2020' },
});
