import { initializeThermalPrinter, printImageUrl } from './tools/ThermalPrinter.js';

initializeThermalPrinter();

// Remettre a false pour reactiver l'accueil, la voix off et la transition.
const SKIP_INTRO = false;

if (SKIP_INTRO) {
    document.getElementById('home').hidden = true;
    document.body.classList.remove('on-home');
    await import('./experience.js');
} else {
    await import('./accueil.js');
}

const canvasThreeJS = document.querySelector(".threejs");

document.addEventListener("keydown", async (event) => {
    if (event.key.toLowerCase() === "p") {
        event.preventDefault();

        const dataUrl = canvasThreeJS.toDataURL("image/png");
        console.log("Data URL:", dataUrl); // Log the data URL to the console

        try {
            await printImageUrl(dataUrl);
        } catch (error) {
            console.error("Erreur lors de l'impression :", error);
        }
    }
});
