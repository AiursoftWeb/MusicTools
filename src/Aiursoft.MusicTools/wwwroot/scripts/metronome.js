document.addEventListener('DOMContentLoaded', () => {
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const timeSignatureSelect = document.getElementById('time-signature');
    const subdivisionSelect = document.getElementById('subdivision');
    const startStopBtn = document.getElementById('start-stop-btn');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    const visualBeatsContainer = document.getElementById('visual-beats');

    let isPlaying = false;
    let audioContext = null;
    let nextNoteTime = 0.0;
    let currentBeat = 0;
    let currentSubBeat = 0;
    let timerID = null;
    
    // Configuration
    let bpm = 90;
    let beatsPerMeasure = 4;
    let noteValue = 4;
    let subdivision = 1;
    let accentPattern = []; // Array of intensities: 3=Strong, 2=Medium, 1=Weak

    // BPM Calculation Logic
    function calculateBpm(sliderVal) {
        // sliderVal is 0-100
        // t goes from -1 to 1
        const t = (sliderVal - 50) / 50;
        let calculatedBpm;
        
        // Use power of 1.5 for smoother curve that isn't too flat in the middle
        const factor = Math.pow(Math.abs(t), 1.5);
        
        if (t < 0) {
            // Range 1 to 90
            calculatedBpm = 90 - 89 * factor;
        } else {
            // Range 90 to 320
            calculatedBpm = 90 + 230 * factor;
        }
        return Math.round(calculatedBpm);
    }
    
    bpmSlider.addEventListener('input', (e) => {
        bpm = calculateBpm(e.target.value);
        bpmDisplay.textContent = bpm;
    });

    function updateConfig(e) {
        const source = e ? e.target.id : 'init';
        const tsValue = timeSignatureSelect.value;
        const ts = tsValue.split('/');
        const num = parseInt(ts[0]);
        const den = parseInt(ts[1]);
        
        let newSubdivision = parseInt(subdivisionSelect.value);

        // Reset logic
        beatsPerMeasure = num;
        
        // Define Accent Patterns
        // 3 = Strong, 2 = Medium, 1 = Weak
        if (den === 8) {
            // X/8 Signatures
            if (num === 3 || num === 6 || num === 9 || num === 12) {
                // Compound Meters (3/8, 6/8, 9/8, 12/8)
                // Beat unit is Dotted Quarter
                beatsPerMeasure = num / 3;
                
                if (num === 3) accentPattern = [3];
                if (num === 6) accentPattern = [3, 2];
                if (num === 9) accentPattern = [3, 2, 2];
                if (num === 12) accentPattern = [3, 2, 2, 2];
                
                // Auto-switch to Triplet (3 clicks)
                if (source === 'time-signature' || source === 'init') {
                    subdivisionSelect.value = "3";
                    newSubdivision = 3;
                }
            } else {
                // Complex/Simple Meters (5/8, 7/8)
                // Beat unit is Eighth Note
                if (num === 5) accentPattern = [3, 1, 2, 1, 1]; // 2+3
                else if (num === 7) accentPattern = [3, 1, 1, 2, 1, 2, 1]; // 3+2+2
                else {
                    // Fallback for other x/8
                    accentPattern = new Array(num).fill(1);
                    accentPattern[0] = 3;
                }
                
                if (source === 'time-signature') {
                    subdivisionSelect.value = "1";
                    newSubdivision = 1;
                }
            }
        } else {
            // X/4 Signatures
            if (num === 4) accentPattern = [3, 1, 2, 1];
            else if (num === 3) accentPattern = [3, 1, 1];
            else if (num === 2) accentPattern = [3, 1];
            else if (num === 1) accentPattern = [3];
            else if (num === 5) accentPattern = [3, 1, 2, 1, 1]; // 2+3
            else if (num === 6) accentPattern = [3, 1, 2, 1, 2, 1]; // 2+2+2
            else {
                accentPattern = new Array(num).fill(1);
                accentPattern[0] = 3;
            }
            
            if (source === 'time-signature') {
                subdivisionSelect.value = "1";
                newSubdivision = 1;
            }
        }

        noteValue = den;
        subdivision = newSubdivision;
        
        updateVisuals();
    }

    timeSignatureSelect.addEventListener('change', updateConfig);
    subdivisionSelect.addEventListener('change', updateConfig);

    function updateVisuals() {
        visualBeatsContainer.innerHTML = '';
        visualBeatsContainer.className = 'beat-container'; // Reset class
        
        for (let i = 0; i < beatsPerMeasure; i++) {
            const intensity = accentPattern[i] || 1;
            
            const bar = document.createElement('div');
            bar.className = 'beat-bar';
            bar.id = `beat-${i}`;
            
            // Create 3 blocks
            for (let b = 0; b < 3; b++) {
                const block = document.createElement('div');
                block.className = 'beat-block';
                // b=0 is bottom, b=2 is top (due to column-reverse)
                // Intensity 3: fill 0, 1, 2
                // Intensity 2: fill 0, 1
                // Intensity 1: fill 0
                if (b < intensity) {
                    block.classList.add('filled');
                } else {
                    block.classList.add('empty');
                }
                bar.appendChild(block);
            }
            
            visualBeatsContainer.appendChild(bar);
        }
    }

    // Audio Logic
    function nextNote() {
        nextNoteTime += (60.0 / bpm) / subdivision;
        
        currentSubBeat++;
        if (currentSubBeat >= subdivision) {
            currentSubBeat = 0;
            currentBeat++;
            if (currentBeat >= beatsPerMeasure) {
                currentBeat = 0;
            }
        }
    }

    function scheduleNote(beatNumber, subBeatNumber, time) {
        const osc = audioContext.createOscillator();
        const envelope = audioContext.createGain();

        // Determine Frequency based on Intensity
        // If subBeat is 0, use the beat's intensity.
        // If subBeat > 0, use Weak (1).
        let intensity = 1;
        if (subBeatNumber === 0) {
            intensity = accentPattern[beatNumber] || 1;
        }
        
        let frequency = 600; // Weak (1)
        if (intensity === 3) frequency = 1200; // Strong
        else if (intensity === 2) frequency = 800; // Medium

        osc.type = 'square';
        osc.frequency.value = frequency;
        osc.connect(envelope);
        envelope.connect(audioContext.destination);

        envelope.gain.setValueAtTime(1.0, time);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
        
        // Visual scheduling
        const drawTime = (time - audioContext.currentTime) * 1000;
        setTimeout(() => {
            drawBeat(beatNumber, subBeatNumber);
        }, Math.max(0, drawTime));
    }
    
    function drawBeat(beat, subBeat) {
        // Reset all
        document.querySelectorAll('.beat-bar').forEach(d => {
            d.classList.remove('active');
            d.classList.remove('sub-active');
        });
        
        const bar = document.getElementById(`beat-${beat}`);
        if (bar) {
            if (subBeat === 0) {
                bar.classList.add('active');
            } else {
                bar.classList.add('sub-active');
            }
        }
    }

    function scheduler() {
        while (nextNoteTime < audioContext.currentTime + 0.1) {
            scheduleNote(currentBeat, currentSubBeat, nextNoteTime);
            nextNote();
        }
        timerID = window.setTimeout(scheduler, 25.0);
    }

    startStopBtn.addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false;
            window.clearTimeout(timerID);
            
            // Use localized text from data attributes
            const startText = startStopBtn.getAttribute('data-text-start');
            btnText.textContent = startText;
            btnIcon.textContent = "▶";
            
            startStopBtn.classList.remove('btn-danger');
            startStopBtn.classList.add('btn-primary');
        } else {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            isPlaying = true;
            currentBeat = 0;
            currentSubBeat = 0;
            nextNoteTime = audioContext.currentTime + 0.1;
            scheduler();
            
            // Use localized text from data attributes
            const stopText = startStopBtn.getAttribute('data-text-stop');
            btnText.textContent = stopText;
            btnIcon.textContent = "⏸";
            
            startStopBtn.classList.remove('btn-primary');
            startStopBtn.classList.add('btn-danger');
        }
    });

    // Initialize
    updateConfig();
});
