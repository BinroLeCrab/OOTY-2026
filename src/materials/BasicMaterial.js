import { color, mix, sin, time } from "three/tsl";
import * as THREE from "three/webgpu";

class BasicMaterial extends THREE.MeshBasicNodeMaterial {
	constructor(parameters) {
		super(parameters);

		const baseColor = mix(
			color("#1e3a8a"),
			color("#f472b6"),
			sin(time).mul(0.5).add(0.5)
		);

		this.colorNode = baseColor;
	}
}

const basicMaterial = new BasicMaterial();

export default basicMaterial;