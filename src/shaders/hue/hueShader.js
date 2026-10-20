import { Fn, hue, saturation, vec4 } from "three/tsl";

export const hueShader = Fn(([inputColor, intensity]) => {
	// Parcourir le cercle complet des teintes sur 360 degrés.
	// Chaque couche possède sa propre intensité : sa teinte reste figée au changement de shader.
	const strength = intensity.clamp(0, 1);
	const hueAngle = strength.mul(Math.PI * 2);
	// Renforcer progressivement les couleurs pendant la rotation de teinte.
	const vivid = saturation(hue(inputColor.rgb, hueAngle), strength.mul(1.5).add(1));
	return vec4(vivid.clamp(0, 1), inputColor.a);
});
