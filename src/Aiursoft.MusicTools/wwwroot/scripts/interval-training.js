import Piano from './Piano.js';
import { getLocalizedText } from './localization.js';

class IntervalTraining {
    #piano;
    #localizedStrings;
    #intervalKeys;
    #isPlaying = false;
    #isShowingResult = false;
    #playAbortController = null;
    #correctCount = 0;
    #wrongCount = 0;
    #intervalSemitones = {
        'm2': 1, 'maj2': 2, 'm3': 3, 'maj3': 4,
        'p4': 5, 'a4': 6, 'p5': 7, 'm6': 8, 'maj6': 9, 
        'm7': 10, 'maj7': 11
    };
    #currentBaseMidi;
    #currentIntervalKey;
    #currentTargetMidi;
    #autoNextTimeout = null;
    #noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    constructor(piano, localizedStrings) {
        this.#piano = piano;
        this.#localizedStrings = localizedStrings;
        this.#intervalKeys = Object.keys(localizedStrings.intervals);
        this.#setupEventListeners();
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
                this.playInterval();
            } else {
                this.playInterval();
            }
        });

        const modeRadios = document.querySelectorAll('input[name="start-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (this.#autoNextTimeout) {
                    clearTimeout(this.#autoNextTimeout);
                    this.#autoNextTimeout = null;
                }
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

    async playInterval() {
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

            // --- NEW: Wait for High-Quality Samples ---
            if (this.#piano && !this.#piano.isLoaded) {
                const playButtonText = document.getElementById('play-button-text');
                const originalText = playButtonText ? playButtonText.textContent : '';
                if (playButtonText) playButtonText.textContent = 'Loading...';

                await this.#piano.waitForSamples();

                if (playButtonText) playButtonText.textContent = originalText;
            }

            const selectedMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'random';
            const baseNote = this.#midiToNoteName(this.#currentBaseMidi);
            const targetNote = this.#midiToNoteName(this.#currentTargetMidi);

            this.#piano.stopAll();

            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            if (selectedMode === 'harmonic') {
                this.#piano.playNote(baseNote, 1.0);
                this.#piano.playNote(targetNote, 1.0);
                await this.#delay(1200, signal);
            } else {
                this.#piano.playNote(baseNote, 0.5);
                await this.#delay(600, signal);
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                this.#piano.playNote(targetNote, 0.5);
                await this.#delay(600, signal);
            }

            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            // Hard cooldown 1.5s
            await this.#delay(1500, signal);
        } catch (e) {
            if (e.name === 'AbortError') {
                return;
            }
            console.error('[IntervalTraining] Error playing interval:', e);
        } finally {
            this.#isPlaying = false;
            this.#setPlayButtonLoading(false);
            this.#playAbortController = null;

            // Show options after the first playback
            const optionsContainer = document.getElementById('interval-options-row');
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

            // Reset buttons early
            document.querySelectorAll('.interval-btn').forEach(btn => {
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
            const selectedMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'random';
            
            let isValid = false;
            let iterations = 0;
            while (!isValid && iterations < 100) {
                iterations++;
                if (selectedMode === 'fixed-c') {
                    // In MIDI standard, Middle C (C4) is 60.
                    this.#currentBaseMidi = 60; 
                } else {
                    // Ensure base note does not cause target note to easily exceed C5 (72).
                    // Base note ranges from C3 (48) to B3 (59).
                    this.#currentBaseMidi = 48 + Math.floor(Math.random() * 12); 
                }
                
                this.#currentIntervalKey = this.#intervalKeys[Math.floor(Math.random() * this.#intervalKeys.length)];
                this.#currentTargetMidi = this.#currentBaseMidi + this.#intervalSemitones[this.#currentIntervalKey];
                
                // Ensure target falls within real C3 (48) to C5 (72)
                if (this.#currentTargetMidi >= 48 && this.#currentTargetMidi <= 72) {
                    isValid = true;
                }
            }

            // Update Question UI
            const questionLabel = document.getElementById('question-label');
            if (questionLabel && this.#localizedStrings.questionTemplate) {
                 questionLabel.textContent = this.#localizedStrings.questionTemplate;
            }

            // Reset Play Button
            const playButtonText = document.getElementById('play-button-text');
            if (playButtonText) {
                playButtonText.textContent = this.#localizedStrings.playInterval;
            }

            // Hide result details
            document.getElementById('result-details')?.classList.add('d-none');
            document.getElementById('interval-options-row')?.classList.remove('d-none');
            this.#piano.clearAllHighlights();
        } catch (e) {
            console.error('[IntervalTraining] Error in nextQuestion:', e);
            document.querySelectorAll('.interval-btn').forEach(btn => btn.disabled = false);
            this.#setPlayButtonLoading(false);
        }
    }

    #handleAnswer(button) {
        const selectedKey = button.dataset.key;
        
        if (selectedKey === 'give-up') {
            this.#showResult();
            return;
        }

        const selectedSemitones = this.#intervalSemitones[selectedKey];
        const correctSemitones = this.#intervalSemitones[this.#currentIntervalKey];

        if (selectedSemitones === correctSemitones) {
            this.#correctCount++;
            document.getElementById('correct-count').textContent = this.#correctCount;

            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-success');
            
            // Disable all buttons to prevent multiple clicks
            document.querySelectorAll('.interval-btn').forEach(btn => btn.disabled = true);
            this.#setPlayButtonLoading(true);

            // Wait a bit and next question
            if (this.#autoNextTimeout) clearTimeout(this.#autoNextTimeout);
            this.#autoNextTimeout = setTimeout(() => {
                this.nextQuestion();
                this.playInterval();
                this.#autoNextTimeout = null;
            }, 1000);
        } else {
            this.#wrongCount++;
            document.getElementById('wrong-count').textContent = this.#wrongCount;

            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-danger');
            button.disabled = true; // Disable current wrong button
        }
    }

    #getConsonanceLevel(semitones) {
        const mod = semitones % 12;
        switch (mod) {
            case 0: // P1, P8
            case 5: // P4
            case 7: // P5
                return this.#localizedStrings.consonancePerfect;
            case 3: // m3
            case 4: // M3
            case 8: // m6
            case 9: // M6
                return this.#localizedStrings.consonanceImperfect;
            case 2: // M2
            case 10: // m7
                return this.#localizedStrings.consonanceDissonance;
            case 1: // m2
            case 6: // Tritone
            case 11: // M7
                return this.#localizedStrings.consonanceSharpDissonance;
            default:
                return "";
        }
    }

    #showResult() {
        this.#isShowingResult = true;
        
        // Hide options
        document.getElementById('interval-options-row')?.classList.add('d-none');
        
        // Show details
        const resultDetails = document.getElementById('result-details');
        if (resultDetails) {
            resultDetails.classList.remove('d-none');
        }

        const intervalName = this.#localizedStrings.intervals[this.#currentIntervalKey];
        const semitones = this.#intervalSemitones[this.#currentIntervalKey];
        const consonance = this.#getConsonanceLevel(semitones);

        const nameEl = document.getElementById('result-interval-name');
        if (nameEl) nameEl.textContent = intervalName;

        const consonanceEl = document.getElementById('result-consonance');
        if (consonanceEl) consonanceEl.textContent = consonance;

        // Highlight piano
        const baseNote = this.#midiToNoteName(this.#currentBaseMidi);
        const targetNote = this.#midiToNoteName(this.#currentTargetMidi);
        this.#piano.clearAllHighlights();
        this.#piano.highlightKeys([baseNote, targetNote], 'select-highlight');

        // Change Play Button to Next Question
        const playButtonText = document.getElementById('play-button-text');
        if (playButtonText) {
            playButtonText.textContent = this.#localizedStrings.nextQuestion;
        }
    }

    // Set up answer handlers for dynamically created buttons
    setupButtonHandlers() {
        document.querySelectorAll('.interval-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.#handleAnswer(e.currentTarget));
        });
    }
}

