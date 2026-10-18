import * as THREE from "three/webgpu";
import groundMaterial from "../../materials/GroundMaterial";

export default class Ground extends THREE.Mesh {
	constructor(size = 2) {
		const geometry = new THREE.PlaneGeometry(size, size);
		const material = groundMaterial;

		super(geometry, material);

		this.rotation.x = -Math.PI * 0.5;
		this.receiveShadow = true;
	}
}
