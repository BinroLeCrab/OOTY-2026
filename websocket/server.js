import { SerialPort } from "serialport";
import { WebSocket, WebSocketServer } from "ws";

const serialPath = process.argv[2] ?? "COM8";
const webSocketPort = 8080;

const serialPort = new SerialPort({
	path: serialPath,
	baudRate: 115200,
	autoOpen: false,
});

await new Promise((resolve, reject) => {
	serialPort.open((error) => {
		if (error) {
			reject(error);
			return;
		}

		resolve();
	});
}).catch((error) => {
	console.error(`Impossible d'ouvrir le port série ${serialPath}.`, error);
	process.exit(1);
});

console.info(`Arduino connecté sur ${serialPath} à 115200 bauds.`);
console.info("En attente d'un appui sur le bouton de validation D2...");

const webSocketServer = new WebSocketServer({ port: webSocketPort });
let serialBuffer = "";
let lastGyroscopeLogAt = 0;

function broadcast(message) {
	let delivered = 0;

	for (const client of webSocketServer.clients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
			delivered += 1;
		}
	}

	return delivered;
}

function reportValidation(message) {
	const connectedBrowsers = broadcast(message);
	console.info("✅ Bouton D2 détecté : validation reçue depuis l'Arduino.");
	console.info(`Validation envoyée à ${connectedBrowsers} navigateur(s).`);

	if (connectedBrowsers === 0) {
		console.warn("Aucun navigateur connecté : la couleur ne peut pas encore changer.");
	}
}

function reportMode(mode) {
	const connectedBrowsers = broadcast(JSON.stringify({ type: "mode", mode }));
	console.info(`Mode partagé reçu : Encodeur - Mode : ${mode}.`);
	console.info(`Mode envoyé à ${connectedBrowsers} navigateur(s).`);

	if (connectedBrowsers === 0) {
		console.warn("Aucun navigateur connecté : la couleur ne peut pas changer.");
	}
}

webSocketServer.on("listening", () => {
	console.info(`Serveur WebSocket prêt sur ws://localhost:${webSocketPort}.`);
});

webSocketServer.on("connection", () => {
	console.info("Un navigateur est connecté au serveur WebSocket.");
});

webSocketServer.on("error", (error) => {
	console.error("Erreur du serveur WebSocket.", error);
	serialPort.close((closeError) => {
		if (closeError) {
			console.error(`Impossible de fermer le port série ${serialPath}.`, closeError);
		}

		process.exitCode = 1;
	});
});

serialPort.on("data", (chunk) => {
	serialBuffer += chunk.toString("utf8");

	let newlineIndex = serialBuffer.indexOf("\n");
	while (newlineIndex !== -1) {
		const line = serialBuffer.slice(0, newlineIndex).trim();
		serialBuffer = serialBuffer.slice(newlineIndex + 1);

		if (line === "Validation") {
			reportValidation("Validation");
			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}

		const gyroscopeMatch = /^Gyroscope\s*:\s*(-?(?:\d+(?:\.\d*)?|\.\d+))$/i.exec(line);
		if (gyroscopeMatch) {
			const angle = Number(gyroscopeMatch[1]);
			if (Number.isFinite(angle) && angle >= -90 && angle <= 90) {
				const connectedBrowsers = broadcast(
					JSON.stringify({ type: "gyroscope", angle })
				);
				const now = Date.now();

				if (now - lastGyroscopeLogAt >= 500) {
					console.info(
						`Gyroscope : ${angle.toFixed(1)}° | rotation Y : ${angle.toFixed(1)}° | envoyé à ${connectedBrowsers} navigateur(s).`
					);
					lastGyroscopeLogAt = now;
				}

				if (connectedBrowsers === 0) {
					console.warn("Angle du gyroscope reçu, mais aucun navigateur n'est connecté.");
				}
			} else {
				console.warn(`Angle du gyroscope ignoré (attendu entre -90 et 90) : ${line}`);
			}

			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}

		const modeMatch = /^(?:Encodeur|Bouton) - Mode\s*:\s*(\d+)$/.exec(line);
		if (modeMatch) {
			const mode = Number(modeMatch[1]);
			if (mode <= 3) {
				reportMode(mode);
			} else {
				console.warn(`Mode encodeur/bouton ignoré (valeur invalide) : ${line}`);
			}

			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}

		const match = /^Validation:(\d+)$/.exec(line);
		if (match) {
			const value = Number(match[1]);
			if (Number.isInteger(value) && value >= 0 && value <= 3) {
				reportValidation(JSON.stringify({ type: "mode", mode: value }));
			} else {
				// Older Arduino sketches send millis() after "Validation:".
				reportValidation("Validation");
			}
		} else if (line) {
			console.warn(`Message série inconnu ignoré : ${line}`);
		}

		newlineIndex = serialBuffer.indexOf("\n");
	}

	if (serialBuffer.length > 128) {
		console.warn("Ligne série trop longue, contenu ignoré.");
		serialBuffer = "";
	}
});

serialPort.on("error", (error) => {
	console.error(`Erreur sur le port série ${serialPath}.`, error);
});

serialPort.on("close", () => {
	console.error(`Connexion série à ${serialPath} fermée.`);
});
