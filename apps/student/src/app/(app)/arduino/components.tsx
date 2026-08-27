"use client";

import { COMPONENT_SPECS, colorOf, type PlacedComponent } from "./circuit";

/** Live state a component renders from, derived from the simulation timeline. */
export interface PartState {
  /** Duty for the component's signal pins, keyed by terminal id, 0-255. */
  signals: Record<string, number>;
  /** Frequency in Hz for a buzzer. */
  tone?: number;
  /** Angle in degrees for a servo. */
  angle?: number;
}

export function ComponentBody({
  component,
  state,
  onToggle,
  onValueChange,
}: {
  component: PlacedComponent;
  state: PartState;
  onToggle?: () => void;
  onValueChange?: (value: number) => void;
}) {
  switch (component.type) {
    case "led":
      return <Led component={component} state={state} />;
    case "rgb":
      return <RgbLed state={state} />;
    case "button":
      return <PushButton component={component} onToggle={onToggle} />;
    case "potentiometer":
      return <Potentiometer component={component} onValueChange={onValueChange} />;
    case "buzzer":
      return <Buzzer state={state} />;
    case "servo":
      return <Servo state={state} />;
  }
}

function Led({ component, state }: { component: PlacedComponent; state: PartState }) {
  const spec = COMPONENT_SPECS.led;
  const duty = state.signals.anode ?? 0;
  const brightness = Math.min(1, duty / 255);
  const color = colorOf(component.color);

  return (
    <svg width={spec.width} height={spec.height} viewBox="0 0 62 78">
      <line x1="20" y1="52" x2="20" y2="74" stroke="#94a3b8" strokeWidth="2.5" />
      <line x1="42" y1="52" x2="42" y2="74" stroke="#94a3b8" strokeWidth="2.5" />
      {brightness > 0 && (
        <circle
          cx="31"
          cy="30"
          r={20 + brightness * 10}
          fill={color.glow}
          opacity={brightness * 0.55}
        />
      )}
      <path
        d="M13 34 A18 18 0 0 1 49 34 L49 50 L13 50 Z"
        fill={brightness > 0 ? color.on : "#cbd5e1"}
        opacity={brightness > 0 ? 0.35 + brightness * 0.65 : 0.5}
        stroke="#64748b"
        strokeWidth="1.5"
      />
      <ellipse cx="31" cy="50" rx="18" ry="4" fill={brightness > 0 ? color.on : "#cbd5e1"} opacity="0.85" />
    </svg>
  );
}

function RgbLed({ state }: { state: PartState }) {
  const spec = COMPONENT_SPECS.rgb;
  const r = Math.min(255, state.signals.r ?? 0);
  const g = Math.min(255, state.signals.g ?? 0);
  const b = Math.min(255, state.signals.b ?? 0);
  const lit = r + g + b > 0;
  const fill = `rgb(${r},${g},${b})`;

  return (
    <svg width={spec.width} height={spec.height} viewBox="0 0 74 84">
      {[14, 32, 50, 68].map((x) => (
        <line key={x} x1={x} y1="58" x2={x} y2="80" stroke="#94a3b8" strokeWidth="2.5" />
      ))}
      {lit && <circle cx="37" cy="32" r="30" fill={fill} opacity="0.4" />}
      <path
        d="M17 36 A20 20 0 0 1 57 36 L57 56 L17 56 Z"
        fill={lit ? fill : "#cbd5e1"}
        opacity={lit ? 0.95 : 0.5}
        stroke="#64748b"
        strokeWidth="1.5"
      />
      <ellipse cx="37" cy="56" rx="20" ry="4" fill={lit ? fill : "#cbd5e1"} />
    </svg>
  );
}

