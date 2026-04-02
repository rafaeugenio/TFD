'use client';

import { useState, useEffect } from 'react';
import FormField from '@/shared/components/drawer/FormField';

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

interface UfCidadeSelectProps {
  ufLabel?: string;
  cidadeLabel?: string;
  uf: string;
  cidade: string;
  onUfChange: (uf: string) => void;
  onCidadeChange: (cidade: string) => void;
  required?: boolean;
  size?: 'sm' | 'md';
}

export default function UfCidadeSelect({
  ufLabel = 'UF',
  cidadeLabel = 'Cidade',
  uf,
  cidade,
  onUfChange,
  onCidadeChange,
  required = false,
  size = 'md',
}: UfCidadeSelectProps) {
  const [cidades, setCidades] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uf) {
      setCidades([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCidades(data.map((m: any) => ({ id: m.id, nome: m.nome })));
      })
      .catch(() => { if (!cancelled) setCidades([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [uf]);

  const inputClass = size === 'sm' ? 'tfd-input tfd-input--sm' : 'tfd-input';

  return (
    <>
      <FormField label={ufLabel} required={required}>
        <select
          className={inputClass}
          value={uf}
          onChange={(e) => { onUfChange(e.target.value); onCidadeChange(''); }}
        >
          <option value="">Selecione...</option>
          {UF_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FormField>
      <FormField label={cidadeLabel} required={required}>
        <select
          className={inputClass}
          value={cidade}
          onChange={(e) => onCidadeChange(e.target.value)}
          disabled={!uf || loading}
        >
          <option value="">{loading ? 'Carregando cidades...' : uf ? 'Selecione a cidade...' : 'Selecione a UF primeiro'}</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.nome}>{c.nome}</option>
          ))}
        </select>
      </FormField>
    </>
  );
}

export { UF_OPTIONS };
