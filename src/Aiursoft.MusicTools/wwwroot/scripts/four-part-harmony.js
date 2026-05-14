import Piano from './Piano.js';
import MusicStaff from './MusicStaff.js';
import { FourPartHarmonyGenerator } from './FourPartHarmonyGenerator.js';
import { getLocalizedText } from './localization.js';

class FourPartHarmony {
    constructor(domElements, localizedStrings) {
        this.dom = domElements;
        this.loc = localizedStrings;

        this.generator = new FourPartHarmonyGenerator();
        this.piano = null;
        this.sopranoStaffs = [];
        this.bassStaffs = [];

        this.currentHarmony = null;
        this.options = [];
        this.correctIndex = -1;
        this.isPlaying = false;
        this.isAnswered = false;
        this.playCount = 0;
        this.correctCount = 0;
        this.wrongCount = 0;

        this.timerInterval = null;
        this.timeLeft = 60;
        this.#playAbortController = null;

        this._init();
    }

    #playAbortController;

    _init() {
        // Initialize piano with a reasonable range
        this.piano = new Piano(document.createElement('div'), {
            isClickable: true,
            octaves: 5,
            startOctave: 1
        });

        // Initialize 4 pairs of staffs
        for (let i = 0; i < 4; i++) {
            this.sopranoStaffs.push(new MusicStaff(`soprano-staff-${i}`, { clef: 'treble', baseX: 60 }));
            this.bassStaffs.push(new MusicStaff(`bass-staff-${i}`, { clef: 'bass', baseX: 60 }));
        }

        // Event listeners
        this.dom.btnStart.addEventListener('click', () => this.startGame());
        this.dom.btnPlayHarmony.addEventListener('click', () => this.playHarmony());
        this.dom.btnNext.addEventListener('click', () => this.nextQuestion());

        this.dom.optionCards.forEach((card, index) => {
            card.addEventListener('click', () => this._handleChoice(index));
        });
    }

    async startGame() {
        this.dom.startOverlay.classList.add('d-none');
        this.dom.gameBoard.classList.remove('d-none');

        const originalBtnHtml = this.dom.btnPlayHarmony.innerHTML;
        this.dom.btnPlayHarmony.disabled = true;
        this.dom.btnPlayHarmony.querySelector('span').textContent = this.loc.loading;

        await this.piano.waitForSamples();

        this.dom.btnPlayHarmony.disabled = false;
        this.dom.btnPlayHarmony.innerHTML = originalBtnHtml;

        this.nextQuestion();
    }

    nextQuestion() {
        this._stopTimer();
        this.isAnswered = false;
        this.isPlaying = false;
        this.playCount = 0;
        this.timeLeft = 60;

        if (this.#playAbortController) {
            this.#playAbortController.abort();
            this.#playAbortController = null;
        }
        this.piano.stopAll();

        this._updateUI();
        this.dom.btnNext.classList.add('d-none');
        this.dom.optionCards.forEach(card => {
            card.classList.remove('correct', 'wrong');
            card.style.pointerEvents = 'auto';
        });

        const mode = document.querySelector('input[name="harmonyMode"]:checked').value;
        const key = mode === 'major' ? 'C' : 'Am';

        // Generate correct harmony
        this.currentHarmony = this.generator.generate(key);

        // Generate 3 distractors
        this.options = [{ harmony: this.currentHarmony, isCorrect: true }];
        while (this.options.length < 4) {
            const distractor = this.generator.generate(key);
            if (!this._isHarmonyEqual(distractor, this.currentHarmony)) {
                this.options.push({ harmony: distractor, isCorrect: false });
            }
        }

        this._shuffleArray(this.options);
        this.correctIndex = this.options.findIndex(o => o.isCorrect);

        // Render options
        this.options.forEach((opt, idx) => {
            // Pattern: 2 bars of quarter notes (8) + 1 bar whole note (1). Total 9 chords.
            const sopranoMelody = opt.harmony.chords.map((c, i) => ({
                pitch: c.soprano,
                duration: i === 8 ? 4 : 1,
                time: i < 8 ? i : 8
            }));
            const bassMelody = opt.harmony.chords.map((c, i) => ({
                pitch: c.bass,
                duration: i === 8 ? 4 : 1,
                time: i < 8 ? i : 8
            }));

            this.sopranoStaffs[idx].showMelody(sopranoMelody);
            this.bassStaffs[idx].showMelody(bassMelody);

            // Roman numerals
            const romanText = opt.harmony.chords.map(c => c.roman).join(' ');
            document.getElementById(`roman-${idx}`).textContent = romanText;
        });

        this.playHarmony();
        this._startTimer();
    }

