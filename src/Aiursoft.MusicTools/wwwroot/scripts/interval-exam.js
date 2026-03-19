/* =================================================================
 * == interval-exam.js
 * - [!! 真正修复 !!]
 * - calculateInterval 已重构，使用“绝对半音”逻辑
 * - 移除了所有 if (interval.degree === ...) 的补丁
 * ================================================================= */

// --- 1. 核心音乐数据 (不变) ---

const NOTE_TO_SEMITONE = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11,
};
const ACCIDENTAL_TO_VALUE = { '': 0, '#': 1, 'b': -1, '𝄪': 2, '𝄫': -2 };
const VALUE_TO_ACCIDENTAL = { '0': '', '1': '#', '2': '𝄪', '-1': 'b', '-2': '𝄫' };
const SEMITONE_TO_NOTE = [
    { sharp: 'C', flat: 'C' },     // 0
    { sharp: 'C#', flat: 'Db' },   // 1
    { sharp: 'D', flat: 'D' },     // 2
    { sharp: 'D#', flat: 'Eb' },   // 3
    { sharp: 'E', flat: 'Fb' },     // 4
    { sharp: 'E#', flat: 'F' },     // 5
    { sharp: 'F#', flat: 'Gb' },   // 6
    { sharp: 'G', flat: 'G' },     // 7
    { sharp: 'G#', flat: 'Ab' },   // 8
    { sharp: 'A', flat: 'A' },     // 9
    { sharp: 'A#', flat: 'Bb' },   // 10
    { sharp: 'B', flat: 'Cb' }      // 11
];
const NOTE_LETTER_TO_DEGREE = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
const DEGREE_TO_NOTE_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const INTERVAL_DEFINITIONS = {
    'm2': { semis: 1,  degree: 2 },
    'maj2': { semis: 2,  degree: 2 },
    'm3': { semis: 3,  degree: 3 },
    'maj3': { semis: 4,  degree: 3 },
    'p4': { semis: 5,  degree: 4 },
    'a4': { semis: 6,  degree: 4 },
    'd5': { semis: 6,  degree: 5 },
    'p5': { semis: 7,  degree: 5 },
    'm6': { semis: 8,  degree: 6 },
    'a5': { semis: 8,  degree: 5 },
    'maj6': { semis: 9,  degree: 6 },
    'm7': { semis: 10, degree: 7 },
    'maj7': { semis: 11, degree: 7 }
};
const INTERVAL_KEYS = Object.keys(INTERVAL_DEFINITIONS);

const EXAM_PITCHES = [
    'C3', 'C#3', 'D3', 'Eb3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'Bb3', 'B3',
    'C4'
];

// --- 2. 核心考试逻辑 (已重构) ---

class ExamQuestion {
    // ... (constructor, #handleAnswerClick 不变) ...
    #questionStaff;
    #answerStaffs;
    #answerElements;
    #questionLabel;
    #correctAnswerPitch;
    #localizedStrings;

