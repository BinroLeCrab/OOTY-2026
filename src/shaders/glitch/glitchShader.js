import { dot, Fn, mix, screenSize, vec2, vec3, vec4 } from "three/tsl";

// Une grille fine, plus espacée horizontalement pour former des colonnes.
export const glitchShader = Fn(([coords, intensity, coverScale]) => {
	const strength = intensity.clamp(0, 1).toVar();
	const screenUv = coords.sub(0.5).div(coverScale).add(0.5).toVar();
	const cellSize = vec2(10, 4);
	const sampleUv = screenUv.mul(screenSize).div(cellSize).floor()
		.add(0.5).mul(cellSize).div(screenSize);
	const sampleCoords = sampleUv.sub(0.5).mul(coverScale).add(0.5).clamp(0, 1);
	return strength.greaterThan(0).select(sampleCoords, coords);
});

export const glitchColumnShader = Fn(([inputColor, intensity, coords, coverScale]) => {
	const source = inputColor.toVar();
	const strength = intensity.clamp(0, 1).toVar();
	const screenUv = coords.sub(0.5).div(coverScale).add(0.5).toVar();
	const grid = screenUv.mul(screenSize).div(vec2(10, 4)).toVar();
	const local = grid.fract().sub(0.5).abs().toVar();
	const columnNoise = grid.x.floor().mul(127.1).sin().mul(43758.5453).fract();

	// Des points étroits alignés en colonnes, avec un halo autour du cœur.
	const core = local.x.smoothstep(0.07, 0.18).oneMinus()
		.mul(local.y.smoothstep(0.19, 0.43).oneMinus());
	const halo = local.x.mul(7).pow(2).add(local.y.mul(2).pow(2)).negate().exp().mul(0.22);
	const luminance = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
	// Les ombres disparaissent et chaque colonne a un seuil légèrement différent.
	const threshold = columnNoise.mul(0.14).add(0.07).toVar();
	const light = luminance.smoothstep(threshold, threshold.add(0.32));
	const columns = source.rgb.mul(light).mul(core.mul(2.4).add(halo)).clamp(0, 1);
	return vec4(mix(source.rgb, columns, strength), source.a);
});

