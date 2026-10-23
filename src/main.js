import './experience.js';
import { printImageUrl } from './tools/ThermalPrinter.js';

// const video = document.getElementById("webcam");

// navigator.mediaDevices
// 	.getUserMedia({ video: true })
// 	.then((stream) => {
// 		video.srcObject = stream;
// 	})
// 	.catch((error) => {
// 		console.error("Erreur d'accès à la webcam :", error);
// 	});


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