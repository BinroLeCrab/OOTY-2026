import { Fn, If, texture, uniform, uv, vec2 } from "three/tsl";
import * as THREE from "three/webgpu";
import webcam from "../tools/WebCam";
import sizes from "../utils/Sizes";
import { hueShader } from "../shaders/hue/hueShader";
import { saturationShader } from "../shaders/saturation/saturationShader";
import { glitchShader, glitchColumnShader } from "../shaders/glitch/glitchShader";
import { deformationShader } from "../shaders/deformation/deformationShader";

const CAMERA_SHADERS = [
	{ name: "Variation de teinte", shader: hueShader },
	{ name: "Saturation", shader: saturationShader },
	{
		name: "Glitch / Colonnes",
		warp: (coords, intensity, coverScale) => glitchShader(coords, intensity, coverScale),
		shade: (color, intensity, coords, coverScale) => glitchColumnShader(color, intensity, coords, coverScale),
	},
	{ name: "Déformation", warp: (coords, intensity) => deformationShader(coords, intensity) },
];

class WebCamMaterial extends THREE.MeshBasicNodeMaterial {
	constructor(parameters) {
		super(parameters);
		this.pipelineCache = new Map();
		this.coverScale = uniform(new THREE.Vector2(1, 1));
		this.onResize = () => this.updateCoverScale();
		sizes.addEventListener("resize", this.onResize);

		// Envoyer la vidéo au GPU sans lecture des pixels ni copie intermédiaire sur le CPU.
		this.webcamTexture = new THREE.VideoTexture(webcam.video);
		this.webcamTexture.colorSpace = THREE.SRGBColorSpace;
		this.videoWidth = 0;
		this.videoHeight = 0;
		this.setShaderStack([{ mode: 0, intensity: 1 }]);
	}

	updateCoverScale() {
		const { videoWidth: width, videoHeight: height } = webcam.video;
		if (!width || !height) return;
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

	createWebcamNode(savedLayers, activeMode, activeIntensity) {
		const coverUv = this.createCoverUv();
		const sample = this.composeLayers(savedLayers);
		// Le mode actif est un uniforme : le potentiomètre ne reconstruit plus le shader.
		return Fn(([coords]) => {
			const position = coords.toVar();
			If(activeMode.equal(2), () => {
				position.assign(glitchShader(coords, activeIntensity, this.coverScale));
			}).ElseIf(activeMode.equal(3), () => {
				position.assign(deformationShader(coords, activeIntensity));
			});
			const color = sample(position).toVar();
			If(activeMode.equal(0), () => {
				color.assign(hueShader(color, activeIntensity));
			}).ElseIf(activeMode.equal(1), () => {
				color.assign(saturationShader(color, activeIntensity));
			}).ElseIf(activeMode.equal(2), () => {
				color.assign(glitchColumnShader(color, activeIntensity, coords, this.coverScale));
			});
			return color;
		})(coverUv);
	}

	dispose() {
		sizes.removeEventListener("resize", this.onResize);
		this.webcamTexture.dispose();
		this.pipelineCache.clear();
		super.dispose();
	}

	composeLayers(layers) {
		// Conserver l'ordre des effets et les déformations des couches sauvegardées.
		return layers.reduce((previous, layer) => {
			const effect = CAMERA_SHADERS[layer.mode];
			if (effect.shade) {
				return (position) => effect.shade(
					previous(effect.warp(position, layer.intensity, this.coverScale)),
					layer.intensity, position, this.coverScale
				);
			}
			return effect.warp
				? (position) => previous(effect.warp(position, layer.intensity, this.coverScale))
				: (position) => effect.shader(previous(position), layer.intensity);
		}, (coords) => texture(this.webcamTexture, coords));
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
		// Les couches figées à zéro sont neutres et ne nécessitent aucun calcul GPU.
		const saved = layers.slice(0, -1).filter((layer) => layer.intensity !== 0);
		const key = saved.map((layer) => layer.mode).join(",");
		let pipeline = this.pipelineCache.get(key);
		if (!pipeline) {
			const savedLayers = saved.map((layer) => ({ mode: layer.mode, intensity: uniform(layer.intensity) }));
			pipeline = { savedLayers, activeMode: uniform(0, "int"), activeIntensity: uniform(1) };
			pipeline.colorNode = this.createWebcamNode(savedLayers, pipeline.activeMode, pipeline.activeIntensity);
			this.pipelineCache.set(key, pipeline);
			// Borner les références conservées lors de longues sessions.
			if (this.pipelineCache.size > 8) this.pipelineCache.delete(this.pipelineCache.keys().next().value);
		}
		pipeline.savedLayers.forEach((layer, index) => { layer.intensity.value = saved[index].intensity; });
		pipeline.activeMode.value = layers.at(-1).mode;
		pipeline.activeIntensity.value = layers.at(-1).intensity;
		this.shaderIntensity = pipeline.activeIntensity;
		// Garder la pile logique complète pour les sauvegardes et l'affichage du compteur.
		this.shaderStack = layers.map((layer, index) => ({
			mode: layer.mode,
			intensity: index === layers.length - 1 ? this.shaderIntensity : { value: layer.intensity },
		}));
		if (this.colorNode !== pipeline.colorNode) {
			this.colorNode = pipeline.colorNode;
			this.needsUpdate = true;
		}
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
		const { videoWidth, videoHeight } = webcam.video;
		if (videoWidth !== this.videoWidth || videoHeight !== this.videoHeight) {
			this.videoWidth = videoWidth;
			this.videoHeight = videoHeight;
			this.updateCoverScale();
		}
	}
}

const webCamMaterial = new WebCamMaterial();

export default webCamMaterial;
