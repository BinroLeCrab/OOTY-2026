import SousTitres from './sousTitres.js';
import transitionAccueil from './transition/index.js';
import atmosphereAudio from './tools/atmosphere';

const home = document.getElementById('home');
const startButton = document.getElementById('start-experience');
const status = document.getElementById('home-status');
const voice = new Audio(`${import.meta.env.BASE_URL}sounds/voixoff1.mp3`);
voice.preload = 'auto';
const sousTitres = new SousTitres(voice, document.getElementById('home-subtitles'));
let playing = false;
let entering = false;
let transition;
let disposed = false;
async function enterExperience() {
 if (entering) return;
 entering = true;
 status.textContent = 'Chargement…';
 try {
  await import('./experience.js');
  const {default:webcam} = await import('./tools/WebCam.js');
  await webcam.ready;
  if (disposed) return;
  // Attendre que la premiere image soit rendue avant de retirer l'accueil.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (disposed) return;
  sousTitres.dispose();
  transition = transitionAccueil(home);
  window.removeEventListener('keydown', onKeyDown);
 } catch (error) {
  console.error('Chargement de l’expérience impossible :', error);
  status.textContent = 'Chargement impossible. Rechargez la page pour réessayer.';
 }
}

async function start() {
 if (playing || entering) return;
 playing = true;
 startButton.disabled = true;
 atmosphereAudio.play();
 try {
  await voice.play();
  status.textContent = 'Écoutez…';
 } catch (error) {
  console.error('Lecture de la voix off impossible :', error);
  playing = false;
  startButton.disabled = false;
  status.textContent = 'Lecture impossible. Appuyez sur Espace pour réessayer.';
 }
}

function onKeyDown(event) {
 if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
 if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
 event.preventDefault();
 start();
}

voice.addEventListener('ended', enterExperience);
startButton.addEventListener('click', start);
window.addEventListener('keydown', onKeyDown);

if (import.meta.hot) {
 import.meta.hot.dispose(() => {
  disposed = true;
  transition?.kill();
  voice.pause();
  sousTitres.dispose();
  voice.removeEventListener('ended', enterExperience);
  startButton.removeEventListener('click', start);
  window.removeEventListener('keydown', onKeyDown);
 });
}
