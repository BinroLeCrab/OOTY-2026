import { printImageUrl } from './tools/ThermalPrinter.js';

// Remettre a false pour reactiver l'accueil, la voix off et la transition.
const SKIP_INTRO = true;

if (SKIP_INTRO) {
    document.getElementById('home').hidden = true;
    document.body.classList.remove('on-home');
    await import('./experience.js');
} else {
    await import('./accueil.js');
}

const printButton = document.getElementById('print-canvas');
const canvasThreeJS = document.querySelector('.threejs');

printButton.addEventListener('click', async () => {
    const dataUrl = canvasThreeJS.toDataURL('image/png');

    try {
        await printImageUrl(dataUrl);
    } catch (error) {
        console.error("Erreur lors de l'impression :", error);
    }
});
