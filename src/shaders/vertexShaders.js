import {
	cameraPosition,
	color,
	cos,
	dot,
	Fn,
	length,
	max,
	mix,
	normalLocal,
	normalView,
	normalWorld,
	PI,
	positionGeometry,
	positionLocal,
	positionViewDirection,
	positionWorld,
	time,
	uniform,
	uv,
	vec3,
} from "three/tsl";

export const wave = Fn(({ axis = "y", axis2 = "z", frequency = 5, speed = 5, amplitude = 5, duration = 1 }) => {
	// const coords = uv();

	const waveFacor = positionWorld[axis]
		.mul(PI.mul(frequency)) // Frequency
		.add(time.mul(speed)) // Speed
		.sin()
		.mul(amplitude) // Amplitude
		.mul(0.01)
        .mul(duration);

    if (axis2 === "x") {
        return vec3(positionLocal.x.add(waveFacor), positionLocal.y, positionLocal.z);
    } else if (axis2 === "y") {
        return vec3(positionLocal.x, positionLocal.y.add(waveFacor), positionLocal.z);
    } else if (axis2 === "z") {
        return vec3(positionLocal.x, positionLocal.y, positionLocal.z.add(waveFacor));
    }
});
