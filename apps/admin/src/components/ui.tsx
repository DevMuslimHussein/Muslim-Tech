import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-sm ${
        hover ? "transition-all duration-200 ease-mt hover:-translate-y-0.5 hover:border-accent-soft-border hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeStyles = {
  accent: "bg-accent-soft text-accent-ink border-accent-soft-border",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  neutral: "bg-surface-2 text-ink-soft border-border",
  violet: "bg-violet-soft text-violet-ink border-transparent",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyles[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          {icon}
        </div>
      )}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`mt-skeleton ${className}`} />;
}

export function ProgressBar({ percent, tone = "accent" }: { percent: number; tone?: "accent" | "violet" }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-mt ${
          tone === "accent" ? "bg-gradient-brand" : "bg-gradient-violet"
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover hover:shadow-accent",
    secondary: "border border-border bg-surface text-ink hover:border-border-strong hover:bg-surface-2",
    ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
    danger: "bg-danger-soft text-danger hover:brightness-95",
  } as const;

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ease-mt disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
