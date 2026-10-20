import { SerialPort } from "serialport";
import { WebSocket, WebSocketServer } from "ws";

// Port USB : argument du terminal, puis variable SERIAL_PORT, puis COM8.
const serialPath = process.argv[2] ?? process.env.SERIAL_PORT ?? "COM8";
const webSocketPort = 8080;
const serialPort = new SerialPort({ path: serialPath, baudRate: 115200, autoOpen: false });

// Attendre la connexion USB. Le debit doit correspondre au Serial.begin(115200) du sketch.
await new Promise((resolve, reject) => {
	serialPort.open((error) => {
		if (error) { reject(error); return; }
		resolve();
	});
}).catch((error) => {
	console.error("Impossible d'ouvrir le port serie " + serialPath, error);
	process.exit(1);
});

console.info("Arduino connecte sur " + serialPath + " a 115200 bauds.");
console.info("En attente d'un appui sur le bouton de validation D2...");
const webSocketServer = new WebSocketServer({ port: webSocketPort });
// Etat partage : shader actif de 0 a 3, angle et pile des effets.
let currentMode = 0;
// La derniere couche reste reglable ; les precedentes sont sauvegardees.
const shaderStack = [{ mode: 0, intensity: 1 }];
let currentAngle = 0;
// Garder les morceaux de texte USB jusqu'a recevoir une ligne complete.
let serialBuffer = "";
let lastGyroscopeLogAt = 0;

// Envoyer aux navigateurs connectes et compter les destinataires.
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

// Bouton : figer l'effet actif et superposer une nouvelle couche du même shader.
function reportValidation() {
	console.info("Bouton : superposition du shader " + (currentMode + 1));
	reportMode(currentMode, true);
}

// savePrevious = true pour le bouton, false pour une selection avec l'encodeur.
function reportMode(mode, savePrevious = false) {
	// Ne rien changer si l'encodeur selectionne le mode deja actif.
	if (mode === currentMode && !savePrevious) return;
	currentMode = mode;
	const layer = { mode, intensity: 1 - Math.abs(currentAngle) / 90 };
	if (savePrevious) {
		// Ajouter une couche conserve l'effet precedent et son intensite.
		shaderStack.push(layer);
		console.info("Effet sauvegarde. " + (shaderStack.length - 1) + " couche(s) memorisee(s).");
	} else {
		// Remplacer uniquement la couche active, sans toucher aux sauvegardes.
		shaderStack[shaderStack.length - 1] = layer;
	}
	// Envoyer la pile complete au navigateur pour synchroniser les effets.
	const connectedBrowsers = broadcast(JSON.stringify({ type: "mode", mode, shaders: shaderStack }));
	console.info((savePrevious ? "Validation" : "Selection sans sauvegarde") + " : shader " + (mode + 1));
	console.info("Mode envoye a " + connectedBrowsers + " navigateur(s).");
	if (connectedBrowsers === 0) console.warn("Aucun navigateur connecte : le shader ne peut pas changer.");
}

webSocketServer.on("listening", () => {
	console.info("Serveur WebSocket pret sur ws://localhost:" + webSocketPort);
});

// Chaque navigateur recoit l'etat actuel lors de sa connexion.
webSocketServer.on("connection", (client) => {
	// Le navigateur envoie un reset lorsqu'on charge ou recharge la page.
	client.on("message", (data) => {
		let message;
		try { message = JSON.parse(data.toString()); } catch { return; }
		if (message?.type !== "reset") return;
		// Effacer les sauvegardes et revenir au premier shader selon l'angle actuel.
		currentMode = 0;
		shaderStack.splice(0, shaderStack.length, { mode: 0, intensity: 1 - Math.abs(currentAngle) / 90 });
		broadcast(JSON.stringify({ type: "mode", mode: currentMode, shaders: shaderStack }));
		broadcast(JSON.stringify({ type: "gyroscope", angle: currentAngle }));
	});
	client.send(JSON.stringify({ type: "mode", mode: currentMode, shaders: shaderStack }));
	client.send(JSON.stringify({ type: "gyroscope", angle: currentAngle }));
	client.on("error", (error) => console.error("Erreur client WebSocket.", error));
	console.info("Un navigateur est connecte au serveur WebSocket.");
});
// Si le serveur echoue, liberer aussi le port USB.
webSocketServer.on("error", (error) => {
	console.error("Erreur du serveur WebSocket.", error);
	serialPort.close((closeError) => {
		if (closeError) console.error("Impossible de fermer le port serie " + serialPath, closeError);
		process.exitCode = 1;
	});
});

