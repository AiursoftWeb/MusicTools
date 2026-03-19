import Piano from './Piano.js';
import { MelodyGenerator } from './MelodyGenerator.js';

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
    if (playBtn) {
        playBtn.addEventListener('click', async () => {
            if (playBtn.disabled) return;
            
            // disable button
            playBtn.disabled = true;
            playBtn.classList.add('opacity-50');

            try {
                // Random Key
                const keys = ["C", "G", "D", "A", "E", "F", "Bb", "Eb"];
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                
                // Use existing melody generator logic
                const generator = new MelodyGenerator(randomKey, 'major');
                generator.generateSong();
                
                const buffer = generator.noteBuffer;
                
                for (let i = 0; i < buffer.length; i++) {
                        const item = buffer[i];
                        // Play visuals + sound
                        piano.playNote(item.name, 0.4, true);
                        
                        // Wait for duration (120 BPM = 500ms per beat)
                        await new Promise(r => setTimeout(r, 500 * item.duration));
                }
            } catch (e) {
                console.error("Melody generation failed", e);
            } finally {
                playBtn.disabled = false;
                playBtn.classList.remove('opacity-50');
            }
        });
    }
});
