import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import OsmdAudioPlayer from 'osmd-audio-player';

window.startScorePreview = () => {
    const osmd = new OpenSheetMusicDisplay("osmd-container", {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        drawMeasureNumbers: true
    });

    const audioPlayer = new OsmdAudioPlayer();
    const scoreUrl = document.getElementById('score-url').textContent;
    let isPlaying = false;

    async function loadScore() {
        try {
            await osmd.load(scoreUrl);
            osmd.render();
            audioPlayer.loadScore(osmd);
        } catch (e) {
            console.error("Failed to load score for preview", e);
            document.getElementById('osmd-container').innerHTML =
                '<div class="alert alert-danger">Failed to load the score for preview.</div>';
        }
    }

    document.getElementById('btn-play').addEventListener('click', async () => {
        if (isPlaying) return;
        isPlaying = true;
        const btn = document.getElementById('btn-play');
        btn.disabled = true;
        try { await audioPlayer.play(); } catch(e) { console.log('Playback error'); }
        finally { isPlaying = false; btn.disabled = false; }
    });

    loadScore();
};
