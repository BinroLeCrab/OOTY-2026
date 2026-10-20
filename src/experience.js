import * as THREE from "three/webgpu";

import Scene from "./scene/Scene";
import PostProcessing from "./postprocessing/PostProcessing";
import interactionRaycaster from "./tools/InteractionRaycaster";
import * as stats from "./tools/Stats";
import ArduinoShaderController from "./controllers/ArduinoShaderController";
import webcam from "./tools/WebCam";
import sizes from "./utils/Sizes";
import AtmosphereAudio from "./tools/AtmosphereAudio";

const showStats = true;
const logRendererInfo = false;
const renderPostProcessing = false;

// --- BASE

const canvas = document.querySelector("canvas.threejs");

if (!canvas) {
	throw new Error("The .threejs canvas was not found.");
}

const scene = new Scene();

const atmosphereAudio = new AtmosphereAudio();
const arduinoController = new ArduinoShaderController(scene.video, (angle) => {
	atmosphereAudio.bip.setAngle(angle);
});

// --- CAM?RA

// const camera = new THREE.PerspectiveCamera(
// 	35,
// 	sizes.width / sizes.height,
// 	0.1,
// 	100
// );
// camera.position.set(0, 0, 10);


const camera = new THREE.OrthographicCamera(
	sizes.width / -2,
	sizes.width / 2,
	sizes.height / 2,
	sizes.height / -2,
	0,
	2000
);

camera.position.z = 10;
scene.add(camera);

// --- MOTEUR DE RENDU

const renderer = new THREE.WebGPURenderer({
	canvas,
	antialias: true,
});

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(0x000000);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);
await renderer.init();


// --- CONTR?LES

interactionRaycaster.init(camera, canvas);

// --- POST-TRAITEMENT

const postProcessing = renderPostProcessing
	? new PostProcessing(renderer, scene, camera)
	: null;

// --- D?BOGAGE

stats.initialize(showStats);

// --- REDIMENSIONNEMENT

sizes.addEventListener("resize", () => {
	// camera.aspect = sizes.width / sizes.height;
	// Mettre ? jour la cam?ra
	camera.left = sizes.width / -2;
	camera.right = sizes.width / 2;
	camera.top = sizes.height / 2;
	camera.bottom = sizes.height / -2;

	camera.updateProjectionMatrix();

	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
});

// --- ANIMATION

const timer = new THREE.Timer();
timer.connect(document);

const tick = () => {
	stats.begin();

	timer.update();

	const time = {
		delta: timer.getDelta(),
		elapsed: timer.getElapsed(),
	};
	atmosphereAudio.update(time.delta);

	// --- Mettre ? jour la sc?ne
	// Objets de la sc?ne
	scene.update(time);

	// Contr?les et d?tection des interactions ? la souris
	interactionRaycaster.update();


	// -- Dessiner la sc?ne
	if (renderPostProcessing) {
		postProcessing.render();
	} else {
		renderer.render(scene, camera);
	}

	stats.update(renderer, time.delta);
	stats.end();

	if (logRendererInfo) {
		console.log(renderer.info);
	}
};

renderer.setAnimationLoop(tick);

if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		renderer.setAnimationLoop(null);
		arduinoController.dispose();
		atmosphereAudio.dispose();
		webcam.dispose();
		interactionRaycaster.dispose();
		scene.video.material.dispose();
		scene.video.geometry.dispose();
		timer.dispose();
		renderer.dispose();
	});
}