// L'USB peut envoyer plusieurs lignes ou une ligne en plusieurs morceaux.
serialPort.on("data", (chunk) => {
	serialBuffer += chunk.toString("utf8");
	let newlineIndex = serialBuffer.indexOf("\n");
	// Traiter toutes les lignes completes, puis conserver le morceau restant.
	while (newlineIndex !== -1) {
		const line = serialBuffer.slice(0, newlineIndex).trim();
		serialBuffer = serialBuffer.slice(newlineIndex + 1);
		// Bouton : Validation, ou ancien format Validation:horodatage.
		if (line === "Validation" || /^Validation:\d+$/.test(line)) {
			console.info("Commande bouton recue : " + line);
			reportValidation();
			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}
		// Compatibilite avec l'ancien format Bouton - Mode : N.
		const buttonModeMatch = /^Bouton - Mode\s*:\s*(\d+)$/i.exec(line);
		if (buttonModeMatch) {
			console.info("Commande bouton recue : " + line);
			const mode = Number(buttonModeMatch[1]);
			if (mode < 4) reportValidation();
			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}
		// Extraire l'angle du message Gyroscope:angle (negatif ou positif).
		const gyroscopeMatch = /^Gyroscope\s*:\s*(-?(?:\d+(?:\.\d*)?|\.\d+))$/i.exec(line);
		if (gyroscopeMatch) {
			const angle = Number(gyroscopeMatch[1]);
			if (Number.isFinite(angle) && angle >= -90 && angle <= 90) {
				currentAngle = angle;
				// Modifier seulement la couche active : 100 % a plat, 0 % a +/-90 degres.
				shaderStack.at(-1).intensity = 1 - Math.abs(angle) / 90;
				const connectedBrowsers = broadcast(JSON.stringify({ type: "gyroscope", angle }));
				const now = Date.now();
				// Le rendu suit chaque mesure ; les logs sont limites a une fois toutes les 500 ms.
				if (now - lastGyroscopeLogAt >= 500) {
					console.info("Gyroscope : " + angle.toFixed(1) + " deg | intensite shader : " + ((1 - Math.abs(angle) / 90) * 100).toFixed(0) + " % | envoye a " + connectedBrowsers + " navigateur(s).");
					lastGyroscopeLogAt = now;
				}
			} else {
				console.warn("Angle du gyroscope ignore (attendu entre -90 et 90) : " + line);
			}
			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}
		// Encodeur : choisir un shader sans sauvegarder l'effet remplace.
		const modeMatch = /^(?:(Encodeur|Potentiometre|Potentiom?tre)\s*-\s*)?Mode\s*:\s*(\d+)(?:\s*-\s*.+)?$/i.exec(line);
		if (modeMatch) {
			const mode = Number(modeMatch[2]);
			if (mode <= 3) reportMode(mode);
			else console.warn("Mode encodeur/bouton ignore (valeur invalide) : " + line);
			newlineIndex = serialBuffer.indexOf("\n");
			continue;
		}
		if (line) console.warn("Message serie inconnu ignore : " + line);
		newlineIndex = serialBuffer.indexOf("\n");
	}
	// Eviter d'accumuler du texte sans fin si les donnees serie sont incorrectes.
	if (serialBuffer.length > 128) {
		console.warn("Ligne serie trop longue, contenu ignore.");
		serialBuffer = "";
	}
});
serialPort.on("error", (error) => console.error("Erreur sur le port serie " + serialPath, error));
serialPort.on("close", () => console.error("Connexion serie a " + serialPath + " fermee."));
