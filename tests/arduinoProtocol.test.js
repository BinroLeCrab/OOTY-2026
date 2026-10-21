import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArduinoLine, effectsFromState, validState } from '../src/utils/arduinoProtocol.js';

test('réception de X et Y, de la teinte et de la validation', () => {
 assert.deepEqual(parseArduinoLine('Gyroscope:12.0,-35.0'), {type:'gyroscope',axes:{x:12,y:-35,z:null}});
 assert.deepEqual(parseArduinoLine('Gyroscope: -0.5, 90'), {type:'gyroscope',axes:{x:-0.5,y:90,z:null}});
 assert.deepEqual(parseArduinoLine('Gyroscope:12.0,-35.0,72.5'), {type:'gyroscope',axes:{x:12,y:-35,z:72.5}});
 assert.deepEqual(parseArduinoLine('Teinte:70'), {type:'hue',value:0.7});
 assert.deepEqual(parseArduinoLine('Validation'), {type:'validation'});
 for(const line of ['Teinte:101','Teinte:-1','Gyroscope:NaN,0','Gyroscope:0,0,NaN','Gyroscope:0,0,0,0','Gyroscope:0,Infinity']) assert.equal(parseArduinoLine(line),null);
});

test('chaque axe augmente son effet vers les extremes, avec plafonnement', () => {
 const state={axes:{x:0,y:45,z:-90},hue:0.7,savedEffects:[]};
 assert.deepEqual(effectsFromState(state),{hue:0.7,deformation:0.5,saturation:1,glitch:0});
 state.axes={x:null,y:-180,z:360};
 assert.deepEqual(effectsFromState(state),{hue:0.7,deformation:1,saturation:1,glitch:0});
 assert(validState(state));
 assert(!validState({...state,axes:{x:0}}));
 assert(!validState({...state,axes:{x:0,y:0,z:Infinity}}));
 assert(!validState({...state,savedEffects:[{hue:2}]}));
});

test('la validation conserve les trois intensites apres un nouveau mouvement', () => {
 const state = {axes:{x:-90,y:45,z:22.5},hue:0,savedEffects:[]};
 state.savedEffects.push(effectsFromState(state));
 state.axes = {x:0,y:0,z:0};
 assert.deepEqual(effectsFromState(state),{hue:0,deformation:0,saturation:0,glitch:0});
 assert.deepEqual(state.savedEffects[0],{hue:0,deformation:0.5,saturation:0.25,glitch:1});
 assert(validState(state));
});

test('compatibilité sans inventer les axes absents de l’ancien sketch', () => {
 assert.deepEqual(parseArduinoLine('Gyroscope:35.5'),{type:'gyroscope',axes:{y:35.5}});
 assert.deepEqual(parseArduinoLine('Encodeur - Mode : 3'),{type:'hue',value:1});
});

