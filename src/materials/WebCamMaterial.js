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
  this.animationTime = 0;
  this.variationOffset = 0;
  this.variationKey = undefined;
  this.animationSpeed = 1;
  this.lastFrame = performance.now();
  this.savedTimes = [];
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
 compose(previous, effects, enabled, phase) {
  return Fn(([coords]) => {
   const position = coords.add(vec2(0)).toVar();
   if (enabled.includes('deformation')) If(effects.deformation.greaterThan(0), () => position.assign(deformationShader(coords,effects.deformation,phase)));
   const columnCoords = position.toVar();
   // Copier les coordonn?es avant la pixellisation pour dessiner la trame au bon endroit.
   const sampleCoords = position.add(vec2(0)).toVar();
   if (enabled.includes('glitch')) If(effects.glitch.greaterThan(0), () => sampleCoords.assign(glitchShader(position,effects.glitch,this.coverScale,phase)));
   const color = previous(sampleCoords).toVar();
   if (enabled.includes('hue')) If(effects.hue.greaterThan(0), () => color.assign(hueShader(color,effects.hue)));
   if (enabled.includes('saturation')) If(effects.saturation.greaterThan(0), () => color.assign(saturationShader(color,effects.saturation)));
   if (enabled.includes('glitch')) If(effects.glitch.greaterThan(0), () => color.assign(glitchColumnShader(color,effects.glitch,columnCoords,this.coverScale,phase)));
   return color;
  });
 }
 setEffects(effects,savedEffects = [],activeShaders = Object.keys(neutral),variationKey) {
  if (!validEffects(effects) || !Array.isArray(savedEffects) || !savedEffects.every(validEffects)) throw new RangeError('Effets invalides.');
  // Chaque taille de pile r?utilise son graphe ; seuls les uniformes changent en direct.
  const keys = Object.keys(neutral);
  this.savedTimes.length = Math.min(this.savedTimes.length,savedEffects.length);
  while (this.savedTimes.length < savedEffects.length) this.savedTimes.push(this.animationTime + this.variationOffset);
  // Figer les couches validées avant de changer le motif de la couche active.
  if (variationKey !== this.variationKey) {
   this.variationKey = variationKey;
   this.variationOffset += 50 + Math.random() * 500;
  }
  const savedIndices = savedEffects.flatMap((group,index) => keys.some(key => group[key] > 0) ? [index] : []);
  const saved = savedIndices.map(index => savedEffects[index]);
  const phases = [...savedIndices.map(index => this.savedTimes[index]), this.animationTime + this.variationOffset];
  const values = [...saved,effects];
  const enabled = [...saved.map(group => keys.filter(key => group[key] > 0)), keys.filter(key => activeShaders.includes(key))];
  const signature = enabled.map(group => group.join(',')).join('|');
  let pipeline = this.pipelineCache.get(signature);
  if (!pipeline) {
   const groups = values.map(uniforms);
   const times = phases.map(value => uniform(value));
   let sample = coords => texture(this.webcamTexture,coords);
   groups.forEach((group,index) => { sample = this.compose(sample,group,enabled[index],times[index]); });
   const coords = uv().sub(0.5).mul(this.coverScale).add(0.5);
   pipeline = {groups,times,colorNode:sample(coords)};
   this.pipelineCache.set(signature,pipeline);
   if(this.pipelineCache.size>4) this.pipelineCache.delete(this.pipelineCache.keys().next().value);
  }
  values.forEach((group,index) => {
   for(const key of Object.keys(neutral)) pipeline.groups[index][key].value = group[key];
  });
  this.effectIntensities = pipeline.groups.at(-1);
  phases.forEach((phase,index) => { pipeline.times[index].value = phase; });
  this.effectTime = pipeline.times.at(-1);
  if (this.colorNode !== pipeline.colorNode) {
   this.colorNode = pipeline.colorNode;
   this.needsUpdate = true;
  }
 }
 update() {
  const now = performance.now();
  this.animationTime += Math.min((now-this.lastFrame)/1000,0.1)*this.animationSpeed;
  this.lastFrame = now;
  if (this.effectTime) this.effectTime.value = this.animationTime + this.variationOffset;
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
