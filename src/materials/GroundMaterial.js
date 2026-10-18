import { texture } from "three/tsl";
import * as THREE from "three/webgpu";
import { textureLoader } from "../utils/loaders";

class GroundMaterial extends THREE.MeshStandardNodeMaterial {
	constructor(parameters) {
		super(parameters);

		const floorTexture = textureLoader.load(
			"/assets/textures/floor-color.jpg",
			undefined,
			undefined,
			(error) => {
				console.error("Unable to load the ground texture.", error);
			}
		);
		floorTexture.colorSpace = THREE.SRGBColorSpace;

		this.colorNode = texture(floorTexture);
		this.metalness = 0.7;
		this.roughness = 0.25;
	}
}

const groundMaterial = new GroundMaterial();

export default groundMaterial;