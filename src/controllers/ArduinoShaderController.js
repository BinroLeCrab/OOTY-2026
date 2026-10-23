import WebSocketClient from '../websocket/WebSocketClient';
import ActionSounds from '../tools/ActionSounds';
import ArduinoDebug from '../tools/ArduinoDebug';
import LedClient from '../websocket/LedClient';
import { effectsFromState, validState } from '../utils/arduinoProtocol';

const names = {hue:'Teinte',deformation:'Déformation',saturation:'Saturation',glitch:'Glitch'};

export default class ArduinoShaderController {
 constructor(target,onIntensity = () => {}) {
  if (!target?.isObject3D) throw new TypeError('La cible doit être un objet Three.js.');
  this.onIntensity = onIntensity;
  this.materials = new Set();
  target.traverse(object => {
   for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
    if (typeof material?.setEffects === 'function') this.materials.add(material);
   }
  });
  this.infoPanel = document.getElementById('shader-info');
  if (this.infoPanel) this.infoPanel.textContent = 'Connexion à la sphère…';
  this.actionSounds = new ActionSounds();
  // Materiel par defaut. ?debug=1 active le simulateur.
  const debug = new URLSearchParams(window.location.search).get('debug') === '1';
  if (debug) {
   this.ledClient = new LedClient();
   this.debug = new ArduinoDebug(this);
  }
  else this.webSocketClient = new WebSocketClient(state => this.setState(state),action => this.actionSounds.play(action));
 }
 setState(state,overrideEffects) {
  this.ledClient?.setPair(state.activeShaders);
  if (!validState(state)) throw new RangeError('État Arduino invalide.');
  const effects = overrideEffects ?? effectsFromState(state);
  const variation = `${state.variation ?? 0}:${state.activeShaders.join(',')}:${state.savedEffects.length}`;
  for (const material of this.materials) material.setEffects(effects,state.savedEffects,overrideEffects ? Object.keys(effects) : state.finished ? [] : state.activeShaders,variation);
  this.onIntensity(state.finished ? 0 : Math.max(...Object.values(effects)));
  if (!this.infoPanel) return;
  const angle = value => value === null ? 'En attente' : value.toFixed(1) + '°';
  const percent = value => (value * 100).toFixed(0) + ' %';
  const displayed = state.finished ? state.savedEffects.at(-1) : effects;
  const text = [
   state.finished ? 'PORTRAIT VALIDÉ — TERMINÉ' : 'SHADERS ACTIFS',
   ...state.activeShaders.map((shader,index) => {
    const axis = index === 0 ? 'x' : 'y';
    return axis.toUpperCase() + ' : ' + angle(state.axes[axis]) + ' — ' + names[shader] + ' : ' + percent(displayed[shader]);
   }),
   'Ensembles superposés : ' + state.savedEffects.length,
   'Encodeur : changer les effets. Valider : superposer et continuer.',
  ].join('\n');
  if (this.infoPanel.textContent !== text) this.infoPanel.textContent = text;
 }
 dispose() {
  this.ledClient?.dispose();
  this.debug?.dispose();
  this.webSocketClient?.dispose();
  this.actionSounds.dispose();
 }
}

