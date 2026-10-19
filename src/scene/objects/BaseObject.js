import * as THREE from "three/webgpu";
import basicMaterial from "../../materials/BasicMaterial";

export default class BaseObject extends THREE.Mesh {
	constructor(size = 2) {
		const geometry = new THREE.SphereGeometry(size, 64, 64);
		const material = basicMaterial;

		super(geometry, material);
	}
}
