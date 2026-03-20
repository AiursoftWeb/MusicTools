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
        this.#playAbortController = null;
        
        this.wrongMelodies = [];
        this.allChoices = [];
        
        this._init();
    }

    #playAbortController;

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
        if (this.#playAbortController) {
            this.#playAbortController.abort();
        }
        this.piano.stopAll();
        this.isPlaying = false;
        this.dom.btnPlayMelody.disabled = false;

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

    // ... (rest of methods)

    async playMelody() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.dom.btnPlayMelody.disabled = true;

        if (this.#playAbortController) {
            this.#playAbortController.abort();
        }
        const currentAbortController = new AbortController();
        this.#playAbortController = currentAbortController;
        const signal = currentAbortController.signal;

        this.playCount++;
        console.log(`Playing melody. Count: ${this.playCount}`);
        
        this.piano.stopAll();
        const beatDuration = 0.5; // 120 BPM

        try {
            // Sort notes by time just in case
            const sortedNotes = [...this.currentMelody].sort((a, b) => a.time - b.time);
            
            let currentTime = 0;
            for (const note of sortedNotes) {
                const waitTime = (note.time - currentTime) * beatDuration * 1000;
                if (waitTime > 0) {
                    await this.#delay(waitTime, signal);
                }
                currentTime = note.time;

                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

                // Sound and Visual
                const duration = note.duration * beatDuration;
                this.piano.playNote(note.pitch, duration, false); 

                const keyEl = this.dom.pianoContainer.querySelector(`[data-note="${note.pitch}"]`);
                if (keyEl) {
                    keyEl.classList.add('playing');
                    setTimeout(() => keyEl.classList.remove('playing'), duration * 800);
                }
            }

            // Final wait for last note
            const lastNote = sortedNotes[sortedNotes.length - 1];
            if (lastNote) {
                await this.#delay(lastNote.duration * beatDuration * 1000 + 100, signal);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                return;
            }
            throw e;
        } finally {
            if (this.#playAbortController === currentAbortController) {
                this.isPlaying = false;
                this.dom.btnPlayMelody.disabled = false;
            }
        }
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
