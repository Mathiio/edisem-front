import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This allows you to do things like `import Component from '@/components/Component'`
      // where `@` points to `src`
      '@': '/src',
    },
  },
  server: {
    watch: {
      // Activer le polling pour WSL (nécessaire quand les fichiers sont sur /mnt/c/)
      usePolling: true,
      interval: 1000, // Vérifier les changements toutes les 3 secondes (moins agressif)
    },
    hmr: true,
    proxy: {
      // Proxy Omeka S en dev (same-origin /omk/* → edisem)
      '/omk/api': {
        target: 'https://edisem.arcanes.ca',
        changeOrigin: true,
        secure: true,
      },
      '/omk/s': {
        target: 'https://edisem.arcanes.ca',
        changeOrigin: true,
        secure: true,
      },
      // Fichiers médias (miniatures ResourceCard, avatars, etc.)
      '/omk/files': {
        target: 'https://edisem.arcanes.ca',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
