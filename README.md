# BP-TSL

Boilerplate Vite pour expérimenter avec Three.js, WebGPU et le Three.js Shading Language (TSL).

## Prérequis

- Node.js et npm
- Un navigateur compatible WebGPU pour le rendu principal

## Installation

Installer les dépendances depuis la racine du projet :

```bash
npm install
```

## Commandes

### Serveur de développement

```bash
npm run dev
```

Vite affiche l'URL locale dans le terminal. Ouvrir cette URL dans un navigateur compatible WebGPU.

### Build de production

```bash
npm run build
```

Le résultat est généré dans `dist/`.

### Prévisualisation du build

```bash
npm run preview
```

## Arduino, encodeur et shaders

Le sketch de reference est [OOTYController.ino](arduino/OOTYController/OOTYController.ino).
Il doit etre televerse sur la carte : enregistrer le fichier dans l'IDE ne suffit pas.

- Bouton D2 : envoie uniquement `Validation`. Le relais fige l'effet actif et son intensite, puis ajoute le shader suivant.
- Encodeur : envoie `Encodeur - Mode : N` (0 a 3). Il remplace uniquement la couche active, sans sauvegarde.
- Gyroscope : envoie `Gyroscope:<angleY>`. L'intensite vaut `1 - abs(angleY) / 90`, et ne modifie que la couche active.
- Recharger la page efface les couches sauvegardees et revient au premier shader.
- Le panneau en haut a droite affiche aussi le nombre d'effets sauvegardes.

Le relais utilise 115200 bauds. Copier `.env.example` vers `.env` et regler `SERIAL_PORT` (COM8 par defaut).
Fermer le moniteur serie apres le televersement, puis lancer dans deux terminaux :

```bash
npm run websocket
npm run dev
```

L'argument `npm run websocket -- COM5` est prioritaire sur `SERIAL_PORT`.

## Organisation du projet

```text
.
├── index.html
├── public/
│   └── assets/                 # Ressources accessibles depuis /assets/
├── websocket/
│   └── server.js               # Pont série Arduino -> WebSocket
├── src/
│   ├── main.js                # Point d'entrée et boucle de rendu
│   ├── style.css              # Styles globaux et canvas
│   ├── controllers/
│   │   └── ArduinoObjectController.js # Relie les commandes Arduino à un objet 3D
│   ├── websocket/
│   │   └── WebSocketClient.js  # Réception des modes dans le navigateur
│   ├── scene/
│   │   ├── Scene.js            # Scène, environnement, objets et lumières
│   │   └── objects/            # Objets 3D de la scène
│   ├── materials/              # Matériaux Three.js et matériaux TSL
│   ├── templates/              # Squelettes copiables pour démarrer
│   ├── shaders/                # Fonctions et sources de shaders
│   ├── postprocessing/
│   │   └── PostProcessing.js   # Pipeline de post-processing
│   ├── tools/                  # Outils de debug et d'interaction
│   │   ├── Stats.js            # Panneau Stats natif de Three.js
│   │   ├── InteractionRaycaster.js
│   │   ├── BackgroundMusic.js
│   │   └── Pane.js             # Point d'entrée prévu pour Tweakpane
│   └── utils/                  # Utilitaires, chargement et gestion du viewport
└── package.json
```

## Fonctionnement général

Le point d'entrée est [`src/main.js`](./src/main.js). Il :

1. récupère le canvas HTML ;
2. crée la scène et la caméra ;
3. initialise le renderer WebGPU ;
4. configure les contrôles orbitaux ;
5. initialise les interactions et le post-processing ;
6. met à jour la scène à chaque frame ;
7. rend soit le pipeline de post-processing, soit la scène directement.

La scène est définie dans [`src/scene/Scene.js`](./src/scene/Scene.js). Elle contient notamment :

- l'objet principal ;
- le sol ;
- les lumières ;
- l'environnement HDR.

Chaque objet animé peut implémenter une méthode `update(time)`, appelée par `Scene.update(time)`.

## Réutiliser les contrôles Arduino sur un autre objet

La communication WebSocket et l'application des contrôles sont isolées dans [`src/controllers/ArduinoObjectController.js`](./src/controllers/ArduinoObjectController.js). Le contrôleur accepte n'importe quel `THREE.Object3D` :

- le mode Arduino colore les matériaux colorables de l'objet et de ses enfants ;
- l'angle du MPU6050 règle sa rotation autour de l'axe Y, de -90° à +90°.

