import ThreeStats from "three/addons/libs/stats.module.js";

const showAdditionalStats = false;

const stats = new ThreeStats();
const additionalStats = showAdditionalStats
	? {
			calls: stats.addPanel(new ThreeStats.Panel("CALLS", "#ff8", "#221")),
			triangles: stats.addPanel(
				new ThreeStats.Panel("TRIANGLES", "#f80", "#210")
			),
			lines: stats.addPanel(new ThreeStats.Panel("LINES", "#8ff", "#122")),
			points: stats.addPanel(new ThreeStats.Panel("POINTS", "#f8f", "#212")),
			geometries: stats.addPanel(
				new ThreeStats.Panel("GEOMETRIES", "#8f8", "#121")
			),
			textures: stats.addPanel(
				new ThreeStats.Panel("TEXTURES", "#88f", "#112")
			),
			delta: stats.addPanel(new ThreeStats.Panel("DELTA", "#fff", "#222")),
		}
	: null;

export function initialize(showStats) {
	if (showStats) {
		document.body.appendChild(stats.dom);
	}
}

export function begin() {
	stats.begin();
}

export function update(renderer, delta) {
	if (!additionalStats) return;

	const { render, memory } = renderer.info;

	additionalStats.calls.update(render.drawCalls, 100);
	additionalStats.triangles.update(render.triangles, 100000);
	additionalStats.lines.update(render.lines, 1000);
	additionalStats.points.update(render.points, 1000);
	additionalStats.geometries.update(memory.geometries, 100);
	additionalStats.textures.update(memory.textures, 100);
	additionalStats.delta.update(delta * 1000, 100);
}

export function end() {
	stats.end();
}
