import { SerialPort } from 'serialport';
import { WebSocket, WebSocketServer } from 'ws';
import { parseArduinoLine, createState, applyArduinoEvent, SHADERS } from '../src/utils/arduinoProtocol.js';

const serialPath = process.argv[2] ?? process.env.SERIAL_PORT ?? 'COM8';
const ledPath = process.argv[3] ?? process.env.LED_SERIAL_PORT;
if (ledPath && ledPath === serialPath) throw new Error('Les deux Arduino doivent avoir des ports differents.');
const ledPort = ledPath ? new SerialPort({path:ledPath,baudRate:9600,autoOpen:false}) : null;
let latestPair;
let lastSent;
function sendLeds(pair) {
 latestPair = pair;
 const ids = pair.map(shader => SHADERS.indexOf(shader));
 if (ids.some(id => id < 0) || ids[0] === ids[1]) return;
 const line = 'Shaders:' + ids.join(',') + '\n';
 const output = ledPort;
 if (!output?.isOpen || line === lastSent) return;
 lastSent = line;
 output.write(line, error => { if (error) { lastSent = undefined; console.error('Erreur LED :', error); } });
}
const port = new SerialPort({path:serialPath,baudRate:9600,autoOpen:false});
if (serialPath !== '-') await new Promise((resolve,reject) => port.open(error => error ? reject(error) : resolve())).catch(error => {
 console.error('Impossible d\'ouvrir le port série ' + serialPath, error);
 process.exit(1);
});
const server = new WebSocketServer({port:8080});
let state = createState();
latestPair = state.activeShaders;
if (ledPort) {
 ledPort.on('error', error => console.error('Erreur port LED :', error));
 ledPort.open(error => {
  if (error) return console.error('Impossible d ouvrir le port LED :', error);
  // L'ouverture USB redemarre souvent la carte.
  setTimeout(() => { lastSent = undefined; sendLeds(latestPair); }, 2000);
 });
}
// Resynchroniser la paire apres chaque redemarrage de la carte LED.
let ledBuffer = '';
if (ledPort) ledPort.on('data', chunk => {
 ledBuffer += chunk.toString('utf8');
 let index;
 while ((index = ledBuffer.indexOf('\n')) !== -1) {
  const line = ledBuffer.slice(0,index).trim();
  ledBuffer = ledBuffer.slice(index+1);
  if (line === 'LED Ready') {
   lastSent = undefined;
   sendLeds(latestPair);
  }
 }
 if (ledBuffer.length > 512) ledBuffer = '';
});
let buffer = '';
function broadcast(action) {
 if (action) sendLeds(state.activeShaders);
 const message = JSON.stringify({type:'state',state,...(action ? {action} : {})});
 for (const client of server.clients) if (client.readyState === WebSocket.OPEN) client.send(message);
}
server.on('connection', client => {
 client.on('message', data => {
  let message;
  try { message = JSON.parse(data.toString()); } catch { return; }
  if (message?.type === 'ledShaders') {
   const pair = message.activeShaders;
   if (Array.isArray(pair) && pair.length === 2 && pair.every(shader => SHADERS.includes(shader)) && pair[0] !== pair[1]) sendLeds(pair);
   return;
  }
  if (message?.type !== 'reset') return;
  // Effacer seulement les validations : les angles et la teinte reflètent le matériel.
  const encoderMode = state.encoderMode;
  state = createState(state.axes);
  if (encoderMode !== undefined) state.encoderMode = encoderMode;
  sendLeds(state.activeShaders);
  broadcast();
 });
 client.send(JSON.stringify({type:'state',state}));
 client.on('error', error => console.error('Erreur client :', error));
});
server.on('error', error => {
 console.error('Erreur serveur WebSocket :', error);
 port.close();
 process.exitCode = 1;
});
port.on('data', chunk => {
 buffer += chunk.toString('utf8');
 let index;
 while ((index = buffer.indexOf('\n')) !== -1) {
  const line = buffer.slice(0,index).trim();
  buffer = buffer.slice(index+1);
  if (line === 'Ready') {
   lastSent = undefined;
   sendLeds(latestPair);
   continue;
  }
  const event = parseArduinoLine(line);
  if (!event) continue;
  if (state.finished) continue;
  const action = applyArduinoEvent(state,event);
  broadcast(action);
 }
 if (buffer.length>512) buffer='';
});
port.on('error', error => console.error('Erreur série :',error));
port.on('close', () => console.warn('Connexion Arduino fermée.'));
console.info('Arduino sur ' + serialPath + ' ; relais prêt sur ws://localhost:8080');
