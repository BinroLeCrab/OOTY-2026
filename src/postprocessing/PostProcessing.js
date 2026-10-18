import * as THREE from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

export default class PostProcessing {
	constructor(renderer, scene, camera) {
		this.pipeline = new THREE.RenderPipeline(renderer);
		this.scenePass = pass(scene, camera);
		this.sceneOutput = this.scenePass.getTextureNode("output");

		this.createBloomPass();

		// Add another effect by creating a dedicated method:
		// this.createCustomPass();

		this.buildPipeline();
	}

	createBloomPass() {
		this.bloomSettings = {
			strength: 0.15,
			radius: 0.7,
			threshold: 0.7,
		};

		this.bloomPass = bloom(
			this.sceneOutput,
			this.bloomSettings.strength,
			this.bloomSettings.radius,
			this.bloomSettings.threshold
		);
	}

	// Example of an additional post-processing pass:
	//
	// createCustomPass() {
	// 	this.customSettings = {
	// 		// Add the effect parameters here.
	// 	};
	//
	// 	this.customPass = customEffect(
	// 		this.sceneOutput,
	// 		// Pass the effect parameters here.
	// 	);
	// }

	buildPipeline() {
		this.pipeline.outputNode = this.sceneOutput.add(this.bloomPass);

		// Chain another pass after the bloom:
		// this.pipeline.outputNode = this.sceneOutput
		// 	.add(this.bloomPass)
		// 	.add(this.customPass);
	}

	render() {
		this.pipeline.render();
	}
}
