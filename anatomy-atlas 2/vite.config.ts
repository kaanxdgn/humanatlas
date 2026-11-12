import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // .glb / .gltf dosyaları varlık olarak işlensin
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: [
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
            'postprocessing',
          ],
          motion: ['gsap', 'framer-motion', 'lenis'],
        },
      },
    },
  },
  server: { host: true, port: 5173 },
});
