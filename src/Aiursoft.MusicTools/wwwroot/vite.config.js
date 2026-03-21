import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: "node_modules/@audio-samples/piano-mp3-velocity1/audio/*.mp3",
                    dest: "audio/salamander",
                    rename: (name, ext) => name.replace(/#/g, "s") + "." + ext,
                },
                {
                    src: "node_modules/@audio-samples/piano-mp3-velocity4/audio/*.mp3",
                    dest: "audio/salamander",
                    rename: (name, ext) => name.replace(/#/g, "s") + "." + ext,
                },
                {
                    src: "node_modules/@audio-samples/piano-mp3-velocity8/audio/*.mp3",
                    dest: "audio/salamander",
                    rename: (name, ext) => name.replace(/#/g, "s") + "." + ext,
                },
                {
                    src: "node_modules/@audio-samples/piano-mp3-velocity12/audio/*.mp3",
                    dest: "audio/salamander",
                    rename: (name, ext) => name.replace(/#/g, "s") + "." + ext,
                },
                {
                    src: "node_modules/@audio-samples/piano-mp3-velocity16/audio/*.mp3",
                    dest: "audio/salamander",
                    rename: (name, ext) => name.replace(/#/g, "s") + "." + ext,
                },
                {
                    src: "node_modules/@audio-samples/piano-mp3-pedals/audio/*.mp3",
                    dest: "audio/salamander",
                },
            ],
        }),
    ],
    resolve: {
        alias: {
            events: "events",
            // Stub webmidi since we don't use MIDI input features
            webmidi: resolve(__dirname, "scripts/webmidi-stub.js"),
        },
    },
    optimizeDeps: {
        include: ["tone", "@tonejs/piano", "events"],
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            input: {
                homepage: resolve(__dirname, "scripts/homepage.js"),
                piano: resolve(__dirname, "scripts/Piano.js"),
                interval: resolve(__dirname, "scripts/interval.js"),
                audioPlayer: resolve(__dirname, "scripts/AudioPlayer.js"),
                major: resolve(__dirname, "scripts/major.js"),
                minor: resolve(__dirname, "scripts/minor.js"),
                scaleVisualizer: resolve(
                    __dirname,
                    "scripts/ScaleVisualizerEngine.js"
                ),
                musicStaff: resolve(__dirname, "scripts/MusicStaff.js"),
                metronome: resolve(__dirname, "scripts/metronome.js"),
                melodyMemory: resolve(__dirname, "scripts/melody-memory.js"),
                intervalTraining: resolve(__dirname, "scripts/interval-training.js"),
                chordTraining: resolve(__dirname, "scripts/chord-training.js"),
                chordCalculator: resolve(__dirname, "scripts/chord-calculator.js"),
                intervalExam: resolve(__dirname, "scripts/interval-exam.js"),
                shortMelodyDictation: resolve(__dirname, "scripts/short-melody-dictation.js"),
                tuner: resolve(__dirname, "scripts/tuner.js"),
            },
            output: {
                format: "es",
                entryFileNames: "scripts/[name].js",
                chunkFileNames: "scripts/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
                // Handle mixed module types
                interop: "auto",
                preserveModules: false,
                exports: "auto",
            },
        },
    },
});
