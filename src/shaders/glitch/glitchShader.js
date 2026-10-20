import { dot, Fn, mix, screenCoordinate, uv, vec2, vec3, vec4 } from "three/tsl";

export const glitchShader = Fn(([inputColor, intensity]) => {
	const pixel = screenCoordinate.xy;
	const coords = uv();
	const hash = (value) => value.sin().mul(43758.5453).fract();

	// Colonnes de phosphore et lignes horizontales de l'écran CRT, en pixels physiques.
	const column = pixel.x.mod(6).div(2).floor();
	const phosphor = vec3(
		column.lessThan(1).select(1, 0.55),
		column.equal(1).select(1, 0.55),
		column.greaterThan(1).select(1, 0.55)
	);
	const scanline = pixel.y.mul(Math.PI / 2).sin().mul(0.16).add(0.84);
	const grain = hash(dot(pixel, vec2(12.9898, 78.233))).sub(0.5).mul(0.07);

	// Bandes d'interférence fixes : la trame CRT n'est pas animée.
	const band = coords.y.mul(32).floor();
	const bandNoise = hash(band.mul(127.1));
	const interference = bandNoise.greaterThan(0.985).select(0.12, 0);
	const vignette = coords.sub(0.5).length().smoothstep(0.25, 0.72).mul(0.28).oneMinus();

	const crt = inputColor.rgb.mul(phosphor).mul(scanline).mul(vignette)
		.add(grain).add(vec3(0.1, 0.7, 1).mul(interference)).clamp(0, 1);
	return vec4(mix(inputColor.rgb, crt, intensity), inputColor.a);
});
