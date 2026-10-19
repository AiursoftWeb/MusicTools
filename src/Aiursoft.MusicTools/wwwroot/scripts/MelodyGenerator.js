import { Scale, Note } from "tonal";

const abortError = () => new DOMException("Aborted", "AbortError");
export class MelodyGenerator {
    static #recent = [];
    constructor(key = "C", scaleType = "major") {
        this.isAtonal = scaleType === "atonal";
        this.key = Note.chroma(key);
        const scale = Scale.get(`${key} ${this.isAtonal ? "chromatic" : scaleType}`);
        const pitchClasses = new Set(scale.notes.map(note => Note.chroma(note)));
        this.pitches = Array.from({ length: 25 }, (_, i) => i + 48)
            .filter(pitch => pitchClasses.has(pitch % 12));
        if (!this.pitches.length || this.key === null || (!this.isAtonal && scaleType !== "major")) {
            throw new Error("Unsupported melody scale.");
        }
        this.notes = [];
        this.totalBeats = 0;
        this.noteCount = 0;
        this.boundary = 0;
        this.disposed = false;
    }

    dispose() {
        this.disposed = true;
        this.cancel?.();
        this.worker?.terminate();
        this.worker = null;
    }

    async generateSong(signal) {
        if (this.disposed || signal?.aborted) throw abortError();
        let notes;
        if (this.isAtonal) {
            notes = Array.from({ length: 64 }, (_, i) => ({
                pitch: 48 + Math.floor(Math.random() * 25), start: i * 4, end: i * 4 + 4,
            }));
        } else {
            const result = await this._sample(signal);
            const raw = result.notes;
            let previousEnd = 0;
            if (!Array.isArray(raw) || raw.length < 1 || raw.length > 256) {
                throw new Error("Invalid generated melody.");
            }
            for (const note of raw) {
                if (!Number.isInteger(note.pitch) || !this.pitches.includes(note.pitch) ||
                    !Number.isInteger(note.start) || !Number.isInteger(note.end) ||
                    note.start < previousEnd || note.end <= note.start || note.end > 256) {
                    throw new Error("Invalid generated note.");
                }
                previousEnd = note.end;
            }
            notes = raw;
            MelodyGenerator.#recent.push(result.fingerprint);
            MelodyGenerator.#recent = MelodyGenerator.#recent.slice(-5);
        }
        if (this.disposed || signal?.aborted) throw abortError();
        const song = notes.map(note => ({
            note: Note.fromMidiSharps(note.pitch),
            midi: note.pitch,
            start: this.totalBeats + note.start / 4,
            end: this.totalBeats + note.end / 4,
        }));
        this.notes.push(...song);
        this.totalBeats += 64;
        return { notes: song, duration: 64 };
    }

    _sample(signal) {
        this.worker ??= new Worker(new URL("./melody-worker.js", import.meta.url), { type: "module" });
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error, notes) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                signal?.removeEventListener("abort", abort);
                this.cancel = null;
                if (error) {
                    this.worker?.terminate();
                    this.worker = null;
                    reject(error);
                } else resolve(notes);
            };
            const abort = () => finish(abortError());
            const timeout = setTimeout(() => finish(new Error("Melody generation timed out.")), 120000);
            this.cancel = abort;
            signal?.addEventListener("abort", abort, { once: true });
            this.worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data);
            this.worker.onerror = () => finish(new Error("Melody worker failed."));
            this.worker.postMessage({
                key: this.key, recent: MelodyGenerator.#recent,
                modelUrl: new URL(document.querySelector("[data-melody-model]").dataset.melodyModel, document.baseURI).href,
            });
        });
    }

    async nextSequence(mode, signal) {
        if (mode === "prog-note") {
            while (this.notes.length <= this.noteCount) await this.generateSong(signal);
            this.noteCount++;
            this.boundary = this.notes[this.noteCount - 1].end;
        } else {
            this.boundary += mode === "prog-double" ? 8 : 4;
            while (this.totalBeats < this.boundary) await this.generateSong(signal);
            // A song may begin with rests. Skip empty opening bars rather than
            // requiring a player to answer silence, while retaining their timing.
            while (!this.notes.some(note => note.start < this.boundary)) {
                this.boundary += mode === "prog-double" ? 8 : 4;
                while (this.totalBeats < this.boundary) await this.generateSong(signal);
            }
            this.noteCount = this.notes.filter(note => note.start < this.boundary).length;
        }
        return {
            notes: this.notes.slice(0, this.noteCount).map(note => ({
                ...note, end: Math.min(note.end, this.boundary),
            })),
            duration: this.boundary,
        };
    }
}
