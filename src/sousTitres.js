// Texte de voixoff1. Le minutage est estime selon la longueur des mots
// et la ponctuation, puis adapte a la duree reelle de l'audio.
import { gsap } from 'gsap';

export const phrases = [
 "Bonjour et bienvenue dans l'expérience Wabi Sabi.",
 'Vous avez pris en main la sphère posée sur le socle devant vous.',
 "L'expérience peut commencer.",
 'Face à vous, une projection en direct de votre visage vous permet de découvrir votre reflet sous un nouveau jour.',
 'Faites pivoter les deux hémisphères de la sphère pour explorer différents effets visuels et composer votre portrait artistique.',
 "Inclinez ensuite la sphère de gauche à droite pour modifier l'effet sélectionné.",
 "Lorsqu'un effet vous plaît, appuyez sur le bouton situé sous votre pouce gauche pour le valider.",
 "Laissez-vous guider par vos gestes, expérimentez librement et accueillez l'imprévu.",
];

export default class SousTitres {
 constructor(audio, element) {
  this.audio = audio;
  this.element = element;
  this.frame = null;
  this.currentCue = null;
  this.transition = null;
  this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0;
  this.cues = phrases.map(phrase => {
   const start = elapsed;
   for (const text of phrase.split(/\s+/)) {
    elapsed += Math.max(2, text.replace(/[^\p{L}\p{N}]/gu, '').length) + (/[,.!?]$/.test(text) ? 4 : 0);
   }
   return {start, text:phrase};
  });
  this.totalWeight = elapsed;
  this.update = () => {
   const duration = this.audio.duration;
   if (Number.isFinite(duration) && duration > 0) {
    const position = this.audio.currentTime / duration * this.totalWeight;
    const cue = this.cues.findLast(cue => cue.start <= position);
    if (cue !== this.currentCue) {
     this.currentCue = cue;
     this.showLine(cue?.text ?? '');
    }
   }
   if (!this.audio.paused && !this.audio.ended) this.frame = requestAnimationFrame(this.update);
  };
  this.onPlay = () => {
   cancelAnimationFrame(this.frame);
   this.element.hidden = false;
   this.update();
  };
  this.audio.addEventListener('play', this.onPlay);
  this.audio.addEventListener('seeked', this.onPlay);
 }

 showLine(text) {
  this.transition?.kill();
  if (this.reducedMotion.matches) {
   this.element.textContent = text;
   gsap.set(this.element, {opacity:1});
   return;
  }
  this.transition = gsap.timeline();
  if (this.element.textContent) {
   this.transition.to(this.element, {opacity:0, duration:0.2, ease:'power1.out'});
  } else {
   gsap.set(this.element, {opacity:0});
  }
  this.transition
   .call(() => { this.element.textContent = text; })
   .to(this.element, {opacity:1, duration:0.45, ease:'power1.inOut'});
 }

 dispose() {
  cancelAnimationFrame(this.frame);
  this.transition?.kill();
  this.audio.removeEventListener('play', this.onPlay);
  this.audio.removeEventListener('seeked', this.onPlay);
  this.element.textContent = '';
  this.element.hidden = true;
 }
}
