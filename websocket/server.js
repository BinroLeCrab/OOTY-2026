import { SerialPort } from 'serialport';
import { WebSocket, WebSocketServer } from 'ws';
import { parseArduinoLine, effectsFromState } from '../src/utils/arduinoProtocol.js';

const serialPath = process.argv[2] ?? process.env.SERIAL_PORT ?? 'COM8';
const port = new SerialPort({path:serialPath,baudRate:115200,autoOpen:false});
await new Promise((resolve,reject) => port.open(error => error ? reject(error) : resolve())).catch(error => {
 console.error('Impossible d\'ouvrir le port série ' + serialPath, error);
 process.exit(1);
});
const server = new WebSocketServer({port:8080});
const state = {axes:{x:null,y:null,z:null},hue:0,savedEffects:[]};
let buffer = '';
function broadcast(action) {
 const message = JSON.stringify({type:'state',state,...(action ? {action} : {})});
 for (const client of server.clients) if (client.readyState === WebSocket.OPEN) client.send(message);
}
server.on('connection', client => {
 client.on('message', data => {
  let message;
  try { message = JSON.parse(data.toString()); } catch { return; }
  if (message?.type !== 'reset') return;
  // Effacer seulement les validations : les angles et la teinte reflètent le matériel.
  state.savedEffects.length = 0;
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
  const event = parseArduinoLine(line);
  if (!event) continue;
  if (event.type === 'gyroscope') {
   Object.assign(state.axes,event.axes);
   broadcast();
  } else if (event.type === 'hue' && state.hue !== event.value) {
   state.hue = event.value;
   broadcast('click');
  } else if (event.type === 'validation') {
   // Figer les quatre effets et conserver un nouvel ensemble pilotable en direct.
   state.savedEffects.push(effectsFromState(state));
   broadcast('validation');
  }
 }
 if (buffer.length>512) buffer='';
});
port.on('error', error => console.error('Erreur série :',error));
port.on('close', () => console.warn('Connexion Arduino fermée.'));
console.info('Arduino sur ' + serialPath + ' ; relais prêt sur ws://localhost:8080');
