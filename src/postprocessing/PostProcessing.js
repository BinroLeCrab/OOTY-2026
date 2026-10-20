import * as THREE from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

export default class PostProcessing {
	constructor(renderer, scene, camera) {
		this.pipeline = new THREE.RenderPipeline(renderer);
		this.scenePass = pass(scene, camera);
		this.sceneOutput = this.scenePass.getTextureNode("output");

		this.createBloomPass();

		// Ajouter un autre effet en cr?ant une m?thode d?di?e :
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

	// Exemple d?une ?tape suppl?mentaire de post-traitement :
	//
	// createCustomPass() {
	// 	this.customSettings = {
	// 		// Ajouter ici les param?tres de l?effet.
	// 	};
	//
	// 	this.customPass = customEffect(
	// 		this.sceneOutput,
	// 		// Transmettre ici les param?tres de l?effet.
	// 	);
	// }

	buildPipeline() {
		this.pipeline.outputNode = this.sceneOutput.add(this.bloomPass);

		// Ajouter une autre ?tape apr?s le halo lumineux :
		// this.pipeline.outputNode = this.sceneOutput
		// 	.add(this.bloomPass)
		// 	.add(this.customPass);
	}

	render() {
		this.pipeline.render();
	}
}
