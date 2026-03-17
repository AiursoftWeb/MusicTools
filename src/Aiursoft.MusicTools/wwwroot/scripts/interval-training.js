import Piano from './Piano.js';

class IntervalTraining {
    #piano;
    #localizedStrings;
    #intervalKeys;
    #isPlaying = false;
    #isShowingResult = false;
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
                this.nextQuestion();
            });
        });
    }

    #midiToNoteName(midi) {
        const noteName = this.#noteNames[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${noteName}${octave}`;
    }

    async playInterval() {
        if (this.#isPlaying) return;
        this.#isPlaying = true;

        const playButton = document.getElementById('play-button');
        if (playButton) {
            playButton.disabled = true;
            playButton.classList.add('opacity-50');
        }

        const selectedMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'random';
        const baseNote = this.#midiToNoteName(this.#currentBaseMidi);
        const targetNote = this.#midiToNoteName(this.#currentTargetMidi);

        if (selectedMode === 'harmonic') {
            this.#piano.playNote(baseNote, 1.0);
            this.#piano.playNote(targetNote, 1.0);
            await new Promise(r => setTimeout(r, 1200));
        } else {
            this.#piano.playNote(baseNote, 0.5);
            await new Promise(r => setTimeout(r, 600));
            this.#piano.playNote(targetNote, 0.5);
            await new Promise(r => setTimeout(r, 600));
        }

        this.#isPlaying = false;
        if (playButton) {
            playButton.disabled = false;
            playButton.classList.remove('opacity-50');
        }

        // Show options after the first playback
        const optionsContainer = document.getElementById('interval-options-row');
        if (optionsContainer && !this.#isShowingResult) {
            optionsContainer.classList.remove('d-none');
        }
    }

    nextQuestion() {
        this.#isShowingResult = false;
        const selectedMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'random';
        
        let isValid = false;
        while (!isValid) {
            if (selectedMode === 'fixed-c') {
                this.#currentBaseMidi = 60; // Middle C (C4)
            } else {
                this.#currentBaseMidi = 48 + Math.floor(Math.random() * 25); // Random note from C3 (48) to C5 (72)
            }
            
            this.#currentIntervalKey = this.#intervalKeys[Math.floor(Math.random() * this.#intervalKeys.length)];
            this.#currentTargetMidi = this.#currentBaseMidi + this.#intervalSemitones[this.#currentIntervalKey];
            
            // Limit target to G2 (43) to G5 (79)
            if (this.#currentTargetMidi >= 43 && this.#currentTargetMidi <= 79) {
                isValid = true;
            }
        }

        // Update Question UI
        const questionLabel = document.getElementById('question-label');
        if (questionLabel && this.#localizedStrings.questionTemplate) {
             questionLabel.textContent = this.#localizedStrings.questionTemplate;
        }

        // Reset buttons
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

        // Reset Play Button
        const playButtonText = document.getElementById('play-button-text');
        if (playButtonText) {
            playButtonText.textContent = this.#localizedStrings.playInterval;
        }

        // Hide result details
        document.getElementById('result-details')?.classList.add('d-none');
        document.getElementById('interval-options-row')?.classList.remove('d-none');
        this.#piano.clearAllHighlights();
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

            // Wait a bit and next question
            setTimeout(() => {
                this.nextQuestion();
                this.playInterval();
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
window.startIntervalTraining = (pianoContainerId, localizationDataId) => {
    const localizationData = document.getElementById(localizationDataId).dataset;

    const localizedStrings = {
        correct: localizationData.correct,
        wrong: localizationData.wrong,
        giveUp: localizationData.giveUp,
        nextQuestion: localizationData.nextQuestion,
        playInterval: localizationData.playInterval,
        questionTemplate: localizationData.questionTemplate,
        intervals: {
            'm2': localizationData.intM2,
            'maj2': localizationData.intMaj2,
            'm3': localizationData.intM3,
            'maj3': localizationData.intMaj3,
            'p4': localizationData.intP4,
            'a4': localizationData.intA4,
            'p5': localizationData.intP5,
            'm6': localizationData.intM6,
            'maj6': localizationData.intMaj6,
            'm7': localizationData.intM7,
            'maj7': localizationData.intMaj7
        },
        consonancePerfect: localizationData.consonancePerfect,
        consonanceImperfect: localizationData.consonanceImperfect,
        consonanceDissonance: localizationData.consonanceDissonance,
        consonanceSharpDissonance: localizationData.consonanceSharpDissonance
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
        startOctave: 3,
        isClickable: true,
        showNoteNames: true,
        showTonicIndicator: false
    });

    const training = new IntervalTraining(piano, localizedStrings);
    training.setupButtonHandlers();
    return training;
};
