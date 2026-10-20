import WebSocketClient from "../websocket/WebSocketClient";
import ActionSounds from "../tools/ActionSounds";

const SHADER_MODE_COUNT = 4;

// Relie les données reçues par WebSocket au matériau de la webcam.
// Le relais Node.js décide des sauvegardes ; ce contrôleur applique leur résultat.
export default class ArduinoShaderController {
	constructor(target, onGyroscopeAngle = () => {}) {
		this.onGyroscopeAngle = onGyroscopeAngle;
		// État initial : premier effet à 100 %, aucun effet sauvegardé.
		this.mode = 0;
		this.gyroscopeAngle = null;
		this.intensity = 1;
		this.savedLayerCount = 0;
		// Panneau d'informations affiché en haut à droite de la page.
		this.infoPanel = typeof document !== "undefined"
			? document.getElementById("shader-info") : null;
		this.setTarget(target);
		this.updateInfoPanel();

		// Associer chaque type de donnée reçue à la méthode qui la traite.
		this.actionSounds = new ActionSounds();
		this.webSocketClient = new WebSocketClient(
			(mode, shaders) => this.setMode(mode, shaders),
			(angle) => this.setGyroscopeAngle(angle),
			(action) => this.actionSounds.play(action)
		);
	}

	dispose() {
		// Fermer la connexion et empêcher les nouvelles tentatives de connexion.
		this.webSocketClient.dispose();
		this.actionSounds.dispose();
	}

	setTarget(target) {
		// La cible doit être un objet Three.js, comme le plan vidéo de la scène.
		if (!target?.isObject3D) {
			throw new TypeError("ArduinoShaderController target must be a THREE.Object3D.");
		}

		this.target = target;
	}

	setMode(mode, shaders) {
		// Les modes Arduino vont de 0 à 3, même si l'affichage indique 1 à 4.
		if (!Number.isInteger(mode) || mode < 0 || mode >= SHADER_MODE_COUNT) {
			throw new RangeError(`Invalid shader mode: ${mode}`);
		}

		this.mode = mode;
		if (shaders !== undefined) {
			// Remplacer la pile par l'état complet reçu du relais.
			// Les couches précédentes sont figées ; la dernière reste réglable.
			for (const material of this.getShaderMaterials()) material.setShaderStack(shaders);
			this.intensity = shaders.at(-1).intensity;
			this.savedLayerCount = shaders.length - 1;
		} else {
			// Compatibilité avec les messages qui ne contiennent que le mode.
			this.setSelectedShader(mode);
			this.savedLayerCount += 1;
		}
		this.updateInfoPanel();
		console.info(`Shader sélectionné : ${this.getShaderName(mode)} (mode ${mode}).`);
	}

	setGyroscopeAngle(angle) {
		// Accepter les angles finis et borner ensuite les paramètres du rendu et de l'audio.
		if (!Number.isFinite(angle)) {
			throw new RangeError(`Invalid gyroscope angle: ${angle}`);
		}

		this.gyroscopeAngle = angle;
		this.onGyroscopeAngle(Math.max(-90, Math.min(90, angle)));
		// Convertir l'inclinaison en intensité : 100 % à plat, 0 % à ±90°.
		// Math.abs permet d'obtenir la même intensité des deux côtés.
		this.setShaderIntensity(Math.max(0, 1 - Math.abs(angle) / 90));
	}

	setShaderIntensity(intensity) {
		// L'intensité est stockée entre 0 et 1, puis affichée en pourcentage.
		if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
			throw new RangeError(`Invalid shader intensity: ${intensity}`);
		}

		let updatedMaterials = 0;
		// Parcourir la cible et ses enfants, qui peuvent avoir plusieurs matériaux.
		this.target.traverse((object) => {
			const materials = Array.isArray(object.material) ? object.material : [object.material];
			for (const material of materials) {
				if (typeof material?.setShaderIntensity === "function") {
					// Le matériau modifie uniquement sa couche active, sans toucher aux sauvegardes.
					material.setShaderIntensity(intensity);
					updatedMaterials += 1;
				}
			}
		});
		if (updatedMaterials === 0) {
			console.warn("Gyroscope angle received, but target has no adjustable shader material.");
		}

		this.intensity = intensity;
		this.updateInfoPanel();
	}

	updateInfoPanel() {
		// Actualiser le texte après un changement de shader ou d'inclinaison.
		if (!this.infoPanel) return;
		const angle = this.gyroscopeAngle === null
			? "En attente" : `${this.gyroscopeAngle.toFixed(1)}°`;
		this.infoPanel.textContent =
			`Shader ${this.mode + 1} : ${this.getShaderName(this.mode)}\n` +
			`Gyroscope (Y) : ${angle}\n` +
			`Intensité : ${(this.intensity * 100).toFixed(0)} %\n` +
			`Effets sauvegardés : ${this.savedLayerCount}`;
	}

	getShaderName(mode) {
		// Le matériau connaît les noms des effets ; éviter de les recopier ici.
		const material = this.getShaderMaterials()[0];
		return material?.getShaderName(mode) ?? `mode ${mode}`;
	}

	setSelectedShader(mode) {
		// Ajouter l'effet demandé lorsque le message ne fournit pas de pile complète.
		const materials = this.getShaderMaterials();

		if (materials.length === 0) {
			console.warn("Shader selection received, but target has no camera shader material.");
			return;
		}

		for (const material of materials) {
			material.setSelectedShader(mode);
		}
	}

	getShaderMaterials() {
		// Un Set évite de retourner plusieurs fois un matériau partagé entre objets.
		const materials = new Set();

		this.target.traverse((object) => {
			const objectMaterials = Array.isArray(object.material)
				? object.material
				: [object.material];

			for (const material of objectMaterials) {
				// Ne garder que les matériaux capables de gérer les effets webcam.
				if (typeof material?.setSelectedShader === "function") {
					materials.add(material);
				}
			}
		});

		return [...materials];
	}
}
