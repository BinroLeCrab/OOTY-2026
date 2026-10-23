import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArduinoLine,createState,randomPair,effectsFromState,applyArduinoEvent,validState} from '../src/utils/arduinoProtocol.js';

test('le protocole utilise X et Y et ignore Z', () => {
 assert.deepEqual(parseArduinoLine('Gyroscope:12,-35,72'),{type:'gyroscope',axes:{x:12,y:-35}});
 assert.deepEqual(parseArduinoLine('Gyroscope: -0.5, 90'),{type:'gyroscope',axes:{x:-0.5,y:90}});
 assert.deepEqual(parseArduinoLine('Encodeur - Mode : 3'),{type:'encoder',value:3});
 assert.deepEqual(parseArduinoLine('Validation'),{type:'validation'});
 for (const line of ['Gyroscope:NaN,0','Gyroscope:0,0,Infinity','Gyroscope:0,0,0,0','Mode:4']) assert.equal(parseArduinoLine(line),null);
});

test('les douze paires ordonnees sont possibles, sans doublon interne', () => {
 const pairs = new Set();
 for (let i=0;i<4;i++) for (let j=0;j<3;j++) {
  const values = [(i+0.5)/4,(j+0.5)/3];
  const pair = randomPair(() => values.shift());
  assert.notEqual(pair[0],pair[1]);
  pairs.add(pair.join(','));
 }
 assert.equal(pairs.size,12);
});

test('deux effets seulement suivent les angles bruts sans Z', () => {
 const state = createState({x:-45,y:180},() => 0);
 state.activeShaders = ['glitch','saturation'];
 assert.deepEqual(effectsFromState(state),{hue:0,deformation:0,saturation:1,glitch:0.5});
 assert(validState(state));
 assert(!validState({...state,activeShaders:['glitch','glitch']}));
});

test('encodeur : remplacer la paire sans superposer', () => {
 const state = createState({x:45,y:90},() => 0);
 assert.equal(applyArduinoEvent(state,{type:'encoder',value:0}),null);
 assert.equal(state.savedEffects.length,0);
 assert.equal(applyArduinoEvent(state,{type:'encoder',value:0}),null);
 const values = [0.99,0];
 assert.equal(applyArduinoEvent(state,{type:'encoder',value:1},() => values.shift()),'click');
 assert.deepEqual(state.activeShaders,['glitch','hue']);
 assert.deepEqual(state.savedEffects,[]);
 applyArduinoEvent(state,{type:'gyroscope',axes:{x:0,y:0}});
 assert.deepEqual(state.savedEffects,[]);
});

test('validation : superposer et poursuivre avec une nouvelle paire', () => {
 const state = createState({x:30,y:-60},() => 0);
 const final = effectsFromState(state);
 const values = [0.99,0];
 assert.equal(applyArduinoEvent(state,{type:'validation'},() => values.shift()),'validation');
 assert.deepEqual(state.activeShaders,['glitch','hue']);
 assert.deepEqual(state.savedEffects,[final]);
 assert.equal(state.finished,false);
 applyArduinoEvent(state,{type:'gyroscope',axes:{x:90,y:45}});
 assert.deepEqual(effectsFromState(state),{hue:0.5,deformation:0,saturation:0,glitch:1});
 applyArduinoEvent(state,{type:'encoder',value:0});
 applyArduinoEvent(state,{type:'encoder',value:1},() => 0);
 assert.deepEqual(state.savedEffects,[final]);
 applyArduinoEvent(state,{type:'validation'},() => 0);
 assert.equal(state.savedEffects.length,2);
 assert(validState(state));
 assert(!createState().finished);
});
