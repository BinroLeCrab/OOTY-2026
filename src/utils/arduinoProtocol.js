export const SHADERS = ['hue', 'deformation', 'saturation', 'glitch'];

export function parseArduinoLine(line) {
 if (/^Validation(?::\d+)?$/i.test(line)) return {type:'validation'};
 const number = String.raw`(-?(?:\d+(?:\.\d*)?|\.\d+))`;
 const gyro = new RegExp('^Gyroscope\\s*:\\s*' + number + '\\s*,\\s*' + number + '(?:\\s*,\\s*' + number + ')?\\s*$', 'i').exec(line);
 if (gyro) {
  const values = gyro.slice(1).filter(value => value !== undefined).map(Number);
  if (values.every(Number.isFinite)) return {type:'gyroscope',axes:{x:values[0],y:values[1]}};
 }
 const mode = /^(?:Encodeur\s*-\s*)?Mode\s*:\s*([0-3])$/i.exec(line);
 if (mode) return {type:'encoder',value:Number(mode[1])};
 return null;
}

export const axisIntensity = angle => Number.isFinite(angle) ? Math.min(1, Math.abs(angle) / 90) : 0;

export function randomPair(random = Math.random) {
 const available = [...SHADERS];
 const first = available.splice(Math.floor(random() * available.length),1)[0];
 return [first,available[Math.floor(random() * available.length)]];
}

export function createState(axes = {x:null,y:null}, random = Math.random) {
 return {axes:{x:axes.x,y:axes.y},activeShaders:randomPair(random),savedEffects:[],finished:false,variation:0};
}

export function effectsFromState(state) {
 const effects = {hue:0,deformation:0,saturation:0,glitch:0};
 if (!state.finished) {
  effects[state.activeShaders[0]] = axisIntensity(state.axes.x);
  effects[state.activeShaders[1]] = axisIntensity(state.axes.y);
 }
 return effects;
}

export function applyArduinoEvent(state,event,random = Math.random) {
 if (state.finished) return null;
 if (event.type === 'gyroscope') {
  state.axes.x = event.axes.x;
  state.axes.y = event.axes.y;
 } else if (event.type === 'encoder') {
  // Le premier Mode annonce par le setup initialise la reference de l'encodeur.
  if (state.encoderMode === undefined) {
   state.encoderMode = event.value;
   return null;
  }
  if (state.encoderMode === event.value) return null;
  state.encoderMode = event.value;
  state.activeShaders = randomPair(random);
  state.variation = (state.variation ?? 0) + 1;
  return 'click';
 } else if (event.type === 'validation') {
  state.savedEffects.push(effectsFromState(state));
  state.activeShaders = randomPair(random);
  state.variation = (state.variation ?? 0) + 1;
  return 'validation';
 }
 return null;
}

export function validEffects(effects) {
 return effects && SHADERS.every(key => Number.isFinite(effects[key]) && effects[key]>=0 && effects[key]<=1);
}
export function validState(state) {
 return Boolean(state && state.axes && ['x','y'].every(key => state.axes[key] === null || Number.isFinite(state.axes[key]))
  && Array.isArray(state.activeShaders) && state.activeShaders.length === 2
  && state.activeShaders.every(shader => SHADERS.includes(shader)) && state.activeShaders[0] !== state.activeShaders[1]
  && typeof state.finished === 'boolean' && Array.isArray(state.savedEffects) && state.savedEffects.every(validEffects));
}
