import { color, dot, mix, texture, uv, vec2, vec3, vec4 } from "three/tsl";
import * as THREE from "three/webgpu";
import { textureLoader } from "../utils/loaders";
import webcam from "../tools/WebCam";
import sizes from "../utils/Sizes";
import { invertColor } from "../shaders/fragmentShaders";

class WebCamMaterial extends THREE.MeshBasicNodeMaterial {
	constructor(parameters) {
		super(parameters);

		this.webcamTexture = new THREE.DataTexture(
			new Uint8Array([0, 0, 0, 255]),
			1,
			1,
			THREE.RGBAFormat,
			THREE.UnsignedByteType
		);
		this.webcamTexture.colorSpace = THREE.SRGBColorSpace;

		this.colorNode = texture(this.webcamTexture);
	}

	createCoverUv(width, height) {
		const videoAspect = width / height;
		const planeAspect = sizes.width / sizes.height;

		let scaleX = 1;
		let scaleY = 1;

		if (videoAspect > planeAspect) {
			// La vidéo est plus large que le plan :
			// on coupe les côtés.
			scaleX = planeAspect / videoAspect;
		} else {
			// La vidéo est plus haute que le plan :
			// on coupe le haut et le bas.
			scaleY = videoAspect / planeAspect;
		}

		return uv()
			.sub(vec2(0.5, 0.5))
			.mul(vec2(scaleX, scaleY))
			.add(vec2(0.5, 0.5));
	}

	createWebcamNode(width, height) {
		const coverUv = this.createCoverUv(width, height);
		const webcamSample = texture(this.webcamTexture, coverUv);

		return this.applyEffects(webcamSample);
	}

	applyEffects(inputColor) {
		let result = inputColor;

		
        // result = invertColor(result);
		// result = this.greyscale(result);

		return result;
	}

	update() {
		const frame = webcam.getFrame();

		if (!frame) {
			return;
		}

		if (
			this.webcamTexture.image.width !== frame.width ||
			this.webcamTexture.image.height !== frame.height
		) {
			this.webcamTexture.dispose();

			this.webcamTexture = new THREE.DataTexture(
				new Uint8Array(frame.data),
				frame.width,
				frame.height,
				THREE.RGBAFormat,
				THREE.UnsignedByteType
			);

			this.webcamTexture.colorSpace = THREE.SRGBColorSpace;
			this.webcamTexture.flipY = true;
			this.webcamTexture.needsUpdate = true;

			this.colorNode = this.createWebcamNode(frame.width, frame.height);
			this.needsUpdate = true;
		} else {
			this.webcamTexture.image.data.set(frame.data);
			this.webcamTexture.needsUpdate = true;
		}
	}
}

const webCamMaterial = new WebCamMaterial();

export default webCamMaterial;
