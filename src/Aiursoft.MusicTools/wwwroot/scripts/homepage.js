import Piano from './Piano.js';

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
});
