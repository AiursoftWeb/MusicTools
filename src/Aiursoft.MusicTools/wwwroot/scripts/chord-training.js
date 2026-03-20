import Piano from './Piano.js';
import { getLocalizedText } from './localization.js';

class ChordTraining {
    #piano;
    #localizedStrings;
    #chordKeys;
    #isPlaying = false;
    #isShowingResult = false;
    #playAbortController = null;
    #correctCount = 0;
    #wrongCount = 0;
    
    // Chord intervals from root (in semitones)
    #chordTypes = {
        'major': [0, 4, 7],
        'minor': [0, 3, 7],
        'diminished': [0, 3, 6],
        'augmented': [0, 4, 8]
    };
    
    #currentBaseMidi;
    #currentChordKey;
    #currentInversion; // 0: Root, 1: 1st Inversion, 2: 2nd Inversion
    #currentNotesMidi = [];
    
    #noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    constructor(piano, localizedStrings) {
        this.#piano = piano;
        this.#localizedStrings = localizedStrings;
        this.#chordKeys = Object.keys(this.#chordTypes);
        this.#setupEventListeners();
        this.nextQuestion();
    }

    #setupEventListeners() {
        const playButton = document.getElementById('play-button');
        playButton.addEventListener('click', () => {
            if (this.#isShowingResult) {
                this.nextQuestion();
                this.playChord();
            } else {
                this.playChord();
            }
        });

        const modeRadios = document.querySelectorAll('input[name="start-mode"], input[name="scale-mode"], input[name="voicing-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.nextQuestion();
            });
        });
    }

    #midiToNoteName(midi) {
        const noteName = this.#noteNames[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${noteName}${octave}`;
    }

    #delay(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                return reject(new DOMException('Aborted', 'AbortError'));
            }
            const timer = setTimeout(resolve, ms);
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
        const playButtonIcon = playButton?.querySelector('i');
        const playIconClass = 'bi bi-play-fill fs-3';
        const spinnerClass = 'spinner-border spinner-border-sm';

        if (playButton) {
            playButton.disabled = isLoading;
            if (isLoading) {
                playButton.classList.add('opacity-50');
                if (playButtonIcon) {
                    playButtonIcon.className = spinnerClass;
                }
            } else {
                playButton.classList.remove('opacity-50');
                if (playButtonIcon) {
                    playButtonIcon.className = playIconClass;
                }
            }
        }
    }

    async playChord() {
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
        const notesToPlay = this.#currentNotesMidi.map(midi => this.#midiToNoteName(midi));

        this.#piano.stopAll();

        try {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            if (playMode === 'block') {
                notesToPlay.forEach(note => {
                    this.#piano.playNote(note, 1.0);
                });
                await this.#delay(1200, signal);
            } else if (playMode === 'arpeggio') {
                for (const note of notesToPlay) {
                    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                    this.#piano.playNote(note, 0.7);
                    await this.#delay(400, signal);
                }
                await this.#delay(600, signal); // Pause after arpeggio
            }
            
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            // Hard cooldown
            await this.#delay(1000, signal);
        } catch (e) {
            if (e.name === 'AbortError') {
                return;
            }
            throw e;
        } finally {
            if (this.#playAbortController === currentAbortController) {
                this.#isPlaying = false;
                this.#setPlayButtonLoading(false);

                // Show options after the first playback
                const optionsContainer = document.getElementById('chord-options-row');
                if (optionsContainer && !this.#isShowingResult) {
                    optionsContainer.classList.remove('d-none');
                }
            }
        }
    }

    nextQuestion() {
        if (this.#playAbortController) {
            this.#playAbortController.abort();
        }
        this.#piano.stopAll();
        this.#isPlaying = false;
        this.#setPlayButtonLoading(false);

        this.#isShowingResult = false;
        const startMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'random';
        const scaleMode = document.querySelector('input[name="scale-mode"]:checked')?.value || 'c-major';
        const voicingMode = document.querySelector('input[name="voicing-mode"]:checked')?.value || 'root';
        
        let isValid = false;
        let notesMidi;
        
        while (!isValid) {
            if (scaleMode === 'c-major') {
                const whiteKeys = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71];
                const whiteKeyToType = {
                    0: 'major', // C
                    2: 'minor', // D
                    4: 'minor', // E
                    5: 'major', // F
                    7: 'major', // G
                    9: 'minor', // A
                    11: 'diminished' // B
                };
                
                if (startMode === 'fixed-c') {
                    this.#currentBaseMidi = 60;
                } else {
                    this.#currentBaseMidi = whiteKeys[Math.floor(Math.random() * whiteKeys.length)];
                }
                this.#currentChordKey = whiteKeyToType[this.#currentBaseMidi % 12];
            } else {
                if (startMode === 'fixed-c') {
                    this.#currentBaseMidi = 60; 
                } else {
                    this.#currentBaseMidi = 48 + Math.floor(Math.random() * 12); 
                }
                this.#currentChordKey = this.#chordKeys[Math.floor(Math.random() * this.#chordKeys.length)];
            }

            if (voicingMode === 'root') {
                this.#currentInversion = 0;
            } else {
                this.#currentInversion = Math.floor(Math.random() * 3); // 0, 1, or 2
            }
            
            // Calculate notes based on chord type and inversion
            const intervals = this.#chordTypes[this.#currentChordKey];
            notesMidi = intervals.map(interval => this.#currentBaseMidi + interval);
            
            if (this.#currentInversion === 1) {
                // First inversion: root note goes up an octave
                notesMidi[0] += 12;
                notesMidi.sort((a, b) => a - b);
            } else if (this.#currentInversion === 2) {
                // Second inversion: root and third go up an octave
                notesMidi[0] += 12;
                notesMidi[1] += 12;
                notesMidi.sort((a, b) => a - b);
            }

            // Ensure all notes are within the real C3 (48) to C5 (72) range
            if (notesMidi[notesMidi.length - 1] <= 72 && notesMidi[0] >= 48) {
                isValid = true;
            }
        }
        
        this.#currentNotesMidi = notesMidi;

        // Update Question UI
        const questionLabel = document.getElementById('question-label');
        if (questionLabel && this.#localizedStrings.questionTemplate) {
             questionLabel.textContent = this.#localizedStrings.questionTemplate;
        }

        // Reset buttons
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

        // Reset Play Button
        const playButtonText = document.getElementById('play-button-text');
        if (playButtonText) {
            playButtonText.textContent = this.#localizedStrings.playChord;
        }

        // Hide result details
        document.getElementById('result-details')?.classList.add('d-none');
        document.getElementById('chord-options-row')?.classList.remove('d-none');
        this.#piano.clearAllHighlights();
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
            
            // Disable all buttons to prevent multiple clicks
            document.querySelectorAll('.chord-btn').forEach(btn => btn.disabled = true);

            // Wait a bit and next question
            setTimeout(() => {
                this.nextQuestion();
                this.playChord();
            }, 1000);
        } else {
            this.#wrongCount++;
            document.getElementById('wrong-count').textContent = this.#wrongCount;

            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-danger');
            button.disabled = true; // Disable current wrong button
        }
    }

    #showResult() {
        this.#isShowingResult = true;
        
        // Hide options
        document.getElementById('chord-options-row')?.classList.add('d-none');
        
        // Show details
        const resultDetails = document.getElementById('result-details');
        if (resultDetails) {
            resultDetails.classList.remove('d-none');
        }

        const chordName = this.#localizedStrings.chords[this.#currentChordKey];
        
        let inversionText = this.#localizedStrings.rootPosition;
        if (this.#currentInversion === 1) inversionText = this.#localizedStrings.firstInversion;
        if (this.#currentInversion === 2) inversionText = this.#localizedStrings.secondInversion;

        const nameEl = document.getElementById('result-chord-name');
        if (nameEl) nameEl.textContent = chordName;

        const inversionEl = document.getElementById('result-inversion');
        if (inversionEl) inversionEl.textContent = inversionText;

        // Highlight piano
        const notesToHighlight = this.#currentNotesMidi.map(midi => this.#midiToNoteName(midi));
        this.#piano.clearAllHighlights();
        this.#piano.highlightKeys(notesToHighlight, 'select-highlight');

        // Change Play Button to Next Question
        const playButtonText = document.getElementById('play-button-text');
        if (playButtonText) {
            playButtonText.textContent = this.#localizedStrings.nextQuestion;
        }
    }

    // Set up answer handlers for dynamically created buttons
    setupButtonHandlers() {
        document.querySelectorAll('.chord-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.#handleAnswer(e.currentTarget));
        });
    }
}

