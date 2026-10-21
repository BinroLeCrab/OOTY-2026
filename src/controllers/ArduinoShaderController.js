import WebSocketClient from '../websocket/WebSocketClient';
import ActionSounds from '../tools/ActionSounds';
import { effectsFromState, validState } from '../utils/arduinoProtocol';

export default class ArduinoShaderController {
 constructor(target, onIntensity = () => {}) {
  if (!target?.isObject3D) throw new TypeError('La cible doit être un objet Three.js.');
  this.onIntensity = onIntensity;
  this.materials = new Set();
  target.traverse(object => {
   for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (typeof material?.setEffects === 'function') this.materials.add(material);
   }
  });
  this.infoPanel = document.getElementById('shader-info');
  this.actionSounds = new ActionSounds();
  this.setState({axes:{x:null,y:null,z:null},hue:0,savedEffects:[]});
  this.webSocketClient = new WebSocketClient(state => this.setState(state), action => this.actionSounds.play(action));
 }
 setState(state) {
  if (!validState(state)) throw new RangeError('État Arduino invalide.');
  const effects = effectsFromState(state);
  for (const material of this.materials) material.setEffects(effects, state.savedEffects);
  // Le bip représente l'effet de rotation le plus intense, indépendamment de la teinte.
  this.onIntensity(Math.max(effects.deformation, effects.glitch, effects.saturation));
  if (!this.infoPanel) return;
  const angle = value => value == null ? 'En attente' : value.toFixed(1) + '°';
  const percent = value => (value * 100).toFixed(0) + ' %';
  const text = [
   'GYROSCOPE / EFFETS',
   'X : ' + angle(state.axes.x) + ' — Glitch : ' + percent(effects.glitch),
   'Y : ' + angle(state.axes.y) + ' — Déformation : ' + percent(effects.deformation),
   'Z : ' + angle(state.axes.z) + ' — Saturation : ' + percent(effects.saturation),
   'Encodeur / teinte : ' + percent(effects.hue) + ' (' + (effects.hue * 360).toFixed(0) + '°)',
   'Ensembles sauvegardés : ' + state.savedEffects.length,
  ].join('\n');
  if (this.infoPanel.textContent !== text) this.infoPanel.textContent = text;
 }
 dispose() {
  this.webSocketClient.dispose();
  this.actionSounds.dispose();
 }
}
