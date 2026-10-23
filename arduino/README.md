# Arduino OOTY : controleur et LED sur deux cartes

Televerser OOTY/OOTY.ino sur le controleur (Adafruit MPU6050 et Adafruit Unified Sensor) et LED/LED.ino sur la seconde carte (FastLED). Les deux cartes communiquent avec Node.js par USB a 9600 bauds. Fermer les moniteurs serie avant de lancer le relais.

Le controleur conserve les broches : encodeur CLK 12 / DT 13, validation 2, impression 4, piezo 6. Garder le controleur immobile pendant la calibration. L'envoi Gyroscope:X,Y est active toutes les 100 ms ; il etait commente dans le fichier fourni. Le bouton impression reste reserve pour plus tard.

La logique de l'application reste identique :
- Deux shaders distincts sont tires parmi teinte, deformation, saturation et glitch, pilotes par X et Y.
- Chaque intensite vaut min(1, abs(angle) / 90).
- Cinq impulsions d'encodeur changent de mode. Le premier message Mode initialise la reference ; chaque changement suivant remplace la paire sans sauvegarder les effets actifs.
- Validation sauvegarde les effets courants, puis tire une nouvelle paire. Les couches deja validees restent superposees et la webcam reste en direct.
- Recharger la page efface la session ; une reconnexion WebSocket la conserve.

Le ruban contient 250 LED sur DATA 3, luminosite 13/255. Deux groupes de trois LED defilent toutes les 100 ms. Les indices sont teinte/corail = 0, deformation/bleu = 1, saturation/vert = 2, glitch/violet = 3. Seule la paire active est representee. Le relais envoie Shaders:X,Y suivi d'un saut de ligne, et renvoie la paire a reception de LED Ready.

Depuis la racine du projet (adapter les ports aux deux cartes) :

```powershell
npm.cmd run websocket -- COM8 COM9
npm.cmd run dev
```

Ou configurer SERIAL_PORT et LED_SERIAL_PORT dans .env puis lancer npm.cmd run websocket. Sans port LED, le controleur fonctionne seul ; aucune commande LED ne lui est envoyee.

Ouvrir le site avec ?debug=0 pour le controleur reel, ou ?debug=1 pour la simulation. Pour tester uniquement le ruban avec la simulation :

```powershell
npm.cmd run websocket -- - COM9
```