    async playHarmony() {
        if (this.isPlaying || this.playCount >= 3 || this.isAnswered) return;

        this.isPlaying = true;
        this.playCount++;
        this._updateUI();

        const currentAbortController = new AbortController();
        this.#playAbortController = currentAbortController;
        const signal = currentAbortController.signal;

        try {
            const beatDuration = 1.0; // 60 BPM for clear hearing
            for (let i = 0; i < this.currentHarmony.chords.length; i++) {
                const chord = this.currentHarmony.chords[i];
                const duration = i === 8 ? 3.0 : 0.8;

                // Play all 4 parts
                this.piano.playNote(chord.soprano, duration, false);
                this.piano.playNote(chord.alto, duration, false);
                this.piano.playNote(chord.tenor, duration, false);
                this.piano.playNote(chord.bass, duration, false);

                if (i < this.currentHarmony.chords.length - 1) {
                    await this.#delay(beatDuration * 1000, signal);
                }
            }
            await this.#delay(1000, signal);
        } catch (e) {
            console.log('Playback aborted');
        } finally {
            this.isPlaying = false;
            this._updateUI();
            this.#playAbortController = null;
        }
    }

    _startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this._updateUI();
            if (this.timeLeft <= 0) {
                this._handleTimeout();
            }
        }, 1000);
    }

    _stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    _handleTimeout() {
        this._stopTimer();
        if (this.isAnswered) return;
        this.isAnswered = true;
        alert(this.loc.timeout);
        this._showCorrectAnswer();
    }

    _handleChoice(index) {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this._stopTimer();

        if (index === this.correctIndex) {
            this.correctCount++;
            this.dom.optionCards[index].classList.add('correct');
        } else {
            this.wrongCount++;
            this.dom.optionCards[index].classList.add('wrong');
            this._showCorrectAnswer();
        }

        this.dom.btnNext.classList.remove('d-none');
        this._updateUI();
    }

    _showCorrectAnswer() {
        this.dom.optionCards[this.correctIndex].classList.add('correct');
        this.dom.optionCards.forEach(card => card.style.pointerEvents = 'none');
    }

    _updateUI() {
        // Timer
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        this.dom.timerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (this.timeLeft <= 10) this.dom.timerText.parentElement.classList.add('low');
        else this.dom.timerText.parentElement.classList.remove('low');

        // Play count
        this.dom.playCountText.textContent = `${this.playCount} / 3`;
        this.dom.btnPlayHarmony.disabled = this.isPlaying || this.playCount >= 3 || this.isAnswered;

        // Score
        this.dom.correctCountLabel.textContent = this.correctCount;
        this.dom.wrongCountLabel.textContent = this.wrongCount;
    }

    _isHarmonyEqual(h1, h2) {
        if (h1.chords.length !== h2.chords.length) return false;
        for (let i = 0; i < h1.chords.length; i++) {
            if (h1.chords[i].soprano !== h2.chords[i].soprano ||
                h1.chords[i].bass !== h2.chords[i].bass ||
                h1.chords[i].roman !== h2.chords[i].roman) {
                return false;
            }
        }
        return true;
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    #delay(ms, signal) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (signal?.aborted) reject(new Error('Aborted'));
                else resolve();
            }, ms);
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new Error('Aborted'));
                }, { once: true });
            }
        });
    }
}

window.startFourPartHarmony = () => {
    const dom = {
        startOverlay: document.getElementById('start-overlay'),
        gameBoard: document.getElementById('game-board'),
        btnStart: document.getElementById('btn-start'),
        btnPlayHarmony: document.getElementById('btn-play-harmony'),
        btnNext: document.getElementById('btn-next'),
        timerText: document.getElementById('timer-text'),
        playCountText: document.getElementById('play-count-text'),
        correctCountLabel: document.getElementById('correct-count'),
        wrongCountLabel: document.getElementById('wrong-count'),
        optionCards: Array.from({length: 4}, (_, i) => document.getElementById(`option-${i}`))
    };

    const loc = {
        correct: getLocalizedText('correct', 'Correct!'),
        wrong: getLocalizedText('wrong', 'Wrong!'),
        timeout: getLocalizedText('timeout', "Time's up!"),
        loading: getLocalizedText('loading', 'Loading...')
    };

    return new FourPartHarmony(dom, loc);
};
