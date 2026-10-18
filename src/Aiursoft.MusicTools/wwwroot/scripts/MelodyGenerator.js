import { Scale, Note } from "tonal";

// Original implementation inspired by motif development in MeloForm (ISMIR 2022)
// and probability/rule composition in Computoser. See README for references.
// These are short rhythmic cells and relative contours, not stored songs.
const RHYTHMS = [[1, 1], [0.5, 0.5, 1], [1.5, 0.5]];
const CONTOURS = [
    [0, 0, 1, 2, 2, 1, 0, 0],
    [0, 1, 2, 1, 0, 0, 1, 0],
    [0, 2, 2, 1, 0, 1, 0, -1],
    [0, 1, 0, -1, 0, 2, 1, 0],
    [0, 0, 2, 2, 3, 2, 1, 0],
];
const HARMONY = {
    tonic: [0, 2, 4],
    subdominant: [0, 3, 5],
    supertonic: [1, 3, 5],
    dominant: [1, 4, 6],
};

export class MelodyGenerator {
    constructor(key = "C", scaleType = "major", random = Math.random) {
        this.noteBuffer = [];
        this.random = random;
        this.isAtonal = scaleType === "atonal";
        const notes = Scale.get(`${key} ${this.isAtonal ? "chromatic" : scaleType}`).notes;
        this.scaleMidi = [];
        let previous = Note.midi(`${key}3`) - 1;
        for (const note of notes) {
            let midi = Note.midi(`${note}3`);
            while (midi <= previous) midi += 12;
            this.scaleMidi.push(midi);
            previous = midi;
        }
        this.lastPitch = null;
    }

    getNextNote() {
        if (this.noteBuffer.length === 0) this.generateSong();
        return this.noteBuffer.shift();
    }

    generateSong() {
        if (this.isAtonal) {
            // Keep the explicitly selected chromatic challenge independent of
            // the singable, tonal nursery melody style.
            this._append(Array.from({ length: 64 }, () => ({
                pitch: Math.floor(this.random() * 25), duration: 1,
            })));
            return;
        }

        const cell = this._choose(RHYTHMS);
        const rhythm = [...cell, ...cell, ...cell, 2];
        const answerRhythm = [...cell, ...cell, 1, 1, 2];
        const contour = this._choose(CONTOURS);
        // Start on a tonic-triad tone, within a fifth of the preceding song.
        const starts = [0, 2, 4].filter(p => this.lastPitch === null ||
            Math.abs(this._toMidi(p) - this._toMidi(this.lastPitch)) <= 7);
        const start = this._choose(starts);
        const guide = contour.map(p => start + (start === 4 ? -p : p));
        const home = this._compose(rhythm, guide,
            [HARMONY.tonic, HARMONY.tonic], this.lastPitch, null, start);
        const homeEnd = home.at(-1).pitch;
        // End the question near the returning hook, avoiding a leap at the join.
        const dominant = start === 4 ? 4 : 1;
        const open = this._compose(answerRhythm, guide,
            [HARMONY.subdominant, HARMONY.dominant], homeEnd, dominant);
        const tonic = start === 4 ? 7 : 0;
        const close = this._compose(answerRhythm, guide,
            [HARMONY.dominant, HARMONY.tonic], homeEnd, tonic);

        // A contrasting answer uses the same rhythmic identity in a higher
        // register. It is developed from the motif, not an unrelated random run.
        const contrastGuide = contour.map(p => Math.min(7, p + start + 2));
        const contrast = this._compose(rhythm, contrastGuide,
            [HARMONY.subdominant, HARMONY.subdominant], tonic, null);
        const returnGuide = [...contrastGuide].reverse();
        const returnToDominant = this._compose(answerRhythm, returnGuide,
            [HARMONY.supertonic, HARMONY.dominant], contrast.at(-1).pitch, dominant);

        // Four balanced four-bar phrases: question, answer, contrast, return.
        // The two-bar hook returns exactly, so there is something to remember.
        this._append([
            ...home, ...open,
            ...home, ...close,
            ...contrast, ...returnToDominant,
            ...home, ...close,
        ]);
        this.lastPitch = tonic;
    }

