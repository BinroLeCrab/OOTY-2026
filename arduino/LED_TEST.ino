#include <FastLED.h>

#define NUM_LEDS 10 // Nombre de LED
#define DATA_PIN 3 // Pin des LED
// Define the array of leds
CRGB leds[NUM_LEDS];

unsigned long myTime;
unsigned long Frame = 100; // Frame d'animation
unsigned long previousTime = 0;

// CRGB colors[] = {CRGB(125, 0, 0), CRGB(0, 125, 0), CRGB(0, 0, 125)}; 
CRGB colors[] = {CRGB::SkyBlue, CRGB::Plaid, CRGB::Plum}; // Tableau de couleur
int offset = 0; // offset pour l'animation
int nbColors = sizeof(colors) / sizeof(colors[0]); // nombre de couleur, calcul automatique
int LEDGroup = 3; // nombre de led dans un groupe
int cycleTotal = LEDGroup * nbColors;

void setup() {
  FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);
}

void loop() {
  myTime = millis();

  if((myTime - previousTime) > Frame){
    previousTime = myTime;
    offset = (offset + 1) % cycleTotal;
  }

  // fill_solid(leds, NUM_LEDS, colorA);

  // Turn the LED on, then pause
  for (int i = 0; i < NUM_LEDS; i++) {
    // leds[i] = CRGB(255, 255, 255);

    int indexColor = ((i - offset + cycleTotal) % cycleTotal) / LEDGroup;
    leds[i] = colors[indexColor];

  }
  FastLED.show();
  
}