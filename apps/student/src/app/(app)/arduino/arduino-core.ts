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
  /**
   * Digital pins currently held HIGH by a wired-up button. Any pin not listed
   * reads back whatever the sketch last wrote to it.
   */
  highPins: number[];
  /** Value analogRead() returns per analog pin (A0 = 14 … A5 = 19), 0-1023. */
  analogValues: Record<number, number>;
}

/** A literal backslash-n for inclusion in generated C++ string literals. */
const NL = String.fromCharCode(92) + 'n';

function clampAnalog(value: number): number {
  return Math.max(0, Math.min(1023, Math.round(value)));
}

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
    // Pins a wired button is currently holding HIGH, and the analog readings
    // the wired potentiometers report — both fixed for the whole run.
    `static const bool __FORCED_HIGH[20] = {${Array.from(
      { length: 20 },
      (_, pin) => (inputs.highPins.includes(pin) ? 'true' : 'false'),
    ).join(',')}};`,
    `static const int __ANALOG[20] = {${Array.from({ length: 20 }, (_, pin) =>
      String(clampAnalog(inputs.analogValues[pin] ?? 0)),
    ).join(',')}};`,
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
    '  if (pin < 0 || pin >= 20) return 0;',
    '  if (__FORCED_HIGH[pin]) return 1;',
    '  return __pinState[pin];',
    '}',
    '',
    'void analogWrite(int pin, int value) {',
    // Keep the raw 0-255 duty so the board can render partial brightness.
    '  if (pin >= 0 && pin < 20) __pinState[pin] = value;',
    '  __event("analog", to_string(pin) + "," + to_string(value));',
    '}',
    '',
    'int analogRead(int pin) { return (pin >= 0 && pin < 20) ? __ANALOG[pin] : 0; }',
    '',
    // A minimal Servo, enough for the write()/attach() pattern taught first.
    'class Servo {',
    '  int __pin = -1;',
    'public:',
    '  void attach(int pin) { __pin = pin; __event("servo", to_string(pin) + ",0"); }',
    '  void attach(int pin, int, int) { attach(pin); }',
    '  void write(int angle) {',
    '    if (angle < 0) angle = 0; if (angle > 180) angle = 180;',
    '    __event("servo", to_string(__pin) + "," + to_string(angle));',
    '  }',
    '  void detach() {}',
    '};',
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
  | 'servo'
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

