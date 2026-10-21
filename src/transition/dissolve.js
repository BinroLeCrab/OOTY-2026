import { vertexShader, fragmentShader } from './shaders.js';

export default function createDissolve(image) {
 const canvas = document.createElement('canvas');
 canvas.className = 'transition-dissolve';
 canvas.setAttribute('aria-hidden', 'true');
 const gl = canvas.getContext('webgl', {alpha:true, premultipliedAlpha:false, antialias:false});
 if (!gl) return null;
 const shaders = [];
 let program;
 let buffer;
 let texture;
 const dispose = () => {
  canvas.remove();
  if (texture) gl.deleteTexture(texture);
  if (buffer) gl.deleteBuffer(buffer);
  if (program) gl.deleteProgram(program);
  shaders.forEach(shader => gl.deleteShader(shader));
 };
 try {
  program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]]) {
   const shader = gl.createShader(type);
   shaders.push(shader);
   gl.shaderSource(shader, source);
   gl.compileShader(shader);
   if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
   gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, 'texture1'), 0);
  gl.uniform1f(gl.getUniformLocation(program, 'imageAspect'), image.naturalWidth / image.naturalHeight);
  const factor = gl.getUniformLocation(program, 'factor');
  const resolution = gl.getUniformLocation(program, 'resolution');
  const render = value => {
   const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
   const width = Math.round(window.innerWidth * pixelRatio);
   const height = Math.round(window.innerHeight * pixelRatio);
   if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
   }
   gl.uniform2f(resolution, width, height);
   gl.uniform1f(factor, value);
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  render(0);
  return {canvas, render, dispose};
 } catch (error) {
  console.warn('Dissolution indisponible, utilisation du fondu :', error);
  dispose();
  return null;
 }
}
