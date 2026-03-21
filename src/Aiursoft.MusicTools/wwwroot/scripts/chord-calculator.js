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
    
    // Major scale intervals for inner degree visualization
    #majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
    
    #triadTypes = {
        'major': { name: getLocalizedText('major-triad', 'Major Triad'), intervals: [4, 3] },
        'minor': { name: getLocalizedText('minor-triad', 'Minor Triad'), intervals: [3, 4] },
        'diminished': { name: getLocalizedText('diminished-triad', 'Diminished Triad'), intervals: [3, 3] },
        'augmented': { name: getLocalizedText('augmented-triad', 'Augmented Triad'), intervals: [4, 4] }
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
        this.#updateUIFromControls(false); // Initial load, don't play
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
                if (this.#activeNotes.length > 3) {
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
        // 1. Create outer notes
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

        // 2. Create inner degrees
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
        const intervals = this.#triadTypes[chordType].intervals;
        
        const note1 = rootIndex;
        const note2 = (rootIndex + intervals[0]) % 12;
        const note3 = (rootIndex + intervals[0] + intervals[1]) % 12;
        
        const startOctave = 3;
        this.#activeNotes = [
            rootIndex + (startOctave + 1) * 12,
            note2 + (startOctave + (note2 < rootIndex ? 2 : 1)) * 12,
            note3 + (startOctave + (note3 < rootIndex ? 2 : 1)) * 12
        ].sort((a, b) => a - b);
        
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
        if (this.#activeNotes.length !== 3) {
            this.#dom.detectedNotes.textContent = this.#activeNotes.length > 0 
                ? this.#activeNotes.map(m => this.#midiToNoteNameSimple(m)).join(', ') 
                : '--';
            this.#dom.detectedType.textContent = '--';
            this.#dom.chordResultDisplay.textContent = '--';
            
            document.querySelectorAll('.degree-btn').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.mode-btn').forEach(i => i.classList.remove('active'));
            return;
        }

        let pitchClasses = [...new Set(this.#activeNotes.map(m => m % 12))].sort((a, b) => a - b);
        if (pitchClasses.length !== 3) {
             this.#dom.detectedType.textContent = getLocalizedText('invalid-chord', 'Invalid Chord');
             return;
        }

        let foundChord = null;
        let sortedNotes = [...this.#activeNotes].sort((a, b) => a - b);
        let normalizedPcs = sortedNotes.map(n => n % 12);

        for (let i = 0; i < 3; i++) {
            const n1 = normalizedPcs[0];
            const n2 = normalizedPcs[1];
            const n3 = normalizedPcs[2];
            
            const diff1 = (n2 - n1 + 12) % 12;
            const diff2 = (n3 - n2 + 12) % 12;
            
            for (const [type, data] of Object.entries(this.#triadTypes)) {
                if (diff1 === data.intervals[0] && diff2 === data.intervals[1]) {
                    foundChord = { root: n1, type: type, originalRootMidi: sortedNotes[0] };
                    break;
                }
            }
            if (foundChord) break;
            
            sortedNotes = [sortedNotes[1], sortedNotes[2], sortedNotes[0] + 12];
            normalizedPcs = sortedNotes.map(n => n % 12);
        }

        if (!foundChord) {
            this.#dom.detectedType.textContent = getLocalizedText('invalid-chord', 'Invalid Chord');
            this.#dom.chordResultDisplay.textContent = getLocalizedText('invalid-chord', 'Invalid Chord');
            document.querySelectorAll('.degree-btn').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.mode-btn').forEach(i => i.classList.remove('active'));
            this.#dom.detectedNotes.textContent = this.#activeNotes.map(m => this.#midiToNoteNameSimple(m)).join(', ');
        } else {
            const smartNotes = this.#getEnharmonicNotes(foundChord.root, foundChord.type, sortedNotes);
            const rootName = smartNotes[0].replace(/\d+$/, '');
            const typeName = this.#triadTypes[foundChord.type].name;
            
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
        
        return sortedMidis.map((midi, i) => {
            const pc = midi % 12;
            const octave = Math.floor(midi / 12) - 1;
            
            const degree = (i === 0 ? 1 : (i === 1 ? 3 : 5));
            const targetLetterIdx = (rootLetterIdx + (degree === 1 ? 0 : (degree === 3 ? 2 : 4))) % 7;
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
