import { Fn, If, texture, uniform, uv, vec2 } from 'three/tsl';
import * as THREE from 'three/webgpu';
import webcam from '../tools/WebCam';
import sizes from '../utils/Sizes';
import { hueShader } from '../shaders/hue/hueShader';
import { saturationShader } from '../shaders/saturation/saturationShader';
import { glitchShader, glitchColumnShader } from '../shaders/glitch/glitchShader';
import { deformationShader } from '../shaders/deformation/deformationShader';
import { validEffects } from '../utils/arduinoProtocol';

const neutral = {hue:0,saturation:0,glitch:0,deformation:0};
const uniforms = effects => Object.fromEntries(Object.entries(effects).map(([key,value]) => [key,uniform(value)]));

class WebCamMaterial extends THREE.MeshBasicNodeMaterial {
 constructor(parameters) {
  super(parameters);
  this.coverScale = uniform(new THREE.Vector2(1,1));
  this.webcamTexture = new THREE.VideoTexture(webcam.video);
  this.webcamTexture.colorSpace = THREE.SRGBColorSpace;
  this.pipelineCache = new Map();
  this.onResize = () => this.updateCoverScale();
  sizes.addEventListener('resize',this.onResize);
  this.videoWidth = 0;
  this.videoHeight = 0;
  this.setEffects(neutral,[]);
 }
 updateCoverScale() {
  const {videoWidth:width,videoHeight:height} = webcam.video;
  if (!width || !height) return;
  const videoAspect = width/height, planeAspect = sizes.width/sizes.height;
  this.coverScale.value.set(videoAspect>planeAspect ? planeAspect/videoAspect : 1, videoAspect>planeAspect ? 1 : videoAspect/planeAspect);
 }
 // Composer un ensemble : teinte puis saturation, colonnes, et d?formation globale.
 // Les conditions sont uniformes et ?vitent le bruit co?teux lorsque l'intensit? est nulle.
 compose(previous, effects) {
  return Fn(([coords]) => {
   const position = coords.add(vec2(0)).toVar();
   If(effects.deformation.greaterThan(0), () => position.assign(deformationShader(coords,effects.deformation)));
   const columnCoords = position.toVar();
   // Copier les coordonn?es avant la pixellisation pour dessiner la trame au bon endroit.
   const sampleCoords = position.add(vec2(0)).toVar();
   If(effects.glitch.greaterThan(0), () => sampleCoords.assign(glitchShader(position,effects.glitch,this.coverScale)));
   const color = previous(sampleCoords).toVar();
   If(effects.hue.greaterThan(0), () => color.assign(hueShader(color,effects.hue)));
   If(effects.saturation.greaterThan(0), () => color.assign(saturationShader(color,effects.saturation)));
   If(effects.glitch.greaterThan(0), () => color.assign(glitchColumnShader(color,effects.glitch,columnCoords,this.coverScale)));
   return color;
  });
 }
 setEffects(effects,savedEffects = []) {
  if (!validEffects(effects) || !Array.isArray(savedEffects) || !savedEffects.every(validEffects)) throw new RangeError('Effets invalides.');
  // Chaque taille de pile r?utilise son graphe ; seuls les uniformes changent en direct.
  const count = savedEffects.length;
  let pipeline = this.pipelineCache.get(count);
  if (!pipeline) {
   const groups = [...savedEffects,effects].map(uniforms);
   let sample = coords => texture(this.webcamTexture,coords);
   for (const group of groups) sample = this.compose(sample,group);
   const coords = uv().sub(0.5).mul(this.coverScale).add(0.5);
   pipeline = {groups,colorNode:sample(coords)};
   this.pipelineCache.set(count,pipeline);
   if(this.pipelineCache.size>4) this.pipelineCache.delete(this.pipelineCache.keys().next().value);
  }
  [...savedEffects,effects].forEach((group,index) => {
   for(const key of Object.keys(neutral)) pipeline.groups[index][key].value = group[key];
  });
  this.effectIntensities = pipeline.groups.at(-1);
  if (this.colorNode !== pipeline.colorNode) {
   this.colorNode = pipeline.colorNode;
   this.needsUpdate = true;
  }
 }
 update() {
  const {videoWidth,videoHeight} = webcam.video;
  if(videoWidth!==this.videoWidth || videoHeight!==this.videoHeight) {
   this.videoWidth=videoWidth; this.videoHeight=videoHeight;
   this.updateCoverScale();
  }
 }
 dispose() {
  sizes.removeEventListener('resize',this.onResize);
  this.webcamTexture.dispose();
  this.pipelineCache.clear();
  super.dispose();
 }
}
export default new WebCamMaterial();
