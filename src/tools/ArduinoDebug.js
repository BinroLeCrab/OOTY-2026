import { Pane } from 'tweakpane';
import { SHADERS, createState, effectsFromState, applyArduinoEvent } from '../utils/arduinoProtocol.js';

const options = {
 'Teinte — rouge':'hue',
 'Déformation — bleu':'deformation',
 'Saturation — vert':'saturation',
 'Glitch — violet':'glitch'
};

export default class ArduinoDebug {
 constructor(controller) {
  this.controller = controller;
  this.state = createState({x:0,y:0});
  this.state.encoderMode = 0;
  this.params = {x:0,y:0,shaderX:this.state.activeShaders[0],shaderY:this.state.activeShaders[1],manual:false,
   hue:0,deformation:0,saturation:0,glitch:0,speed:1,layers:0};
  this.container = document.createElement('div');
  this.container.hidden = true;
  this.container.style.cssText = 'position:fixed;top:60px;left:12px;width:min(310px,calc(100vw - 24px));max-height:calc(100vh - 80px);overflow:auto;z-index:20';
  document.body.append(this.container);
  this.pane = new Pane({title:'Debug — sans Arduino',container:this.container});
  const axes = this.pane.addFolder({title:'Angles X / Y'});
  for (const axis of ['x','y']) axes.addBinding(this.params,axis,{label:axis.toUpperCase()+' (°)',min:axis==='x'?-180:-90,max:axis==='x'?180:90,step:1}).on('change',() => {
   applyArduinoEvent(this.state,{type:'gyroscope',axes:{x:this.params.x,y:this.params.y}});
   this.render();
  });
  const shaders = this.pane.addFolder({title:'Deux shaders actifs'});
  for (const key of ['shaderX','shaderY']) shaders.addBinding(this.params,key,{label:key==='shaderX'?'Axe X':'Axe Y',options}).on('change',() => {
   const index = key==='shaderX'?0:1;
   const selected = this.params[key];
   const previous = this.state.activeShaders[index];
   if (this.state.activeShaders[1-index] === selected) this.state.activeShaders[1-index] = previous;
   this.state.activeShaders[index] = selected;
   this.render();
  });
  const intensities = this.pane.addFolder({title:'Intensités (0 à 100 %)'});
  intensities.addBinding(this.params,'manual',{label:'Réglage manuel'}).on('change',() => this.render());
  this.intensityBindings = SHADERS.map(shader => intensities.addBinding(this.params,shader,{label:Object.keys(options).find(key => options[key]===shader),min:0,max:100,step:1}).on('change',() => this.render()));
  const animation = this.pane.addFolder({title:'Animation'});
  animation.addBinding(this.params,'speed',{label:'Vitesse (0 = pause)',min:0,max:3,step:0.1}).on('change',() => {
   for (const material of controller.materials) material.animationSpeed = this.params.speed;
  });
  this.pane.addButton({title:'Changer la paire — sans sauvegarder'}).on('click',() => {
   applyArduinoEvent(this.state,{type:'encoder',value:(this.state.encoderMode+1)%4});
   this.params.manual = false;
   this.render();
   controller.actionSounds.play('click');
  });
  this.pane.addButton({title:'Valider — superposer et continuer'}).on('click',() => {
   if (this.params.manual) {
    this.state.savedEffects.push(this.manualEffects());
    applyArduinoEvent(this.state,{type:'encoder',value:(this.state.encoderMode+1)%4});
   } else applyArduinoEvent(this.state,{type:'validation'});
   this.params.manual = false;
   this.render();
   controller.actionSounds.play('validation');
  });
  this.pane.addBinding(this.params,'layers',{label:'Ensembles validés',readonly:true});
  this.pane.addButton({title:'Remettre à zéro'}).on('click',() => {
   this.state = createState({x:0,y:0});
   this.state.encoderMode = 0;
   Object.assign(this.params,{x:0,y:0,manual:false});
   this.render();
  });
  this.pane.addButton({title:'Passer au véritable Arduino'}).on('click',() => {
   const url = new URL(location.href);
   url.searchParams.set('debug','0');
   location.href = url.href;
  });
  this.render();
 }
 manualEffects() {
  return Object.fromEntries(SHADERS.map(key => [key,this.params[key]/100]));
 }
 render() {
  const effects = this.params.manual ? this.manualEffects() : effectsFromState(this.state);
  if (!this.params.manual) for (const key of SHADERS) this.params[key] = effects[key]*100;
  this.params.shaderX = this.state.activeShaders[0];
  this.params.shaderY = this.state.activeShaders[1];
  this.params.layers = this.state.savedEffects.length;
  for (const binding of this.intensityBindings) binding.disabled = !this.params.manual;
  this.controller.setState(this.state,this.params.manual ? effects : undefined);
  this.pane.refresh();
 }
 dispose() {
  this.pane.dispose();
  this.container.remove();
  for (const material of this.controller.materials) material.animationSpeed = 1;
 }
}
