/**
 * The circuit model: what the student can place on the canvas, how each part
 * connects to the board, and how a part reacts to the pin values produced by a
 * simulation run.
 *
 * There is no electrical solver here — no voltage, current or resistance. A
 * part simply reads whatever its signal pin was last driven to. That is enough
 * to teach sketch logic and wiring intent, and the UI says so plainly.
 */

export type ComponentType =
  | 'led'
  | 'rgb'
  | 'button'
  | 'potentiometer'
  | 'buzzer'
  | 'servo';

export interface Terminal {
  /** Stable id within the component, e.g. "anode". */
  id: string;
  label: string;
  /** Terminals that must reach a board pin to do anything. */
  kind: 'signal' | 'power' | 'ground';
  /** Offset from the component's top-left corner, in canvas units. */
  dx: number;
  dy: number;
}

export interface ComponentSpec {
  type: ComponentType;
  label: string;
  width: number;
  height: number;
  terminals: Terminal[];
}

export const COMPONENT_SPECS: Record<ComponentType, ComponentSpec> = {
  led: {
    type: 'led',
    label: 'مصباح LED',
    width: 62,
    height: 78,
    terminals: [
      { id: 'anode', label: 'الطرف الموجب', kind: 'signal', dx: 20, dy: 74 },
      { id: 'cathode', label: 'الطرف السالب', kind: 'ground', dx: 42, dy: 74 },
    ],
  },
  rgb: {
    type: 'rgb',
    label: 'LED ملوّن',
    width: 74,
    height: 84,
    terminals: [
      { id: 'r', label: 'أحمر', kind: 'signal', dx: 14, dy: 80 },
      { id: 'g', label: 'أخضر', kind: 'signal', dx: 32, dy: 80 },
      { id: 'b', label: 'أزرق', kind: 'signal', dx: 50, dy: 80 },
      { id: 'gnd', label: 'أرضي', kind: 'ground', dx: 68, dy: 80 },
    ],
  },
  button: {
    type: 'button',
    label: 'زر ضغط',
    width: 68,
    height: 68,
    terminals: [
      { id: 'out', label: 'الخرج', kind: 'signal', dx: 20, dy: 64 },
      { id: 'gnd', label: 'أرضي', kind: 'ground', dx: 48, dy: 64 },
    ],
  },
  potentiometer: {
    type: 'potentiometer',
    label: 'مقياس دوّار',
    width: 76,
    height: 84,
    terminals: [
      { id: 'wiper', label: 'القراءة', kind: 'signal', dx: 38, dy: 80 },
      { id: 'vcc', label: 'تغذية', kind: 'power', dx: 14, dy: 80 },
      { id: 'gnd', label: 'أرضي', kind: 'ground', dx: 62, dy: 80 },
    ],
  },
  buzzer: {
    type: 'buzzer',
    label: 'جرس',
    width: 70,
    height: 74,
    terminals: [
      { id: 'signal', label: 'الإشارة', kind: 'signal', dx: 22, dy: 70 },
      { id: 'gnd', label: 'أرضي', kind: 'ground', dx: 48, dy: 70 },
    ],
  },
  servo: {
    type: 'servo',
    label: 'محرّك سيرفو',
    width: 96,
    height: 82,
    terminals: [
      { id: 'signal', label: 'الإشارة', kind: 'signal', dx: 24, dy: 78 },
      { id: 'vcc', label: 'تغذية', kind: 'power', dx: 48, dy: 78 },
      { id: 'gnd', label: 'أرضي', kind: 'ground', dx: 72, dy: 78 },
    ],
  },
};

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  /** LED colour, ignored by other types. */
  color?: string;
  /** Potentiometer knob position, 0-1023. */
  value?: number;
  /** Whether a button is currently held down. */
  pressed?: boolean;
}

/** One wire from a component terminal to a board pin. */
export interface Wire {
  id: string;
  componentId: string;
  terminalId: string;
  /** Board pin: 0-13 digital, 14-19 analog, or one of the rails. */
  pin: number | 'GND' | '5V';
}

export const LED_COLORS = [
  { key: 'red', label: 'أحمر', on: '#ef4444', glow: 'rgba(239,68,68,0.75)' },
  { key: 'green', label: 'أخضر', on: '#22c55e', glow: 'rgba(34,197,94,0.75)' },
  { key: 'blue', label: 'أزرق', on: '#3b82f6', glow: 'rgba(59,130,246,0.75)' },
  { key: 'yellow', label: 'أصفر', on: '#fbbf24', glow: 'rgba(251,191,36,0.75)' },
  { key: 'white', label: 'أبيض', on: '#f8fafc', glow: 'rgba(248,250,252,0.75)' },
] as const;

export function colorOf(key: string | undefined) {
  return LED_COLORS.find((c) => c.key === key) ?? LED_COLORS[0];
}

/** Board pins a wire may terminate on, in the order the rail renders them. */
export const BOARD_PINS: (number | 'GND' | '5V')[] = [
  ...Array.from({ length: 14 }, (_, i) => i),
  14,
  15,
  16,
  17,
  18,
  19,
  'GND',
  '5V',
];

export function pinLabel(pin: number | 'GND' | '5V'): string {
  if (pin === 'GND' || pin === '5V') return pin;
  return pin >= 14 ? `A${pin - 14}` : String(pin);
}

/** Signal terminals of a component that currently reach a numbered pin. */
export function signalPinsFor(
  component: PlacedComponent,
  wires: Wire[],
): Record<string, number> {
  const spec = COMPONENT_SPECS[component.type];
  const result: Record<string, number> = {};

  for (const terminal of spec.terminals) {
    if (terminal.kind !== 'signal') continue;
    const wire = wires.find(
      (w) => w.componentId === component.id && w.terminalId === terminal.id,
    );
    if (wire && typeof wire.pin === 'number') result[terminal.id] = wire.pin;
  }

  return result;
}

export interface WiringProblem {
  componentId: string;
  message: string;
}

/**
 * Flags wiring a beginner commonly gets wrong. This is guidance, not an
 * electrical check — the simulation runs regardless.
 */
export function checkWiring(
  components: PlacedComponent[],
  wires: Wire[],
): WiringProblem[] {
  const problems: WiringProblem[] = [];

  for (const component of components) {
    const spec = COMPONENT_SPECS[component.type];
    const connected = new Set(
      wires
        .filter((w) => w.componentId === component.id)
        .map((w) => w.terminalId),
    );

    const missingSignal = spec.terminals.filter(
      (t) => t.kind === 'signal' && !connected.has(t.id),
    );
    const missingGround = spec.terminals.filter(
      (t) => t.kind === 'ground' && !connected.has(t.id),
    );

    if (missingSignal.length === spec.terminals.filter((t) => t.kind === 'signal').length) {
      problems.push({
        componentId: component.id,
        message: `${spec.label}: لم تُوصَّل الإشارة بأي منفذ`,
      });
    }

    if (missingGround.length > 0) {
      problems.push({
        componentId: component.id,
        message: `${spec.label}: الطرف الأرضي غير موصول بـ GND`,
      });
    }
  }

  return problems;
}
