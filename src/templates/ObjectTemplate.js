import * as THREE from "three/webgpu";

export default class TemplateObject extends THREE.Mesh {
	constructor(
		geometry = new THREE.BoxGeometry(1, 1, 1),
		material = new THREE.MeshBasicNodeMaterial()
	) {
		super(geometry, material);
	}

	update(time) {
		// Ajouter ici les animations ? effectuer ? chaque image.
	}
}
