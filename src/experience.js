import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as THREE from "three/webgpu";

import Scene from "./scene/Scene";
import PostProcessing from "./postprocessing/PostProcessing";
import interactionRaycaster from "./tools/InteractionRaycaster";
import Sizes from "./utils/Sizes";
import * as stats from "./tools/Stats";
import webcam from "./tools/WebCam";

const showStats = true;
const logRendererInfo = false;
const renderPostProcessing = true;

// --- BASE

const canvas = document.querySelector("canvas.threejs");

if (!canvas) {
	throw new Error("The .threejs canvas was not found.");
}

const sizes = new Sizes();
const scene = new Scene();

// --- CAMERA

const camera = new THREE.PerspectiveCamera(
	35,
	sizes.width / sizes.height,
	0.1,
	100
);
camera.position.set(0, 4.5, 2.5);
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

const controls = new OrbitControls(camera, canvas);
controls.target.copy(scene.baseObject.position);
controls.enableDamping = true;
camera.lookAt(scene.baseObject.position);

interactionRaycaster.init(camera, canvas);

// --- POST-PROCESSING

const postProcessing = new PostProcessing(renderer, scene, camera);

// --- DEBUG

stats.initialize(showStats);

// --- RESIZE

sizes.addEventListener("resize", () => {
	camera.aspect = sizes.width / sizes.height;
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
	controls.update();
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
