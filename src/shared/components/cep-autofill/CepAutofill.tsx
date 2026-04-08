'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';

interface ViaCepAddress {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  codigo_ibge: string;
}

interface CepAutofillProps {
  onAddressFound: (address: ViaCepAddress) => void;
  initialCep?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function getRawDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

export default function CepAutofill({
  onAddressFound,
  initialCep = '',
  label = 'CEP',
  required = false,
  disabled = false,
  size = 'md',
}: CepAutofillProps) {
  const [cep, setCep] = useState(() => maskCep(initialCep));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(false);

  const fetchCep = useCallback(
    (rawCep: string) => {
      if (rawCep.length !== 8) return;

      let cancelled = false;
      setLoading(true);
      setError('');
      setFound(false);

      fetch(`https://viacep.com.br/ws/${rawCep}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data.erro) {
            setError('CEP não encontrado');
            return;
          }
          const address: ViaCepAddress = {
            cep: data.cep,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
            codigo_ibge: data.ibge,
          };
          onAddressFound(address);
          setFound(true);
          setTimeout(() => {
            if (!cancelled) setFound(false);
          }, 2000);
        })
        .catch(() => {
          if (!cancelled) setError('Erro ao buscar CEP');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    },
    [onAddressFound],
  );

  useEffect(() => {
    const raw = getRawDigits(initialCep);
    if (raw.length === 8) {
      setCep(maskCep(initialCep));
      const cleanup = fetchCep(raw);
      return cleanup;
    }
  }, [initialCep, fetchCep]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = getRawDigits(e.target.value);
    const masked = maskCep(raw);
    setCep(masked);
    setError('');
    setFound(false);

    if (raw.length === 8) {
      fetchCep(raw);
    }
  }

  const inputClass = size === 'sm' ? 'tfd-input tfd-input--sm' : 'tfd-input';

  return (
    <FormField label={label} required={required} error={error}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          className={inputClass}
          value={cep}
          onChange={handleChange}
          placeholder="00000-000"
          disabled={disabled || loading}
          maxLength={9}
        />
        {loading && (
          <Loader2
            size={16}
            className="animate-spin"
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--tfd-text-muted)',
            }}
          />
        )}
        {found && !loading && (
          <CheckCircle2
            size={16}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--tfd-status-success)',
            }}
          />
        )}
      </div>
    </FormField>
  );
}
