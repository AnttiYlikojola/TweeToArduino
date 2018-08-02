
#include <Adafruit_GFX.h>
#include <MCUFRIEND_kbv.h>
#include "TouchScreen.h"
#include <Servo.h>
#include <FiniteStateMachine.h>
#include <Wire.h>
#include "Adafruit_LEDBackpack.h"

#pragma GCC diagnostic ignored "-Wwrite-strings"
#pragma GCC diagnostic ignored "-Wnarrowing"
#pragma GCC diagnostic ignored "-Woverflow"
#pragma GCC diagnostic ignored "-fpermissive"
#define BLACK 0x0000
#define BLUE 0x001F
#define RED 0xF800
#define GREEN 0x07E0
#define CYAN 0x07FF
#define MAGENTA 0xF81F
#define YELLOW 0xFFE0
#define WHITE 0xFFFF
#define BLUEBAR_MINX 120
#define BAR_MINY 60

#define MINPRESSURE 2
#define MAXPRESSURE 1000

// These are the pins for the shield!
#define YP A1 // must be an analog pin, use "An" notation!
#define XM A2 // must be an analog pin, use "An" notation!
#define YM 7  // can be a digital pin
#define XP 6  // can be a digital pin

static const uint8_t PROGMEM
    smile_bmp[] =
        {B00111100,
         B01000010,
         B10100101,
         B10000001,
         B10100101,
         B10011001,
         B01000010,
         B00111100},
    neutral_bmp[] =
        {B00111100,
         B01000010,
         B10100101,
         B10000001,
         B10111101,
         B10000001,
         B01000010,
         B00111100},
    frown_bmp[] =
        {B00111100,
         B01000010,
         B10100101,
         B10000001,
         B10011001,
         B10100101,
         B01000010,
         B00111100};

int servoPos[9] = {90, 90, 90, 90, 90, 90, 90, 90, 90}; // array for servo position tracking
int servoInitPos[9];                                    // array for initializing positions

// servo declarations
Servo ankle_left;
Servo ankle_right;
Servo hip_left;
Servo hip_right;
Servo shoulder_left;
Servo shoulder_right;
Servo arm_left;
Servo arm_right;
Servo head;
Servo servos[] = {
    ankle_left, ankle_right,
    hip_left, hip_right,
    shoulder_left, shoulder_right,
    arm_left, arm_right, head};
const int numOfServos = sizeof(servos) / sizeof(*servos);

// finite state machine declarations (enter state, update state, exit state)
State state_stepforward(NULL, &on_stepforward_update, &initPosition);
State state_stepbackward(NULL, &on_stepbackward_update, &initPosition);
State state_donothing(NULL, NULL, NULL);
State state_wavelefthand(NULL, &on_wavelefthand_update, &initPosition);
State state_waverighthand(NULL, &on_waverighthand_update, &initPosition);
State state_dance(NULL, &on_dance_update, &initPosition);
State state_moonwalk(NULL, &on_moonwalk_update, &initPosition);
State state_lookaround(NULL, &on_lookaround_update, NULL);
State state_lookforward(NULL, &on_lookforward_update, NULL);
State state_lookleft(NULL, &on_lookleft_update, NULL);
State state_lookright(NULL, &on_lookright_update, NULL);
State state_turnleft(NULL, &on_turnleft_update, &initPosition);
State state_turnright(NULL, &on_turnright_update, &initPosition);
State state_handsup(NULL, &on_handsup_update, &initPosition);
State state_handsdown(NULL, &on_handsdown_update, &initPosition);
FSM fsm = FSM(state_donothing);

bool storyStarted = false;

TouchScreen ts = TouchScreen(XP, YP, XM, YM, 300);
MCUFRIEND_kbv tft;

Adafruit_8x8matrix matrix = Adafruit_8x8matrix();

