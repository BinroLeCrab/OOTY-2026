import { Fn, mix, saturation, vec4 } from "three/tsl";

export const saturationShader = Fn(([inputColor, intensity]) => {
	// Renforcer les couleurs et les ombres selon l'intensité de la couche active.
	// À zéro, conserver l'image reçue et tous les effets déjà sauvegardés.
	const amount = intensity.mul(7).add(1);
	const saturated = saturation(inputColor.rgb, amount);
	const contrast = intensity.mul(1.5).add(1);
	const vivid = saturated.sub(0.18).mul(contrast).add(0.18).clamp(0, 1);
	return vec4(mix(inputColor.rgb, vivid, intensity), inputColor.a);
});
