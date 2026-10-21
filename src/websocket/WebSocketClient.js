import { validState } from '../utils/arduinoProtocol';
const RECONNECT_DELAY = 2000;

export default class WebSocketClient {
 constructor(onState, onAction = () => {}) {
  this.onState = onState;
  this.onAction = onAction;
  this.disposed = false;
  // Repartir sans couches sauvegardées à chaque chargement, pas à chaque reconnexion.
  this.resetOnConnect = true;
  this.connect();
 }
 connect() {
  if (this.disposed) return;
  const socket = this.socket = new WebSocket('ws://localhost:8080');
  socket.addEventListener('open', () => {
   if (this.disposed || socket !== this.socket) return;
   if (this.resetOnConnect) {
    socket.send(JSON.stringify({type:'reset'}));
    this.resetOnConnect = false;
   }
  });
  socket.addEventListener('message', event => {
   if (this.disposed || socket !== this.socket) return;
   let message;
   try { message = JSON.parse(event.data); } catch { return; }
   if (message?.type !== 'state' || !validState(message.state)) {
    console.warn('?tat Arduino invalide :', message);
    return;
   }
   this.onState(message.state);
   if (message.action === 'click' || message.action === 'validation') this.onAction(message.action);
  });
  socket.addEventListener('error', error => console.error('Erreur WebSocket :', error));
  socket.addEventListener('close', () => {
   if (!this.disposed) this.reconnectTimer = window.setTimeout(() => this.connect(), RECONNECT_DELAY);
  });
 }
 dispose() {
  this.disposed = true;
  window.clearTimeout(this.reconnectTimer);
  this.socket?.close();
 }
}
