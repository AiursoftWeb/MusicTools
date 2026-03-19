import Piano from './Piano.js';
import AudioPlayer from './AudioPlayer.js';
import MusicStaff from './MusicStaff.js';
import { ShortMelodyGenerator } from './ShortMelodyGenerator.js';
import * as Tone from 'tone';
import { getLocalizedText } from './localization.js';

class ShortMelodyDictation {
    constructor(domElements, localizedStrings) {
        this.dom = domElements;
        this.loc = localizedStrings;
        
        this.generator = new ShortMelodyGenerator();
        this.piano = null;
        this.audioPlayer = null;
        
        this.currentMelody = [];
        this.userAttempt = [];
        this.mode = 'A'; // 'A' for piano, 'B' for staff
        this.playCount = 0;
        this.isPlaying = false;
        
        this.wrongMelodies = [];
        this.allChoices = [];
        
        this._init();
    }

    _init() {
        this.piano = new Piano(this.dom.pianoContainer, {
            octaves: 2,
            startOctave: 3,
            isClickable: true,
            showNoteNames: true,
            showTonicIndicator: true,
            localizedTonicText: "C"
        });

        this.piano.onClick((note) => {
            if (this.mode === 'A') {
                this._handlePianoClick(note);
            }
        });

        this.dom.btnStart.addEventListener('click', () => this.startGame());
        this.dom.btnPlayMelody.addEventListener('click', () => this.playMelody());
        this.dom.btnPlayStandard.addEventListener('click', () => this.playStandardPitch());
        this.dom.btnNext.addEventListener('click', () => this.nextQuestion());

        this.answerStaffs = [
            new MusicStaff(this.dom.answerStaffContainers[0].id, { clef: 'treble' }),
            new MusicStaff(this.dom.answerStaffContainers[1].id, { clef: 'treble' }),
            new MusicStaff(this.dom.answerStaffContainers[2].id, { clef: 'treble' })
        ];

        this.dom.answerElements.forEach((el, index) => {
            el.addEventListener('click', () => this._handleStaffChoice(index));
        });
    }

    startGame() {
        this.dom.startOverlay.classList.add('d-none');
        this.dom.gameBoard.classList.remove('d-none');
        this.nextQuestion();
    }

    nextQuestion() {
        const bars = parseInt(document.querySelector('input[name="bars"]:checked').value);
        const timeSignature = document.querySelector('input[name="timeSignature"]:checked').value;
        this.mode = document.querySelector('input[name="gameMode"]:checked').value;

        this.currentMelody = this.generator.generate(bars, timeSignature);
        this.userAttempt = [];
        this.playCount = 0;
        
        if (this.mode === 'A') {
            this.dom.pianoArea.classList.remove('d-none');
            this.dom.staffArea.classList.add('d-none');
        } else {
            this.dom.pianoArea.classList.add('d-none');
            this.dom.staffArea.classList.remove('d-none');
            this._setupStaffChoices();
        }

        this.playMelody();
    }

    _setupStaffChoices() {
        this.wrongMelodies = [
            this._generateWrongMelody(this.currentMelody),
            this._generateWrongMelody(this.currentMelody)
        ];

        this.allChoices = [
            { melody: this.currentMelody, correct: true },
            { melody: this.wrongMelodies[0], correct: false },
            { melody: this.wrongMelodies[1], correct: false }
        ];

        this._shuffleArray(this.allChoices);

        this.allChoices.forEach((choice, index) => {
            this.answerStaffs[index].showMelody(choice.melody);
        });
    }

    _generateWrongMelody(original) {
        const wrong = JSON.parse(JSON.stringify(original));
        const numChanges = Math.floor(Math.random() * 2) + 1; // 1 or 2
        for (let i = 0; i < numChanges; i++) {
            const indexToChange = Math.floor(Math.random() * wrong.length);
            const originalPitch = wrong[indexToChange].pitch;
            let newPitchObj;
            do {
                newPitchObj = this.generator.pitches[Math.floor(Math.random() * this.generator.pitches.length)];
            } while (newPitchObj.name === originalPitch);
            
            wrong[indexToChange].pitch = newPitchObj.name;
            wrong[indexToChange].midi = newPitchObj.midi;
        }
        return wrong;
    }

    playMelody() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.dom.btnPlayMelody.disabled = true;

        this.playCount++;
        console.log(`Playing melody. Count: ${this.playCount}`);
        
        this.piano.stopAll();
        const beatDuration = 0.5; // 120 BPM
        let maxTimeMs = 0;

        this.currentMelody.forEach(note => {
            const startTimeMs = note.time * beatDuration * 1000;
            const durationMs = note.duration * beatDuration * 1000;
            maxTimeMs = Math.max(maxTimeMs, startTimeMs + durationMs);
            
            // Visual feedback on piano
            setTimeout(() => {
                const keyEl = this.dom.pianoContainer.querySelector(`[data-note="${note.pitch}"]`);
                if (keyEl) {
                    keyEl.classList.add('playing');
                    setTimeout(() => keyEl.classList.remove('playing'), durationMs * 0.8);
                }
            }, startTimeMs);

            // Sound
            setTimeout(() => {
                this.piano.playNote(note.pitch, note.duration * beatDuration, false); 
            }, startTimeMs);
        });

        setTimeout(() => {
            this.isPlaying = false;
            this.dom.btnPlayMelody.disabled = false;
        }, maxTimeMs + 100);
    }

    playStandardPitch() {
        this.piano.playNote("C4", 1.0, true);
    }

    _handlePianoClick(note) {
        this.userAttempt.push(note);
        const expectedNote = this.currentMelody[this.userAttempt.length - 1].pitch;
        
        if (note !== expectedNote) {
            alert(this.loc.wrong);
            this.userAttempt = [];
            return;
        }

        if (this.userAttempt.length === this.currentMelody.length) {
            alert(this.loc.correct);
            this.nextQuestion();
        }
    }

    _handleStaffChoice(index) {
        if (this.allChoices[index].correct) {
            alert(this.loc.correct);
            this.nextQuestion();
        } else {
            alert(this.loc.wrong);
        }
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

window.ShortMelodyDictation = ShortMelodyDictation;

window.startShortMelodyDictation = () => {
    const dom = {
        startOverlay: document.getElementById('start-overlay'),
        gameBoard: document.getElementById('game-board'),
        btnStart: document.getElementById('btn-start'),
        btnPlayMelody: document.getElementById('btn-play-melody'),
        btnPlayStandard: document.getElementById('btn-play-standard'),
        btnNext: document.getElementById('btn-next'),
        pianoArea: document.getElementById('piano-area'),
        staffArea: document.getElementById('staff-area'),
        pianoContainer: document.getElementById('piano-container'),
        answerStaffContainers: [
            document.getElementById('staff-answer1-container'),
            document.getElementById('staff-answer2-container'),
            document.getElementById('staff-answer3-container')
        ],
        answerElements: [
            document.getElementById('staff-answer1-container'),
            document.getElementById('staff-answer2-container'),
            document.getElementById('staff-answer3-container')
        ]
    };

    const loc = {
        correct: getLocalizedText('correct', 'Correct!'),
        wrong: getLocalizedText('wrong', 'Wrong. Try again!')
    };

    return new ShortMelodyDictation(dom, loc);
};

export default ShortMelodyDictation;
