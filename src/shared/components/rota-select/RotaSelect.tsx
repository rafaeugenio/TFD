'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, ArrowRight, Save, Loader2 } from 'lucide-react';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { createClient } from '@/lib/supabase/client';

interface RotaValue {
  id?: number;
  cidade_origem: string;
  uf_origem: string;
  cidade_destino: string;
  uf_destino: string;
  distancia_milhas?: number;
  distancia_km?: number;
  distancia_milhas_nauticas?: number;
}

interface RotaSelectProps {
  onRotaSelect: (rota: RotaValue) => void;
  modalTransporte?: 'aereo' | 'terrestre' | 'fluvial';
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const CALC_CONFIG = {
  aereo: { divisor: 200, valorUnitario: 181.5, unidade: 'milhas', campo: 'distancia_milhas' as const },
  terrestre: { divisor: 50, valorUnitario: 4.95, unidade: 'km', campo: 'distancia_km' as const },
  fluvial: { divisor: 27, valorUnitario: 3.7, unidade: 'milhas náuticas', campo: 'distancia_milhas_nauticas' as const },
};

const DISTANCE_LABELS: Record<string, string> = {
  aereo: 'Distância em milhas',
  terrestre: 'Distância em km',
  fluvial: 'Distância em milhas náuticas',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RotaSelect({
  onRotaSelect,
  modalTransporte = 'terrestre',
  label = 'Rota de deslocamento',
  required = false,
  disabled = false,
  size = 'md',
}: RotaSelectProps) {
  const [ufOrigem, setUfOrigem] = useState('');
  const [cidadeOrigem, setCidadeOrigem] = useState('');
  const [ufDestino, setUfDestino] = useState('');
  const [cidadeDestino, setCidadeDestino] = useState('');
  const [rota, setRota] = useState<RotaValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualDistancia, setManualDistancia] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Search for existing route when both origin and destination are set
  useEffect(() => {
    if (!cidadeOrigem || !ufOrigem || !cidadeDestino || !ufDestino) {
      setRota(null);
      setManualMode(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function buscarRota() {
      setLoading(true);
      setRota(null);
      setManualMode(false);

      // TODO: Substituir por useRotasDeslocamento hook quando Agente 1 implementar
      const { data, error } = await supabase
        .from('rotas_deslocamento' as any)
        .select('*')
        .eq('cidade_origem', cidadeOrigem)
        .eq('uf_origem', ufOrigem)
        .eq('cidade_destino', cidadeDestino)
        .eq('uf_destino', ufDestino)
        .eq('ativo', true)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setManualMode(true);
        setManualDistancia(0);
      } else {
        const row = data as unknown as RotaValue & { id: number };
        const rotaEncontrada: RotaValue = {
          id: row.id,
          cidade_origem: row.cidade_origem,
          uf_origem: row.uf_origem,
          cidade_destino: row.cidade_destino,
          uf_destino: row.uf_destino,
          distancia_milhas: row.distancia_milhas,
          distancia_km: row.distancia_km,
          distancia_milhas_nauticas: row.distancia_milhas_nauticas,
        };
        setRota(rotaEncontrada);
        onRotaSelect(rotaEncontrada);
      }

      setLoading(false);
    }

    buscarRota();
    return () => { cancelled = true; };
  }, [cidadeOrigem, ufOrigem, cidadeDestino, ufDestino, onRotaSelect]);

  const handleSalvarNovaRota = useCallback(async () => {
    if (manualDistancia <= 0) return;

    setSaving(true);
    const supabase = createClient();
    const config = CALC_CONFIG[modalTransporte];

    const novaRota: Record<string, unknown> = {
      cidade_origem: cidadeOrigem,
      uf_origem: ufOrigem,
      cidade_destino: cidadeDestino,
      uf_destino: ufDestino,
      ativo: true,
      [config.campo]: manualDistancia,
    };

    const { data, error } = await supabase
      .from('rotas_deslocamento' as any)
      .insert(novaRota)
      .select()
      .single();

    if (!error && data) {
      const row = data as unknown as RotaValue & { id: number };
      const rotaSalva: RotaValue = {
        id: row.id,
        cidade_origem: row.cidade_origem,
        uf_origem: row.uf_origem,
        cidade_destino: row.cidade_destino,
        uf_destino: row.uf_destino,
        distancia_milhas: row.distancia_milhas,
        distancia_km: row.distancia_km,
        distancia_milhas_nauticas: row.distancia_milhas_nauticas,
      };
      setRota(rotaSalva);
      setManualMode(false);
      onRotaSelect(rotaSalva);
    }

    setSaving(false);
  }, [cidadeOrigem, ufOrigem, cidadeDestino, ufDestino, manualDistancia, modalTransporte, onRotaSelect]);

  const config = CALC_CONFIG[modalTransporte];

  function getDistancia(r: RotaValue): number {
    return (r[config.campo] as number) ?? 0;
  }

  function calcProcedimentos(distancia: number): number {
    return Math.ceil(distancia / config.divisor);
  }

  function renderCalculo(distancia: number) {
    const procedimentos = calcProcedimentos(distancia);
    const valorTotal = procedimentos * config.valorUnitario;

    return (
      <div className="tfd-message tfd-message--info" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <MapPin size={18} style={{ color: 'var(--tfd-blue)', flexShrink: 0 }} />
        <span style={{ color: 'var(--tfd-text-primary)' }}>
          Distancia: <strong>{distancia} {config.unidade}</strong>
          {' '}&rarr;{' '}
          <strong>{procedimentos} procedimento{procedimentos !== 1 ? 's' : ''}</strong>
          {' '}&rarr;{' '}
          <strong>{formatCurrency(valorTotal)}</strong>
        </span>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="tfd-label" style={{ display: 'block', marginBottom: 8 }}>
          {label}
          {required && <span style={{ color: 'var(--tfd-status-success)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'end' }}>
        {/* Origin */}
        <div>
          <span className="tfd-label" style={{ fontSize: 13, color: 'var(--tfd-text-secondary)', marginBottom: 4, display: 'block' }}>
            Origem
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
            <UfCidadeSelect
              ufLabel="UF"
              cidadeLabel="Cidade"
              uf={ufOrigem}
              cidade={cidadeOrigem}
              onUfChange={(v) => { setUfOrigem(v); setCidadeOrigem(''); }}
              onCidadeChange={setCidadeOrigem}
              required={required}
              size={size}
            />
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 4 }}>
          <ArrowRight size={20} style={{ color: 'var(--tfd-text-muted)' }} />
        </div>

        {/* Destination */}
        <div>
          <span className="tfd-label" style={{ fontSize: 13, color: 'var(--tfd-text-secondary)', marginBottom: 4, display: 'block' }}>
            Destino
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
            <UfCidadeSelect
              ufLabel="UF"
              cidadeLabel="Cidade"
              uf={ufDestino}
              cidade={cidadeDestino}
              onUfChange={(v) => { setUfDestino(v); setCidadeDestino(''); }}
              onCidadeChange={setCidadeDestino}
              required={required}
              size={size}
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--tfd-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" />
          <span>Buscando rota...</span>
        </div>
      )}

      {/* Route found - show calculation */}
      {!loading && rota && renderCalculo(getDistancia(rota))}

      {/* Route not found - manual mode */}
      {!loading && manualMode && (
        <div style={{ marginTop: 12 }}>
          <div className="tfd-message tfd-message--info" style={{ marginBottom: 12 }}>
            Rota nao cadastrada. Informe a distancia manualmente.
          </div>

          <div style={{ display: 'flex', alignItems: 'end', gap: 12 }}>
            <div style={{ flex: '0 0 220px' }}>
              <label className="tfd-label" style={{ display: 'block', marginBottom: 4 }}>
                {DISTANCE_LABELS[modalTransporte]}
              </label>
              <input
                type="number"
                className={size === 'sm' ? 'tfd-input tfd-input--sm' : 'tfd-input'}
                min={0}
                step={1}
                value={manualDistancia || ''}
                onChange={(e) => setManualDistancia(Number(e.target.value))}
                disabled={disabled || saving}
                placeholder="0"
              />
            </div>

            <button
              type="button"
              className={`tfd-btn tfd-btn-primary${size === 'sm' ? ' tfd-btn--sm' : ''}`}
              onClick={handleSalvarNovaRota}
              disabled={disabled || saving || manualDistancia <= 0}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Salvar nova rota
            </button>
          </div>

          {/* Preview calculation for manual distance */}
          {manualDistancia > 0 && renderCalculo(manualDistancia)}
        </div>
      )}
    </div>
  );
}
