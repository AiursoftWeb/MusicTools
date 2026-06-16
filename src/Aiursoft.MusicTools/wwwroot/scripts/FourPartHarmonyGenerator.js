import { Progression, Chord, Note } from "tonal";

/**
 * FourPartHarmonyGenerator.js
 * Generates 3-bar 4-part harmony progressions (4/4 time).
 */
export class FourPartHarmonyGenerator {
    constructor() {
        this.majorProgressions = [
            ["I", "IV", "V", "I"],
            ["I", "vi", "IV", "V", "I"],
            ["I", "ii", "V", "I"],
            ["I", "IV", "I", "V", "I"],
            ["I", "V", "vi", "IV", "I"],
            ["I", "IV", "V", "vi", "ii", "V", "I"]
        ];

        this.minorProgressions = [
            ["i", "iv", "v", "i"],
            ["i", "VI", "iv", "v", "i"],
            ["i", "ii°", "V", "i"],
            ["i", "iv", "i", "V", "i"],
            ["i", "v", "VI", "iv", "i"]
        ];
    }

    /**
     * Generates a 3-bar 4-part harmony progression.
     * Pattern: 2 bars of quarter notes (8 chords) + 1 bar of whole note (1 chord).
     * Total 9 chords.
     * @param {string} key - e.g., "C", "G", "F", "Am", "Em"
     * @returns {Object} { chords: Array, romanNumerals: Array }
     */
    generate(key = "C") {
        const isMinor = key.endsWith("m");
        const root = isMinor ? key.slice(0, -1) : key;
        const mode = isMinor ? "minor" : "major";
        const pool = isMinor ? this.minorProgressions : this.majorProgressions;

        // Select a random progression template and expand it to 9 notes if needed
        // Or just generate a random logical progression
        const progressionSteps = this._generateProgressionSteps(isMinor);

        const chords = progressionSteps.map(step => {
            const chordName = Progression.fromRomanNumerals(root, [step])[0];
            const chordNotes = Chord.get(chordName).notes;

            // Generate 4-part voicing (Soprano, Alto, Tenor, Bass)
            // For the quiz, we mainly care about Soprano and Bass.
            return this._voiceChord(chordNotes, step, root, mode);
        });

        return {
            chords: chords, // Array of { soprano, alto, tenor, bass, roman }
            key: key,
            isMinor: isMinor
        };
    }

    _generateProgressionSteps(isMinor) {
        // We need 9 steps.
        // Bar 1: 4 steps. Bar 2: 4 steps. Bar 3: 1 step.
        const tonic = isMinor ? "i" : "I";
        const dominant = isMinor ? "V" : "V";
        const subdominant = isMinor ? "IV" : "IV"; // Simplified

        // Example simple logic for 9 steps
        // 1 2 3 4 | 5 6 7 8 | 9
        // I ...           V | I
        const steps = [tonic];

        // Random walk for first 7 steps
        const options = isMinor ? ["i", "ii°", "III", "iv", "v", "VI", "VII"] : ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

        for (let i = 1; i < 7; i++) {
            steps.push(options[Math.floor(Math.random() * options.length)]);
        }

        steps.push(dominant); // Step 8 is V
        steps.push(tonic);    // Step 9 is I

        return steps;
    }

    _voiceChord(notes, roman, root, mode) {
        // notes: e.g. ["C", "E", "G"]
        // We want a voicing:
        // Soprano: Highest, usually 5th or 3rd or Root in octave 4 or 5
        // Bass: Lowest, usually Root or 5th in octave 2 or 3

        const rootNote = notes[0];
        const thirdNote = notes[1];
        const fifthNote = notes[2] || notes[0]; // If it's a power chord or something

        // Simple voicing rules:
        // Bass takes root in octave 2 or 3
        const bassPitch = rootNote + (Math.random() > 0.5 ? "2" : "3");

        // Soprano takes one of the chord notes in octave 4 or 5
        const sopranoOptions = notes.map(n => n + "4").concat(notes.map(n => n + "5"));
        const sopranoPitch = sopranoOptions[Math.floor(Math.random() * sopranoOptions.length)];

        // Alto and Tenor (just for full sound, but not displayed in quiz options)
        const altoPitch = notes[Math.floor(Math.random() * notes.length)] + "4";
        const tenorPitch = notes[Math.floor(Math.random() * notes.length)] + "3";

        return {
            soprano: sopranoPitch,
            alto: altoPitch,
            tenor: tenorPitch,
            bass: bassPitch,
            roman: roman,
            notes: [sopranoPitch, altoPitch, tenorPitch, bassPitch]
        };
    }
}
