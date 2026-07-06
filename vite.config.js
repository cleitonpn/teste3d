import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base = nome do repositório (GitHub Pages: usuario.github.io/teste3d/)
export default defineConfig({
  base: '/teste3d/',
  plugins: [react()],
});
