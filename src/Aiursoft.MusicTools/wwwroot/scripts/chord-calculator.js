import Piano from './Piano.js';
import { getLocalizedText } from './localization.js';

class ChordCalculator {
    #piano;
    #dom;
    #currentStep = 0; // Tonic (0=C, 1=C#, etc.)
    #activeNotes = []; // Array of MIDI notes currently selected on piano
    #fifthsVisualAngle = 0;
    
    // Constants
    #circleOfFifthsOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
    #notes = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
    #notesSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    #notesFlat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    
    #majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
    
    #chordTypes = {
        // Triads
        'major': { name: getLocalizedText('major-triad', 'Major Triad'), intervals: [4, 3] },
        'minor': { name: getLocalizedText('minor-triad', 'Minor Triad'), intervals: [3, 4] },
        'diminished': { name: getLocalizedText('diminished-triad', 'Diminished Triad'), intervals: [3, 3] },
        'augmented': { name: getLocalizedText('augmented-triad', 'Augmented Triad'), intervals: [4, 4] },
        // 7th Chords
        'maj7': { name: getLocalizedText('maj7-chord', 'Major 7th'), intervals: [4, 3, 4] },
        'dom7': { name: getLocalizedText('dom7-chord', 'Dominant 7th'), intervals: [4, 3, 3] },
        'min7': { name: getLocalizedText('min7-chord', 'Minor 7th'), intervals: [3, 4, 3] },
        'm7b5': { name: getLocalizedText('m7b5-chord', 'Half-Diminished 7th'), intervals: [3, 3, 4] },
        'dim7': { name: getLocalizedText('dim7-chord', 'Diminished 7th'), intervals: [3, 3, 3] }
    };

    #diatonicDegrees = [
        { degree: 'I', type: 'major', offset: 0 },
        { degree: 'II', type: 'minor', offset: 2 },
        { degree: 'III', type: 'minor', offset: 4 },
        { degree: 'IV', type: 'major', offset: 5 },
        { degree: 'V', type: 'major', offset: 7 },
        { degree: 'VI', type: 'minor', offset: 9 },
        { degree: 'VII', type: 'diminished', offset: 11 }
    ];

    constructor(domElements) {
        this.#dom = domElements;
        this.#setupPiano();
        this.#setupCircleOfFifths();
        this.#setupControls();
        this.#updateUIFromControls(false); 
    }

    #setupPiano() {
        this.#piano = new Piano(this.#dom.pianoContainer, {
            octaves: 2,
            startOctave: 3,
            isClickable: true,
            showNoteNames: true,
            showTonicIndicator: false
        });

        this.#piano.onClick((noteName) => {
            const li = this.#dom.pianoContainer.querySelector(`[data-note="${noteName}"]`);
            const midi = parseInt(li.dataset.midi);
            
            const index = this.#activeNotes.indexOf(midi);
            if (index !== -1) {
                this.#activeNotes.splice(index, 1);
            } else {
                this.#activeNotes.push(midi);
                // FIFO logic updated to support 4 notes for 7th chords
                if (this.#activeNotes.length > 4) {
                    this.#activeNotes.shift();
                }
            }
            
            this.#updatePianoHighlights();
            this.#identifyChordFromPiano();
        });

        this.#dom.resetPianoBtn.addEventListener('click', () => {
            this.#activeNotes = [];
            this.#updatePianoHighlights();
            this.#identifyChordFromPiano();
        });
    }

    #setupCircleOfFifths() {
        const outerRadius = (this.#dom.fifthsOuterCircle.offsetWidth / 2) * 0.85;
        this.#circleOfFifthsOrder.forEach((noteIndex, i) => {
            const angle = (i / 12) * 360 - 90;
            const x = outerRadius * Math.cos((angle * Math.PI) / 180);
            const y = outerRadius * Math.sin((angle * Math.PI) / 180);
            const noteEl = document.createElement("div");
            noteEl.className = "note";
            noteEl.style.transform = `translate(${x}px, ${y}px)`;
            if (this.#notes[noteIndex].includes("♯") || this.#notes[noteIndex].includes("♭")) {
                noteEl.dataset.isBlackKey = "true";
            }
            const labelEl = document.createElement("div");
            labelEl.className = "note-label";
            labelEl.textContent = this.#notes[noteIndex];
            noteEl.appendChild(labelEl);
            this.#dom.fifthsOuterCircle.appendChild(noteEl);
        });

        const innerRadius = (this.#dom.fifthsInnerCircle.offsetWidth / 2) * 0.8;
        this.#majorScaleIntervals.forEach((interval, i) => {
            const circlePos = this.#circleOfFifthsOrder.indexOf(interval);
            const angle = (circlePos / 12) * 360 - 90;
            const x = innerRadius * Math.cos((angle * Math.PI) / 180);
            const y = innerRadius * Math.sin((angle * Math.PI) / 180);
            const degreeEl = document.createElement("div");
            degreeEl.className = "degree";
            degreeEl.textContent = i + 1;
            degreeEl.style.transform = `translate(${x}px, ${y}px)`;
            this.#dom.fifthsInnerCircle.appendChild(degreeEl);
        });

        this.#dom.fifthsLeftBtn.addEventListener('click', () => {
            this.#currentStep = (this.#currentStep - 7 + 12) % 12;
            this.#fifthsVisualAngle -= 30;
            this.#updateCircleRotation();
            this.#updateUIFromControls(true);
        });

        this.#dom.fifthsRightBtn.addEventListener('click', () => {
            this.#currentStep = (this.#currentStep + 7) % 12;
            this.#fifthsVisualAngle += 30;
            this.#updateCircleRotation();
            this.#updateUIFromControls(true);
        });
    }

    #setupControls() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.#updateUIFromControls(true);
            });
        });

        const degreeButtons = document.querySelectorAll('.degree-btn');
        degreeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                degreeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.#updateUIFromControls(true);
            });
        });
    }

    #updateCircleRotation() {
        this.#dom.fifthsInnerCircle.style.transform = `translate(-50%, -50%) rotate(${this.#fifthsVisualAngle}deg)`;
        const centerText = this.#dom.fifthsInnerCircle.querySelector(".current-key-display");
        centerText.style.transform = `translate(-50%, -50%) rotate(${-this.#fifthsVisualAngle}deg)`;
        centerText.querySelector(".key-name").textContent = this.#notes[this.#currentStep];
    }

    #updateUIFromControls(shouldPlay = false) {
        const modeBtn = document.querySelector('.mode-btn.active');
        if (!modeBtn) return;
        const mode = modeBtn.dataset.mode;

        const degreeBtn = document.querySelector('.degree-btn.active');
        if (!degreeBtn) return;
        const degreeIndex = parseInt(degreeBtn.dataset.degree) - 1;
        
        let chordType;
        let rootOffset;
        
        if (mode === 'diatonic') {
            const diatonic = this.#diatonicDegrees[degreeIndex];
            chordType = diatonic.type;
            rootOffset = diatonic.offset;
        } else {
            chordType = mode;
            rootOffset = this.#diatonicDegrees[degreeIndex].offset;
        }
        
        const rootIndex = (this.#currentStep + rootOffset) % 12;
        const intervals = this.#chordTypes[chordType].intervals;
        
        // Forward generation upgraded to handle N intervals
        const startOctave = 3;
        let currentMidiInOctave = rootIndex + (startOctave + 1) * 12;
        this.#activeNotes = [currentMidiInOctave];
        let cumulativeInterval = 0;
        
        intervals.forEach(interval => {
            cumulativeInterval += interval;
            const nextNotePc = (rootIndex + cumulativeInterval) % 12;
            // Check if we cross an octave boundary relative to root
            const octaveOffset = (rootIndex + cumulativeInterval >= 12) ? 1 : 0;
            this.#activeNotes.push(nextNotePc + (startOctave + 1 + octaveOffset) * 12);
        });
        
        this.#activeNotes.sort((a, b) => a - b);
        
        this.#updatePianoHighlights();
        this.#identifyChordFromPiano(); 

        if (shouldPlay) {
            this.#playCurrentChord();
        }
    }

    #playCurrentChord() {
        this.#activeNotes.forEach(midi => {
            const noteName = this.#midiToNoteNameSimple(midi);
            this.#piano.playNote(noteName, 1.0);
        });
    }

    #updatePianoHighlights() {
        this.#piano.clearAllHighlights();
        const pianoNoteNames = this.#activeNotes.map(m => this.#midiToNoteNameSimple(m));
        this.#piano.highlightKeys(pianoNoteNames, 'select-highlight');
    }

    #identifyChordFromPiano() {
        const noteCount = this.#activeNotes.length;
        if (noteCount !== 3 && noteCount !== 4) {
            this.#dom.detectedNotes.textContent = noteCount > 0 
                ? this.#activeNotes.map(m => this.#midiToNoteNameSimple(m)).join(', ') 
                : '--';
            this.#dom.detectedType.textContent = '--';
            this.#dom.chordResultDisplay.textContent = '--';
            
            document.querySelectorAll('.degree-btn').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.mode-btn').forEach(i => i.classList.remove('active'));
            return;
        }

        const pitchClasses = [...new Set(this.#activeNotes.map(m => m % 12))].sort((a, b) => a - b);
        if (pitchClasses.length !== noteCount) {
             this.#dom.detectedType.textContent = getLocalizedText('invalid-chord', 'Invalid Chord');
             return;
        }

        let foundChord = null;
        let currentPcs = [...pitchClasses];

        for (let i = 0; i < noteCount; i++) {
            // Calculate current intervals
            let currentIntervals = [];
            for (let j = 0; j < noteCount - 1; j++) {
                currentIntervals.push((currentPcs[j + 1] - currentPcs[j] + 12) % 12);
            }
            
            const intervalStr = JSON.stringify(currentIntervals);
            for (const [type, data] of Object.entries(this.#chordTypes)) {
                if (JSON.stringify(data.intervals) === intervalStr) {
                    foundChord = { root: currentPcs[0], type: type };
                    break;
                }
            }
            if (foundChord) break;
            
            // Rotate the set
            currentPcs.push(currentPcs.shift());
            currentPcs = currentPcs.map((pc, idx) => (idx === noteCount - 1 ? pc : pc)); // Logical rotation only
        }

        if (!foundChord) {
            this.#dom.detectedType.textContent = getLocalizedText('invalid-chord', 'Invalid Chord');
            this.#dom.chordResultDisplay.textContent = getLocalizedText('invalid-chord', 'Invalid Chord');
            document.querySelectorAll('.degree-btn').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.mode-btn').forEach(i => i.classList.remove('active'));
            this.#dom.detectedNotes.textContent = this.#activeNotes.map(m => this.#midiToNoteNameSimple(m)).join(', ');
        } else {
            const root = foundChord.root;
            const sortedByRoot = [...this.#activeNotes].sort((a, b) => {
                const aPc = (a % 12 - root + 12) % 12;
                const bPc = (b % 12 - root + 12) % 12;
                return aPc - bPc;
            });

            const smartNotes = this.#getEnharmonicNotes(foundChord.root, foundChord.type, sortedByRoot);
            const rootName = smartNotes[0].replace(/\d+$/, '');
            const typeName = this.#chordTypes[foundChord.type].name;
            
            this.#dom.detectedType.textContent = typeName;
            this.#dom.chordResultDisplay.textContent = `${rootName} ${typeName}`;
            this.#dom.detectedNotes.textContent = smartNotes.join(', ');
            
            const offset = (foundChord.root - this.#currentStep + 12) % 12;
            const degreeMatch = this.#diatonicDegrees.find(d => d.offset === offset);
            
            document.querySelectorAll('.mode-btn').forEach(btn => {
                const mode = btn.dataset.mode;
                const isDiatonic = mode === 'diatonic';
                const isTypeMatch = mode === foundChord.type;
                
                if (isDiatonic) {
                    if (degreeMatch && degreeMatch.type === foundChord.type) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                } else if (isTypeMatch) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            document.querySelectorAll('.degree-btn').forEach(btn => {
                const degree = btn.dataset.degree;
                if (degreeMatch && degree === (this.#diatonicDegrees.indexOf(degreeMatch) + 1).toString()) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    #midiToNoteNameSimple(midi) {
        const noteName = this.#notesSharp[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${noteName}${octave}`;
    }

    #getEnharmonicNotes(rootPc, chordType, sortedMidis) {
        const letters = ["C", "D", "E", "F", "G", "A", "B"];
        const letterToMidi = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
        
        const rootName = this.#getSmartRootName(rootPc);
        const rootLetter = rootName[0];
        const rootLetterIdx = letters.indexOf(rootLetter);
        
        const degreeSteps = [0, 2, 4, 6, 8, 10]; // Support up to 13th chords potentially

        return sortedMidis.map((midi, i) => {
            const pc = midi % 12;
            const octave = Math.floor(midi / 12) - 1;
            
            const targetLetterIdx = (rootLetterIdx + degreeSteps[i]) % 7;
            const targetLetter = letters[targetLetterIdx];
            const targetBaseMidi = letterToMidi[targetLetter];
            
            let diff = (pc - targetBaseMidi + 12) % 12;
            if (diff > 6) diff -= 12;
            
            let accidental = "";
            if (diff === 1) accidental = "#";
            else if (diff === 2) accidental = "##";
            else if (diff === -1) accidental = "b";
            else if (diff === -2) accidental = "bb";
            
            return targetLetter + accidental + octave;
        });
    }

    #getSmartRootName(pc) {
        const circleIndex = this.#circleOfFifthsOrder.indexOf(this.#currentStep);
        const isSharpKey = circleIndex <= 6;
        const scalePcs = [0, 2, 4, 5, 7, 9, 11].map(i => (i + this.#currentStep) % 12);
        const scaleIdx = scalePcs.indexOf(pc);
        
        if (scaleIdx !== -1) {
            const tonicName = isSharpKey ? this.#notesSharp[this.#currentStep] : this.#notesFlat[this.#currentStep];
            let officialTonicName = tonicName;
            if (this.#currentStep === 1) officialTonicName = isSharpKey ? "C#" : "Db";
            if (this.#currentStep === 6) officialTonicName = isSharpKey ? "F#" : "Gb";
            if (this.#currentStep === 11) officialTonicName = isSharpKey ? "B" : "Cb";
            
            const letters = ["C", "D", "E", "F", "G", "A", "B"];
            const letterToMidi = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
            const tonicLetter = officialTonicName[0];
            const tonicLetterIdx = letters.indexOf(tonicLetter);
            const targetLetterIdx = (tonicLetterIdx + scaleIdx) % 7;
            const targetLetter = letters[targetLetterIdx];
            const targetBaseMidi = letterToMidi[targetLetter];
            let diff = (pc - targetBaseMidi + 12) % 12;
            if (diff > 6) diff -= 12;
            let accidental = "";
            if (diff === 1) accidental = "#";
            else if (diff === 2) accidental = "##";
            else if (diff === -1) accidental = "b";
            else if (diff === -2) accidental = "bb";
            return targetLetter + accidental;
        }
        return isSharpKey ? this.#notesSharp[pc] : this.#notesFlat[pc];
    }
}

window.addEventListener('load', () => {
    const dom = {
        fifthsOuterCircle: document.getElementById("fifths-outer-circle"),
        fifthsInnerCircle: document.getElementById("fifths-inner-circle"),
        fifthsLeftBtn: document.getElementById("fifths-rotate-left"),
        fifthsRightBtn: document.getElementById("fifths-rotate-right"),
        pianoContainer: document.querySelector(".piano-container"),
        resetPianoBtn: document.getElementById("reset-piano-btn"),
        chordResultDisplay: document.getElementById("chord-result-display"),
        detectedNotes: document.getElementById("detected-notes"),
        detectedType: document.getElementById("detected-type")
    };
    new ChordCalculator(dom);
});