// Global entry point
window.startIntervalTraining = (pianoContainerId) => {
    const localizedStrings = {
        correct: getLocalizedText('correct', 'Correct!'),
        wrong: getLocalizedText('wrong', 'Wrong.'),
        giveUp: getLocalizedText('give-up', 'I give up'),
        nextQuestion: getLocalizedText('next-question', 'Next Question'),
        playInterval: getLocalizedText('play-interval', 'Play Interval'),
        questionTemplate: getLocalizedText('question-template', 'What is the interval of the notes played?'),
        intervals: {
            'm2': getLocalizedText('int-m2', 'Minor Second'),
            'maj2': getLocalizedText('int-maj2', 'Major Second'),
            'm3': getLocalizedText('int-m3', 'Minor Third'),
            'maj3': getLocalizedText('int-maj3', 'Major Third'),
            'p4': getLocalizedText('int-p4', 'Perfect Fourth'),
            'a4': getLocalizedText('int-a4', 'Augmented Fourth'),
            'p5': getLocalizedText('int-p5', 'Perfect Fifth'),
            'm6': getLocalizedText('int-m6', 'Minor Sixth'),
            'maj6': getLocalizedText('int-maj6', 'Major Sixth'),
            'm7': getLocalizedText('int-m7', 'Minor Seventh'),
            'maj7': getLocalizedText('int-maj7', 'Major Seventh')
        },
        consonancePerfect: getLocalizedText('consonance-perfect', 'Perfect Consonance'),
        consonanceImperfect: getLocalizedText('consonance-imperfect', 'Imperfect Consonance'),
        consonanceDissonance: getLocalizedText('consonance-dissonance', 'Dissonance'),
        consonanceSharpDissonance: getLocalizedText('consonance-sharp-dissonance', 'Sharp Dissonance')
    };

    const intervalKeys = Object.keys(localizedStrings.intervals);
    const intervalOptionsContainer = document.getElementById('interval-options');

    intervalKeys.forEach(key => {
        const col = document.createElement('div');
        col.className = 'col';
        const button = document.createElement('button');
        button.className = 'btn btn-outline-secondary w-100 py-3 rounded-3 shadow-sm interval-btn';
        button.dataset.key = key;
        button.textContent = localizedStrings.intervals[key];
        col.appendChild(button);
        intervalOptionsContainer.appendChild(col);
    });

    // Add "I give up" button
    const giveUpCol = document.createElement('div');
    giveUpCol.className = 'col';
    const giveUpButton = document.createElement('button');
    giveUpButton.className = 'btn btn-outline-warning w-100 py-3 rounded-3 shadow-sm interval-btn';
    giveUpButton.dataset.key = 'give-up';
    giveUpButton.textContent = localizedStrings.giveUp;
    giveUpCol.appendChild(giveUpButton);
    intervalOptionsContainer.appendChild(giveUpCol);

    const piano = new Piano(document.getElementById(pianoContainerId), {
        octaves: 3,
        startOctave: 2,
        isClickable: true,
        showNoteNames: true,
        showTonicIndicator: false
    });

    const training = new IntervalTraining(piano, localizedStrings);
    training.setupButtonHandlers();
    return training;
};
