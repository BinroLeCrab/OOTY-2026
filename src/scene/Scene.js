import * as THREE from "three/webgpu";
import BaseObject from "./objects/BaseObject";
import Ground from "./objects/Ground";
import { hdrLoader } from "../utils/loaders";
import Video from "./objects/Video";

export default class Scene extends THREE.Scene {
	constructor() {
		super();

		this.addObjects();
		this.addLights();

		// this.setupEnvironment();
	}

	setupEnvironment() {
		hdrLoader.load(
			"/assets/environments/sky_environnement.hdr",
			(environmentMap) => {
				environmentMap.mapping = THREE.EquirectangularReflectionMapping;
				this.environment = environmentMap;
				this.background = environmentMap;
				this.environmentIntensity = 0.8;
			},
			undefined,
			(error) => {
				console.error("Unable to load HDR environment.", error);
			}
		);
	}

	addObjects() {
		this.baseObject = new BaseObject(10);
		this.add(this.baseObject);

		// this.ground = new Ground(10);
		// this.add(this.ground);
		this.video = new Video(10);
		this.add(this.video);
	}

	addLights() {
		const directionalLight = new THREE.DirectionalLight(0xffffff, 4.5);
		directionalLight.castShadow = true;
		directionalLight.position
			.set(2, 0.75, -1)
			.normalize()
			.multiplyScalar(10);
		directionalLight.shadow.camera.top = 10;
		directionalLight.shadow.camera.right = 10;
		directionalLight.shadow.camera.bottom = -10;
		directionalLight.shadow.camera.left = -10;
		directionalLight.shadow.camera.near = 0.01;
		directionalLight.shadow.camera.far = 20;
		directionalLight.shadow.radius = 3;
		directionalLight.shadow.normalBias = 0.1;
		this.add(directionalLight);

		this.add(new THREE.AmbientLight(0x859dff, 1));
	}

	update(time) {
		this.baseObject.update(time);
		this.video.update();
	}
}
