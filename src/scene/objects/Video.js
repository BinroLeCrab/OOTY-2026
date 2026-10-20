import * as THREE from "three/webgpu";
import webCamMaterial from "../../materials/WebCamMaterial";
import sizes from "../../utils/Sizes";

export default class Video extends THREE.Mesh {
	constructor(size = 2) {
		const geometry = new THREE.PlaneGeometry(sizes.width, sizes.height);
		const material = webCamMaterial;

		super(geometry, material);


		// this.rotation.x = -Math.PI * 0.5;
		this.receiveShadow = true;

		sizes.addEventListener("resize", () => {
			this.geometry.dispose();
			this.geometry = new THREE.PlaneGeometry(sizes.width, sizes.height);
		});
	}

	update() {
		webCamMaterial.update();
	}
}
