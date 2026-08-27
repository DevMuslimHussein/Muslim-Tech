/**
 * A mock Arduino core that lets a real sketch compile with plain g++ instead of
 * avr-gcc. Every hardware call is recorded as an event against a virtual clock,
 * so the browser can replay the run visually afterwards.
 *
 * This is not an AVR emulator: timing is virtual and there are no interrupts.
 * It models the Arduino *API* faithfully enough to teach sketch logic.
 */

/** Digital pins the simulated board exposes. */
export const DIGITAL_PINS = 14;

export interface VirtualInputs {
  /** Value digitalRead() returns for the button pin. */
  buttonPin: number;
  buttonPressed: boolean;
  /** Value analogRead() returns for every analog pin, 0-1023. */
  potValue: number;
}

/** A literal backslash-n for inclusion in generated C++ string literals. */
const NL = String.fromCharCode(92) + 'n';

export function buildProgram(sketch: string, inputs: VirtualInputs): string {
  const core = [
    '#include <iostream>',
    '#include <string>',
    '#include <sstream>',
    'using namespace std;',
    '',
    '#define HIGH 1',
    '#define LOW 0',
    '#define INPUT 0',
    '#define OUTPUT 1',
    '#define INPUT_PULLUP 2',
    '#define LED_BUILTIN 13',
    '#define A0 14',
    '#define A1 15',
    '#define A2 16',
    '#define A3 17',
    '#define A4 18',
    '#define A5 19',
    '',
    'static unsigned long __vclock = 0;',
    'static int __pinState[20] = {0};',
    // Caps the run so an empty loop() or a huge delay cannot produce an
    // unbounded event stream.
    'static const unsigned long __TIME_BUDGET = 30000;',
    'static const long __MAX_EVENTS = 4000;',
    'static long __events = 0;',
    'static bool __halted = false;',
    `static const int __BUTTON_PIN = ${inputs.buttonPin};`,
    `static const int __BUTTON_VALUE = ${inputs.buttonPressed ? 1 : 0};`,
    `static const int __POT_VALUE = ${Math.max(0, Math.min(1023, Math.round(inputs.potValue)))};`,
    '',
    'static void __event(const string& kind, const string& data) {',
    '  if (__events++ > __MAX_EVENTS) { __halted = true; return; }',
    `  cout << "@" << __vclock << "|" << kind << "|" << data << "${NL}";`,
    '}',
    '',
    'void pinMode(int pin, int mode) { __event("mode", to_string(pin) + "," + to_string(mode)); }',
    '',
    'void digitalWrite(int pin, int value) {',
    '  if (pin >= 0 && pin < 20) __pinState[pin] = value;',
    '  __event("write", to_string(pin) + "," + to_string(value));',
    '}',
    '',
    'int digitalRead(int pin) {',
    '  if (pin == __BUTTON_PIN) return __BUTTON_VALUE;',
    '  return (pin >= 0 && pin < 20) ? __pinState[pin] : 0;',
    '}',
    '',
    'void analogWrite(int pin, int value) {',
    '  if (pin >= 0 && pin < 20) __pinState[pin] = value > 0 ? 1 : 0;',
    '  __event("analog", to_string(pin) + "," + to_string(value));',
    '}',
    '',
    'int analogRead(int) { return __POT_VALUE; }',
    '',
    'void delay(unsigned long ms) {',
    '  __vclock += ms;',
    '  if (__vclock > __TIME_BUDGET) __halted = true;',
    '}',
    'void delayMicroseconds(unsigned long us) { __vclock += us / 1000; }',
    'unsigned long millis() { return __vclock; }',
    'unsigned long micros() { return __vclock * 1000; }',
    'long map(long x, long a, long b, long c, long d) { return (x - a) * (d - c) / (b - a) + c; }',
    'long constrain(long x, long a, long b) { return x < a ? a : (x > b ? b : x); }',
    'void tone(int pin, unsigned int f) { __event("tone", to_string(pin) + "," + to_string(f)); }',
    'void tone(int pin, unsigned int f, unsigned long) { tone(pin, f); }',
    'void noTone(int pin) { __event("tone", to_string(pin) + ",0"); }',
    '',
    'struct __SerialClass {',
    '  void begin(long) {}',
    '  void end() {}',
    '  int available() { return 0; }',
    '  template <typename T> void print(T v) { ostringstream o; o << v; __event("serial", o.str()); }',
    '  template <typename T> void println(T v) { ostringstream o; o << v; __event("serialln", o.str()); }',
    '  void println() { __event("serialln", ""); }',
    '} Serial;',
    '',
    '// The sketch supplies these.',
    'void setup();',
    'void loop();',
    '',
    'int main() {',
    '  setup();',
    '  for (long i = 0; i < 2000 && !__halted; i++) loop();',
    `  cout << "@" << __vclock << "|end|" << (__halted ? "limit" : "done") << "${NL}";`,
    '  return 0;',
    '}',
    '',
    '#line 1 "sketch.ino"',
    '',
  ].join('\n');

  return core + sketch;
}

