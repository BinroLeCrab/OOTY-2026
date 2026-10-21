import { gsap } from 'gsap';
import { Howl } from 'howler';
import createDissolve from './dissolve.js';

const transitionSound = new Howl({
 src: [`${import.meta.env.BASE_URL}sounds/transition.mp3`],
 volume: 1,
 loop: false,
 onloaderror: (_id, error) => console.warn('Son de transition indisponible :', error),
 onplayerror: (_id, error) => console.warn('Lecture du son de transition impossible :', error),
});

if (import.meta.hot) {
 import.meta.hot.dispose(() => transitionSound.unload());
}

export default function transitionAccueil(home) {
 const details = [document.getElementById('shader-info'), document.getElementById('webcam')];
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const image = new Image();
 let dissolve;
 let cancelled = false;
 let soundId;
 const cleanup = () => {
  image.onload = image.onerror = null;
  dissolve?.dispose();
  gsap.set(details, {clearProps:'opacity'});
 };
 const timeline = gsap.timeline({paused:true, onComplete:() => {
  home.hidden = true;
  cleanup();
 }});

 const begin = () => {
  if (cancelled) return;
  gsap.set(details, {opacity:0});
  home.style.pointerEvents = 'none';
  if (!reducedMotion && image.naturalWidth) dissolve = createDissolve(image);
  if (dissolve) {
   document.body.append(dissolve.canvas);
   home.hidden = true;
   const progress = {factor:0};
   timeline.to(progress, {
    factor:1,
    duration:2.8,
    ease:'sine.inOut',
    onUpdate:() => dissolve.render(progress.factor),
   }, 0).to(details, {opacity:1, duration:0.6}, 2.4);
  } else {
   timeline.to(home, {opacity:0, duration:0.4}, 0)
    .to(details, {opacity:1, duration:0.4}, 0);
  }
  document.body.classList.remove('on-home');
  soundId = transitionSound.play();
  timeline.play();
 };
 if (reducedMotion) {
  begin();
 } else {
  image.onload = image.onerror = begin;
  image.src = `${import.meta.env.BASE_URL}img/background.webp`;
 }
 return {kill() {
  cancelled = true;
  timeline.kill();
  if (soundId !== undefined) transitionSound.stop(soundId);
  cleanup();
 }};
}
