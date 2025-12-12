import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      events: 'events',
      // Stub webmidi since we don't use MIDI input features
      webmidi: resolve(__dirname, 'scripts/webmidi-stub.js'),
    },
  },
  optimizeDeps: {
    include: ['tone', '@tonejs/piano', 'events'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      input: {
        homepage: resolve(__dirname, 'scripts/homepage.js'),
        piano: resolve(__dirname, 'scripts/Piano.js'),
        interval: resolve(__dirname, 'scripts/interval.js'),
        audioPlayer: resolve(__dirname, 'scripts/AudioPlayer.js'),
        major: resolve(__dirname, 'scripts/major.js'),
        minor: resolve(__dirname, 'scripts/minor.js'),
        scaleVisualizer: resolve(__dirname, 'scripts/ScaleVisualizerEngine.js'),
        musicStaff: resolve(__dirname, 'scripts/MusicStaff.js'),
        metronome: resolve(__dirname, 'scripts/metronome.js'),
        melodyMemory: resolve(__dirname, 'scripts/melody-memory.js'),
      },
      output: {
        format: 'es',
        entryFileNames: 'scripts/[name].js',
        chunkFileNames: 'scripts/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Handle mixed module types
        interop: 'auto',
        preserveModules: false,
        exports: 'auto'
      }
    }
  }
});