    _compose(rhythm, guide, chords, previous, ending, start = null) {
        let beat = 0;
        const events = rhythm.map(duration => {
            const event = { beat, duration };
            beat += duration;
            return event;
        });
        // Plan a complete two-bar path before emitting any notes.
        // Keeping every distinct continuation lets cadence constraints influence the
        // approach; overwriting the last notes afterwards can create bad joins.
        let paths = [{ notes: [], pitch: previous, jump: 0, repeats: previous === null ? 0 : 1, cost: 0 }];
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const chord = chords[Math.floor(event.beat / 4)];
            const downbeat = event.beat % 4 === 0;
            const last = i === events.length - 1;
            const penultimate = i === events.length - 2;
            const candidates = [];
            // Shared per-event noise varies the tune without rewarding paths
            // simply for having more opportunities to draw random numbers.
            const variation = Array.from({ length: 8 }, () => this.random() * 1.4);
            for (const path of paths) {
                for (let pitch = 0; pitch <= 7; pitch++) {
                    if (i === 0 && start !== null && pitch !== start) continue;
                    if (i === 0 && start === null && pitch === previous) continue;
                    if (last && ending !== null && pitch !== ending) continue;
                    if (penultimate && ending !== null &&
                        Math.abs(pitch - ending) !== 1) continue;
                    const chordTone = chord.includes(pitch % 7);
                    if ((downbeat || last) && !chordTone) continue;
                    const jump = path.pitch === null ? 0 : pitch - path.pitch;
                    const semitones = path.pitch === null ? 0 :
                        Math.abs(this._toMidi(pitch) - this._toMidi(path.pitch));
                    if (semitones > 7 || semitones === 6) continue;
                    // Large leaps recover by a step in the opposite direction.
                    if (Math.abs(path.jump) >= 3 &&
                        !(Math.abs(jump) === 1 && Math.sign(jump) !== Math.sign(path.jump))) continue;
                    const repeats = jump === 0 ? path.repeats + 1 : 1;
                    // The hook is reused after a dominant ending, so leave room
                    // for that preceding note when limiting repeated pitches.
                    if (repeats > (start === null ? 3 : 2)) continue;
                    // Unstable scale tones connect by step, rather than being
                    // treated as interchangeable with tonic-triad notes.
                    if (!chordTone && Math.abs(jump) > 1) continue;
                    if (path.pitch !== null && path.pitch % 7 === 6 && jump !== 1) continue;
                    const desired = guide[Math.floor(event.beat)];
                    const motion = [0.4, 0, 0.8, 2.4, 4.5][Math.abs(jump)] ?? 8;
                    const turn = jump * path.jump < 0 ? 0.5 : 0;
                    const cost = path.cost + motion + turn + Math.pow(pitch - desired, 2) * 0.5 +
                        (chordTone ? 0 : 0.8) + (repeats === 3 ? 1.2 : 0) + variation[pitch];
                    candidates.push({
                        notes: [...path.notes, { pitch, duration: event.duration }],
                        pitch, jump, repeats, cost,
                    });
                }
            }
            candidates.sort((a, b) => a.cost - b.cost);
            // Only the cheapest prefix for each continuation state is needed.
            // Keep every state: truncating by cost could discard the only path
            // that can reach the cadence. The pitch/jump/repeat ranges bound it.
            const seen = new Set();
            paths = candidates.filter(path => {
                const state = `${path.pitch},${path.jump},${path.repeats}`;
                if (seen.has(state)) return false;
                seen.add(state);
                return true;
            });
        }
        return paths[0].notes;
    }

    _append(notes) {
        let beat = 0;
        for (const note of notes) {
            const midi = this._toMidi(note.pitch);
            this.noteBuffer.push({
                scaleIndex: note.pitch,
                midi,
                name: Note.fromMidiSharps(midi),
                duration: note.duration,
                isBarStart: beat % 4 === 0,
            });
            beat += note.duration;
        }
    }

    _toMidi(index) {
        const length = this.scaleMidi.length;
        return this.scaleMidi[index % length] + 12 * Math.floor(index / length);
    }

    _choose(items) {
        return items[Math.floor(this.random() * items.length)];
    }
}