    constructor(questionStaff, answerStaffs, answerElements, questionLabel, localizedStrings) {
        this.#questionStaff = questionStaff;
        this.#answerStaffs = answerStaffs;
        this.#answerElements = answerElements;
        this.#questionLabel = questionLabel;
        this.#localizedStrings = localizedStrings;
        this.#correctAnswerPitch = null;

        this.#answerElements.forEach(element => {
            element.addEventListener('click', this.#handleAnswerClick.bind(this));
        });
    }

    #handleAnswerClick(event) {
        const clickedPitch = event.currentTarget.dataset.pitch;
        if (!clickedPitch) return;

        if (clickedPitch === this.#correctAnswerPitch) {
            alert(this.#localizedStrings.correct);
            this.nextQuestion();
        } else {
            alert(this.#localizedStrings.wrong);
        }
    }


    /**
     * [!! 最终修复 !!]
     * (F#4, 增五度) -> C𝄪5
     * (F#4, 纯八度) -> F#5
     */
    calculateInterval(basePitch, interval) {
        // 1. 解析基础音高 (e.g., F#4)
        const baseLetter = basePitch.charAt(0); // 'F'
        const baseAccidental = (basePitch.length > 2 && (basePitch.charAt(1) === '#' || basePitch.charAt(1) === 'b'))
            ? basePitch.charAt(1)
            : ''; // '#'
        const baseOctave = parseInt(basePitch.slice(baseLetter.length + baseAccidental.length), 10); // 4

        // 2. 计算目标音名 (Degree)
        const baseDegree = NOTE_LETTER_TO_DEGREE[baseLetter]; // F -> 3
        const targetDegree = (baseDegree + interval.degree - 1) % 7; // (3 + 5 - 1) % 7 = 0
        const targetLetter = DEGREE_TO_NOTE_LETTER[targetDegree]; // 0 -> 'C'

        // 3. 计算目标八度
        const targetOctave = baseOctave + Math.floor((baseDegree + interval.degree - 1) / 7); // 4 + floor(7/7) = 5

        // 4. [!! 核心逻辑 !!] 计算偏移量

        // 4a. 目标的 *实际* 绝对半音 (e.g., F#4 + 增五度)
        const baseNaturalSemitone = NOTE_TO_SEMITONE[baseLetter]; // F -> 5
        const baseAccidentalValue = ACCIDENTAL_TO_VALUE[baseAccidental]; // # -> 1
        const baseAbsoluteSemitone = (baseNaturalSemitone + baseAccidentalValue) + ((baseOctave + 1) * 12);
        // F#4 = (5 + 1) + ((4 + 1) * 12) = 66
        const targetAbsoluteSemitone = baseAbsoluteSemitone + interval.semis;
        // 66 + 8 (增五) = 74
        // 66 + 12 (纯八) = 78

        // 4b. 目标的 *自然* 绝对半音 (e.g., C5)
        const targetNaturalSemitone = NOTE_TO_SEMITONE[targetLetter]; // C -> 0
        const targetNaturalAbsoluteSemitone = targetNaturalSemitone + ((targetOctave + 1) * 12);
        // C5 = 0 + ((5 + 1) * 12) = 72
        // (F5 = 5 + ((5 + 1) * 12) = 77)

        // 4c. 偏移量 = 实际 - 自然
        const accidentalValue = targetAbsoluteSemitone - targetNaturalAbsoluteSemitone;
        // 增五: 74 - 72 = 2
        // 纯八: 78 - 77 = 1

        // 5. 查找调号
        const accidentalSymbol = VALUE_TO_ACCIDENTAL[accidentalValue];
        // 2 -> '𝄪'
        // 1 -> '#'

        if (accidentalSymbol === undefined) {
            console.error(`无法计算调号: ${targetLetter} (Value: ${accidentalValue})`);
            return targetLetter + targetOctave;
        }

        return targetLetter + accidentalSymbol + targetOctave; // 'C' + '𝄪' + '5'
    }

    #isPitchInRange(pitch) {
        if (!pitch) return false;
        const baseLetter = pitch.charAt(0);
        const baseAccidental = (pitch.length > 2 && (pitch.charAt(1) === '#' || pitch.charAt(1) === 'b' || pitch.charAt(1) === '𝄪' || pitch.charAt(1) === '𝄫')) ? pitch.slice(1, -1) : '';
        const baseOctave = parseInt(pitch.slice(baseLetter.length + baseAccidental.length), 10);

        const NOTE_TO_SEMI = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
        const ACC_TO_VAL = { '': 0, '#': 1, 'b': -1, '𝄪': 2, '𝄫': -2 };

        const semi = NOTE_TO_SEMI[baseLetter] + (ACC_TO_VAL[baseAccidental] || 0) + (baseOctave + 1) * 12;
        // In MIDI standard, Middle C (C4) is 60.
        // We ensure all exam notes strictly fall within the real C3 (48) to C5 (72) range.
        return semi >= 48 && semi <= 72;
    }

    nextQuestion() {
        // ... (此函数 100% 不变)
        let basePitch, intervalKey, interval, localizedIntervalName;
        let isValid = false;
        while (!isValid) {
            basePitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            intervalKey = INTERVAL_KEYS[Math.floor(Math.random() * INTERVAL_KEYS.length)];
            interval = INTERVAL_DEFINITIONS[intervalKey];
            this.#correctAnswerPitch = this.calculateInterval(basePitch, interval);
            isValid = this.#isPitchInRange(this.#correctAnswerPitch);
        }
        localizedIntervalName = this.#localizedStrings.intervals[intervalKey];
        
        const wrongAnswers = this.generateWrongAnswers(basePitch, interval, this.#correctAnswerPitch);
        const allAnswers = [this.#correctAnswerPitch, ...wrongAnswers];
        this.shuffleArray(allAnswers);

        console.clear();
        console.group("--- 🎵 考试题目调试信息 🎵 ---");
        console.log(`题目 (Question): ${basePitch} 的 ${localizedIntervalName} 是？`);
        console.log(`✅ 计算出的正确答案 (Correct): ${this.#correctAnswerPitch}`);
        console.log(`❌ 生成的错误答案 (Wrong): ${wrongAnswers.join(', ')}`);
        console.log("--- 答案分配 (Assignment) ---");
        console.log(`   ➡️ 答案 1 (ID: ${this.#answerElements[0].id}) 设为: ${allAnswers[0]} ${allAnswers[0] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 2 (ID: ${this.#answerElements[1].id}) 设为: ${allAnswers[1]} ${allAnswers[1] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 3 (ID: ${this.#answerElements[2].id}) 设为: ${allAnswers[2]} ${allAnswers[2] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.groupEnd();

        for (let i = 0; i < this.#answerStaffs.length; i++) {
            this.#answerStaffs[i].showNote(allAnswers[i]);
            this.#answerElements[i].dataset.pitch = allAnswers[i];
        }

        this.#questionStaff.showNote(basePitch);
        this.#questionLabel.innerText = this.#localizedStrings.questionTemplate.replace('(0)', localizedIntervalName);
    }

    generateWrongAnswers(basePitch, interval, correctAnswer) {
        // ... (此函数 100% 不变)
        const wrongAnswers = new Set();
        try {
            const currentIntervalKey = Object.keys(INTERVAL_DEFINITIONS).find(key => INTERVAL_DEFINITIONS[key] === interval);
            const wrongIntervalKey = INTERVAL_KEYS.find(key => key !== currentIntervalKey);
            const wrongInterval = INTERVAL_DEFINITIONS[wrongIntervalKey];
            const wrongAnswer1 = this.calculateInterval(basePitch, wrongInterval);
            if (wrongAnswer1 !== correctAnswer && wrongAnswer1 !== basePitch && this.#isPitchInRange(wrongAnswer1)) {
                wrongAnswers.add(wrongAnswer1);
            }
        } catch (e) { console.error("Error generating wrong answer 1:", e); }

        try {
            const correctLetter = correctAnswer.charAt(0);
            const correctOctave = correctAnswer.slice(-1);
            const correctAccidental = correctAnswer.slice(1, -1);
            const correctAccidentalValue = ACCIDENTAL_TO_VALUE[correctAccidental];
            const correctNaturalSemitone = NOTE_TO_SEMITONE[correctLetter];
            const correctSemitoneIndex = (correctNaturalSemitone + correctAccidentalValue + 12) % 12;
            const possibleNotes = SEMITONE_TO_NOTE[correctSemitoneIndex];
            let enharmonicAnswer = null;
            if (correctAnswer.includes('𝄪') || correctAnswer.includes('#')) {
                if (possibleNotes.flat !== possibleNotes.sharp) {
                    enharmonicAnswer = possibleNotes.flat + correctOctave;
                } else {
                    enharmonicAnswer = possibleNotes.sharp + correctOctave;
                }
            } else if (correctAnswer.includes('𝄫') || correctAnswer.includes('b')) {
                if (possibleNotes.sharp !== possibleNotes.flat) {
                    enharmonicAnswer = possibleNotes.sharp + correctOctave;
                } else {
                    enharmonicAnswer = possibleNotes.flat + correctOctave;
                }
            }
            if (enharmonicAnswer && enharmonicAnswer !== correctAnswer && enharmonicAnswer !== basePitch && this.#isPitchInRange(enharmonicAnswer)) {
                wrongAnswers.add(enharmonicAnswer);
            }
        } catch (e) { console.error("Error generating wrong answer 2:", e); }

        while (wrongAnswers.size < 2) {
            const randomPitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            if (randomPitch !== correctAnswer && randomPitch !== basePitch) {
                wrongAnswers.add(randomPitch);
            }
        }
        return Array.from(wrongAnswers);
    }

    shuffleArray(array) {
        // ... (此函数不变) ...
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

window.ExamQuestion = ExamQuestion;
export default ExamQuestion;
