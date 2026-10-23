import { Howl } from "howler";

export default class BipAudio {
	constructor() {
		this.enabled = false;
		this.intensity = 0;
		this.voices = [];
		this.wait = 0;
		this.sound = new Howl({
			src: [`${import.meta.env.BASE_URL}sounds/bipbip.mp3`],
			volume: 0.65,
			onloaderror: (_id, error) => console.error("Impossible de charger sounds/bipbip.mp3 :", error),
		});
	}

	setAngle(angle) {
		if (Number.isFinite(angle)) this.intensity = Math.max(0, 1 - Math.abs(angle) / 90);
	}

	setIntensity(intensity) {
		if (Number.isFinite(intensity)) this.intensity = Math.max(0, Math.min(1, intensity));
	}

	update(delta) {
		if (!this.enabled || this.sound.volume() === 0) return;
		// À 0 %, silence ; la cadence augmente ensuite jusqu'à 100 %.
		if (this.intensity <= 0) {
			this.sound.stop();
			this.voices = [];
			this.wait = 0;
			return;
		}
		if (this.sound.state() !== "loaded") return;
		// Superposer les bips à forte intensité pour éviter de couper leur attaque.
		this.wait += Math.max(0, Math.min(delta, 0.1));
		// Entre 0 et 20 %, espacer les bips de 3 à 2 secondes.
		// Au-delà, accélérer progressivement jusqu'à 40 ms à 100 %.
		const interval = this.intensity <= 0.2
			? 3 - 5 * this.intensity
			: 0.04 + 1.96 * Math.pow((1 - this.intensity) / 0.8, 2.5);
		if (this.wait >= interval) {
			this.wait = 0;
			this.voices = this.voices.filter(id => this.sound.playing(id));
			// Borner la superposition pour garder un niveau sonore stable.
			if (this.voices.length >= 4) this.sound.stop(this.voices.shift());
			this.voices.push(this.sound.play());
		}
	}

	play() {
		this.enabled = true;
		this.wait = 2;
	}

	pause() {
		this.enabled = false;
		this.sound.stop();
		this.voices = [];
		this.wait = 0;
	}

	dispose() {
		this.enabled = false;
		this.sound.unload();
	}
}
