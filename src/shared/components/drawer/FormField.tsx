'use client';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="tfd-label">
        {label}
        {required && <span style={{ color: 'var(--tfd-status-danger)' }}> *</span>}
      </label>
      {children}
      {error && <p className="tfd-field-error">{error}</p>}
    </div>
  );
}
