import { texture, uniform, uv, vec2 } from "three/tsl";
import * as THREE from "three/webgpu";
import webcam from "../tools/WebCam";
import sizes from "../utils/Sizes";
import { hueShader } from "../shaders/hue/hueShader";
import { saturationShader } from "../shaders/saturation/saturationShader";
import { glitchShader } from "../shaders/glitch/glitchShader";
import { deformationShader } from "../shaders/deformation/deformationShader";

const CAMERA_SHADERS = [
	{ name: "Variation de teinte", shader: hueShader },
	{ name: "Saturation", shader: saturationShader },
	{ name: "Glitch / CRT", shader: glitchShader },
	{ name: "Déformation", warp: deformationShader },
];

class WebCamMaterial extends THREE.MeshBasicNodeMaterial {
	constructor(parameters) {
		super(parameters);
		this.shaderIntensity = uniform(1);
		this.shaderStack = [{ mode: 0, intensity: this.shaderIntensity }];
		this.coverScale = uniform(new THREE.Vector2(1, 1));
		this.onResize = () => this.updateCoverScale();
		sizes.addEventListener("resize", this.onResize);

		this.webcamTexture = new THREE.DataTexture(
			new Uint8Array([0, 0, 0, 255]),
			1,
			1,
			THREE.RGBAFormat,
			THREE.UnsignedByteType
		);
		this.webcamTexture.colorSpace = THREE.SRGBColorSpace;

		this.colorNode = this.applyEffects(texture(this.webcamTexture));
	}

	updateCoverScale() {
		const { width, height } = this.webcamTexture.image;
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

		this.coverScale.value.set(scaleX, scaleY);
	}

	createCoverUv() {
		return uv()
			.sub(vec2(0.5, 0.5))
			.mul(this.coverScale)
			.add(vec2(0.5, 0.5));
	}

	createWebcamNode() {
		const coverUv = this.createCoverUv();
		const webcamSample = texture(this.webcamTexture, coverUv);
		return this.applyEffects(webcamSample, (coords) => texture(this.webcamTexture, coords), coverUv);
	}

	dispose() {
		sizes.removeEventListener("resize", this.onResize);
		this.webcamTexture.dispose();
		super.dispose();
	}

	applyEffects(inputColor, sampleAt = () => inputColor, coords) {
		// Composer les lectures de l?image pour conserver les couches pr?c?dentes lors de la d?formation.
		const sample = this.shaderStack.reduce((previous, layer) => {
			const effect = CAMERA_SHADERS[layer.mode];
			return effect.warp
				? (position) => previous(effect.warp(position, layer.intensity))
				: (position) => effect.shader(previous(position), layer.intensity);
		}, sampleAt);
		return sample(coords);
	}

	setSelectedShader(mode) {
		this.setShaderStack([
			...this.shaderStack.map((layer) => ({ mode: layer.mode, intensity: layer.intensity.value })),
			{ mode, intensity: this.shaderIntensity.value },
		]);
	}

	setShaderStack(layers) {
		if (!Array.isArray(layers) || layers.length === 0 || layers.some((layer) =>
			!layer || !Number.isInteger(layer.mode) || layer.mode < 0 || layer.mode >= CAMERA_SHADERS.length ||
			!Number.isFinite(layer.intensity) || layer.intensity < 0 || layer.intensity > 1)) {
			throw new RangeError("Invalid camera shader stack.");
		}
		this.shaderStack = layers.map((layer) => ({ mode: layer.mode, intensity: uniform(layer.intensity) }));
		this.shaderIntensity = this.shaderStack.at(-1).intensity;
		this.colorNode = this.createWebcamNode();
		this.needsUpdate = true;
	}

	getShaderName(mode) {
		if (!Number.isInteger(mode) || mode < 0 || mode >= CAMERA_SHADERS.length) {
			throw new RangeError(`Invalid camera shader mode: ${mode}`);
		}

		return CAMERA_SHADERS[mode].name;
	}

	setShaderIntensity(intensity) {
		if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
			throw new RangeError(`Invalid shader intensity: ${intensity}`);
		}

		this.shaderIntensity.value = intensity;
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
				frame.data,
				frame.width,
				frame.height,
				THREE.RGBAFormat,
				THREE.UnsignedByteType
			);

			this.webcamTexture.colorSpace = THREE.SRGBColorSpace;
			this.webcamTexture.flipY = true;
			this.webcamTexture.needsUpdate = true;

			this.updateCoverScale();
			this.colorNode = this.createWebcamNode();
			this.needsUpdate = true;
		} else {
			this.webcamTexture.image.data.set(frame.data);
			this.webcamTexture.needsUpdate = true;
		}
	}
}

const webCamMaterial = new WebCamMaterial();

export default webCamMaterial;
