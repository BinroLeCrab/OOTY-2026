import * as THREE from "three/webgpu";
import Video from "./objects/Video";

export default class Scene extends THREE.Scene {
	constructor() {
		super();

		this.addObjects();
	}

	addObjects() {
		this.video = new Video(10);
		this.add(this.video);
	}

	update(time) {
		this.video.update();
	}
}
