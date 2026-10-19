import Piano from './Piano.js';
import { MelodyGenerator } from './MelodyGenerator.js';
import { getLocalizedText } from './localization.js';

// 主页钢琴初始化
window.addEventListener('load', () => {
    const pianoEl = document.getElementById('homepage-piano-container');

    if (!pianoEl) return;

    // 初始化钢琴控件
    const piano = new Piano(pianoEl, {
        octaves: 4,
        startOctave: 2,
        isClickable: true,
        showNoteNames: true,
        volumeDb: -9,
        showTonicIndicator: false
    });

    // 绑定键盘映射
    piano.bindToComputerKeyboard({
        // QWERTY (低音区)
        'W': 'A1',
        'E': 'B1',
        'R': 'C2',
        'T': 'D2',
        'Y': 'E2',
        'U': 'F2',
        'I': 'G2',
        'O': 'A2',
        'P': 'B2',
        // ASDF (中音区)
        'A': 'C3',
        'S': 'D3',
        'D': 'E3',
        'F': 'F3',
        'G': 'G3',
        'H': 'A3',
        'J': 'B3',
        'K': 'C4',
        'L': 'D4',
        ';': 'E4',
        // ZXCV (高音区)
        'Z': 'F4',
        'X': 'G4',
        'C': 'A4',
        'V': 'B4',
        'B': 'C5',
        'N': 'D5',
        'M': 'E5'
    });

    // 绑定随机旋律按钮
    const playBtn = document.getElementById('play-melody-btn');
    let activeGenerator;
    let playback;
    const wait = (ms, signal) => new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
        const abort = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', abort);
            resolve();
        }, ms);
        signal.addEventListener('abort', abort, { once: true });
    });
    window.addEventListener('pagehide', () => {
        playback?.abort();
        activeGenerator?.dispose();
        piano.stopAll();
    });
    if (playBtn) {
        playBtn.addEventListener('click', async () => {
            if (playBtn.disabled) return;
            
            // disable button
            playBtn.disabled = true;
            playBtn.classList.add('opacity-50');

            const controller = new AbortController();
            playback = controller;
            let generator;
            const status = document.getElementById('melody-status');
            status.textContent = getLocalizedText('loading-melody', 'Preparing your melody...');
            status.classList.remove('text-danger');
            try {
                // Random Key
                const keys = ["C", "G", "D", "A", "E", "F", "Bb", "Eb"];
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                
                generator = new MelodyGenerator(randomKey, 'major');
                activeGenerator = generator;
                const [song] = await Promise.all([generator.generateSong(controller.signal), piano.waitForSamples()]);
                status.textContent = '';
                const playbackStart = performance.now();
                for (const item of song.notes) {
                    await wait(Math.max(0, playbackStart + item.start * 500 - performance.now()), controller.signal);
                    await piano.playNote(item.note, (item.end - item.start) * 0.5 * 0.9, true);
                }
                await wait(Math.max(0, playbackStart + song.duration * 500 - performance.now()), controller.signal);
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error("Melody generation failed", e);
                    status.textContent = getLocalizedText('generation-failed', 'The melody could not be loaded. Please try again.');
                    status.classList.add('text-danger');
                }
            } finally {
                generator?.dispose();
                if (playback === controller) {
                    playBtn.disabled = false;
                    playBtn.classList.remove('opacity-50');
                }
            }
        });
    }
});
