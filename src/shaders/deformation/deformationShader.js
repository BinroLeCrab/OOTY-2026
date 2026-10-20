import { Fn, mx_noise_vec3, vec2 } from "three/tsl";

// Les ondulations restent fixes lorsque l'intensité de la couche est sauvegardée.
export const deformationShader = Fn(([coords, intensity]) => {
	const strength = intensity.clamp(0, 1);
	// Brouiller le domaine pour casser les motifs réguliers du bruit.
	const domainWarp = mx_noise_vec3(coords.mul(3.1).add(vec2(7.3, 19.1))).xy;
	const warpedCoords = coords.add(domainWarp.mul(0.24));
	// Superposer des mouvements larges et des plis plus fins, décorrélés en X/Y.
	const broad = mx_noise_vec3(warpedCoords.mul(4.3).add(vec2(13.7, 2.9))).xy;
	const medium = mx_noise_vec3(warpedCoords.mul(10.7).add(vec2(31.2, 17.8))).xy;
	const fine = mx_noise_vec3(warpedCoords.mul(23.1).add(vec2(4.6, 43.5))).xy;
	const offset = broad.mul(0.22)
		.add(medium.mul(0.075))
		.add(fine.mul(0.025))
		.mul(strength);
	// Atténuer la déformation près des bords pour éviter les bandes noires.
	const edge = coords.mul(coords.oneMinus()).mul(4);
	return coords.add(offset.mul(edge.x.mul(edge.y))).clamp(0, 1);
});
