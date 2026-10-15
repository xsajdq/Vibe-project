import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serwuje aplikację pod https://<user>.github.io/<repo>/,
// więc wszystkie zasoby muszą mieć prefiks /<repo>/.
const base = process.env.VITE_BASE ?? '/Vibe-project/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
