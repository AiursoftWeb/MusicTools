/* =================================================================
 * == interval-exam.js
 * - [!! 语法修复 !!] 移除了 calculateInterval 中重复的 'accidentalValue' 声明
 * ================================================================= */

// --- 1. 核心音乐数据 (已修改) ---

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
    'p1': { semis: 0,  degree: 1 },
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
    'maj7': { semis: 11, degree: 7 },
    'p8': { semis: 12, degree: 8 }
};
const INTERVAL_KEYS = Object.keys(INTERVAL_DEFINITIONS);

const EXAM_PITCHES = [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
    'C#4', 'Eb4', 'F#4', 'G#4', 'Bb4'
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
     * [!! 核心修复 !!]
     * 移除了重复的 'accidentalValue' 声明
     */
    calculateInterval(basePitch, interval) {
        // 1. 解析基础音高
        const baseLetter = basePitch.charAt(0);
        const baseAccidental = (basePitch.length > 2 && (basePitch.charAt(1) === '#' || basePitch.charAt(1) === 'b'))
            ? basePitch.charAt(1)
            : '';
        const baseOctave = parseInt(basePitch.slice(baseLetter.length + baseAccidental.length), 10);

        // 2. 获取基础音的 "自然" 半音值
        const baseNaturalSemitone = NOTE_TO_SEMITONE[baseLetter];
        const baseAccidentalValue = ACCIDENTAL_TO_VALUE[baseAccidental];

        if (baseNaturalSemitone === undefined) {
            console.error(`无法解析 baseLetter: ${baseLetter} (来自 ${basePitch})`);
            return "C4";
        }

        // 3. 计算目标音名 (Degree)
        const baseDegree = NOTE_LETTER_TO_DEGREE[baseLetter];
        const targetDegree = (baseDegree + interval.degree - 1) % 7;
        const targetLetter = DEGREE_TO_NOTE_LETTER[targetDegree];

        // 4. 计算目标八度
        const targetOctave = baseOctave + Math.floor((baseDegree + interval.degree - 1) / 7);

        // 5. [!! 核心 !!] 计算目标调号 (Accidental)

        // 5a. 目标的 "自然" 半音值 (0-11)
        const targetNaturalSemitone = NOTE_TO_SEMITONE[targetLetter];

        // 5b. "自然" 音程的半音数 (F -> C)
        let naturalDistance = targetNaturalSemitone - baseNaturalSemitone;
        if (naturalDistance < 0) {
            naturalDistance += 12; // (e.g., F(5) -> C(0) = -5 -> 7)
        }

        // [!! 移除的 Bug 在这里 !!]
        // 我之前在这里留下了一个错误的、重复的 'const accidentalValue' 声明

        // 5c. 计算 "调号偏移"
        // 偏移 = (要求的半音) - (自然的半音) + (基础音的偏移)
        // e.g., (增五度: 8) - (纯五度: 7) + (F# 的: +1)
        const accidentalValue = interval.semis - naturalDistance + baseAccidentalValue; // 8 - 7 + 1 = 2

        // 5d. 查找调号
        const accidentalSymbol = VALUE_TO_ACCIDENTAL[accidentalValue]; // 2 -> '𝄪'

        if (accidentalSymbol === undefined) {
            console.error(`无法计算调号: ${targetLetter} (Value: ${accidentalValue})`);
            return targetLetter + targetOctave;
        }

        return targetLetter + accidentalSymbol + targetOctave; // 'C' + '𝄪' + 5
    }

    nextQuestion() {
        // ... (此函数不变) ...
        const basePitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
        const intervalKey = INTERVAL_KEYS[Math.floor(Math.random() * INTERVAL_KEYS.length)];
        const interval = INTERVAL_DEFINITIONS[intervalKey];
        const localizedIntervalName = this.#localizedStrings.intervals[intervalKey];
        this.#correctAnswerPitch = this.calculateInterval(basePitch, interval);
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
        // ... (此函数不变) ...
        const wrongAnswers = new Set();
        try {
            const currentIntervalKey = Object.keys(INTERVAL_DEFINITIONS).find(key => INTERVAL_DEFINITIONS[key] === interval);
            const wrongIntervalKey = INTERVAL_KEYS.find(key => key !== currentIntervalKey);
            const wrongInterval = INTERVAL_DEFINITIONS[wrongIntervalKey];
            const wrongAnswer1 = this.calculateInterval(basePitch, wrongInterval);
            if (wrongAnswer1 !== correctAnswer) {
                wrongAnswers.add(wrongAnswer1);
            }
        } catch (e) { console.error("Error generating wrong answer 1:", e); }

        try {
            // 错误答案 2: 异名同音 (e.g., C𝄪5 -> D5)
            const correctLetter = correctAnswer.charAt(0);
            const correctOctave = correctAnswer.slice(-1);
            const correctAccidental = correctAnswer.slice(1, -1);

            const correctAccidentalValue = ACCIDENTAL_TO_VALUE[correctAccidental];
            const correctNaturalSemitone = NOTE_TO_SEMITONE[correctLetter];

            const correctSemitoneIndex = (correctNaturalSemitone + correctAccidentalValue + 12) % 12; // +12 确保是正数

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

            if (enharmonicAnswer && enharmonicAnswer !== correctAnswer) {
                wrongAnswers.add(enharmonicAnswer);
            }
        } catch (e) { console.error("Error generating wrong answer 2:", e); }

        while (wrongAnswers.size < 2) {
            const randomPitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            if (randomPitch !== correctAnswer) {
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
