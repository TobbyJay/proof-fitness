import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/scripts/audio/.venv/**',
        '**/scripts/audio/.work/**',
        '**/public/audio/samples/**'
      ]
    }
  }
});
