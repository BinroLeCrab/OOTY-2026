const RECONNECT_DELAY = 2000;
const COLOR_MODE_COUNT = 4;

export default class WebSocketClient {
	constructor(onMode, onGyroscopeAngle) {
		this.onMode = onMode;
		this.onGyroscopeAngle = onGyroscopeAngle;
		this.currentMode = 0;
		this.connect();
	}

	connect() {
		const socket = new WebSocket("ws://localhost:8080");

		socket.addEventListener("open", () => {
			console.info("WebSocket connecté !");
		});

		socket.addEventListener("message", (event) => {
			console.info("NAVIGATEUR RECOIT :", new Date().toISOString(), event.data);

			if (event.data === "Validation") {
				this.currentMode = (this.currentMode + 1) % COLOR_MODE_COUNT;
				this.onMode(this.currentMode);
				console.info(`Validation reçue : mode couleur ${this.currentMode}.`);
				return;
			}

			let message;
			try {
				message = JSON.parse(event.data);
			} catch (error) {
				console.warn("Message WebSocket inconnu :", event.data, error);
				return;
			}

			if (message?.type === "gyroscope") {
				if (
					!Number.isFinite(message.angle) ||
					message.angle < -90 ||
					message.angle > 90
				) {
					console.error("Angle du gyroscope invalide.", message);
					return;
				}

				this.onGyroscopeAngle(message.angle);
				return;
			}

			if (
				message?.type !== "mode" ||
				!Number.isInteger(message.mode) ||
				message.mode < 0 ||
				message.mode > 3
			) {
				console.error("Message WebSocket de mode invalide.", message);
				return;
			}

			this.currentMode = message.mode;
			this.onMode(message.mode);
			console.info(`Mode couleur reçu : ${this.currentMode}.`);
		});

		socket.addEventListener("error", (error) => {
			console.error("Erreur de connexion au serveur WebSocket.", error);
		});

		socket.addEventListener("close", () => {
			console.warn(
				`WebSocket déconnecté. Nouvelle tentative dans ${RECONNECT_DELAY / 1000}s.`
			);
			window.setTimeout(() => this.connect(), RECONNECT_DELAY);
		});
	}
}
