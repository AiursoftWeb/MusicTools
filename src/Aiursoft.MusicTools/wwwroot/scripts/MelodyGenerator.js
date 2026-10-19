import { Scale, Note } from "tonal";

const abortError = () => new DOMException("Aborted", "AbortError");
const pitchDistance = (a, b) => Math.min(((a - b) % 12 + 12) % 12, ((b - a) % 12 + 12) % 12);

// Map the complete melody, rather than independently folding notes by octave.
// These costs are the same as the accepted six-sample listening experiment.
export function adaptPitches(notes, pitches) {
    const raw = notes.map(note => note.pitch);
    const median = [...raw].sort((a, b) => a - b)[Math.floor(raw.length / 2)];
    let best;
    for (let transpose = 0; transpose < 12; transpose++) {
        const shift = transpose + 12 * Math.round((60 - median - transpose) / 12);
        const targets = raw.map(pitch => pitch + shift);
        let paths = pitches.map(pitch => ({
            pitch, cost: (pitch - targets[0]) ** 2 * 0.16 +
                pitchDistance(pitch % 12, targets[0] % 12) ** 2 * 6,
            notes: [pitch],
        }));
        for (let i = 1; i < raw.length; i++) {
            const delta = raw[i] - raw[i - 1];
            const next = [];
            for (const pitch of pitches) {
                let prefix;
                for (const previous of paths) {
                    const interval = pitch - previous.pitch;
                    if (Math.abs(interval) > 7 || Math.abs(interval) === 6) continue;
                    const cost = previous.cost + (interval - delta) ** 2 * 0.9 +
                        (delta * interval < 0 ? 18 : 0) +
                        (delta !== 0 && interval === 0 ? 3 : 0) +
                        (delta === 0 && interval !== 0 ? 6 : 0) +
                        (pitch - targets[i]) ** 2 * 0.16 +
                        pitchDistance(pitch % 12, targets[i] % 12) ** 2 * 6;
                    if (!prefix || cost < prefix.cost) {
                        prefix = { pitch, cost, notes: [...previous.notes, pitch] };
                    }
                }
                if (prefix) next.push(prefix);
            }
            paths = next;
        }
        paths.sort((a, b) => a.cost - b.cost);
        if (!best || paths[0].cost < best.cost) best = paths[0];
    }
    return notes.map((note, i) => ({ ...note, pitch: best.notes[i] }));
}

export class MelodyGenerator {
    constructor(key = "C", scaleType = "major") {
        this.isAtonal = scaleType === "atonal";
        const scale = Scale.get(`${key} ${this.isAtonal ? "chromatic" : scaleType}`);
        const pitchClasses = new Set(scale.notes.map(note => Note.chroma(note)));
        this.pitches = Array.from({ length: 25 }, (_, i) => i + 48)
            .filter(pitch => pitchClasses.has(pitch % 12));
        if (!this.pitches.length) throw new Error("Unsupported melody scale.");
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
            const raw = await this._sample(signal);
            let previousEnd = 0;
            if (!Array.isArray(raw) || raw.length < 1 || raw.length > 256) {
                throw new Error("Invalid generated melody.");
            }
            for (const note of raw) {
                if (!Number.isInteger(note.pitch) || note.pitch < 21 || note.pitch > 108 ||
                    !Number.isInteger(note.start) || !Number.isInteger(note.end) ||
                    note.start < previousEnd || note.end <= note.start || note.end > 256) {
                    throw new Error("Invalid generated note.");
                }
                previousEnd = note.end;
            }
            notes = adaptPitches(raw, this.pitches);
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
            this.worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.notes);
            this.worker.onerror = () => finish(new Error("Melody worker failed."));
            this.worker.postMessage({
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
