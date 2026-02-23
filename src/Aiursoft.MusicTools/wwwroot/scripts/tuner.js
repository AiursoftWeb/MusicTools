document.addEventListener('DOMContentLoaded', () => {
    const startStopBtn = document.getElementById('start-stop-btn');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');
    const noteDisplay = document.getElementById('note-display');
    const frequencyDisplay = document.getElementById('frequency-display');
    const meterPointer = document.getElementById('meter-pointer');
    const centsDisplay = document.getElementById('cents-display');
    
    const freqCanvas = document.getElementById('frequency-chart');
    const freqCtx = freqCanvas.getContext('2d');
    
    const waveformCanvas = document.getElementById('waveform-chart');
    const waveformCtx = waveformCanvas.getContext('2d');
    
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
            analyser.fftSize = 4096; // Increased from 2048 for better low frequency detection
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

    function yinPitchTracking(buffer, sampleRate) {
        // 1. Calculate RMS to filter silence/noise
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);
        if (rms < 0.01) return -1; // Signal too weak

        const threshold = 0.15; // Standard YIN threshold
        const bufferSize = buffer.length;
        const halfBufferSize = Math.floor(bufferSize / 2);
        const yinBuffer = new Float32Array(halfBufferSize);

        // Step 1: Difference function
        for (let tau = 1; tau < halfBufferSize; tau++) {
            for (let i = 0; i < halfBufferSize; i++) {
                const delta = buffer[i] - buffer[i + tau];
                yinBuffer[tau] += delta * delta;
            }
        }

        // Step 2: Cumulative mean normalized difference function
        yinBuffer[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau < halfBufferSize; tau++) {
            runningSum += yinBuffer[tau];
            yinBuffer[tau] *= tau / runningSum;
        }

        // Step 3: Absolute threshold search
        let tauEstimate = -1;
        for (let tau = 2; tau < halfBufferSize; tau++) {
            if (yinBuffer[tau] < threshold) {
                while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
                    tau++; 
                }
                tauEstimate = tau;
                break;
            }
        }

        // Step 4: Global minimum fallback
        if (tauEstimate === -1) {
            let minVal = Infinity;
            for (let tau = 2; tau < halfBufferSize; tau++) {
                if (yinBuffer[tau] < minVal) {
                    minVal = yinBuffer[tau];
                    tauEstimate = tau;
                }
            }
            if (minVal >= threshold) {
                return -1;
            }
        }

        // Step 5: Parabolic interpolation
        if (tauEstimate > 0 && tauEstimate < halfBufferSize - 1) {
            const s0 = yinBuffer[tauEstimate - 1];
            const s1 = yinBuffer[tauEstimate];
            const s2 = yinBuffer[tauEstimate + 1];
            
            const shift = 0.5 * (s2 - s0) / (2 * s1 - s2 - s0);
            tauEstimate += shift;
        }

        return sampleRate / tauEstimate;
    }

    function updateTuner() {
        if (!isRunning) return;

        const buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);
        const pitch = yinPitchTracking(buffer, audioContext.sampleRate);

        if (pitch !== -1 && pitch < 5000) { // Limit to reasonable frequency
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

        drawFrequencyGraph();
        drawWaveform(buffer);
        rafID = requestAnimationFrame(updateTuner);
    }

    function drawFrequencyGraph() {
        freqCtx.clearRect(0, 0, freqCanvas.width, freqCanvas.height);
        
        // Draw grid
        freqCtx.strokeStyle = '#e9ecef';
        freqCtx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (freqCanvas.height / 4) * i;
            freqCtx.beginPath();
            freqCtx.moveTo(0, y);
            freqCtx.lineTo(freqCanvas.width, y);
            freqCtx.stroke();
        }

        freqCtx.strokeStyle = '#0d6efd';
        freqCtx.lineWidth = 2;
        freqCtx.beginPath();
        
        const maxFreq = 1000; // Max frequency to show in graph
        
        let first = true;
        for (let i = 0; i < frequencyHistory.length; i++) {
            const x = (freqCanvas.width / historyLimit) * i;
            const freq = frequencyHistory[i];
            
            if (freq === 0) {
                first = true;
                continue;
            }
            
            const y = freqCanvas.height - (freq / maxFreq) * freqCanvas.height;
            
            if (first) {
                freqCtx.moveTo(x, y);
                first = false;
            } else {
                freqCtx.lineTo(x, y);
            }
        }
        freqCtx.stroke();
    }

    function drawWaveform(buffer) {
        waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        
        waveformCtx.lineWidth = 2;
        waveformCtx.strokeStyle = '#20c997'; // Teal color
        waveformCtx.beginPath();

        const sliceWidth = waveformCanvas.width * 1.0 / buffer.length;
        let x = 0;

        for (let i = 0; i < buffer.length; i++) {
            const v = buffer[i]; // -1.0 to 1.0
            const y = (v + 1) / 2 * waveformCanvas.height; // Map to canvas height

            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
        waveformCtx.stroke();
    }

    startStopBtn.addEventListener('click', () => {
        if (isRunning) {
            stopTuner();
        } else {
            startTuner();
        }
    });

    // Handle resize
    function resizeCanvases() {
        const freqContainer = freqCanvas.parentElement;
        freqCanvas.width = freqContainer.clientWidth;
        freqCanvas.height = freqContainer.clientHeight;
        
        const waveContainer = waveformCanvas.parentElement;
        waveformCanvas.width = waveContainer.clientWidth;
        waveformCanvas.height = waveContainer.clientHeight;
        
        drawFrequencyGraph();
        // Can't draw waveform without buffer, will update on next frame
    }

    window.addEventListener('resize', resizeCanvases);
    
    // Initial size
    resizeCanvases();
});
