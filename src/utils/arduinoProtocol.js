// Protocole s?rie partag? avec les tests : angles en degr?s, teinte entre 0 et 1.
export function parseArduinoLine(line) {
 if (/^Validation(?::\d+)?$/i.test(line)) return { type: 'validation' };
 const number = String.raw`(-?(?:\d+(?:\.\d*)?|\.\d+))`;
 const gyro = new RegExp('^Gyroscope\\s*:\\s*' + number + '\\s*,\\s*' + number + '(?:\\s*,\\s*' + number + ')?\\s*$', 'i').exec(line);
 if (gyro) {
  const [x,y,z] = gyro.slice(1).map(value => value === undefined ? null : Number(value));
  if ([x,y].every(Number.isFinite) && (z === null || Number.isFinite(z))) return { type: 'gyroscope', axes: {x,y,z} };
 }
 const hue = /^Teinte\s*:\s*(\d+(?:\.\d+)?)$/i.exec(line);
 if (hue && Number(hue[1]) <= 100) return {type: 'hue', value: Number(hue[1]) / 100};
 // Compatibilit? limit?e avec l'ancien sketch : seul Y ?tait disponible.
 const legacy = new RegExp('^Gyroscope\\s*:\\s*' + number + '$', 'i').exec(line);
 if (legacy && Number.isFinite(Number(legacy[1]))) return {type:'gyroscope', axes:{y:Number(legacy[1])}};
 const mode = /^(?:Encodeur\s*-\s*)?Mode\s*:\s*([0-3])$/i.exec(line);
 if (mode) return {type:'hue',value:Number(mode[1])/3};
 return null;
}

// Intensite maximale a +/-90 degres ; Z integre peut depasser cette limite.
export const axisIntensity = angle => Number.isFinite(angle) ? Math.min(1, Math.abs(angle) / 90) : 0;

export function effectsFromState(state) {
 return {hue:state.hue, deformation:axisIntensity(state.axes.y), saturation:axisIntensity(state.axes.z), glitch:axisIntensity(state.axes.x)};
}
export function validEffects(effects) {
 return effects && ['hue','deformation','saturation','glitch'].every(key => Number.isFinite(effects[key]) && effects[key]>=0 && effects[key]<=1);
}
export function validState(state) {
 return state && Number.isFinite(state.hue) && state.hue>=0 && state.hue<=1 && state.axes && ['x','y'].every(key => state.axes[key] === null || Number.isFinite(state.axes[key])) && (state.axes.z === undefined || state.axes.z === null || Number.isFinite(state.axes.z)) && Array.isArray(state.savedEffects) && state.savedEffects.every(validEffects);
}
