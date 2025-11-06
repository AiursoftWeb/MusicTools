/* =================================================================
 * == interval-exam.js
 * - 使用新的 MusicStaff.js 控件
 * - 保留了 'calculateInterval' 的核心音程计算逻辑
 * - 将点击事件绑定到 HTML 容器，而不是 staff 控件
 * ================================================================= */

// --- 1. 核心音乐数据 (与你的版本 100% 相同) ---

const NOTE_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10,
    'Cb': 11, 'Fb': 4, 'E#': 5 // <--- 新增
};

// [!! 修复 !!] 修正了 4, 5, 11 的 flat/sharp 定义
const SEMITONE_TO_NOTE = [
    { sharp: 'C', flat: 'C' },     // 0
    { sharp: 'C#', flat: 'Db' },   // 1
    { sharp: 'D', flat: 'D' },     // 2
    { sharp: 'D#', flat: 'Eb' },   // 3
    { sharp: 'E', flat: 'Fb' },     // 4  <--- 修正 (之前是 E/E)
    { sharp: 'E#', flat: 'F' },     // 5  <--- 修正 (之前是 F/F)
    { sharp: 'F#', flat: 'Gb' },   // 6
    { sharp: 'G', flat: 'G' },     // 7
    { sharp: 'G#', flat: 'Ab' },   // 8
    { sharp: 'A', flat: 'A' },     // 9
    { sharp: 'A#', flat: 'Bb' },   // 10
    { sharp: 'B', flat: 'Cb' }      // 11 <--- 修正 (之前是 B/B)
];

const NOTE_LETTER_TO_DEGREE = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
const DEGREE_TO_NOTE_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const INTERVALS = {
    '纯一度':   { semis: 0,  degree: 1 },
    '小二度':   { semis: 1,  degree: 2 },
    '大二度':   { semis: 2,  degree: 2 },
    '小三度':   { semis: 3,  degree: 3 },
    '大三度':   { semis: 4,  degree: 3 },
    '纯四度':   { semis: 5,  degree: 4 },
    '增四度':   { semis: 6,  degree: 4 }, // (三全音)
    '减五度':   { semis: 6,  degree: 5 }, // (三全音)
    '纯五度':   { semis: 7,  degree: 5 },
    '小六度':   { semis: 8,  degree: 6 }, // (注意: 增五度 和 小六度 异名同音)
    '增五度':   { semis: 8,  degree: 5 },
    '大六度':   { semis: 9,  degree: 6 },
    '小七度':   { semis: 10, degree: 7 },
    '大七度':   { semis: 11, degree: 7 },
    '纯八度':   { semis: 12, degree: 8 }
};
const INTERVAL_NAMES = Object.keys(INTERVALS);

const EXAM_PITCHES = [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
    'C#4', 'Eb4', 'F#4', 'G#4', 'Bb4'
];

// --- 2. 核心考试逻辑 (已重构) ---

class ExamQuestion {
    #questionStaff;
    #answerStaffs;
    #answerElements; // [新] HTML 容器 (div)
    #questionLabel;
    #correctAnswerPitch;