void setup()
{

  matrix.begin(0x70); // pass in the address
  matrix.setRotation(1);

  Serial.begin(9600);
  if (!Serial)
  {
    delay(5000);
  }

  Serial.println(tft.width());
  Serial.println(tft.height());
  tft.reset();
  tft.begin(tft.readID());
  tft.setRotation(3);
  tft.fillScreen(BLACK);

  tft.setTextSize(2);
  tft.setTextColor(YELLOW);
  tft.setCursor(110, 90);
  tft.print("Loading...");
  memcpy(servoInitPos, servoPos, sizeof(servoInitPos));
  for (int i = 0; i < numOfServos; i += 1)
  {
    servos[i].write(servoInitPos[i]);
    Serial.println(i + 30);
    servos[i].attach(i + 30);
    delay(400);
  }

  for (int i; i < 220; i++)
  {
    tft.fillRect(BAR_MINY - 10, BLUEBAR_MINX, i, 10, RED);
    delay(10);
  }
  tft.reset();
  tft.fillScreen(BLACK);
  tft.fillRoundRect(60, 90, 200, 40, 8, RED); //RGB led
  tft.drawRoundRect(60, 90, 200, 40, 8, WHITE);
  tft.setCursor(90, 100);
  tft.print("Aloita tarina");
}



