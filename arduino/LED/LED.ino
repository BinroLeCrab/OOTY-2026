#include <FastLED.h>
#include <string.h>

// Configuration du ruban et de son animation.
constexpr uint8_t DATA_PIN = 3;
constexpr uint16_t NUM_LEDS = 250;
constexpr uint8_t BRIGHTNESS = 13; // Environ 5 %.
constexpr uint8_t LEDS_PER_GROUP = 3;
constexpr uint8_t CYCLE_LENGTH = LEDS_PER_GROUP * 2;
constexpr unsigned long FRAME_INTERVAL_MS = 100;
constexpr unsigned long SERIAL_BAUD_RATE = 9600;

// L'ordre correspond aux indices envoyes par l'application.
const CRGB SHADER_COLORS[] = {
  CRGB(220, 85, 65),  // 0 : Teinte, corail doux.
  CRGB(65, 140, 220), // 1 : Deformation, bleu doux.
  CRGB(85, 190, 95),  // 2 : Saturation, vert doux.
  CRGB(155, 70, 210)  // 3 : Glitch, violet doux.
};
constexpr size_t SHADER_COUNT = sizeof(SHADER_COLORS) / sizeof(SHADER_COLORS[0]);

CRGB leds[NUM_LEDS];
uint8_t shaderX = 0;
uint8_t shaderY = 1;
uint8_t animationOffset = 0;
unsigned long lastFrameTime = 0;

// Reception non bloquante, avec rejet des lignes trop longues.
constexpr char MESSAGE_PREFIX[] = "Shaders:";
constexpr size_t PREFIX_LENGTH = sizeof(MESSAGE_PREFIX) - 1;
constexpr size_t MESSAGE_LENGTH = PREFIX_LENGTH + 3; // Shaders:X,Y
char serialMessage[MESSAGE_LENGTH + 1];
size_t messageLength = 0;
bool messageOverflow = false;

void appliquerMessage() {
  if (messageOverflow || messageLength != MESSAGE_LENGTH) return;
  if (strncmp(serialMessage, MESSAGE_PREFIX, PREFIX_LENGTH) != 0) return;
  if (serialMessage[PREFIX_LENGTH + 1] != ',') return;

  const int x = serialMessage[PREFIX_LENGTH] - '0';
  const int y = serialMessage[PREFIX_LENGTH + 2] - '0';
  if (x < 0 || y < 0 || x >= (int)SHADER_COUNT || y >= (int)SHADER_COUNT || x == y) return;

  shaderX = x;
  shaderY = y;
}

void recevoirShaders() {
  while (Serial.available() > 0) {
    const char character = Serial.read();
    if (character == '\r') continue;

    if (character == '\n') {
      serialMessage[messageLength] = '\0';
      appliquerMessage();
      messageLength = 0;
      messageOverflow = false;
    } else if (messageLength < MESSAGE_LENGTH) {
      serialMessage[messageLength++] = character;
    } else {
      messageOverflow = true;
    }
  }
}

void animerLED() {
  const unsigned long now = millis();
  if (now - lastFrameTime < FRAME_INTERVAL_MS) return;
  lastFrameTime = now;
  animationOffset = (animationOffset + 1) % CYCLE_LENGTH;

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    const uint16_t position = (i + CYCLE_LENGTH - animationOffset) % CYCLE_LENGTH;
    const uint8_t shader = position < LEDS_PER_GROUP ? shaderX : shaderY;
    leds[i] = SHADER_COLORS[shader];
  }
  FastLED.show();
}

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  FastLED.addLeds<NEOPIXEL, DATA_PIN>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.clear(true);
  Serial.println("LED Ready");
}

void loop() {
  recevoirShaders();
  animerLED();
}
