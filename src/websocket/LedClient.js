// Le debug pilote le second Arduino sans remplacer son etat par celui des capteurs.
export default class LedClient {
 constructor() {
  this.connect();
 }
 connect() {
  if (this.disposed) return;
  this.socket = new WebSocket('ws://localhost:8080');
  this.socket.addEventListener('open', () => this.send());
  this.socket.addEventListener('close', () => {
   if (!this.disposed) this.timer = setTimeout(() => this.connect(), 2000);
  });
  this.socket.addEventListener('error', () => {});
 }
 setPair(pair) {
  if (this.pair?.join(',') === pair.join(',')) return;
  this.pair = [...pair];
  this.send();
 }
 send() {
  if (this.pair && this.socket.readyState === WebSocket.OPEN) {
   this.socket.send(JSON.stringify({type:'ledShaders',activeShaders:this.pair}));
  }
 }
 dispose() {
  this.disposed = true;
  clearTimeout(this.timer);
  this.socket.close();
 }
}
