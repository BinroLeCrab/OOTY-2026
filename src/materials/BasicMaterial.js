import * as THREE from "three/webgpu";

class BasicMaterial extends THREE.MeshBasicMaterial {
	constructor(parameters = {}) {
		super({ color: "#ef4444", ...parameters });
	}

	setColor(hexColor) {
		this.color.set(hexColor);
	}
}

const basicMaterial = new BasicMaterial();

export default basicMaterial;