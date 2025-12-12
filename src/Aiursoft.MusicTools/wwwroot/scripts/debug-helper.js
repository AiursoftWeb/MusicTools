
// ... (imports)

// ... (previous code)

// --- Public Control Functions (attached to window for buttons) ---
window.startMelodyGame = function() {
    startGame();
};

window.playDebugMelody = async function() {
    console.log("%c🎶 Debug: Generating and Playing 4 Bars...", "color: #0dcaf0; font-weight: bold; font-size: 1.2em;");
    
    // 1. Determine Scale
    let notesToPlay = validNotesForLevel;
    if (!notesToPlay || notesToPlay.length === 0) {
        console.warn("⚠️ Game not started. Defaulting to C Major (C4-C5) for debug.");
        notesToPlay = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
    } else {
        console.log(`🔑 Current Scale: ${notesToPlay.join(", ")}`);
    }

    // 2. Generate new block using a temporary generator to preserve game state
    //    (Or use the main one if we don't care about consuming buffer)
    //    Let's use a NEW instance to be safe and clean.
    const debugGen = new MelodyGenerator();
    
    // Force generate a block
    debugGen.generateNextBlock();
    
    // 3. Play it
    const buffer = debugGen.noteBuffer;
    console.table(buffer); // Show data in table

    console.log("▶️ playback started...");
    
    for (let i = 0; i < buffer.length; i++) {
        const item = buffer[i];
        
        // Map Index -> Note Name
        // Ensure index fits in our scale array
        const safeIndex = Math.min(item.noteIndex, notesToPlay.length - 1);
        const noteName = notesToPlay[safeIndex];

        // Is it the start of a bar?
        if (item.isNewBar) {
            console.log(`%c| Bar Start |`, "color: #ffc107; font-weight: bold;");
        }

        console.log(`🎵 Note: ${noteName}, Duration: ${item.duration}`);

        // Visual + Audio
        if (piano) piano.playNote(noteName, 0.4, true);

        // Wait for rhythm
        // Base Beat 500ms = 120 BPM
        await new Promise(r => setTimeout(r, 500 * item.duration));
    }
    
    console.log("%c✅ Debug: Playback Finished.", "color: #198754; font-weight: bold;");
};

// ... (StartGame and rest of code)
