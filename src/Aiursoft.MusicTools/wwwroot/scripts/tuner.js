document.addEventListener('DOMContentLoaded', () => {
    const startStopBtn = document.getElementById('start-stop-btn');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    const noteDisplay = document.getElementById('note-display');
    const frequencyDisplay = document.getElementById('frequency-display');
    const meterPointer = document.getElementById('meter-pointer');
    const centsDisplay = document.getElementById('cents-display');
    const canvas = document.getElementById('frequency-chart');
    const ctx = canvas.getContext('2d');
    const unsupportedWarning = document.getElementById('unsupported-warning');

    let isRunning = false;
    let audioContext = null;
    let source = null;
    let analyser = null;
    let stream = null;
    let rafID = null;
    
    // Frequency history for graph
    const historyLimit = 200;
    let frequencyHistory = new Array(historyLimit).fill(0);
    
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    function getNoteFromFrequency(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        return Math.round(noteNum) + 69;
    }

    function getStandardFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function getCents(frequency, note) {
        return Math.floor(1200 * Math.log(frequency / getStandardFrequency(note)) / Math.log(2));
    }

    async function startTuner() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                unsupportedWarning.classList.remove('d-none');
                return;
            }

            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);

            isRunning = true;
            updateBtnUI();
            updateTuner();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please ensure permissions are granted.');
        }
    }

    function stopTuner() {
        isRunning = false;
        if (rafID) cancelAnimationFrame(rafID);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        updateBtnUI();
        
        // Reset UI
        noteDisplay.textContent = '-';
        frequencyDisplay.textContent = '0.00 Hz';
        meterPointer.style.left = '50%';
        centsDisplay.textContent = '0 cents';
    }

    function updateBtnUI() {
        if (isRunning) {
            btnText.textContent = startStopBtn.getAttribute('data-text-stop');
            btnIcon.textContent = "⏹";
            startStopBtn.classList.remove('btn-primary');
            startStopBtn.classList.add('btn-danger');
        } else {
            btnText.textContent = startStopBtn.getAttribute('data-text-start');
            btnIcon.textContent = "🎤";
            startStopBtn.classList.remove('btn-danger');
            startStopBtn.classList.add('btn-primary');
        }
    }

    function autoCorrelate(buf, sampleRate) {
        // Find a root-mean-square (RMS) to see if we have enough signal
        let size = buf.length;
        let rms = 0;

        for (let i = 0; i < size; i++) {
            let val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / size);
        if (rms < 0.01) // Not enough signal
            return -1;

        let r1 = 0, r2 = size - 1, thres = 0.2;
        for (let i = 0; i < size / 2; i++)
            if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        for (let i = 1; i < size / 2; i++)
            if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }

        buf = buf.slice(r1, r2);
        size = buf.length;

        let c = new Array(size).fill(0);
        for (let i = 0; i < size; i++)
            for (let j = 0; j < size - i; j++)
                c[i] = c[i] + buf[j] * buf[j + i];

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < size; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    }

    function updateTuner() {
        if (!isRunning) return;

        const buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);
        const pitch = autoCorrelate(buffer, audioContext.sampleRate);

        if (pitch !== -1 && pitch < 2000) { // Limit to reasonable frequency
            const note = getNoteFromFrequency(pitch);
            const cents = getCents(pitch, note);
            const octave = Math.floor(note / 12) - 1;
            
            noteDisplay.textContent = noteStrings[note % 12] + octave;
            frequencyDisplay.textContent = pitch.toFixed(2) + " Hz";
            
            // Update meter: cents range -50 to +50
            const percent = 50 + cents; // -50 -> 0%, 0 -> 50%, 50 -> 100%
            meterPointer.style.left = Math.max(0, Math.min(100, percent)) + "%";
            centsDisplay.textContent = (cents > 0 ? "+" : "") + cents + " cents";
            
            // Color based on closeness
            if (Math.abs(cents) < 5) {
                noteDisplay.className = "display-1 fw-bold text-success mb-2";
                meterPointer.className = "position-absolute top-0 translate-middle-x bg-success rounded-pill h-100 transition-all";
            } else if (Math.abs(cents) < 15) {
                noteDisplay.className = "display-1 fw-bold text-warning mb-2";
                meterPointer.className = "position-absolute top-0 translate-middle-x bg-warning rounded-pill h-100 transition-all";
            } else {
                noteDisplay.className = "display-1 fw-bold text-primary mb-2";
                meterPointer.className = "position-absolute top-0 translate-middle-x bg-primary rounded-pill h-100 transition-all";
            }
            
            // Add to history
            frequencyHistory.push(pitch);
        } else {
            frequencyHistory.push(0);
        }
        
        if (frequencyHistory.length > historyLimit) {
            frequencyHistory.shift();
        }

        drawGraph();
        rafID = requestAnimationFrame(updateTuner);
    }

    function drawGraph() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (canvas.height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = '#0d6efd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const maxFreq = 1000; // Max frequency to show in graph
        
        let first = true;
        for (let i = 0; i < frequencyHistory.length; i++) {
            const x = (canvas.width / historyLimit) * i;
            const freq = frequencyHistory[i];
            
            if (freq === 0) {
                first = true;
                continue;
            }
            
            const y = canvas.height - (freq / maxFreq) * canvas.height;
            
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    startStopBtn.addEventListener('click', () => {
        if (isRunning) {
            stopTuner();
        } else {
            startTuner();
        }
    });

    // Handle resize
    window.addEventListener('resize', () => {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawGraph();
    });
    
    // Initial size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
});
