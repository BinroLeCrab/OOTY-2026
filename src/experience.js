import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three/webgpu";

import Scene from "./scene/Scene";
import PostProcessing from "./postprocessing/PostProcessing";
import interactionRaycaster from "./tools/InteractionRaycaster";
import * as stats from "./tools/Stats";
import ArduinoObjectController from "./controllers/ArduinoObjectController";
import webcam from "./tools/WebCam";
import sizes from "./utils/Sizes";

const showStats = true;
const logRendererInfo = false;
const renderPostProcessing = false;

// --- BASE

const canvas = document.querySelector("canvas.threejs");

if (!canvas) {
	throw new Error("The .threejs canvas was not found.");
}

const scene = new Scene();

const arduinoController = new ArduinoObjectController(scene.baseObject);

// --- CAMERA

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

// --- RENDERER

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

// --- CONTROLS

interactionRaycaster.init(camera, canvas);

// --- POST-PROCESSING

const postProcessing = new PostProcessing(renderer, scene, camera);

// --- DEBUG

stats.initialize(showStats);

// --- RESIZE

sizes.addEventListener("resize", () => {
	// camera.aspect = sizes.width / sizes.height;
	// Update the camera
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

	// --- Update Scene
	// objects
	scene.update(time);

	// controls and interaction raycaster
	interactionRaycaster.update();

	// -- Render Scene
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
