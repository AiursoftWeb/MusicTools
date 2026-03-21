import Piano from './Piano.js';
import { getLocalizedText } from './localization.js';

class ChordTraining {
    #piano;
    #localizedStrings;
    #chordTypes = {
        'triad': {
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'dimidished': [0, 3, 6],
            'augmented': [0, 4, 8]
        },
        'seventh': {
            'maj7': [0, 4, 7, 11],
            'dom7': [0, 4, 7, 10],
            'min7': [0, 3, 7, 10],
            'm7b5': [0, 3, 6, 10],
            'dim7': [0, 3, 6, 9]
        }
    };
    
    #isPlaying = false;
    #isShowingResult = false;
    #playAbortController = null;
    #correctCount = 0;
    #wrongCount = 0;
    
    #currentBaseMidi;
    #currentChordKey;
    #currentInversion; 
    #currentFunctionalNotes = []; // Stores objects: { midi: number, funcIdx: number }
    #autoNextTimeout = null;
    #noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    #notesFlat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    #lastQuestion = null;

    constructor(piano, localizedStrings) {
        this.#piano = piano;
        this.#localizedStrings = localizedStrings;
        this.#setupEventListeners();
        this.#refreshOptions();
        this.nextQuestion();
    }

    #setupEventListeners() {
        const playButton = document.getElementById('play-button');
        playButton.addEventListener('click', () => {
            if (this.#autoNextTimeout) {
                clearTimeout(this.#autoNextTimeout);
                this.#autoNextTimeout = null;
            }
            if (this.#isShowingResult) {
                this.nextQuestion();
                this.playChord();
            } else {
                this.playChord();
            }
        });

        const modeRadios = document.querySelectorAll('input[name="start-mode"], input[name="voicing-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.#autoNextTimeout) {
                    clearTimeout(this.#autoNextTimeout);
                    this.#autoNextTimeout = null;
                }
                this.nextQuestion();
            });
        });

        const categoryRadios = document.querySelectorAll('input[name="chord-category"]');
        categoryRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.#refreshOptions();
                this.nextQuestion();
            });
        });
    }

    #refreshOptions() {
        const category = document.querySelector('input[name="chord-category"]:checked')?.value || 'triad';
        const chordOptionsContainer = document.getElementById('chord-options');
        chordOptionsContainer.innerHTML = '';

        const chords = this.#chordTypes[category];
        Object.keys(chords).forEach(key => {
            const col = document.createElement('div');
            col.className = 'col';
            const button = document.createElement('button');
            button.className = 'btn btn-outline-secondary w-100 py-3 rounded-3 shadow-sm chord-btn';
            button.dataset.key = key;
            button.textContent = this.#localizedStrings.chords[key];
            button.addEventListener('click', (e) => this.#handleAnswer(e.currentTarget));
            col.appendChild(button);
            chordOptionsContainer.appendChild(col);
        });

        const giveUpCol = document.createElement('div');
        giveUpCol.className = 'col';
        const giveUpButton = document.createElement('button');
        giveUpButton.className = 'btn btn-outline-warning w-100 py-3 rounded-3 shadow-sm chord-btn';
        giveUpButton.dataset.key = 'give-up';
        giveUpButton.textContent = this.#localizedStrings.giveUp;
        giveUpButton.addEventListener('click', (e) => this.#handleAnswer(e.currentTarget));
        giveUpCol.appendChild(giveUpButton);
        chordOptionsContainer.appendChild(giveUpCol);
    }

    #midiToNoteName(midi) {
        const noteName = this.#noteNames[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${noteName}${octave}`;
    }

    #delay(ms, signal) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (signal?.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                } else {
                    resolve();
                }
            }, ms);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new DOMException('Aborted', 'AbortError'));
                }, { once: true });
            }
        });
    }

    #setPlayButtonLoading(isLoading) {
        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.disabled = isLoading;
            if (isLoading) {
                playButton.classList.add('opacity-50');
            } else {
                playButton.classList.remove('opacity-50');
            }
        }
    }

    async playChord() {
        try {
            if (this.#isPlaying) return;
            this.#isPlaying = true;

            if (this.#playAbortController) {
                this.#playAbortController.abort();
            }
            const currentAbortController = new AbortController();
            this.#playAbortController = currentAbortController;
            const signal = currentAbortController.signal;

            this.#setPlayButtonLoading(true);

            const playMode = document.querySelector('input[name="play-mode"]:checked')?.value || 'block';
            const notesToPlay = this.#currentFunctionalNotes.map(n => this.#midiToNoteName(n.midi));

            this.#piano.stopAll();

            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            if (playMode === 'block') {
                notesToPlay.forEach(note => {
                    this.#piano.playNote(note, 1.0);
                });
                await this.#delay(1200, signal);
            } else if (playMode === 'arpeggio') {
                // Play in physical pitch order for arpeggio
                const sortedNotes = [...this.#currentFunctionalNotes].sort((a, b) => a.midi - b.midi);
                for (const n of sortedNotes) {
                    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                    this.#piano.playNote(this.#midiToNoteName(n.midi), 0.7);
                    await this.#delay(400, signal);
                }
                await this.#delay(600, signal);
            }
            
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            await this.#delay(1000, signal);
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.error('[ChordTraining] Error playing chord:', e);
        } finally {
            this.#isPlaying = false;
            this.#setPlayButtonLoading(false);
            this.#playAbortController = null;

            const optionsContainer = document.getElementById('chord-options-row');
            if (optionsContainer && !this.#isShowingResult) {
                optionsContainer.classList.remove('d-none');
            }
        }
    }

    nextQuestion() {
        try {
            if (this.#playAbortController) {
                this.#playAbortController.abort();
                this.#playAbortController = null;
            }
            if (this.#autoNextTimeout) {
                clearTimeout(this.#autoNextTimeout);
                this.#autoNextTimeout = null;
            }
            this.#piano.stopAll();
            this.#isPlaying = false;
            this.#setPlayButtonLoading(false);

            document.querySelectorAll('.chord-btn').forEach(btn => {
                btn.classList.remove('btn-success', 'btn-danger');
                btn.classList.remove('btn-outline-secondary', 'btn-outline-warning');
                if (btn.dataset.key === 'give-up') {
                    btn.classList.add('btn-outline-warning');
                } else {
                    btn.classList.add('btn-outline-secondary');
                }
                btn.disabled = false;
            });

            this.#isShowingResult = false;
            const category = document.querySelector('input[name="chord-category"]:checked')?.value || 'triad';
            const startMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'random';
            const voicingMode = document.querySelector('input[name="voicing-mode"]:checked')?.value || 'root';
            
            const chordsInCategory = this.#chordTypes[category];
            const keysInCategory = Object.keys(chordsInCategory);

            let isValid = false;
            let iterations = 0;
            
            while (!isValid && iterations < 100) {
                iterations++;
                
                this.#currentChordKey = keysInCategory[Math.floor(Math.random() * keysInCategory.length)];

                if (startMode === 'fixed-c') {
                    this.#currentBaseMidi = 60;
                } else {
                    this.#currentBaseMidi = 48 + Math.floor(Math.random() * 24); 
                    if (this.#currentBaseMidi % 12 === 0) {
                        this.#currentBaseMidi = 60;
                    }
                }

                const absoluteOffsets = chordsInCategory[this.#currentChordKey];
                const noteCount = absoluteOffsets.length;

                if (voicingMode === 'root') {
                    this.#currentInversion = 0;
                } else {
                    this.#currentInversion = Math.floor(Math.random() * noteCount);
                }
                
                // Track identity: funcIdx 0=root, 1=3rd, 2=5th, 3=7th
                let notesWithFunction = absoluteOffsets.map((offset, index) => ({
                    midi: this.#currentBaseMidi + offset,
                    funcIdx: index
                }));
                
                // Apply inversions by shifting the lowest functional note
                for(let i = 0; i < this.#currentInversion; i++) {
                    let lowest = notesWithFunction.reduce((prev, curr) => (curr.midi < prev.midi ? curr : prev));
                    lowest.midi += 12;
                }

                const midis = notesWithFunction.map(n => n.midi);
                if (Math.max(...midis) <= 72 && Math.min(...midis) >= 48) {
                    const questionState = `${this.#currentBaseMidi}-${this.#currentChordKey}-${this.#currentInversion}`;
                    if (questionState !== this.#lastQuestion || iterations > 50) {
                        isValid = true;
                        this.#lastQuestion = questionState;
                        this.#currentFunctionalNotes = notesWithFunction;
                    }
                }
            }
            
            const questionLabel = document.getElementById('question-label');
            if (questionLabel && this.#localizedStrings.questionTemplate) {
                 questionLabel.textContent = this.#localizedStrings.questionTemplate;
            }

            const playButtonText = document.getElementById('play-button-text');
            if (playButtonText) {
                playButtonText.textContent = this.#localizedStrings.playChord;
            }

            document.getElementById('result-details')?.classList.add('d-none');
            document.getElementById('chord-options-row')?.classList.remove('d-none');
            this.#piano.clearAllHighlights();
        } catch (e) {
            console.error('[ChordTraining] Error in nextQuestion:', e);
            document.querySelectorAll('.chord-btn').forEach(btn => btn.disabled = false);
            this.#setPlayButtonLoading(false);
        }
    }

    #handleAnswer(button) {
        const selectedKey = button.dataset.key;
        if (selectedKey === 'give-up') {
            this.#showResult();
            return;
        }
        if (selectedKey === this.#currentChordKey) {
            this.#correctCount++;
            document.getElementById('correct-count').textContent = this.#correctCount;
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-success');
            document.querySelectorAll('.chord-btn').forEach(btn => btn.disabled = true);
            this.#setPlayButtonLoading(true);
            if (this.#autoNextTimeout) clearTimeout(this.#autoNextTimeout);
            this.#autoNextTimeout = setTimeout(() => {
                this.nextQuestion();
                this.playChord();
                this.#autoNextTimeout = null;
            }, 1000);
        } else {
            this.#wrongCount++;
            document.getElementById('wrong-count').textContent = this.#wrongCount;
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-danger');
            button.disabled = true;
        }
    }

    #getSmartNoteName(rootPc, midi, funcIdx) {
        const letters = ["C", "D", "E", "F", "G", "A", "B"];
        const letterToMidi = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
        
        const rootNameSimple = this.#notesFlat[rootPc];
        const rootLetter = rootNameSimple[0];
        const rootLetterIdx = letters.indexOf(rootLetter);
        const degreeSteps = [0, 2, 4, 6];

        const pc = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        const targetLetterIdx = (rootLetterIdx + degreeSteps[funcIdx]) % 7;
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
    }

    #showResult() {
        this.#isShowingResult = true;
        document.getElementById('chord-options-row')?.classList.add('d-none');
        const resultDetails = document.getElementById('result-details');
        if (resultDetails) {
            resultDetails.classList.remove('d-none');
        }

        const rootPc = this.#currentBaseMidi % 12;
        
        const chordName = this.#localizedStrings.chords[this.#currentChordKey];
        let inversionText = this.#localizedStrings.rootPosition;
        if (this.#currentInversion === 1) inversionText = this.#localizedStrings.firstInversion;
        if (this.#currentInversion === 2) inversionText = this.#localizedStrings.secondInversion;
        if (this.#currentInversion === 3) inversionText = this.#localizedStrings.thirdInversion;

        document.getElementById('result-chord-name').textContent = chordName;
        document.getElementById('result-inversion').textContent = inversionText;

        // Populate results using the tracked MIDI values
        const rootObj = this.#currentFunctionalNotes.find(n => n.funcIdx === 0);
        const thirdObj = this.#currentFunctionalNotes.find(n => n.funcIdx === 1);
        const fifthObj = this.#currentFunctionalNotes.find(n => n.funcIdx === 2);
        const seventhObj = this.#currentFunctionalNotes.find(n => n.funcIdx === 3);

        document.getElementById('result-root-note').textContent = this.#getSmartNoteName(rootPc, rootObj.midi, 0);
        document.getElementById('result-third-note').textContent = this.#getSmartNoteName(rootPc, thirdObj.midi, 1);
        document.getElementById('result-fifth-note').textContent = this.#getSmartNoteName(rootPc, fifthObj.midi, 2);

        const seventhRow = document.getElementById('result-seventh-row');
        if (seventhObj) {
            seventhRow?.classList.remove('d-none');
            document.getElementById('result-seventh-note').textContent = this.#getSmartNoteName(rootPc, seventhObj.midi, 3);
        } else {
            seventhRow?.classList.add('d-none');
        }

        const notesToHighlight = this.#currentFunctionalNotes.map(n => this.#midiToNoteName(n.midi));
        this.#piano.clearAllHighlights();
        this.#piano.highlightKeys(notesToHighlight, 'select-highlight');

        const playButtonText = document.getElementById('play-button-text');
        if (playButtonText) {
            playButtonText.textContent = this.#localizedStrings.nextQuestion;
        }
    }
}

window.startChordTraining = (pianoContainerId) => {
    const localizedStrings = {
        correct: getLocalizedText('correct', 'Correct!'),
        wrong: getLocalizedText('wrong', 'Wrong.'),
        giveUp: getLocalizedText('give-up', 'I give up'),
        nextQuestion: getLocalizedText('next-question', 'Next Question'),
        playChord: getLocalizedText('play-chord', 'Play Chord'),
        questionTemplate: getLocalizedText('question-template', 'What is the type of the chord played?'),
        rootPosition: getLocalizedText('root-position', 'Root Position'),
        firstInversion: getLocalizedText('first-inversion', 'First Inversion'),
        secondInversion: getLocalizedText('second-inversion', 'Second Inversion'),
        thirdInversion: getLocalizedText('third-inversion', 'Third Inversion'),
        rootNote: getLocalizedText('root-note', 'Root note'),
        thirdNote: getLocalizedText('third-note', 'Third note'),
        fifthNote: getLocalizedText('fifth-note', 'Fifth note'),
        seventhNote: getLocalizedText('seventh-note', 'Seventh note'),
        chords: {
            'major': getLocalizedText('chord-major', 'Major Triad'),
            'minor': getLocalizedText('chord-minor', 'Minor Triad'),
            'dimidished': getLocalizedText('chord-diminished', 'Diminished Triad'),
            'augmented': getLocalizedText('chord-augmented', 'Augmented Triad'),
            'maj7': getLocalizedText('chord-maj7', 'Major 7th'),
            'dom7': getLocalizedText('chord-dom7', 'Dominant 7th'),
            'min7': getLocalizedText('chord-min7', 'Minor 7th'),
            'm7b5': getLocalizedText('chord-m7b5', 'Half-Diminished 7th'),
            'dim7': getLocalizedText('chord-dim7', 'Diminished 7th')
        }
    };

    const piano = new Piano(document.getElementById(pianoContainerId), {
        octaves: 3,
        startOctave: 2,
        isClickable: true,
        showNoteNames: true,
        showTonicIndicator: false
    });

    return new ChordTraining(piano, localizedStrings);
};
