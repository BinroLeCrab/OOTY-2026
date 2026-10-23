#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

Adafruit_MPU6050 mpu;
constexpr unsigned long SERIAL_BAUD_RATE = 9600;

// Encodeur rotatif : 5 impulsions detectees par mode
const int CLK = 12;
const int DT = 13;
int ancienCLK = HIGH;
int mode = 0;
int compteurCrans = 0;
const int cransParMode = 5;

// Boutons
const int boutonValidation = 2;
const int boutonImprimer = 4;
int ancienValidation = HIGH;
int ancienImprimer = HIGH;
unsigned long dernierAppui = 0;
unsigned long dernierImprimer = 0;

// Piezo et gyroscope
const int piezo = 6;
bool gyroscopeDisponible = false;
unsigned long derniereLectureGyroscope = 0;
unsigned long dernierEnvoiGyroscope = 0;
float offsetX = 0;
float offsetY = 0;
const float zoneMorte = 1.0;

float calculerAngleX(float ax, float ay, float az) {
  return atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI;
}

float calculerAngleY(float ax, float ay, float az) {
  return atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
}

void calibrerGyroscope() {
  Serial.println("Calibration en cours...");
  Serial.println("Ne bougez pas le controleur !");
  sensors_event_t a, g, temp;
  float sommeX = 0, sommeY = 0;
  int lecturesValides = 0;
  for (int i = 0; i < 200; i++) {
    if (mpu.getEvent(&a, &g, &temp)) {
      sommeX += calculerAngleX(a.acceleration.x, a.acceleration.y, a.acceleration.z);
      sommeY += calculerAngleY(a.acceleration.x, a.acceleration.y, a.acceleration.z);
      lecturesValides++;
    }
    delay(10);
  }
  if (lecturesValides > 0) {
    offsetX = sommeX / lecturesValides;
    offsetY = sommeY / lecturesValides;
  }
  derniereLectureGyroscope = millis();
  dernierEnvoiGyroscope = millis();
  Serial.println("Calibration terminee !");
  Serial.println("Gyroscope:0.0,0.0");
}

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  pinMode(CLK, INPUT_PULLUP);
  pinMode(DT, INPUT_PULLUP);
  ancienCLK = digitalRead(CLK);
  pinMode(boutonValidation, INPUT_PULLUP);
  pinMode(boutonImprimer, INPUT_PULLUP);
  pinMode(piezo, OUTPUT);
  Wire.begin();
  Wire.setClock(100000);
#if defined(WIRE_HAS_TIMEOUT)
  Wire.setWireTimeout(3000, true);
#endif
  Serial.println("Initialisation MPU6050...");
  gyroscopeDisponible = mpu.begin();
  if (gyroscopeDisponible) {
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    Serial.println("MPU6050 connecte !");
    calibrerGyroscope();
  } else {
    Serial.println("MPU6050 absent - Programme continue !");
  }
  Serial.println("Encodeur - Mode : 0");
  Serial.println("Ready");
}

void lireEncodeur() {
  int nouveauCLK = digitalRead(CLK);
  if (nouveauCLK != ancienCLK && nouveauCLK == LOW) {
    if (digitalRead(DT) == HIGH) compteurCrans++;
    else compteurCrans--;
    Serial.print("Encodeur - Cran : ");
    Serial.println(compteurCrans);
    if (compteurCrans >= cransParMode) {
      mode = (mode + 1) % 4;
      compteurCrans = 0;
      Serial.print("Encodeur - Mode : ");
      Serial.println(mode);
    } else if (compteurCrans <= -cransParMode) {
      mode = (mode + 3) % 4;
      compteurCrans = 0;
      Serial.print("Encodeur - Mode : ");
      Serial.println(mode);
    }
  }
  ancienCLK = nouveauCLK;
}

void lireBoutons() {
  int etatValidation = digitalRead(boutonValidation);
  if (etatValidation == LOW && ancienValidation == HIGH && millis() - dernierAppui >= 200) {
    dernierAppui = millis();
    Serial.println("Validation");
  }
  ancienValidation = etatValidation;
  int etatImprimer = digitalRead(boutonImprimer);
  if (etatImprimer == LOW && ancienImprimer == HIGH && millis() - dernierImprimer >= 200) {
    dernierImprimer = millis();
    // Impression ajoutee plus tard, comme dans le code original.
  }
  ancienImprimer = etatImprimer;
}

void lireGyroscope() {
  unsigned long maintenant = millis();
  if (maintenant - derniereLectureGyroscope < 20) return;
  derniereLectureGyroscope = maintenant;
  sensors_event_t acceleration, rotation, temperature;
  if (!mpu.getEvent(&acceleration, &rotation, &temperature)) {
    Serial.println("Erreur lecture MPU6050");
    return;
  }
  float angleX = calculerAngleX(acceleration.acceleration.x, acceleration.acceleration.y, acceleration.acceleration.z) - offsetX;
  float angleY = calculerAngleY(acceleration.acceleration.x, acceleration.acceleration.y, acceleration.acceleration.z) - offsetY;
  angleX = constrain(angleX, -90.0, 90.0);
  angleY = constrain(angleY, -90.0, 90.0);
  if (fabs(angleX) < zoneMorte) angleX = 0;
  if (fabs(angleY) < zoneMorte) angleY = 0;
  if (maintenant - dernierEnvoiGyroscope >= 100) {
    dernierEnvoiGyroscope = maintenant;
    Serial.print("Gyroscope:");
    Serial.print(angleX, 1);
    Serial.print(',');
    Serial.println(angleY, 1);
  }
  if (fabs(angleX) >= 90 || fabs(angleY) >= 90) tone(piezo, 100);
  else noTone(piezo);
}

void loop() {
  lireEncodeur();
  lireBoutons();
  if (gyroscopeDisponible) lireGyroscope();
}
