// Texte de voixoff1 et minutage en secondes.
import { gsap } from 'gsap';

// Début de chaque phrase en secondes depuis le début de la voix off.
// Garder les temps dans l'ordre croissant ; la phrase reste jusqu'à la suivante.
export const debutPhrases = [
 0,    // Bonjour et bienvenue…
 2.69, // Vous avez pris en main…
 6.34, // L'expérience peut commencer.
 9.19, // Face à vous…
 15.90, // Faites pivoter…
 23.40, // Inclinez ensuite…
 28.17, // Lorsqu'un effet vous plaît…
 33.74, // Laissez vous guider…
];

export const phrases = [
 "Bonjour et bienvenue dans l'expérience Wabi Sabi.",
 'Vous avez pris en main la sphère posée sur le socle devant vous.',
 "L'expérience peut commencer.",
 'Face à vous, une projection en direct de votre visage vous permet de découvrir votre reflet sous un nouveau jour.',
 'Faites pivoter les deux hémisphères de la sphère pour explorer différents effets visuels et composer votre portrait artistique.',
 'Inclinez ensuite la sphère dans les différentes directions pour modifier les effets à sélectionner.',
 "Lorsqu'un effet vous plaît, appuyez sur le bouton situé sous votre pouce gauche pour valider.",
 "Laissez vous guider par vos gestes, expérimentez librement et accueillez l'imprévu.",
];

export default class SousTitres {
 constructor(audio, element) {
  this.audio = audio;
  this.element = element;
  this.frame = null;
  this.currentCue = null;
  this.transition = null;
  this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  this.cues = phrases.map((text, index) => ({start:debutPhrases[index], text}));
  this.update = () => {
   const duration = this.audio.duration;
   if (Number.isFinite(duration) && duration > 0) {
    const cue = this.cues.findLast(cue => cue.start <= this.audio.currentTime);
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
   this.transition.to(this.element, {opacity:0, duration:0.06, ease:'power1.out'});
  } else {
   gsap.set(this.element, {opacity:0});
  }
  this.transition
   .call(() => { this.element.textContent = text; })
   .to(this.element, {opacity:1, duration:0.12, ease:'power1.inOut'});
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
