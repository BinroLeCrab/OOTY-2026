import AtmosphereAudio from './AtmosphereAudio';

// Une seule ambiance continue entre l'accueil et l'expérience.
const atmosphereAudio = new AtmosphereAudio({ autoStart: false });

if (import.meta.hot) {
 import.meta.hot.dispose(() => atmosphereAudio.dispose());
}

export default atmosphereAudio;
