
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

Adafruit_MPU6050 mpu;

// -----------------------------------
// ENCODEUR ROTATIF
// -----------------------------------

const int CLK = 12;
const int DT = 13;

int ancienCLK;
int mode = 0;

// -----------------------------------
// BOUTONS
// -----------------------------------

const int boutonValidation = 2;
const int boutonImprimer = 4;

int ancienValidation = HIGH;
int ancienImprimer = HIGH;

unsigned long dernierAppui = 0;
unsigned long dernierImprimer = 0;

// -----------------------------------
// LED RGB ET PIEZO
// -----------------------------------

const int rouge = 9;
const int vert = 10;
const int bleu = 5;
const int piezo = 6;

// -----------------------------------
// GYROSCOPE X Y Z
// -----------------------------------

unsigned long derniereLectureGyroscope = 0;
unsigned long dernierEnvoiGyroscope = 0;

float angleZ = 0;
float vitesseZLisse = 0;
float offsetZ = 0;

bool premiereLectureGyroscope = true;

// Reglages Z
const float zoneMorteZ = 1.5;
const float facteurLissageZ = 0.25;

// -----------------------------------
// SETUP
// -----------------------------------

void setup() {
  Serial.begin(115200);

  Wire.begin();
  Wire.setClock(100000);

#if defined(WIRE_HAS_TIMEOUT)
  Wire.setWireTimeout(3000, true);
#endif

  pinMode(CLK, INPUT_PULLUP);
  pinMode(DT, INPUT_PULLUP);
  ancienCLK = digitalRead(CLK);

  pinMode(boutonValidation, INPUT_PULLUP);
  pinMode(boutonImprimer, INPUT_PULLUP);

  pinMode(rouge, OUTPUT);
  pinMode(vert, OUTPUT);
  pinMode(bleu, OUTPUT);
  pinMode(piezo, OUTPUT);

  Serial.println("Initialisation MPU6050...");

  if (!mpu.begin()) {
    Serial.println("ERREUR : MPU6050 non detecte !");
    while (true) {
      delay(100);
    }
  }

  mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Serial.println("MPU6050 connecte !");
  Serial.println("Encodeur - Mode : 0");
}

// -----------------------------------
// LOOP
// -----------------------------------

void loop() {
  lireEncodeur();
  lireBoutons();
  actualiserLED();
  lireGyroscope();
}

// -----------------------------------
// ENCODEUR ROTATIF
// -----------------------------------

void lireEncodeur() {
  int nouveauCLK = digitalRead(CLK);

  if (nouveauCLK != ancienCLK && nouveauCLK == LOW) {
    if (digitalRead(DT) == HIGH) {
      mode++;
    } else {
      mode--;
    }

    if (mode > 3) {
      mode = 0;
    } else if (mode < 0) {
      mode = 3;
    }

    Serial.print("Encodeur - Mode : ");
    Serial.println(mode);
  }

  ancienCLK = nouveauCLK;
}

// -----------------------------------
// BOUTONS
// -----------------------------------

void lireBoutons() {
  int etatValidation = digitalRead(boutonValidation);

  if (
    etatValidation == LOW &&
    ancienValidation == HIGH &&
    millis() - dernierAppui >= 200
  ) {
    dernierAppui = millis();

    mode++;

    if (mode > 3) {
      mode = 0;
    }

    Serial.println("Validation");
  }

  ancienValidation = etatValidation;

  int etatImprimer = digitalRead(boutonImprimer);

  if (
    etatImprimer == LOW &&
    ancienImprimer == HIGH &&
    millis() - dernierImprimer >= 200
  ) {
    dernierImprimer = millis();

    // Impression ajoutee plus tard
  }

  ancienImprimer = etatImprimer;
}

// -----------------------------------
// LED RGB
// -----------------------------------

void actualiserLED() {
  digitalWrite(rouge, LOW);
  digitalWrite(vert, LOW);
  digitalWrite(bleu, LOW);

  if (mode == 0) {
    digitalWrite(rouge, HIGH);
  }
  else if (mode == 1) {
    digitalWrite(vert, HIGH);
  }
  else if (mode == 2) {
    digitalWrite(bleu, HIGH);
  }
  else if (mode == 3) {
    digitalWrite(rouge, HIGH);
    digitalWrite(bleu, HIGH);
  }
}

// -----------------------------------
// GYROSCOPE X Y Z
// -----------------------------------

void lireGyroscope() {
  unsigned long maintenant = millis();

  // Lecture toutes les 20 ms
  if (maintenant - derniereLectureGyroscope < 20) {
    return;
  }

  float tempsEcoule = 0;

  if (premiereLectureGyroscope) {
    premiereLectureGyroscope = false;
  } else {
    tempsEcoule =
      (maintenant - derniereLectureGyroscope) / 1000.0;
  }

  derniereLectureGyroscope = maintenant;

  sensors_event_t acceleration, rotation, temperature;

  bool lectureOK = mpu.getEvent(
    &acceleration,
    &rotation,
    &temperature
  );

  if (!lectureOK) {
    Serial.println("Erreur lecture MPU6050");
    return;
  }

  // -----------------------------------
  // AXE X
  // -----------------------------------

  float angleX = atan2(
    acceleration.acceleration.y,
    acceleration.acceleration.z
  ) * 180.0 / PI;

  // -----------------------------------
  // AXE Y
  // -----------------------------------

  float angleY = atan2(
    -acceleration.acceleration.x,
    sqrt(
      acceleration.acceleration.y * acceleration.acceleration.y +
      acceleration.acceleration.z * acceleration.acceleration.z
    )
  ) * 180.0 / PI;

  // -----------------------------------
  // AXE Z
  // -----------------------------------

  // Vitesse de rotation en degres/seconde
  float vitesseZ = rotation.gyro.z * 180.0 / PI;

  // Correction offset
  vitesseZ -= offsetZ;

  // Zone morte
  if (fabs(vitesseZ) < zoneMorteZ) {
    vitesseZ = 0;
  }

  // Lissage
  vitesseZLisse =
    vitesseZLisse * (1.0 - facteurLissageZ) +
    vitesseZ * facteurLissageZ;

  // Stabilisation a l'arret
  if (fabs(vitesseZLisse) < 0.1 && vitesseZ == 0) {
    vitesseZLisse = 0;
  }

  // Calcul angle Z
  angleZ += vitesseZLisse * tempsEcoule;

  // -----------------------------------
  // ENVOI SERIAL X Y Z
  // -----------------------------------

  if (maintenant - dernierEnvoiGyroscope >= 100) {
    dernierEnvoiGyroscope = maintenant;

    Serial.print("Gyroscope:");
    Serial.print(angleX, 1);
    Serial.print(',');
    Serial.print(angleY, 1);
    Serial.print(',');
    Serial.println(angleZ, 1);
  }

  // -----------------------------------
  // PIEZO
  // -----------------------------------

  float rotationY = angleY + 90.0;

  if (rotationY >= 90 || rotationY <= -90) {
    tone(piezo, 100);
  } else {
    noTone(piezo);
  }
}
