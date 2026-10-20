import { Howl } from "howler";

export default class ActionSounds {
	constructor() {
		// Howler déverrouille l'audio après la première interaction dans la page.
		this.sounds = Object.fromEntries(["click", "validation"].map((name) => [
			name,
			new Howl({ src: [`${import.meta.env.BASE_URL}sounds/${name}.mp3`], volume: 0.7 }),
		]));
	}

	play(action) {
		// Les lectures peuvent se chevaucher lors de changements rapides du potentiomètre.
		this.sounds[action]?.play();
	}

	dispose() {
		for (const sound of Object.values(this.sounds)) sound.unload();
	}
}
