import { Key, Note } from 'tonal';

// Two bars of motion followed by a full bar on the tonic. The figures specify
// the bass; scale degrees and chord spellings are resolved in the selected key.
const phrases = [
    'I V6 I IV vi ii6 I64 V I',
    'I V6 I IV I6 ii6 V V7 I',
    'I I6 IV V I IV I64 V I',
    'I I6 IV ii6 V vi ii6 V7 I',
    'I vi I6 V65 I IV I6 V I',
    'I IV I6 vi IV ii6 I64 V I',
    'I I6 vi iii IV I6 ii6 V7 I',
    'I I6 vi I6 V65 I ii6 V I',
];
const degrees = { I: 0, ii: 1, iii: 2, IV: 3, V: 4, vi: 5 };
const minorLabels = ['i', 'ii°', 'III', 'iv', 'V', 'VI'];
const figures = { '': 0, '6': 1, '64': 2, '7': 0, '65': 1 };
const ranges = [[40, 60], [48, 67], [55, 74], [60, 79]]; // Bass, tenor, alto, soprano.

function chordShape(symbol, key, isMinor) {
    const [, numeral, figure] = symbol.match(/^([IViv]+)(\d*)$/);
    const degree = degrees[numeral];
    const scale = isMinor ? (numeral === 'V' ? key.harmonic : key.natural).scale : key.scale;
    const seventh = figure === '7' || figure === '65';
    const tones = (seventh ? [0, 2, 4, 6] : [0, 2, 4]).map(offset => scale[(degree + offset) % 7]);
    return {
        roman: (isMinor ? minorLabels[degree] : numeral) + figure,
        tones, bass: tones[figures[figure]], dominant: numeral === 'V',
        cadential: symbol === 'I64', diminished: isMinor && numeral === 'ii', seventh
    };
}

function voicings(shape, leadingTone) {
    const choices = ranges.map(([low, high], voice) => {
        const tones = voice === 0 ? [shape.bass] : shape.tones;
        return tones.flatMap(tone => [2, 3, 4, 5].map(octave => Note.get(tone + octave)))
            .filter(note => note.midi >= low && note.midi <= high);
    });
    const result = [];
    for (const bass of choices[0]) {
        for (const tenor of choices[1]) {
            if (tenor.midi <= bass.midi || tenor.midi - bass.midi > 19) continue;
            for (const alto of choices[2]) {
                if (alto.midi <= tenor.midi || alto.midi - tenor.midi > 12) continue;
                for (const soprano of choices[3]) {
                    if (soprano.midi <= alto.midi || soprano.midi - alto.midi > 12) continue;
                    const notes = [bass, tenor, alto, soprano];
                    const pcs = notes.map(n => n.pc);
                    // Root-position V7 may omit its fifth and double the root
                    // so both tendency tones can resolve to a complete tonic.
                    const missing = shape.tones.filter(tone => !pcs.includes(tone));
                    if (missing.length && !(shape.roman === 'V7' && missing.length === 1 &&
                        missing[0] === shape.tones[2] && pcs.filter(pc => pc === bass.pc).length === 2)) continue;
                    if (pcs.filter(pc => pc === leadingTone).length > 1) continue;
                    if ((shape.cadential || shape.diminished) && pcs.filter(pc => pc === bass.pc).length !== 2) continue;
                    result.push(notes);
                }
            }
        }
    }
    return result;
}

// Return the total melodic motion, or Infinity for an inadmissible connection.
function motion(previous, next, from, to, leadingTone) {
    const steps = next.map((note, i) => note.midi - previous[i].midi);
    for (let i = 0; i < 4; i++) {
        const distance = Math.abs(steps[i]);
        if (distance > (i === 0 ? 7 : 5) || distance === 6) return Infinity;
        const diatonicSteps = Math.abs((next[i].oct - previous[i].oct) * 7 + next[i].step - previous[i].step);
        if (diatonicSteps === 1 && distance > 2) return Infinity;
        if (from.dominant && !to.dominant && previous[i].pc === leadingTone && steps[i] !== 1) return Infinity;
        if (from.seventh && previous[i].pc === from.tones[3] && ![-1, -2].includes(steps[i])) return Infinity;
        if (from.cadential) {
            const tone = previous[i].pc;
            if (tone === from.bass ? steps[i] !== 0 : ![-1, -2].includes(steps[i])) return Infinity;
        }
        if (i && (next[i].midi < previous[i - 1].midi || previous[i].midi < next[i - 1].midi)) return Infinity;
        for (let j = 0; j < i; j++) {
            if (steps[i] * steps[j] <= 0) continue;
            const interval = (next[i].midi - next[j].midi) % 12;
            if (interval !== 0 && interval !== 7) continue;
            if ((previous[i].midi - previous[j].midi) % 12 === interval) return Infinity;
            if (j === 0 && i === 3 && distance > 2) return Infinity;
        }
    }
    return steps.reduce((sum, step) => sum + Math.abs(step), 0);
}

function voicePhrase(shapes, candidates, leadingTone) {
    // A dead end depends only on this voicing and beat, so never retry it with
    // a different prefix. Try smooth connections first, with variety among ties.
    const deadEnds = shapes.map(() => new Set());
    function extend(path) {
        const beat = path.length;
        if (beat === shapes.length) return path;
        const previous = path.at(-1);
        const choices = candidates[beat].filter(notes => !deadEnds[beat].has(notes)).map(notes => {
            const cost = previous ? motion(previous, notes, shapes[beat - 1], shapes[beat], leadingTone) : 0;
            return { notes, cost: cost + Math.random() * 4 };
        }).filter(choice => Number.isFinite(choice.cost)).sort((a, b) => a.cost - b.cost);
        for (const { notes } of choices) {
            const complete = extend([...path, notes]);
            if (complete) return complete;
            deadEnds[beat].add(notes);
        }
        return null;
    }
    return extend([]);
}

export class FourPartHarmonyGenerator {
    constructor(tonic = 'C', isMinor = false) {
        this.tonic = tonic;
        this.isMinor = isMinor;
        this.key = isMinor ? Key.minorKey(tonic) : Key.majorKey(tonic);
        this.leadingTone = (isMinor ? this.key.harmonic.scale : this.key.scale)[6];
        this.shapes = new Map();
    }

    generateOptions() {
        const remaining = [...phrases];
        const options = [];
        while (options.length < 4 && remaining.length) {
            const [phrase] = remaining.splice(Math.floor(Math.random() * remaining.length), 1);
            const entries = phrase.split(' ').map(symbol => {
                if (!this.shapes.has(symbol)) {
                    const shape = chordShape(symbol, this.key, this.isMinor);
                    this.shapes.set(symbol, { shape, candidates: voicings(shape, this.leadingTone) });
                }
                return this.shapes.get(symbol);
            });
            const line = voicePhrase(entries.map(e => e.shape), entries.map(e => e.candidates), this.leadingTone);
            if (!line) continue;
            const chords = line.map(([bass, tenor, alto, soprano], i) => ({
                bass, tenor, alto, soprano, roman: entries[i].shape.roman, beats: i === 8 ? 4 : 1
            }));
            // Only outer voices are visible before answering.
            if (options.some(other => other.chords.every((c, i) =>
                c.bass.name === chords[i].bass.name && c.soprano.name === chords[i].soprano.name))) continue;
            options.push({ chords, fifths: this.key.alteration, isMinor: this.isMinor });
        }
        if (options.length !== 4) throw new Error('Unable to voice four distinct harmony options.');
        return options;
    }
}
