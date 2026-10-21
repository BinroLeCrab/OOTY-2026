import './accueil.js';
import { printImageUrl } from './tools/ThermalPrinter.js';

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
