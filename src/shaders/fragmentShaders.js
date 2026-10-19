import {
	cameraPosition,
	color,
	cos,
	dot,
	Fn,
	int,
	length,
	max,
	mix,
	mx_unifiednoise2d,
	normalLocal,
	normalView,
	normalWorld,
	positionGeometry,
	positionLocal,
	positionViewDirection,
	positionWorld,
	time,
	uniform,
	uv,
	vec2,
	vec3,
	vec4,
} from "three/tsl";

export const greyscale = Fn(([inputColor]) => {
	const effectStrength = 1.0; // Adjust this value to control the strength of the effect
	const luminance = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
	const grayscale = vec4(luminance, luminance, luminance, inputColor.a);

	return mix(inputColor, grayscale, effectStrength);
});

export const invertColor = Fn(([inputColor]) => {
	const invertedRgb = vec3(1).sub(inputColor.rgb);

	return vec4(invertedRgb, inputColor.a);
});

export const fresnel = Fn(
	({
		baseColor = color("#000000"),
		secondaryColor = color("#ffffff"),
		power = 2.0,
	}) => {
		// const coords = uv();

		const fresnelFactor = normalView.z.oneMinus().pow(power);

		const color = mix(baseColor, secondaryColor, fresnelFactor);

		return color;
	}
);

export const smoothCircle = Fn(
	({
		foreground = color("#000000"),
		background = color("#ffffff"),
		radius = 0.3,
		smoothness = 0.01,
	}) => {
		const coords = uv().sub(0.5);
		const distance = length(coords);

		const mask = distance.smoothstep(
			radius.sub(smoothness),
			radius.add(smoothness)
		);

		return mix(foreground, background, mask);
	}
);

export const noiseUnifiedFractal2D = Fn(() => {
	// Implementation for 2D fractal noise
	const position2D = uv(0)
		.mul(50)
		.add(vec2(time.mul(0.03), time.mul(0.019)));
	const unifiedOffset2D = vec2(time.mul(0.35), time.mul(0.19));
	return mx_unifiednoise2d(
		int(3),
		position2D,
		vec2(1, 1),
		unifiedOffset2D,
		1,
		0,
		1,
		false,
		3
	);
});