// Global entry point
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
        chords: {
            'major': getLocalizedText('chord-major', 'Major Triad'),
            'minor': getLocalizedText('chord-minor', 'Minor Triad'),
            'diminished': getLocalizedText('chord-diminished', 'Diminished Triad'),
            'augmented': getLocalizedText('chord-augmented', 'Augmented Triad')
        }
    };

    const chordKeys = Object.keys(localizedStrings.chords);
    const chordOptionsContainer = document.getElementById('chord-options');

    chordKeys.forEach(key => {
        const col = document.createElement('div');
        col.className = 'col';
        const button = document.createElement('button');
        button.className = 'btn btn-outline-secondary w-100 py-3 rounded-3 shadow-sm chord-btn';
        button.dataset.key = key;
        button.textContent = localizedStrings.chords[key];
        col.appendChild(button);
        chordOptionsContainer.appendChild(col);
    });

    // Add "I give up" button
    const giveUpCol = document.createElement('div');
    giveUpCol.className = 'col';
    const giveUpButton = document.createElement('button');
    giveUpButton.className = 'btn btn-outline-warning w-100 py-3 rounded-3 shadow-sm chord-btn';
    giveUpButton.dataset.key = 'give-up';
    giveUpButton.textContent = localizedStrings.giveUp;
    giveUpCol.appendChild(giveUpButton);
    chordOptionsContainer.appendChild(giveUpCol);

    const piano = new Piano(document.getElementById(pianoContainerId), {
        octaves: 3,
        startOctave: 2,
        isClickable: true,
        showNoteNames: true,
        showTonicIndicator: false
    });

    const training = new ChordTraining(piano, localizedStrings);
    training.setupButtonHandlers();
    return training;
};
