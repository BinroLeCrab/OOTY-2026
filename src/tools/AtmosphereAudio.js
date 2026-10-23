import { Howl, Howler } from "howler";
import BipAudio from "./BipAudio";

export default class AtmosphereAudio {
 constructor({ autoStart = true } = {}) {
  this.enabled = true;
  this.disposed = false;
  this.bip = new BipAudio();
  this.stopWaiting = () => {
   document.removeEventListener('pointerdown', this.onInteraction);
   document.removeEventListener('keydown', this.onInteraction);
  };
  this.onInteraction = (event) => {
   if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.altKey || event.metaKey)) return;
   if (this.enabled) this.play();
  };
  this.audio = new Howl({
   src: [`${import.meta.env.BASE_URL}sounds/atmosphere.mp3`],
   loop: true, volume: 1,
   onplay: () => {
    if (!this.enabled || this.disposed) return;
    this.bip.play();
    this.stopWaiting();
   },
   onplayerror: () => {
    this.audio.once('unlock', () => { if (this.enabled && !this.disposed) this.play(); });
   },
   onloaderror: (_id, error) => console.error('Ambiance indisponible :', error),
  });
  // Essayer immédiatement ; une interaction débloquera le son si le navigateur l'exige.
  if (autoStart) {
   document.addEventListener('pointerdown', this.onInteraction);
   document.addEventListener('keydown', this.onInteraction);
   this.play();
  }
 }

 play() {
  if (this.disposed) return;
  this.enabled = true;
  Howler.mute(false);
  if (!this.audio.playing()) this.audio.play();
 }

 pause() {
  this.enabled = false;
  Howler.mute(true);
  this.audio.pause();
  this.bip.pause();
 }

 update(delta) {
  // Éviter d'accumuler des lectures de bip pendant le blocage initial de l'audio.
  if (Howler.ctx && Howler.ctx.state !== 'running') return;
  this.bip.update(delta);
 }

 dispose() {
  this.disposed = true;
  this.enabled = false;
  this.stopWaiting();
  this.audio.unload();
  this.bip.dispose();
  Howler.mute(false);
 }
}
