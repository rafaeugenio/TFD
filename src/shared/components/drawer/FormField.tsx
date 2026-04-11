'use client';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, required, hint, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="tfd-label">
        {label}
        {required && <span style={{ color: 'var(--tfd-status-danger)' }}> *</span>}
        {hint && <span className="ml-1 font-normal text-xs" style={{ color: 'var(--tfd-text-muted)' }}>({hint})</span>}
      </label>
      {children}
      {error && <p className="tfd-field-error">{error}</p>}
    </div>
  );
}
