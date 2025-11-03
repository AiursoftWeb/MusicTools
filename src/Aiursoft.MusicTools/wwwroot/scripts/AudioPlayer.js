/* =====================================================================
 * AudioPlayer.js (V3.2 - 单个播放/停止按钮)
 * ===================================================================== */

// 1. 乐曲库 (不变)
const SONG_LIBRARY = {
    'major_scale': {
        name: 'Major Scale (C)',
        baseKey: 0, // C Major
        data: [
            // Ascending: C D E F G A B C
            { note: 60, time: 0.0, duration: 0.4 },
            { note: 62, time: 0.5, duration: 0.4 },
            { note: 64, time: 1.0, duration: 0.4 },
            { note: 65, time: 1.5, duration: 0.4 },
            { note: 67, time: 2.0, duration: 0.4 },
            { note: 69, time: 2.5, duration: 0.4 },
            { note: 71, time: 3.0, duration: 0.4 },
            { note: 72, time: 3.5, duration: 0.9 }, // 顶部 C 稍长
            // Descending: B A G F E D C
            { note: 71, time: 4.5, duration: 0.4 },
            { note: 69, time: 5.0, duration: 0.4 },
            { note: 67, time: 5.5, duration: 0.4 },
            { note: 65, time: 6.0, duration: 0.4 },
            { note: 64, time: 6.5, duration: 0.4 },
            { note: 62, time: 7.0, duration: 0.4 },
            { note: 60, time: 7.5, duration: 0.9 }  // 底部 C 稍长
        ]
    },
// --- 【新】自然小调音阶 (已修改为 A 小调) ---
    'natural_minor_scale': {
        name: 'Natural Minor Scale (A)',
        baseKey: 0, // A Minor is relative to C Major (0 sharps/flats)
        data: [
            // Ascending: A(3) B C D E F G A(4)
            { note: 57, time: 0.0, duration: 0.4 }, // A
            { note: 59, time: 0.5, duration: 0.4 }, // B
            { note: 60, time: 1.0, duration: 0.4 }, // C
            { note: 62, time: 1.5, duration: 0.4 }, // D
            { note: 64, time: 2.0, duration: 0.4 }, // E
            { note: 65, time: 2.5, duration: 0.4 }, // F
            { note: 67, time: 3.0, duration: 0.4 }, // G
            { note: 69, time: 3.5, duration: 0.9 }, // 顶部 A 稍长
            // Descending: G F E D C B A
            { note: 67, time: 4.5, duration: 0.4 }, // G
            { note: 65, time: 5.0, duration: 0.4 }, // F
            { note: 64, time: 5.5, duration: 0.4 }, // E
            { note: 62, time: 6.0, duration: 0.4 }, // D
            { note: 60, time: 6.5, duration: 0.4 }, // C
            { note: 59, time: 7.0, duration: 0.4 }, // B
            { note: 57, time: 7.5, duration: 0.9 }  // 底部 A 稍长
        ]
    },
    'twinkle': {
        name: 'Twinkle Twinkle',
        baseKey: 0, // C Major
        data: [
// --- Verse 1: C C G G A A G -
            { note: 60, time: 0.0, duration: 0.4 },
            { note: 60, time: 0.5, duration: 0.4 },
            { note: 67, time: 1.0, duration: 0.4 },
            { note: 67, time: 1.5, duration: 0.4 },
            { note: 69, time: 2.0, duration: 0.4 },
            { note: 69, time: 2.5, duration: 0.4 },
            { note: 67, time: 3.0, duration: 0.9 },

            // --- Verse 2: F F E E D D C -
            { note: 65, time: 4.0, duration: 0.4 },
            { note: 65, time: 4.5, duration: 0.4 },
            { note: 64, time: 5.0, duration: 0.4 },
            { note: 64, time: 5.5, duration: 0.4 },
            { note: 62, time: 6.0, duration: 0.4 },
            { note: 62, time: 6.5, duration: 0.4 },
            { note: 60, time: 7.0, duration: 0.9 },

            // --- Verse 3: G G F F E E D - (新增)
            { note: 67, time: 8.0, duration: 0.4 },
            { note: 67, time: 8.5, duration: 0.4 },
            { note: 65, time: 9.0, duration: 0.4 },
            { note: 65, time: 9.5, duration: 0.4 },
            { note: 64, time: 10.0, duration: 0.4 },
            { note: 64, time: 10.5, duration: 0.4 },
            { note: 62, time: 11.0, duration: 0.9 },

            // --- Verse 4: G G F F E E D - (新增)
            { note: 67, time: 12.0, duration: 0.4 },
            { note: 67, time: 12.5, duration: 0.4 },
            { note: 65, time: 13.0, duration: 0.4 },
            { note: 65, time: 13.5, duration: 0.4 },
            { note: 64, time: 14.0, duration: 0.4 },
            { note: 64, time: 14.5, duration: 0.4 },
            { note: 62, time: 15.0, duration: 0.9 },

            // --- Verse 5: C C G G A A G - (新增)
            { note: 60, time: 16.0, duration: 0.4 },
            { note: 60, time: 16.5, duration: 0.4 },
            { note: 67, time: 17.0, duration: 0.4 },
            { note: 67, time: 17.5, duration: 0.4 },
            { note: 69, time: 18.0, duration: 0.4 },
            { note: 69, time: 18.5, duration: 0.4 },
            { note: 67, time: 19.0, duration: 0.9 },

            // --- Verse 6: F F E E D D C - (新增)
            { note: 65, time: 20.0, duration: 0.4 },
            { note: 65, time: 20.5, duration: 0.4 },
            { note: 64, time: 21.0, duration: 0.4 },
            { note: 64, time: 21.5, duration: 0.4 },
            { note: 62, time: 22.0, duration: 0.4 },
            { note: 62, time: 22.5, duration: 0.4 },
            { note: 60, time: 23.0, duration: 0.9 }
        ]
    },
    'mary_lamb': {
        name: 'Mary Had a Little Lamb',
        baseKey: 0, // C Major
        data: [
            // E D C D | E E E -
            { note: 64, time: 0.0, duration: 0.4 },
            { note: 62, time: 0.5, duration: 0.4 },
            { note: 60, time: 1.0, duration: 0.4 },
            { note: 62, time: 1.5, duration: 0.4 },
            { note: 64, time: 2.0, duration: 0.4 },
            { note: 64, time: 2.5, duration: 0.4 },
            { note: 64, time: 3.0, duration: 0.9 },
            // D D D - | E G G -
            { note: 62, time: 4.0, duration: 0.4 },
            { note: 62, time: 4.5, duration: 0.4 },
            { note: 62, time: 5.0, duration: 0.9 },
            { note: 64, time: 6.0, duration: 0.4 },
            { note: 67, time: 6.5, duration: 0.4 },
            { note: 67, time: 7.0, duration: 0.9 },
            // E D C D | E E E C
            { note: 64, time: 8.0, duration: 0.4 },
            { note: 62, time: 8.5, duration: 0.4 },
            { note: 60, time: 9.0, duration: 0.4 },
            { note: 62, time: 9.5, duration: 0.4 },
            { note: 64, time: 10.0, duration: 0.4 },
            { note: 64, time: 10.5, duration: 0.4 },
            { note: 64, time: 11.0, duration: 0.4 },
            { note: 60, time: 11.5, duration: 0.4 },
            // D D E D | C - - -
            { note: 62, time: 12.0, duration: 0.4 },
            { note: 62, time: 12.5, duration: 0.4 },
            { note: 64, time: 13.0, duration: 0.4 },
            { note: 62, time: 13.5, duration: 0.4 },
            { note: 60, time: 14.0, duration: 0.9 }
        ]
    },
    'two_tigers': {
        name: 'Two Tigers',
        baseKey: 0, // C Major
        data: [
            // 两只 老 虎 | 两只 老 虎 | 跑得 快
            { note: 60, time: 0.0, duration: 0.4 }, { note: 62, time: 0.5, duration: 0.4 }, { note: 64, time: 1.0, duration: 0.4 }, { note: 60, time: 1.5, duration: 0.4 }, // C D E C
            { note: 60, time: 2.0, duration: 0.4 }, { note: 62, time: 2.5, duration: 0.4 }, { note: 64, time: 3.0, duration: 0.4 }, { note: 60, time: 3.5, duration: 0.4 }, // C D E C
            { note: 64, time: 4.0, duration: 0.4 }, { note: 65, time: 4.5, duration: 0.4 }, { note: 67, time: 5.0, duration: 0.9 }, // E F G
            // 跑得 快 | 一只 没有 耳 朵 | 一只 没有 尾 巴
            { note: 64, time: 6.0, duration: 0.4 }, { note: 65, time: 6.5, duration: 0.4 }, { note: 67, time: 7.0, duration: 0.9 }, // E F G
            { note: 67, time: 8.0, duration: 0.22 }, { note: 69, time: 8.25, duration: 0.22 }, { note: 67, time: 8.5, duration: 0.22 }, { note: 65, time: 8.75, duration: 0.22 }, { note: 64, time: 9.0, duration: 0.4 }, { note: 60, time: 9.5, duration: 0.4 }, // G A G F E C
            { note: 67, time: 10.0, duration: 0.22 }, { note: 69, time: 10.25, duration: 0.22 }, { note: 67, time: 10.5, duration: 0.22 }, { note: 65, time: 10.75, duration: 0.22 }, { note: 64, time: 11.0, duration: 0.4 }, { note: 60, time: 11.5, duration: 0.4 }, // G A G F E C
            // 真奇 怪 | 真奇 怪
            { note: 62, time: 12.0, duration: 0.4 }, { note: 55, time: 12.5, duration: 0.4 }, { note: 60, time: 13.0, duration: 0.9 }, // D G(low) C
            { note: 62, time: 14.0, duration: 0.4 }, { note: 55, time: 14.5, duration: 0.4 }, { note: 60, time: 15.0, duration: 0.9 }, // D G(low) C
        ]
    },
    'ode_to_joy': {
        name: 'Ode to Joy',
        baseKey: 0, // C Major
        data: [
            // --- Line 1 ---
            // E E F G | G F E D | C C D E | E D D -
            { note: 64, time: 0.0, duration: 0.4 }, { note: 64, time: 0.5, duration: 0.4 }, { note: 65, time: 1.0, duration: 0.4 }, { note: 67, time: 1.5, duration: 0.4 },
            { note: 67, time: 2.0, duration: 0.4 }, { note: 65, time: 2.5, duration: 0.4 }, { note: 64, time: 3.0, duration: 0.4 }, { note: 62, time: 3.5, duration: 0.4 },
            { note: 60, time: 4.0, duration: 0.4 }, { note: 60, time: 4.5, duration: 0.4 }, { note: 62, time: 5.0, duration: 0.4 }, { note: 64, time: 5.5, duration: 0.4 },
            { note: 64, time: 6.0, duration: 0.4 }, { note: 62, time: 6.5, duration: 0.4 }, { note: 62, time: 7.0, duration: 0.9 }, // Last D is longer

            // --- Line 2 ---
            // E E F G | G F E D | C C D E | D C C -
            { note: 64, time: 8.0, duration: 0.4 }, { note: 64, time: 8.5, duration: 0.4 }, { note: 65, time: 9.0, duration: 0.4 }, { note: 67, time: 9.5, duration: 0.4 },
            { note: 67, time: 10.0, duration: 0.4 }, { note: 65, time: 10.5, duration: 0.4 }, { note: 64, time: 11.0, duration: 0.4 }, { note: 62, time: 11.5, duration: 0.4 },
            { note: 60, time: 12.0, duration: 0.4 }, { note: 60, time: 12.5, duration: 0.4 }, { note: 62, time: 13.0, duration: 0.4 }, { note: 64, time: 13.5, duration: 0.4 },
            { note: 62, time: 14.0, duration: 0.4 }, { note: 60, time: 14.5, duration: 0.4 }, { note: 60, time: 15.0, duration: 0.9 }  // Last C is longer
        ]
    },
    'happy_birthday': {
        name: 'Happy Birthday',
        baseKey: 0, // C Major
        data: [
            // C C D C | F E - -
            { note: 60, time: 0.0, duration: 0.35 }, { note: 60, time: 0.5, duration: 0.4 }, { note: 62, time: 1.0, duration: 0.4 }, { note: 60, time: 1.5, duration: 0.4 },
            { note: 65, time: 2.0, duration: 0.4 }, { note: 64, time: 2.5, duration: 0.9 },
            // C C D C | G F - -
            { note: 60, time: 4.0, duration: 0.35 }, { note: 60, time: 4.5, duration: 0.4 }, { note: 62, time: 5.0, duration: 0.4 }, { note: 60, time: 5.5, duration: 0.4 },
            { note: 67, time: 6.0, duration: 0.4 }, { note: 65, time: 6.5, duration: 0.9 },
            // C C C' A | F E D -
            { note: 60, time: 8.0, duration: 0.35 }, { note: 60, time: 8.5, duration: 0.4 }, { note: 72, time: 9.0, duration: 0.4 }, { note: 69, time: 9.5, duration: 0.4 },
            { note: 65, time: 10.0, duration: 0.4 }, { note: 64, time: 10.5, duration: 0.4 }, { note: 62, time: 11.0, duration: 0.9 },
            // Bb Bb A F | G F - -
            { note: 70, time: 12.0, duration: 0.35 }, { note: 70, time: 12.5, duration: 0.4 }, { note: 69, time: 13.0, duration: 0.4 }, { note: 65, time: 13.5, duration: 0.4 },
            { note: 67, time: 14.0, duration: 0.4 }, { note: 65, time: 14.5, duration: 0.9 },
        ]
    },
    'jingle_bells': {
        name: 'Jingle Bells',
        baseKey: 0, // C Major
        data: [
            // E E E - | E E E - | E G C D | E - - -
            { note: 64, time: 0.0, duration: 0.4 }, { note: 64, time: 0.5, duration: 0.4 }, { note: 64, time: 1.0, duration: 0.9 },
            { note: 64, time: 2.0, duration: 0.4 }, { note: 64, time: 2.5, duration: 0.4 }, { note: 64, time: 3.0, duration: 0.9 },
            { note: 64, time: 4.0, duration: 0.4 }, { note: 67, time: 4.5, duration: 0.4 }, { note: 60, time: 5.0, duration: 0.4 }, { note: 62, time: 5.5, duration: 0.4 },
            { note: 64, time: 6.0, duration: 1.9 },
            // F F F - | F F E E | E D D E | D G - -
            { note: 65, time: 8.0, duration: 0.4 }, { note: 65, time: 8.5, duration: 0.4 }, { note: 65, time: 9.0, duration: 0.4 }, { note: 65, time: 9.5, duration: 0.4 },
            { note: 65, time: 10.0, duration: 0.4 }, { note: 64, time: 10.5, duration: 0.4 }, { note: 64, time: 11.0, duration: 0.4 }, { note: 64, time: 11.5, duration: 0.22 }, // 短一点的 E
            { note: 64, time: 12.0, duration: 0.4 }, { note: 62, time: 12.5, duration: 0.4 }, { note: 62, time: 13.0, duration: 0.4 }, { note: 64, time: 13.5, duration: 0.4 },
            { note: 62, time: 14.0, duration: 0.9 }, { note: 67, time: 15.0, duration: 0.9 }, // G 结束
        ]
    },
};

