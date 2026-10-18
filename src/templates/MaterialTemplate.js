import { color } from "three/tsl";
import * as THREE from "three/webgpu";

export default class TemplateMaterial extends THREE.MeshStandardNodeMaterial {
	constructor(parameters = {}) {
		super(parameters);

		this.colorNode = color("#ffffff");
		this.roughness = 0.5;
		this.metalness = 0;
	}
}
