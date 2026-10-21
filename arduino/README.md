# Arduino OOTY : axes X, Y et Z

Le sketch OOTY/OOTY.ino reprend le nouveau code Arduino fourni.

Messages a 115200 bauds :
- Gyroscope:12.0,-35.0,72.5 : angles X, Y et Z en degres.
- Encodeur - Mode : 0 : valeur de 0 a 3, convertie en quatre positions de teinte.
- Validation : sauvegarder les effets courants tout en conservant le controle en direct.

X pilote le glitch, Y la deformation et Z la saturation. Chaque intensite vaut min(1, abs(angle) / 90) : 0 % a 0 degre, 50 % a +/-45 degres, 100 % a partir de +/-90 degres. Le bip suit le plus intense des trois effets.

Les angles envoyes par l'Arduino sont utilises directement, sans decalage ni calibrage au demarrage. Recharger la page efface seulement les ensembles sauvegardes.

Z est un angle relatif integre depuis le demarrage : il peut deriver et depasser 90 degres. Son effet reste alors plafonne a 100 %.

Televerser le sketch avec les bibliotheques Adafruit MPU6050 et Adafruit Unified Sensor. Fermer le moniteur serie, redemarrer npm run websocket puis recharger le site.
