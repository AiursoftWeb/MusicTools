/**
 * Need load staff.js first.
 */
const ALL_PITCHES = [
    'C_2', 'D_2', 'E_2', 'F_2', 'G_2', 'A_2', 'B_2', // 低音组
    'C_1', 'D_1', 'E_1', 'F_1', 'G_1', 'A_1', 'B_1',
    'C', 'D', 'E', 'F', 'G', 'A', 'B', // 中心组
    'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', // 高音组
];

// 将音高映射到**绝对半音数**（以最低的 C_2 为 0）
// C-D-E-F-G-A-B-C 是 2-2-1-2-2-2-1 个半音
const PITCH_TO_SEMI = new Map([
    // C_2 (0)
    ['C_2', 0], ['D_2', 2], ['E_2', 4], ['F_2', 5], ['G_2', 7], ['A_2', 9], ['B_2', 11],
    // C_1 (12)
    ['C_1', 12], ['D_1', 14], ['E_1', 16], ['F_1', 17], ['G_1', 19], ['A_1', 21], ['B_1', 23],
    // C (24)
    ['C', 24], ['D', 26], ['E', 28], ['F', 29], ['G', 31], ['A', 33], ['B', 35],
    // C2 (36)
    ['C2', 36], ['D2', 38], ['E2', 40], ['F2', 41], ['G2', 43], ['A2', 45], ['B2', 47],
]);

// 存储音程类型：[度数] => [纯/大调时的半音数]
const INTERVAL_SEMIS = new Map([
    // 纯/大音程的半音标准
    [1, 0],   // 纯一度 (P1)
    [2, 2],   // 大二度 (M2)
    [3, 4],   // 大三度 (M3)
    [4, 5],   // 纯四度 (P4)
    [5, 7],   // 纯五度 (P5)
    [6, 9],   // 大六度 (M6)
    [7, 11],  // 大七度 (M7)
    [8, 12]   // 纯八度 (P8)
]);

class ExamQuestion {

    #answerStaffs;
    #questionLabel;
    #answerPitch;

    constructor(questionStaff, answerStaffs, questionLabel) {
        this.questionStaff = questionStaff;
        this.#answerStaffs = answerStaffs;
        this.#questionLabel = questionLabel;

        answerStaffs.forEach(staff => {
            staff.onclick((pitch) => {
                if (pitch === this.#answerPitch) {
                    alert('Correct!');
                    console.log('Correct!');
                    this.nextQuestion();    
                } else {
                    alert('Wrong!');
                    console.log('Wrong!');
                }
            });
        });
    }

    nextQuestion() {
        const question = getRandomPitchesAndExactInterval(ALL_PITCHES);
        this.#answerPitch = question.pitch2;

        this.questionStaff.setPitch(question.pitch1);

        const randomIndex1 = Math.floor(Math.random() * this.#answerStaffs.length);
        const answerContainer = this.#answerStaffs[randomIndex1];
        answerContainer.setPitch(question.pitch2);

        for (let i = 0; i < this.#answerStaffs.length; i++) {
            if (i !== randomIndex1) {
                const randomPitch = this.getRandomPitchKeyDifferentFrom(question.pitch1);
                this.#answerStaffs[i].setPitch(randomPitch);
            }
        }

        this.#questionLabel.innerText = `右边音符的${question.direction}${question.interval}的是：`;
    }

    getRandomPitchKey() {
        const randomIndex = Math.floor(Math.random() * ALL_PITCHES.length);

        return ALL_PITCHES[randomIndex];
    }

    getRandomPitchKeyDifferentFrom(pitch) {
        while (true) {
            const randomPitch = this.getRandomPitchKey();
            if (randomPitch !== pitch) {
                return randomPitch;
            }
        }
    }
}

/**
 * 随机选择两个不同的音高，并计算其精确的音程关系（使用复合音程名称）。
 * @param {string[]} pitches 音高数组
 * @returns {{ pitch1: string, pitch2: string, interval: string, direction: string }}
 */
function getRandomPitchesAndExactInterval(pitches) {
    // ... (选择两个随机音高的逻辑与之前相同) ...
    const randomIndex1 = Math.floor(Math.random() * pitches.length);
    const pitch1 = pitches[randomIndex1];

    let randomIndex2;
    do {
        randomIndex2 = Math.floor(Math.random() * 8);
    } while (randomIndex1 === randomIndex2);
    const pitch2 = pitches[randomIndex2];
    
    // --- 计算核心参数 ---
    const semi1 = PITCH_TO_SEMI.get(pitch1);
    const semi2 = PITCH_TO_SEMI.get(pitch2);

    const ALL_PITCH_INDEX_MAP = new Map(ALL_PITCHES.map((pitch, index) => [pitch, index]));
    const index1 = ALL_PITCH_INDEX_MAP.get(pitch1);
    const index2 = ALL_PITCH_INDEX_MAP.get(pitch2);

    // 1. 绝对半音距离
    const totalSemitones = Math.abs(semi1 - semi2);

    // 2. 音级距离 (Degree): 数组索引差 + 1
    // 例如 C -> D 是 1 个数组距离，是二度 (2)
    const degreeDistance = Math.abs(index1 - index2);
    const intervalDegree = degreeDistance + 1; // 1度, 2度, 3度...

    // 3. 确定方向
    const direction = semi2 > semi1 ? '向上 (Ascending)' : '向下 (Descending)';
    
    // --- 4. 计算音程类型（大/小/纯/增/减） ---

    // 调整到 1-8 度的标准度数
    const baseDegree = ((intervalDegree - 1) % 7) + 1;
    
    let intervalType = '';
    let intervalName = '';

    // 获取标准半音数 (P1, M2, M3, P4, P5, M6, M7, P8)
    const standardSemis = (INTERVAL_SEMIS.get(baseDegree)) + Math.floor((intervalDegree - 1) / 7) * 12;

    const degreeNames = ['一度', '二度', '三度', '四度', '五度', '六度', '七度'];

    if (baseDegree === 1 || baseDegree === 4 || baseDegree === 5 || baseDegree === 8) {
        // 纯音程 (P1, P4, P5, P8)
        if (totalSemitones === standardSemis) {
            intervalType = '纯 (Perfect)';
        } else if (totalSemitones === standardSemis + 1) {
            intervalType = '增 (Augmented)';
        } else if (totalSemitones === standardSemis - 1) {
            intervalType = '减 (Diminished)';
        }
    } else {
        // 大小音程 (M2, M3, M6, M7)
        if (totalSemitones === standardSemis) {
            intervalType = '大 (Major)';
        } else if (totalSemitones === standardSemis - 1) {
            intervalType = '小 (Minor)';
        } else if (totalSemitones === standardSemis + 1) {
            intervalType = '增 (Augmented)';
        } else if (totalSemitones === standardSemis - 2) {
            intervalType = '减 (Diminished)';
        }
    }
    
    // 5. 组合最终音程名称
    
    // 中文度数名称（考虑复合音程：九度、十度等）
    const chineseDegrees = [
        '一度', '二度', '三度', '四度', '五度', '六度', '七度', '八度', 
        '九度', '十度', '十一度', '十二度', '十三度', '十四度', '十五度', 
        // 更多度数...
    ];
    
    // 确保 degreeDistance + 1 不超过数组长度
    const degreeIndex = Math.min(intervalDegree, chineseDegrees.length);
    intervalName = chineseDegrees[degreeIndex - 1]; // 索引从 0 开始

    const finalInterval = `${intervalType.replace(/\s\(.*\)/, '')} ${intervalName}`;


    return {
        pitch1,
        pitch2,
        interval: finalInterval,
        direction,
    };
}