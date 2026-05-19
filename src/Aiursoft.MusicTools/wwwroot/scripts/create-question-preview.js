import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

window.startCreateQuestionPreview = () => {
    const osmd = new OpenSheetMusicDisplay("osmd-container", {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        drawMeasureNumbers: true
    });

    const scoreUrl = document.getElementById('score-url')?.textContent;
    if (!scoreUrl) return;

    async function loadScore() {
        try {
            await osmd.load(scoreUrl);
            osmd.render();
        } catch (e) {
            console.error("Failed to load score for preview", e);
        }
    }

    loadScore();
};
