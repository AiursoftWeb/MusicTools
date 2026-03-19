import { Scale, Note } from "tonal";

/**
 * ShortMelodyGenerator.js
 * Generates short melodies (2-4 bars) based on specific rules.
 */
export class ShortMelodyGenerator {
    constructor() {
        this.scaleNotes = Scale.get("C major").notes;
        this.pitches = [];
        // Ensure all generated notes strictly fall within the real C3 (48) to C5 (72) range.
        // In MIDI standard, Middle C (C4) is 60.
        const octaves = [3, 4, 5];
        octaves.forEach(octave => {
            this.scaleNotes.forEach(note => {
                const fullNote = `${note}${octave}`;
                const midi = Note.midi(fullNote);
                if (midi >= 48 && midi <= 72) { // C3 to C5
                    this.pitches.push({
                        name: fullNote,
                        midi: midi
                    });
                }
            });
        });
    }

    /**
     * Generates a melody.
     * @param {number} bars - 2 or 4
     * @param {string} timeSignature - "2/4", "3/4", "4/4"
     * @returns {Array} List of notes with pitch, duration, and time.
     */
    generate(bars = 2, timeSignature = "4/4") {
        const [beatsPerBar] = timeSignature.split("/").map(Number);
        const totalBeats = bars * beatsPerBar;
        const melody = [];
        let currentBeat = 0;

        while (currentBeat < totalBeats) {
            const remainingInBar = beatsPerBar - (currentBeat % beatsPerBar);
            let duration;

            // Pick a duration based on remaining space in bar
            const rand = Math.random();
            if (remainingInBar >= 2 && rand > 0.8) {
                duration = 2; // Half note
            } else if (remainingInBar >= 1 && rand > 0.3) {
                duration = 1; // Quarter note
            } else {
                duration = 0.5; // Eighth note (we'll pair them)
            }

            if (duration === 0.5) {
                // Always generate pairs of eighth notes
                melody.push(this._createNote(0.5, currentBeat));
                currentBeat += 0.5;
                if (currentBeat < totalBeats) {
                    melody.push(this._createNote(0.5, currentBeat));
                    currentBeat += 0.5;
                }
            } else {
                melody.push(this._createNote(duration, currentBeat));
                currentBeat += duration;
            }
        }

        // Rule: Ending usually on C (tonic)
        if (melody.length > 0) {
            const lastNote = melody[melody.length - 1];
            const prevNote = melody.length > 1 ? melody[melody.length - 2] : null;
            if (prevNote) {
                if (prevNote.midi > 65) {
                    lastNote.pitch = "C5";
                    lastNote.midi = 72;
                } else if (prevNote.midi < 55) {
                    lastNote.pitch = "C3";
                    lastNote.midi = 48;
                } else {
                    lastNote.pitch = "C4";
                    lastNote.midi = 60;
                }
            } else {
                lastNote.pitch = "C4";
                lastNote.midi = 60;
            }
        }

        return melody;
    }

    _createNote(duration, time) {
        const pitchObj = this.pitches[Math.floor(Math.random() * this.pitches.length)];
        return {
            pitch: pitchObj.name,
            midi: pitchObj.midi,
            duration: duration,
            time: time
        };
    }
}
