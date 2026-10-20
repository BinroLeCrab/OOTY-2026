import { Fn, hue, vec4 } from "three/tsl";

export const hueShader = Fn(([inputColor, intensity]) => {
	// Faire varier la teinte sur 240 degrés.
	// Chaque couche possède sa propre intensité : sa teinte reste figée au changement de shader.
	const hueAngle = intensity.mul((Math.PI * 4) / 3);
	return vec4(hue(inputColor.rgb, hueAngle), inputColor.a);
});
