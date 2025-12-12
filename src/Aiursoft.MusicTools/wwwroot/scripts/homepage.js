import Piano from './Piano.js';
import { MelodyGenerator } from './MelodyGenerator.js';

// 主页钢琴初始化
window.addEventListener('load', () => {
    const pianoEl = document.getElementById('homepage-piano-container');

    if (!pianoEl) return;

    // 初始化钢琴控件
    const piano = new Piano(pianoEl, {
        octaves: 4,
        startOctave: 3,
        isClickable: true,
        showNoteNames: true,
        showTonicIndicator: false
    });

    // 绑定键盘映射
    piano.bindToComputerKeyboard({
        // QWERTY (低音区)
        'W': 'A2',
        'E': 'B2',
        'R': 'C3',
        'T': 'D3',
        'Y': 'E3',
        'U': 'F3',
        'I': 'G3',
        'O': 'A3',
        'P': 'B3',
        // ASDF (中音区)
        'A': 'C4',
        'S': 'D4',
        'D': 'E4',
        'F': 'F4',
        'G': 'G4',
        'H': 'A4',
        'J': 'B4',
        'K': 'C5',
        'L': 'D5',
        ';': 'E5',
        // ZXCV (高音区)
        'Z': 'F5',
        'X': 'G5',
        'C': 'A5',
        'V': 'B5',
        'B': 'C6',
        'N': 'D6',
        'M': 'E6'
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