export type EventKind =
  | 'mode'
  | 'write'
  | 'analog'
  | 'serial'
  | 'serialln'
  | 'tone'
  | 'end';

export interface SimEvent {
  time: number;
  kind: EventKind;
  /** Pin number for hardware events; undefined for serial output. */
  pin?: number;
  /** Written value for hardware events. */
  value?: number;
  /** Text for serial events, or the halt reason for `end`. */
  text?: string;
}

/** Turns the program's stdout back into a typed timeline. */
export function parseEvents(stdout: string): SimEvent[] {
  const events: SimEvent[] = [];

  for (const line of stdout.split('\n')) {
    if (!line.startsWith('@')) continue;
    const separator = line.indexOf('|');
    if (separator === -1) continue;

    const time = Number(line.slice(1, separator));
    const rest = line.slice(separator + 1);
    const second = rest.indexOf('|');
    if (second === -1) continue;

    const kind = rest.slice(0, second) as EventKind;
    const data = rest.slice(second + 1);

    if (kind === 'serial' || kind === 'serialln' || kind === 'end') {
      events.push({ time, kind, text: data });
    } else {
      const [pin, value] = data.split(',').map(Number);
      events.push({ time, kind, pin, value });
    }
  }

  return events;
}

export const STARTER_SKETCH = `// وميض LED على المنفذ 13
// جرّب تغيير الأرقام وشوف النتيجة

void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("بدء التشغيل");
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("الضوء مضاء");
  delay(500);

  digitalWrite(13, LOW);
  Serial.println("الضوء مطفأ");
  delay(500);
}
`;

export const EXAMPLES: { name: string; code: string }[] = [
  { name: 'وميض LED', code: STARTER_SKETCH },
  {
    name: 'تتابع أضواء',
    code: `// أضواء متتابعة على المنافذ 8 إلى 12

void setup() {
  for (int pin = 8; pin <= 12; pin++) {
    pinMode(pin, OUTPUT);
  }
}

void loop() {
  for (int pin = 8; pin <= 12; pin++) {
    digitalWrite(pin, HIGH);
    delay(200);
    digitalWrite(pin, LOW);
  }
}
`,
  },
  {
    name: 'زر يشغّل ضوء',
    code: `// اضغط «الزر» من لوحة المدخلات قبل التشغيل

void setup() {
  pinMode(2, INPUT);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int state = digitalRead(2);

  if (state == HIGH) {
    digitalWrite(13, HIGH);
    Serial.println("الزر مضغوط — الضوء مضاء");
  } else {
    digitalWrite(13, LOW);
    Serial.println("الزر غير مضغوط");
  }

  delay(1000);
}
`,
  },
  {
    name: 'قراءة مقياس',
    code: `// حرّك المقياس من لوحة المدخلات قبل التشغيل

void setup() {
  Serial.begin(9600);
  pinMode(9, OUTPUT);
}

void loop() {
  int reading = analogRead(A0);
  int brightness = map(reading, 0, 1023, 0, 255);

  Serial.print("القراءة: ");
  Serial.println(reading);

  analogWrite(9, brightness);
  delay(1000);
}
`,
  },
];
