// Attendre 2 secondes avant de réessayer une connexion interrompue.
const RECONNECT_DELAY = 2000;
const SHADER_MODE_COUNT = 4;

export default class WebSocketClient {
	constructor(onMode, onGyroscopeAngle) {
		// Ces fonctions sont fournies par ArduinoShaderController :
		// elles appliquent les shaders et l'angle reçus au rendu webcam.
		this.onMode = onMode;
		this.onGyroscopeAngle = onGyroscopeAngle;
		this.currentMode = 0;
		this.disposed = false;
		// Réinitialiser les effets au chargement de la page, mais pas à chaque reconnexion.
		this.resetOnConnect = true;
		this.connect();
	}

	connect() {
		// Ne pas rouvrir une connexion après la destruction du client.
		if (this.disposed) return;
		// Connexion au relais Node.js, qui reçoit les données USB de l'Arduino.
		const socket = this.socket = new WebSocket("ws://localhost:8080");

		socket.addEventListener("open", () => {
			// Le relais efface les couches sauvegardées et revient au premier shader.
			if (this.resetOnConnect) {
				socket.send(JSON.stringify({ type: "reset" }));
				this.resetOnConnect = false;
			}
			console.info("WebSocket connecté !");
		});

		socket.addEventListener("message", (event) => {
			if (this.disposed) return;
	
			// Compatibilité avec l'ancien relais qui envoyait un simple texte.
			// Le modulo permet de revenir au mode 0 après le mode 3.
			if (event.data === "Validation") {
				this.currentMode = (this.currentMode + 1) % SHADER_MODE_COUNT;
				this.onMode(this.currentMode);
				console.info(`Validation reçue : shader ${this.currentMode}.`);
				return;
			}
	
			// Le relais actuel envoie du JSON : on transforme le texte en objet.
			let message;
			try {
				message = JSON.parse(event.data);
			} catch (error) {
				console.warn("Message WebSocket inconnu :", event.data, error);
				return;
			}
	
			// Un message gyroscope règle seulement l'intensité de la couche active.
			if (message?.type === "gyroscope") {
				// Ignorer les angles invalides ou hors de la plage prévue.
				if (
					!Number.isFinite(message.angle) || message.angle < -90 || message.angle > 90
				) {
					console.error("Angle du gyroscope invalide.", message);
					return;
				}
	
				this.onGyroscopeAngle(message.angle);
				return;
			}
	
			// Les autres messages attendus décrivent le mode actif (de 0 à 3).
			if (
				message?.type !== "mode" ||
				!Number.isInteger(message.mode) ||
				message.mode < 0 ||
				message.mode > 3
			) {
				console.error("Message WebSocket de mode invalide.", message);
				return;
			}
	
			// Vérifier chaque couche : un mode valide et une intensité entre 0 et 1.
			// Les anciennes couches sont figées ; la dernière reste réglable.
			if (message.shaders !== undefined && (!Array.isArray(message.shaders) ||
				message.shaders.length === 0 || message.shaders.some((layer) => !layer ||
					!Number.isInteger(layer.mode) || layer.mode < 0 || layer.mode >= SHADER_MODE_COUNT ||
					!Number.isFinite(layer.intensity) || layer.intensity < 0 || layer.intensity > 1))) {
				console.error("Pile de shaders invalide.", message);
				return;
			}
			// Transmettre l'état complet au contrôleur pour afficher la bonne superposition.
			this.currentMode = message.mode;
			this.onMode(message.mode, message.shaders);
			console.info(`Mode shader reçu : ${this.currentMode}.`);
		});

		socket.addEventListener("error", (error) => {
			console.error("Erreur de connexion au serveur WebSocket.", error);
		});

		socket.addEventListener("close", () => {
			// Réessayer automatiquement si la fermeture n'a pas été demandée par dispose().
			console.warn(
				`WebSocket déconnecté. Nouvelle tentative dans ${RECONNECT_DELAY / 1000}s.`
			);
			if (!this.disposed) {
				this.reconnectTimer = window.setTimeout(() => this.connect(), RECONNECT_DELAY);
			}
		});
	}


	dispose() {
		// Arrêter les reconnexions et fermer le WebSocket lorsque le client est détruit.
		this.disposed = true;
		window.clearTimeout(this.reconnectTimer);
		this.socket?.close();
	}
}
