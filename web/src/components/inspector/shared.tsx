import type { ReactNode } from 'react';

export function InspectorCard({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="inspector-card">
      <header className="inspector-card-header">
        <div>
          <h4>{title}</h4>
          {hint ? <p className="inspector-hint">{hint}</p> : null}
        </div>
        {action}
      </header>
      <div className="inspector-card-body">{children}</div>
    </article>
  );
}

export function InspectorField({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="inspector-field" title={hint}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function InspectorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <label className="inspector-control" title={hint}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InspectorInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="inspector-control" title={hint}>
      <span>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="text" value={value} />
    </label>
  );
}

export function InspectorTextarea({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="inspector-control inspector-control-grow" title={hint}>
      <span>{label}</span>
      <textarea onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} value={value} />
    </label>
  );
}

export function InspectorRange({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="inspector-control" title={hint}>
      <span>
        {label} <em>{value.toFixed(2)}</em>
      </span>
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

export function InspectorBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}) {
  return <span className={`inspector-badge tone-${tone}`}>{label}</span>;
}

export function InspectorEmpty({ message }: { message: string }) {
  return <p className="inspector-empty">{message}</p>;
}

export function InspectorListItem({
  title,
  meta,
  trailing,
  onClick,
}: {
  title: string;
  meta?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="inspector-list-item" onClick={onClick} type={onClick ? 'button' : undefined}>
      <div>
        <strong>{title}</strong>
        {meta ? <span>{meta}</span> : null}
      </div>
      {trailing}
    </Tag>
  );
}
