import {Howl, Howler} from 'howler';

class BackgroundMusic {
    constructor(path, volume, startWithFilter = false) {
        this.music = new Howl({
            src: [path],
            loop: true,
            volume: volume,
            html5: false,
            onplay: () => this.setupFilter(startWithFilter),
        });

        this.filtersReady = false;
    }

    setupFilter(startWithFilter = false) {
        if (this.filtersReady) return;

        const context = Howler.ctx; // recupère le contexte audio de Howler
        const source = this.music._sounds[0]._node; // recupère le noeud audio de la musique

        // Crée un filtre passe-bas
        this.bass = context.createBiquadFilter();
        this.bass.type = "lowshelf";
        this.bass.frequency.value = 180;
        this.bass.gain.value = 0;

        this.mids = context.createBiquadFilter();
        this.mids.type = "peaking";
        this.mids.frequency.value = 1000;
        this.mids.Q.value = 1;
        this.mids.gain.value = 0;

        this.treble = context.createBiquadFilter();
        this.treble.type = "highshelf";
        this.treble.frequency.value = 5000;
        this.treble.gain.value = 0;

        // Relier les n?uds audio
        source.disconnect(); // déconnecte le noeud audio de la musique du contexte audio
        source.connect(this.bass)
        .connect(this.mids)
        .connect(this.treble)
        .connect(Howler.masterGain); // connecte le noeud audio de la musique aux filtres et au contexte audio

        this.filtersReady = true;

        if (startWithFilter) {
            this[startWithFilter]();
        }
    }

    setBass(value) {
        this.bass.gain.value = value;
    }

    setMids(value) {
        this.mids.gain.value = value;
    }

    setTreble(value) {
        this.treble.gain.value = value;
    }

    lowPassFilter() {
        if (!this.filtersReady) return;
        this.bass.gain.value = 8;
        this.mids.gain.value = -20;
        this.treble.gain.value = -20;
    }

    highPassFilter() {
        if (!this.filtersReady) return;
        this.bass.gain.value = -10;
        this.mids.gain.value = -10;
        this.treble.gain.value = 8;
    }

    normalFilter() {
        if (!this.filtersReady) return;
        this.bass.gain.value = 0;
        this.mids.gain.value = 0;
        this.treble.gain.value = 0;
    }

    play() {
        this.music.play();
    }
    
    pause() {
        this.music.pause();
    }

    setVolume(volume) {
        this.music.volume(volume);
    }

    stop() {
        this.music.stop();
    }
}

// const backgroundMusic = new BackgroundMusic('/Geese_Cobra.mp3', 0.4, 'lowPassFilter');

// export default backgroundMusic;