    /**
     * [修改] 构造函数现在接收 staff 实例 *和* 它们可点击的 HTML 容器
     */
    constructor(questionStaff, answerStaffs, answerElements, questionLabel) {
        this.#questionStaff = questionStaff;
        this.#answerStaffs = answerStaffs;
        this.#answerElements = answerElements; // 你的 .exam-answer 元素
        this.#questionLabel = questionLabel;
        this.#correctAnswerPitch = null;

        // [修改] 将点击事件绑定到 HTML 元素，而不是 staff 控件
        this.#answerElements.forEach(element => {
            // 使用 .bind(this) 确保 'this' 在处理器中指向 ExamQuestion 实例
            element.addEventListener('click', this.#handleAnswerClick.bind(this));
        });
    }

    /**
     * [新] 处理答案点击
     */
    #handleAnswerClick(event) {
        // 从 HTML 元素的 data-* 属性中获取音高
        const clickedPitch = event.currentTarget.dataset.pitch;
        if (!clickedPitch) return; // 防止意外点击

        if (clickedPitch === this.#correctAnswerPitch) {
            alert('正确! (Correct!)');
            // [可选] 可以在这里添加一个短暂的绿色高亮
            this.nextQuestion(); // 进入下一题
        } else {
            alert('错误。 (Wrong.)');
            // [可选] 可以在这里添加一个短暂的红色高亮
        }
    }

    /**
     * 核心功能：计算 (音1 + 音程) -> 音2
     * (这个函数与你的版本 100% 相同，因为它是完美的)
     */
    calculateInterval(basePitch, interval) {
        // 1. 解析基础音高
        const baseLetter = basePitch.charAt(0);
        const baseAccidental = basePitch.length > 2 ? basePitch.charAt(1) : '';
        const baseOctave = parseInt(basePitch.slice(baseAccidental.length + 1), 10);
        const basePitchName = baseLetter + baseAccidental;

        // 2. 计算目标半音
        const baseSemitone = NOTE_TO_SEMITONE[basePitchName];
        if (baseSemitone === undefined) {
            console.error(`无法解析 basePitchName: ${basePitchName} (来自 ${basePitch})`);
            return "C4"; // 安全回退
        }
        const targetSemitone_raw = baseSemitone + interval.semis;
        const targetSemitone = targetSemitone_raw % 12;

        // 3. 计算目标音名 (C, D, E...)
        const baseDegree = NOTE_LETTER_TO_DEGREE[baseLetter];
        const targetDegree = (baseDegree + interval.degree - 1) % 7;
        const targetLetter = DEGREE_TO_NOTE_LETTER[targetDegree];

        // 4. 计算目标八度
        const targetOctave = baseOctave + Math.floor((baseDegree + interval.degree - 1) / 7);

        // 5. 组合答案：找到与目标音名 (targetLetter) 匹配的半音
        const possibleNotes = SEMITONE_TO_NOTE[targetSemitone];

        let finalPitchName;
        if (possibleNotes.sharp.startsWith(targetLetter)) {
            finalPitchName = possibleNotes.sharp;
        } else if (possibleNotes.flat.startsWith(targetLetter)) {
            finalPitchName = possibleNotes.flat;
        } else {
            finalPitchName = possibleNotes.sharp; // e.g., 'C' or 'F'
        }

        return finalPitchName + targetOctave;
    }

    /**
     * [修改] 更新 DOM 交互
     */
    /**
     * [修改] 更新 DOM 交互
     */
    nextQuestion() {
        // 1. 随机选择一个基础音高
        const basePitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];

        // 2. 随机选择一个音程
        const intervalName = INTERVAL_NAMES[Math.floor(Math.random() * INTERVAL_NAMES.length)];
        const interval = INTERVALS[intervalName];

        // 3. 计算正确答案
        this.#correctAnswerPitch = this.calculateInterval(basePitch, interval);

        // 4. 生成错误答案
        const wrongAnswers = this.generateWrongAnswers(basePitch, interval, this.#correctAnswerPitch);

        // 5. 将答案随机分配到3个 staff 上
        const allAnswers = [this.#correctAnswerPitch, ...wrongAnswers];
        this.shuffleArray(allAnswers);


        // --- ⬇️ [!! 修复 !!] 把你的调试日志加回来 ⬇️ ---
        console.clear(); // 清空控制台，方便阅读
        console.group("--- 🎵 考试题目调试信息 🎵 ---");

        console.log(`题目 (Question): ${basePitch} 的 ${intervalName} 是？`);
        console.log(`✅ 计算出的正确答案 (Correct): ${this.#correctAnswerPitch}`);
        console.log(`❌ 生成的错误答案 (Wrong): ${wrongAnswers.join(', ')}`);

        console.log("--- 答案分配 (Assignment) ---");
        // [修改日志] 我们现在可以引用 answerElements 的真实 ID
        console.log(`   ➡️ 答案 1 (ID: ${this.#answerElements[0].id}) 设为: ${allAnswers[0]} ${allAnswers[0] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 2 (ID: ${this.#answerElements[1].id}) 设为: ${allAnswers[1]} ${allAnswers[1] === this.#correctAnswerPitch ? ' (✅)' : ''}`);
        console.log(`   ➡️ 答案 3 (ID: ${this.#answerElements[2].id}) 设为: ${allAnswers[2]} ${allAnswers[2] === this.#correctAnswerPitch ? ' (✅)' : ''}`);

        console.groupEnd();
        // --- ⬆️ 调试日志结束 ⬆️ ---


        // 6. 更新视图 (DOM)
        for (let i = 0; i < this.#answerStaffs.length; i++) {
            // [修改] 使用新的 API: showNote()
            this.#answerStaffs[i].showNote(allAnswers[i]);

            // [新] 将答案音高存储在可点击的 HTML 元素上
            this.#answerElements[i].dataset.pitch = allAnswers[i];
        }

        // [修改] 使用新的 API: showNote()
        this.#questionStaff.showNote(basePitch);
        this.#questionLabel.innerText = `上方音符的 ${intervalName} 是？`;
    }

    /**
     * 生成两个“聪明”的错误答案
     * (这个函数与你的版本 100% 相同)
     */
    generateWrongAnswers(basePitch, interval, correctAnswer) {
        const wrongAnswers = new Set();

        // 错误答案 1: 错误的音程
        try {
            const currentIntervalName = Object.keys(INTERVALS).find(key => INTERVALS[key] === interval);
            const wrongIntervalName = INTERVAL_NAMES.find(name => name !== currentIntervalName);
            const wrongInterval = INTERVALS[wrongIntervalName];
            const wrongAnswer1 = this.calculateInterval(basePitch, wrongInterval);
            if (wrongAnswer1 !== correctAnswer) {
                wrongAnswers.add(wrongAnswer1);
            }
        } catch(e) {}

        // 错误答案 2: 异名同音
        try {
            const correctSemitone = NOTE_TO_SEMITONE[correctAnswer.slice(0, -1)] % 12;
            const possibleNotes = SEMITONE_TO_NOTE[correctSemitone];
            const octave = correctAnswer.slice(-1);

            let enharmonicAnswer = null;
            if (correctAnswer.includes('#') && possibleNotes.flat !== possibleNotes.sharp) {
                enharmonicAnswer = possibleNotes.flat + octave;
            } else if (correctAnswer.includes('b') && possibleNotes.sharp !== possibleNotes.flat) {
                enharmonicAnswer = possibleNotes.sharp + octave;
            }

            if (enharmonicAnswer && enharmonicAnswer !== correctAnswer) {
                wrongAnswers.add(enharmonicAnswer);
            }
        } catch(e) {}

        // 如果错误答案不够，用完全随机的音高填充
        while (wrongAnswers.size < 2) {
            const randomPitch = EXAM_PITCHES[Math.floor(Math.random() * EXAM_PITCHES.length)];
            if (randomPitch !== correctAnswer) {
                wrongAnswers.add(randomPitch);
            }
        }

        return Array.from(wrongAnswers);
    }

    /** 辅助函数：随机打乱数组 (与你的版本 100% 相同) */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
