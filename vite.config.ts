import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, readdirSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function generateHtmlPlugin() {
  return {
    name: 'generate-extension-html',
    writeBundle() {
      mkdirSync('dist/popup', { recursive: true });
      mkdirSync('dist/options', { recursive: true });

      // Find hashed CSS assets
      let pCss = '', oCss = '';
      try {
        const files = readdirSync('dist/assets');
        pCss = files.find((f) => f.startsWith('popup') && f.endsWith('.css')) ?? '';
        oCss = files.find((f) => f.startsWith('options') && f.endsWith('.css')) ?? '';
      } catch {}

      const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />`;

      writeFileSync('dist/popup/index.html', `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ticker</title>
  ${fonts}
  ${pCss ? `<link rel="stylesheet" href="../assets/${pCss}" />` : ''}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./popup.js"></script>
</body>
</html>`);

      writeFileSync('dist/options/index.html', `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ticker — Settings</title>
  ${fonts}
  ${oCss ? `<link rel="stylesheet" href="../assets/${oCss}" />` : ''}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./options.js"></script>
</body>
</html>`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'icons/*', dest: 'icons' },
      ],
    }),
    generateHtmlPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/src/main.tsx'),
        options: resolve(__dirname, 'options/src/main.tsx'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background/serviceWorker.js';
          if (chunk.name === 'popup') return 'popup/popup.js';
          if (chunk.name === 'options') return 'options/options.js';
          return '[name]/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