// 按钮图标和文本
const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play lucide-sm me-1 align-middle"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Play`;
const STOP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square lucide-sm me-1 align-middle"><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg> Stop`;


class AudioPlayer {

    /**
     * @param {object} elements - 包含所有 DOM 元素的
     * @param {HTMLElement} elements.playStopButton
     * @param {HTMLElement} elements.songSelector
     * @param {HTMLElement} elements.loopCheckbox
     */
    /* =====================================================================
 * AudioPlayer.js - constructor
 * ===================================================================== */
    constructor(elements) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.activeOscillators = new Set();
        this.activeMarkers = new Set(); // <--【!! 新增此行 !!】

        // DOM 元素
        this.playStopButton = elements.playStopButton;
        this.songSelector = elements.songSelector;
        this.loopCheckbox = elements.loopCheckbox;

        // 内部状态
        this.currentKey = 0;
        this.isPlaying = false;
        this.loop = this.loopCheckbox.checked;
        this.selectedSongKey = '';

        this._initializeControls();
    }

    _initializeControls() {
        // 1. 填充歌曲下拉菜单
        Object.entries(SONG_LIBRARY).forEach(([key, song]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = song.name;
            this.songSelector.appendChild(option);
        });
        this.selectedSongKey = this.songSelector.value;

        // 2. 监听控件变化
        this.songSelector.addEventListener('change', (e) => {
            this.selectedSongKey = e.target.value;
            this.stop(); // 切换歌曲时停止播放
        });

        this.loopCheckbox.addEventListener('change', (e) => {
            this.loop = e.target.checked;
        });

        // 3. 监听播放/停止按钮
        this.playStopButton.addEventListener('click', () => {
            if (this.isPlaying) {
                this.stop();
            } else {
                this.play();
            }
        });

        // 4. 显示按钮
        this.playStopButton.style.display = 'block';
    }

    /**
     * 辅助函数：更新播放按钮的外观
     * @param {boolean} isPlaying - 播放器是否即将开始播放
     */
    _setPlayButtonState(isPlaying) {
        if (isPlaying) {
            this.playStopButton.innerHTML = STOP_ICON;
            this.playStopButton.classList.remove('btn-success');
            this.playStopButton.classList.add('btn-danger');
        } else {
            this.playStopButton.innerHTML = PLAY_ICON;
            this.playStopButton.classList.remove('btn-danger');
            this.playStopButton.classList.add('btn-success');
        }
    }

    /**
     * 【公共 API】
     * 设置当前调性 (由 major.js 调用)
     * (V2.1 - 保持不变)
     */
    setKey(keyIndex) {
        this.currentKey = parseInt(keyIndex, 10);
        const now = this.audioContext.currentTime;

        if (this.activeOscillators.size > 0) {
            const song = SONG_LIBRARY[this.selectedSongKey];
            const transpositionOffset = this.currentKey - song.baseKey;
            const detuneInCents = transpositionOffset * 100;

            this.activeOscillators.forEach(osc => {
                osc.detune.cancelScheduledValues(now);
                osc.detune.setTargetAtTime(detuneInCents, now, 0.01);
            });
        }
    }

    /**
     * 【公共 API】
     * 停止所有播放并重置状态
     */
    stop() {
        this.isPlaying = false;
        this._setPlayButtonState(false); // 更新按钮外观

        const now = this.audioContext.currentTime;

        // 1. 停止所有正在发声的音符
        this.activeOscillators.forEach(osc => {
            osc.stop(now);
        });
        this.activeOscillators.clear();

        // ===================【!! 关键修复 !!】===================
        // 2. 停止所有已预定的 "幽灵" 标记 (循环和结束标记)
        this.activeMarkers.forEach(marker => {
            marker.onended = null; // 必须清除回调，防止 stop() 触发 onended
            marker.stop(now);
        });
        this.activeMarkers.clear();
        // =======================================================
    }

    /**
     * 【公共 API】
     * 播放当前选定的歌曲
     */
    play() {
        if (this.isPlaying) return; // 防止重复调用

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isPlaying = true;
        this._setPlayButtonState(true); // 更新按钮外观

        // 开始递归调度 (V3.1 修复版)
        this._scheduleSong(this.audioContext.currentTime + 0.1);
    }

    /**
     * 【私有方法】
     * 递归调度器 (V3.1 修复版 - 保持不变)
     */
    /* =====================================================================
     * AudioPlayer.js - _scheduleSong (V3.3 修复版)
     * ===================================================================== */
    _scheduleSong(startTime) {
        if (!this.isPlaying) return;

        const song = SONG_LIBRARY[this.selectedSongKey];
        if (!song) return;

        const transpositionOffset = this.currentKey - song.baseKey;
        const detuneInCents = transpositionOffset * 100;

        let maxTime = startTime;

        song.data.forEach(note => {
            const noteStartTime = startTime + note.time;
            const noteEndTime = noteStartTime + note.duration;

            this._playNote(note.note, noteStartTime, note.duration, detuneInCents);

            if (noteEndTime > maxTime) {
                maxTime = noteEndTime;
            }
        });

        if (this.loop && this.isPlaying) {
            // 异步递归
            const loopMarker = this.audioContext.createOscillator();
            this.activeMarkers.add(loopMarker); // <--【!! 关键修复 !!】

            loopMarker.onended = () => {
                this.activeMarkers.delete(loopMarker); // 自我清理
                if (this.isPlaying) {
                    this._scheduleSong(maxTime);
                }
            };
            loopMarker.start(maxTime);
            loopMarker.stop(maxTime);

        } else if (!this.loop && this.isPlaying) {
            // 歌曲结束时调用 stop() 来重置按钮
            const endOfSongMarker = this.audioContext.createOscillator();
            this.activeMarkers.add(endOfSongMarker); // <--【!! 关键修复 !!】

            endOfSongMarker.onended = () => {
                this.activeMarkers.delete(endOfSongMarker); // 自我清理
                if (this.isPlaying) {
                    this.stop();
                }
            };
            endOfSongMarker.start(maxTime);
            endOfSongMarker.stop(maxTime);
        }
    }
    /**
     * 【私有方法】
     * 播放单个音符 (与 V2.1 相同)
     */
    _playNote(midiNote, startTime, duration, detuneInCents) {
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        const oscillator = this.audioContext.createOscillator();
        // Like piano
        oscillator.type = 'sawtooth'; // 可尝试 'sine', 'square', 'sawtooth', 'triangle'
        oscillator.frequency.setValueAtTime(freq, startTime);
        oscillator.detune.setValueAtTime(detuneInCents, startTime);


        // 3. 创建音量控制器 (GainNode)
        const gainNode = this.audioContext.createGain();

        // 4. 模拟一个 *更快速衰减* 的包络
        const attackTime = 0.01;
        // const releaseTime = 0.1; // 原来的释音时间
        const releaseTime = 0.05; // <--- 尝试更短的释音
        const scheduledEndTime = startTime + duration;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.7, startTime + attackTime); // 快速起音

        // 【可选】 增加一个快速衰减阶段 (Decay)
        // 在起音后 0.1 秒内，音量衰减到 40%
        const decayTime = 0.1;
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + attackTime + decayTime);

        // 在音符结束前开始最终的释音
        // 注意：这里的 setValueAtTime 需要基于衰减后的值 (0.4)
        gainNode.gain.setValueAtTime(0.4, scheduledEndTime - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, scheduledEndTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(startTime);
        oscillator.stop(scheduledEndTime);

        this.activeOscillators.add(oscillator);

        oscillator.onended = () => {
            this.activeOscillators.delete(oscillator);
            // (V3.2 移除) 结束时重置按钮的逻辑已移至 _scheduleSong
        };
    }
}