function PushButton({
  component,
  onToggle,
}: {
  component: PlacedComponent;
  onToggle?: () => void;
}) {
  const spec = COMPONENT_SPECS.button;
  const pressed = component.pressed === true;

  return (
    <svg
      width={spec.width}
      height={spec.height}
      viewBox="0 0 68 68"
      onPointerDown={(event) => {
        event.stopPropagation();
        onToggle?.();
      }}
      className="cursor-pointer"
    >
      <line x1="20" y1="48" x2="20" y2="64" stroke="#94a3b8" strokeWidth="2.5" />
      <line x1="48" y1="48" x2="48" y2="64" stroke="#94a3b8" strokeWidth="2.5" />
      <rect x="10" y="14" width="48" height="34" rx="4" fill="#475569" />
      <circle
        cx="34"
        cy="28"
        r={pressed ? 11 : 13}
        fill={pressed ? "#dc2626" : "#ef4444"}
        stroke="#7f1d1d"
        strokeWidth="1.5"
      />
      {pressed && <circle cx="34" cy="28" r="16" fill="#ef4444" opacity="0.25" />}
    </svg>
  );
}

function Potentiometer({
  component,
  onValueChange,
}: {
  component: PlacedComponent;
  onValueChange?: (value: number) => void;
}) {
  const spec = COMPONENT_SPECS.potentiometer;
  const value = component.value ?? 512;
  // Sweep across 270°, the usual travel of a real knob.
  const angle = -135 + (value / 1023) * 270;

  return (
    <div className="flex flex-col items-center">
      <svg width={spec.width} height={spec.height - 20} viewBox="0 0 76 64">
        {[14, 38, 62].map((x) => (
          <line key={x} x1={x} y1="48" x2={x} y2="62" stroke="#94a3b8" strokeWidth="2.5" />
        ))}
        <circle cx="38" cy="26" r="22" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        <line
          x1="38"
          y1="26"
          x2={38 + 16 * Math.sin((angle * Math.PI) / 180)}
          y2={26 - 16 * Math.cos((angle * Math.PI) / 180)}
          stroke="#f8fafc"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="range"
        min={0}
        max={1023}
        value={value}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onValueChange?.(Number(event.target.value))}
        className="w-16 accent-[var(--color-accent)]"
      />
    </div>
  );
}

function Buzzer({ state }: { state: PartState }) {
  const spec = COMPONENT_SPECS.buzzer;
  const sounding = (state.tone ?? 0) > 0 || (state.signals.signal ?? 0) > 0;

  return (
    <svg width={spec.width} height={spec.height} viewBox="0 0 70 74">
      <line x1="22" y1="54" x2="22" y2="70" stroke="#94a3b8" strokeWidth="2.5" />
      <line x1="48" y1="54" x2="48" y2="70" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="35" cy="30" r="24" fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <circle cx="35" cy="30" r="5" fill="#0f172a" />
      {sounding && (
        <>
          <circle cx="35" cy="30" r="30" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.7" />
          <circle cx="35" cy="30" r="35" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
        </>
      )}
      {sounding && state.tone ? (
        <text x="35" y="70" textAnchor="middle" fontSize="9" fill="#38bdf8">
          {state.tone} Hz
        </text>
      ) : null}
    </svg>
  );
}

function Servo({ state }: { state: PartState }) {
  const spec = COMPONENT_SPECS.servo;
  const angle = state.angle ?? 0;

  return (
    <svg width={spec.width} height={spec.height} viewBox="0 0 96 82">
      {[24, 48, 72].map((x) => (
        <line key={x} x1={x} y1="64" x2={x} y2="78" stroke="#94a3b8" strokeWidth="2.5" />
      ))}
      <rect x="16" y="26" width="64" height="38" rx="3" fill="#1e40af" />
      <circle cx="48" cy="24" r="10" fill="#475569" />
      <line
        x1="48"
        y1="24"
        x2={48 + 22 * Math.cos(((angle - 90) * Math.PI) / 180)}
        y2={24 + 22 * Math.sin(((angle - 90) * Math.PI) / 180)}
        stroke="#f8fafc"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <text x="48" y="52" textAnchor="middle" fontSize="11" fill="#dbeafe">
        {angle}°
      </text>
    </svg>
  );
}
