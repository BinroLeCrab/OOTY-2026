export const vertexShader = `
attribute vec2 position;
varying vec2 vUv;
void main() {
 vUv = position * 0.5 + 0.5;
 gl_Position = vec4(position, 0.0, 1.0);
}`;

export const fragmentShader = `
precision highp float;
uniform sampler2D texture1;
uniform float factor;
uniform vec2 resolution;
uniform float imageAspect;
varying vec2 vUv;

float hash(vec2 p) {
 return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
 vec2 cell = floor(p);
 vec2 f = fract(p);
 f = f * f * (3.0 - 2.0 * f);
 return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
            mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), f.x), f.y);
}
float dissolveMap(vec2 p) {
 float value = 0.0;
 float amplitude = 0.5;
 for (int i = 0; i < 5; i++) {
  value += amplitude * noise(p);
  p = p * 2.03 + vec2(7.3, 19.1);
  amplitude *= 0.5;
 }
 return value;
}
void main() {
 float aspect = resolution.x / resolution.y;
 vec2 cover = vec2(min(aspect / imageAspect, 1.0), min(imageAspect / aspect, 1.0));
 vec2 uv = (vUv - 0.5) * cover + 0.5;
 vec4 colorA = texture2D(texture1, uv);
 float map = dissolveMap(vec2(vUv.x * aspect, vUv.y) * 5.0);
 // Meme seuil que le shader de reference : 0 = accueil, 1 = webcam.
 float threshold = map + 0.1 * (1.0 - factor);
 float revealed = step(threshold, factor);
 // Un fin liseré dore accompagne le front de dissolution.
 float edge = (1.0 - smoothstep(0.0, 0.035, threshold - factor))
              * (1.0 - revealed) * smoothstep(0.0, 0.08, factor);
 vec3 color = mix(colorA.rgb, vec3(0.91, 0.77, 0.46), edge * 0.7);
 // La webcam est deja rendue sous ce canvas : la transparence remplace texture2.
 gl_FragColor = vec4(color, colorA.a * (1.0 - revealed));
}`;
