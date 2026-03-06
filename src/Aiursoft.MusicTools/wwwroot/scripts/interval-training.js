import Piano from './Piano.js';

class IntervalTraining {
    #piano;
    #localizedStrings;
    #intervalKeys;
    #intervalSemitones = {
        'p1': 0, 'm2': 1, 'maj2': 2, 'm3': 3, 'maj3': 4,
        'p4': 5, 'a4': 6, 'd5': 6, 'p5': 7, 'a5': 8,
        'm6': 8, 'maj6': 9, 'm7': 10, 'maj7': 11, 'p8': 12
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
        playButton.addEventListener('click', () => this.playInterval());

        const intervalButtons = document.querySelectorAll('.interval-btn');
        intervalButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.#handleAnswer(e.currentTarget));
        });
    }

    #midiToNoteName(midi) {
        const noteName = this.#noteNames[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${noteName}${octave}`;
    }

    async playInterval() {
        const baseNote = this.#midiToNoteName(this.#currentBaseMidi);
        const targetNote = this.#midiToNoteName(this.#currentTargetMidi);

        this.#piano.playNote(baseNote, 0.5);
        await new Promise(r => setTimeout(r, 600));
        this.#piano.playNote(targetNote, 0.5);
    }

    nextQuestion() {
        this.#currentBaseMidi = 60 + Math.floor(Math.random() * 12); // Random note from C4 to B4
        this.#currentIntervalKey = this.#intervalKeys[Math.floor(Math.random() * this.#intervalKeys.length)];
        this.#currentTargetMidi = this.#currentBaseMidi + this.#intervalSemitones[this.#currentIntervalKey];

        // Reset buttons
        document.querySelectorAll('.interval-btn').forEach(btn => {
            btn.classList.remove('btn-success', 'btn-danger');
            btn.classList.add('btn-outline-secondary');
            btn.disabled = false;
        });
    }

    #handleAnswer(button) {
        const selectedKey = button.dataset.key;
        const selectedSemitones = this.#intervalSemitones[selectedKey];
        const correctSemitones = this.#intervalSemitones[this.#currentIntervalKey];

        if (selectedSemitones === correctSemitones) {
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
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-danger');
        }
    }
}

// Global entry point
window.startIntervalTraining = (pianoContainerId, localizationDataId) => {
    const localizationData = document.getElementById(localizationDataId).dataset;

    const localizedStrings = {
        correct: localizationData.correct,
        wrong: localizationData.wrong,
        intervals: {
            'p1': localizationData.intP1,
            'm2': localizationData.intM2,
            'maj2': localizationData.intMaj2,
            'm3': localizationData.intM3,
            'maj3': localizationData.intMaj3,
            'p4': localizationData.intP4,
            'a4': localizationData.intA4,
            'd5': localizationData.intD5,
            'p5': localizationData.intP5,
            'a5': localizationData.intA5,
            'm6': localizationData.intM6,
            'maj6': localizationData.intMaj6,
            'm7': localizationData.intM7,
            'maj7': localizationData.intMaj7,
            'p8': localizationData.intP8
        }
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

    const piano = new Piano(document.getElementById(pianoContainerId), {
        octaves: 3,
        startOctave: 3,
        isClickable: true,
        showNoteNames: false,
        showTonicIndicator: false
    });

    return new IntervalTraining(piano, localizedStrings);
};
