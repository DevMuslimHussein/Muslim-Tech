/**
 * Ready-made projects: each pairs a sketch with a circuit that is already
 * wired, so a student can press run and see something work before they have
 * learned to wire anything themselves.
 */
import type { PlacedComponent, Wire } from './circuit';

export interface Example {
  name: string;
  code: string;
  components: PlacedComponent[];
  wires: Wire[];
}

export const STARTER_SKETCH = `// وميض مصباح على المنفذ 9

void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
  Serial.println("بدء التشغيل");
}

void loop() {
  digitalWrite(9, HIGH);
  delay(500);
  digitalWrite(9, LOW);
  delay(500);
}
`;

const led = (id: string, x: number, y: number, color: string): PlacedComponent => ({
  id,
  type: 'led',
  x,
  y,
  color,
});

const wire = (
  id: string,
  componentId: string,
  terminalId: string,
  pin: number | 'GND' | '5V',
): Wire => ({ id, componentId, terminalId, pin });

export const EXAMPLES: Example[] = [
  {
    name: 'وميض مصباح',
    code: STARTER_SKETCH,
    components: [led('led1', 120, 60, 'red')],
    wires: [
      wire('w1', 'led1', 'anode', 9),
      wire('w2', 'led1', 'cathode', 'GND'),
    ],
  },

  {
    name: 'إشارة مرور',
    code: `// إشارة مرور: أحمر ثم أصفر ثم أخضر

void setup() {
  pinMode(11, OUTPUT); // أحمر
  pinMode(10, OUTPUT); // أصفر
  pinMode(9, OUTPUT);  // أخضر
}

void loop() {
  digitalWrite(11, HIGH);
  delay(2000);
  digitalWrite(11, LOW);

  digitalWrite(10, HIGH);
  delay(700);
  digitalWrite(10, LOW);

  digitalWrite(9, HIGH);
  delay(2000);
  digitalWrite(9, LOW);
}
`,
    components: [
      led('r1', 60, 50, 'red'),
      led('y1', 160, 50, 'yellow'),
      led('g1', 260, 50, 'green'),
    ],
    wires: [
      wire('w1', 'r1', 'anode', 11),
      wire('w2', 'r1', 'cathode', 'GND'),
      wire('w3', 'y1', 'anode', 10),
      wire('w4', 'y1', 'cathode', 'GND'),
      wire('w5', 'g1', 'anode', 9),
      wire('w6', 'g1', 'cathode', 'GND'),
    ],
  },

  {
    name: 'زر يشغّل مصباح',
    code: `// اضغط الزر في الدائرة قبل التشغيل

void setup() {
  pinMode(2, INPUT);
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(2) == HIGH) {
    digitalWrite(9, HIGH);
    Serial.println("الزر مضغوط");
  } else {
    digitalWrite(9, LOW);
    Serial.println("الزر مرفوع");
  }
  delay(500);
}
`,
    components: [
      { id: 'btn1', type: 'button', x: 60, y: 60, pressed: false },
      led('led1', 220, 55, 'green'),
    ],
    wires: [
      wire('w1', 'btn1', 'out', 2),
      wire('w2', 'btn1', 'gnd', 'GND'),
      wire('w3', 'led1', 'anode', 9),
      wire('w4', 'led1', 'cathode', 'GND'),
    ],
  },

  {
    name: 'مقياس يتحكّم بالإضاءة',
    code: `// حرّك المقياس في الدائرة قبل التشغيل

void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int reading = analogRead(A0);
  int brightness = map(reading, 0, 1023, 0, 255);

  analogWrite(9, brightness);

  Serial.print("القراءة: ");
  Serial.println(reading);
  delay(500);
}
`,
    components: [
      { id: 'pot1', type: 'potentiometer', x: 60, y: 50, value: 700 },
      led('led1', 230, 55, 'yellow'),
    ],
    wires: [
      wire('w1', 'pot1', 'wiper', 14),
      wire('w2', 'pot1', 'vcc', '5V'),
      wire('w3', 'pot1', 'gnd', 'GND'),
      wire('w4', 'led1', 'anode', 9),
      wire('w5', 'led1', 'cathode', 'GND'),
    ],
  },

  {
    name: 'جرس إنذار',
    code: `// جرس مع مصباح تحذير

void setup() {
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
}

void loop() {
  tone(8, 1000);
  digitalWrite(9, HIGH);
  delay(400);

  noTone(8);
  digitalWrite(9, LOW);
  delay(400);
}
`,
    components: [
      { id: 'bz1', type: 'buzzer', x: 70, y: 55 },
      led('led1', 220, 55, 'red'),
    ],
    wires: [
      wire('w1', 'bz1', 'signal', 8),
      wire('w2', 'bz1', 'gnd', 'GND'),
      wire('w3', 'led1', 'anode', 9),
      wire('w4', 'led1', 'cathode', 'GND'),
    ],
  },

  {
    name: 'محرّك سيرفو',
    code: `// تحريك ذراع السيرفو ذهابًا وإيابًا

Servo arm;

void setup() {
  arm.attach(9);
  Serial.begin(9600);
}

void loop() {
  for (int angle = 0; angle <= 180; angle += 30) {
    arm.write(angle);
    Serial.println(angle);
    delay(400);
  }
  for (int angle = 180; angle >= 0; angle -= 30) {
    arm.write(angle);
    delay(400);
  }
}
`,
    components: [{ id: 'sv1', type: 'servo', x: 110, y: 55 }],
    wires: [
      wire('w1', 'sv1', 'signal', 9),
      wire('w2', 'sv1', 'vcc', '5V'),
      wire('w3', 'sv1', 'gnd', 'GND'),
    ],
  },
];