Le branchement courant est dans [`src/experience.js`](./src/experience.js) :

```js
const arduinoController = new ArduinoObjectController(scene.baseObject);
```

Pour remplacer l'objet principal plus tard, passe le nouvel objet à la place de `scene.baseObject`. Si tu souhaites conserver la connexion active et changer sa cible à l'exécution, utilise :

```js
arduinoController.setTarget(nouvelObjet);
```

Le nouvel objet peut être un mesh ou un groupe qui contient des meshes ; ses matériaux avec une propriété `color` seront colorés par les modes Arduino.

## Post-processing

Le post-processing est géré par [`src/postprocessing/PostProcessing.js`](./src/postprocessing/PostProcessing.js).

Dans [`src/experience.js`](./src/experience.js), le toggle suivant permet de comparer le rendu avec et sans post-processing :

```js
const renderPostProcessing = false;
```

- `true` : rend via le pipeline et applique le bloom ;
- `false` : rend directement avec `renderer.render(scene, camera)`.

## Statistiques et debug

Les statistiques utilisent le module natif `Stats` fourni par Three.js. Leur intégration est isolée dans [`src/tools/Stats.js`](./src/tools/Stats.js).

Dans [`src/experience.js`](./src/experience.js), les options générales sont :

```js
const showStats = true;
const logRendererInfo = false;
```

- `showStats` affiche ou masque le panneau `FPS`, `MS` et éventuellement `MB` ;
- `logRendererInfo` affiche `renderer.info` dans la console.

Les panneaux supplémentaires sont contrôlés dans [`src/tools/Stats.js`](./src/tools/Stats.js) :

```js
const showAdditionalStats = false;
```

Lorsque la valeur est `true`, le panneau Stats contient aussi :

- `CALLS` ;
- `TRIANGLES` ;
- `LINES` ;
- `POINTS` ;
- `GEOMETRIES` ;
- `TEXTURES` ;
- `DELTA`.

Un clic sur le panneau permet de faire défiler les différentes vues.

## Ajouter un objet

Pour ajouter un objet à la scène :

1. créer une classe dans `src/scene/objects/` ;
2. étendre une classe Three.js adaptée, par exemple `THREE.Mesh` ;
3. créer sa géométrie et son matériau ;
4. ajouter l'objet dans `Scene.addObjects()` ;
5. ajouter une méthode `update(time)` si l'objet doit être animé.

Exemple de structure :

```js
export default class MyObject extends THREE.Mesh {
	constructor() {
		super(geometry, material);
	}

	update(time) {
		// Animation par frame
	}
}
```

## Ajouter ou modifier un matériau TSL

Les matériaux sont regroupés dans `src/materials/`. Les shaders et fonctions associées sont regroupés dans `src/shaders/`.

Les imports Three.js liés au WebGPU et au TSL doivent rester cohérents avec ceux déjà utilisés dans le projet :

```js
import * as THREE from "three/webgpu";
import { ... } from "three/tsl";
```

## Ressources

Les fichiers placés dans `public/` sont servis tels quels à la racine du site. Par exemple :

```text
public/assets/textures/floor-color.jpg
```

est chargé avec :

```js
"/assets/textures/floor-color.jpg"
```

Les ressources actuellement utilisées comprennent une texture de sol et un environnement HDR.

## Matériaux fournis

Les noms des matériaux décrivent leur rôle :

- `BasicMaterial.js` : matériau basique avec une couleur TSL animée ;
- `StandardMaterial.js` : matériau standard avec effet Fresnel et émission ;
- `GroundMaterial.js` : matériau standard utilisant la texture du sol.

Les instances exportées sont utilisées directement par les objets correspondants.

## Templates

Le dossier [`src/templates/`](./src/templates/) contient des squelettes volontairement non utilisés par la scène :

- [`ObjectTemplate.js`](./src/templates/ObjectTemplate.js) : classe d'objet avec géométrie, matériau et méthode `update()` ;
- [`MaterialTemplate.js`](./src/templates/MaterialTemplate.js) : matériau standard TSL minimal ;
- La création d'un effet se fait directement dans [`PostProcessing.js`](./src/postprocessing/PostProcessing.js), avec une méthode dédiée comme `createBloomPass()`.

Pour créer un nouvel élément, copier le template approprié dans le dossier fonctionnel (`scene/objects`, `materials` ou `postprocessing`), le renommer, puis l'importer depuis le code concerné.
