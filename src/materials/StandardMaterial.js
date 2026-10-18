import { color, mix, normalView, sin, time, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";
import { fresnel } from "../shaders/fragmentShaders";

class StandardMaterial extends THREE.MeshStandardNodeMaterial {
	constructor(parameters) {
		super(parameters);

		const baseColor = mix(
			color("#1e3a8a"),
			color("#f472b6"),
			sin(time).mul(0.5).add(0.5)
		);

		this.colorNode = fresnel(baseColor);
        this.emissiveNode = this.colorNode;
	}
}

const standardMaterial = new StandardMaterial();

export default standardMaterial;