void initPosition()
{
  Serial.println("do nothing update");
  for (int i = 0; i < numOfServos; i += 1)
  {
    servos[i].write(servoInitPos[i]);
    delay(300);
  }
}
void on_stepforward_update()
{
  Serial.println("Step forward update");
  ankle_left.write(80); //shift weight to left ankle
  ankle_right.write(90);
  delay(200);
  hip_left.write(70);  //left hip
  hip_right.write(70); //right hip
  delay(200);
  ankle_left.write(90);  //level ankle
  ankle_right.write(90); //right ankle
  delay(200);
  ankle_left.write(100); //shift weight to right ankle
  ankle_right.write(110);
  delay(200);
  hip_left.write(110);  //left hip
  hip_right.write(110); //right hip
  delay(200);
  ankle_left.write(90);  //level ankle
  ankle_right.write(90); //right ankle
  delay(200);
}
void on_stepbackward_update()
{
  Serial.println("Step backward update");
  ankle_left.write(80); //shift weight to left ankle
  ankle_right.write(80);
  delay(200);
  hip_left.write(110);  //left hip
  hip_right.write(110); //right hip
  delay(200);
  ankle_left.write(90);  //level ankle
  ankle_right.write(90); //right ankle
  delay(200);
  ankle_left.write(100); //shift weight to right ankle
  ankle_right.write(100);
  delay(200);
  hip_left.write(70);  //left hip
  hip_right.write(70); //right hip
  delay(200);
  ankle_left.write(90);  //level ankle
  ankle_right.write(90); //right ankle
  delay(200);
}
void on_wavelefthand_update()
{
  Serial.println("on left wave hand update");
  shoulder_left.write(0);
  delay(400);
  arm_left.write(180);
  delay(400);
  arm_left.write(90);
  delay(400);
  arm_left.write(180);
  delay(400);
  arm_left.write(90);
  delay(400);
  arm_left.write(180);
  delay(400);
  arm_left.write(90);
  delay(400);
  fsm.exitState();
}
void on_waverighthand_update()
{
  Serial.println("on left wave hand update");
  shoulder_right.write(180);
  delay(400);
  arm_right.write(90);
  delay(400);
  arm_right.write(0);
  delay(400);
  arm_right.write(90);
  delay(400);
  arm_right.write(0);
  delay(400);
  arm_right.write(90);
  delay(400);
  arm_right.write(0);
  delay(400);
  fsm.exitState();
}
void on_dance_update()
{
  head.write(60);
  arm_left.write(130);
  arm_right.write(50);
  shoulder_right.write(120);
  hip_left.write(100);  //left hip
  hip_right.write(100); //right hip
  delay(200);
  head.write(100);
  shoulder_left.write(10);
  arm_left.write(90);
  arm_right.write(90);
  hip_left.write(70);  //left hip
  hip_right.write(70); //right hip
  delay(500);
  shoulder_right.write(160);
  shoulder_left.write(50);
  head.write(50);
  arm_left.write(90);
  arm_right.write(90);
  ankle_left.write(70);   //left hip
  ankle_right.write(110); //right hip
  delay(300);
  head.write(130);
  arm_left.write(130);
  arm_right.write(50);
  hip_left.write(100);   //left hip
  hip_right.write(100);  //right hip
  ankle_left.write(90);  //left hip
  ankle_right.write(90); //right hip
  delay(500);
  head.write(70);
  shoulder_left.write(90);
  arm_left.write(90);
  arm_right.write(20);
  hip_left.write(40);     //left hip
  hip_right.write(60);    //right hip
  ankle_left.write(50);   //left hip
  ankle_right.write(120); //right hip
  delay(200);
  head.write(60);
  arm_left.write(130);
  arm_right.write(50);
  hip_left.write(100);  //left hip
  hip_right.write(100); //right hip
  delay(200);
  head.write(100);
  arm_left.write(90);
  arm_right.write(90);
  shoulder_left.write(59);
  hip_left.write(70);  //left hip
  hip_right.write(70); //right hip
  delay(500);
  head.write(50);
  shoulder_right.write(120);
  arm_left.write(90);
  arm_right.write(90);
  ankle_left.write(70);   //left hip
  ankle_right.write(110); //right hip
  delay(300);
  head.write(130);
  shoulder_left.write(90);
  shoulder_right.write(90);
  arm_left.write(130);
  arm_right.write(50);
  hip_left.write(100);   //left hip
  hip_right.write(100);  //right hip
  ankle_left.write(90);  //left hip
  ankle_right.write(90); //right hip
  delay(500);
  head.write(70);
  arm_left.write(90);
  arm_right.write(20);
  hip_left.write(40);     //left hip
  hip_right.write(60);    //right hip
  ankle_left.write(50);   //left hip
  ankle_right.write(120); //right hip
  delay(200);
}
void on_moonwalk_update()
{
  Serial.println("on moonwalk update");
}
void on_lookaround_update()
{
  Serial.println("on look around update");
  head.write(45);
  delay(1000);
  head.write(160);
  delay(1000);
}
void on_lookleft_update()
{
  Serial.println("on look left update");
  head.write(160);
  delay(1000);
}
void on_lookforward_update()
{
  Serial.println("on look left update");
  head.write(90);
  delay(1000);
}
void on_lookright_update()
{
  Serial.println("on look right update");
  head.write(45);
  delay(1000);
}
void on_turnleft_update()
{
  ankle_left.write(70);
  delay(500);
  ankle_right.write(120);
  delay(500);
  hip_left.write(40);
  delay(500);
  ankle_left.write(100);
  delay(500);
  hip_left.write(90);
  delay(500);
  ankle_right.write(90);
  delay(500);
  Serial.println("on turn left update");
}
void on_turnright_update()
{
  ankle_right.write(110);
  delay(500);
  ankle_left.write(70);
  delay(500);
  hip_right.write(140);
  delay(500);
  ankle_right.write(80);
  delay(500);
  hip_right.write(90);
  delay(500);
  ankle_left.write(100);
  delay(500);
  Serial.println("on turn right update");
}
void on_handsup_update()
{
  shoulder_left.write(180);
  shoulder_right.write(180);
  Serial.println("on hands up update");
}
void on_handsdown_update()
{
  shoulder_left.write(180);
  shoulder_right.write(180);
  Serial.println("on hands up update");
}

void smilyFace()
{
  matrix.clear();
  matrix.drawBitmap(0, 0, smile_bmp, 8, 8, LED_ON);
  matrix.writeDisplay();
}
void neutralFace()
{
  matrix.clear();
  matrix.drawBitmap(0, 0, neutral_bmp, 8, 8, LED_ON);
  matrix.writeDisplay();
}
void sadFace()
{
  matrix.clear();
  matrix.drawBitmap(0, 0, frown_bmp, 8, 8, LED_ON);
  matrix.writeDisplay();
}
