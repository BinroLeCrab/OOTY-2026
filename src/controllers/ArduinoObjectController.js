import * as THREE from "three/webgpu";
import WebSocketClient from "../websocket/WebSocketClient";

const MODE_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#a855f7"];

export default class ArduinoObjectController {
	constructor(object) {
		this.mode = 0;
		this.angle = 0;
		this.setTarget(object);

		this.webSocketClient = new WebSocketClient(
			(mode) => this.setMode(mode),
			(angle) => this.setGyroscopeAngle(angle)
		);
	}

	setTarget(object) {
		if (!object?.isObject3D) {
			throw new TypeError("ArduinoObjectController target must be a THREE.Object3D.");
		}

		this.target = object;
		this.applyMode();
		this.applyGyroscopeAngle();
	}

	setMode(mode) {
		if (!Number.isInteger(mode) || mode < 0 || mode >= MODE_COLORS.length) {
			throw new RangeError(`Invalid color mode: ${mode}`);
		}

		this.mode = mode;
		this.applyMode();
	}

	applyMode() {
		const color = MODE_COLORS[this.mode];
		let coloredMaterials = 0;

		this.target.traverse((object) => {
			const materials = Array.isArray(object.material)
				? object.material
				: [object.material];

			for (const material of materials) {
				if (!material) {
					continue;
				}

				if (typeof material.setColor === "function") {
					material.setColor(color);
					coloredMaterials += 1;
				} else if (material.color?.isColor) {
					material.color.set(color);
					coloredMaterials += 1;
				}
			}
		});

		if (coloredMaterials === 0) {
			console.warn("Arduino mode received, but target has no color-capable materials.");
		}
	}

	setGyroscopeAngle(angle) {
		if (!Number.isFinite(angle)) {
			throw new TypeError(`Invalid gyroscope angle: ${angle}`);
		}

		this.angle = THREE.MathUtils.clamp(angle, -90, 90);
		this.applyGyroscopeAngle();
	}

	applyGyroscopeAngle() {
		this.target.rotation.y = THREE.MathUtils.degToRad(this.angle);
	}
}
