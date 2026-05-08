'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { templatesParecer } from '../../_data/templates-parecer';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { DecisaoParecer, ParecerMock } from '@/core/mocks/fluxo-v2-v3-seed';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  /** Quando informado, drawer mostra um header secundário com infos do paciente. */
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição. */
  editar?: ParecerMock;
}

export default function NewParecerDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addParecer, editarParecer } = useFluxoV2State();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [decisao, setDecisao] = useState<DecisaoParecer>('deferido');
  const [cidPrincipal, setCidPrincipal] = useState('');
  const [cidSecundario, setCidSecundario] = useState('');
  const [versaoCID, setVersaoCID] = useState<'10' | '11'>('10');
  const [obs, setObs] = useState('');
  const [medico, setMedico] = useState('Dr. Ricardo Mello');
  const [tplOpen, setTplOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (editar) {
        setDecisao(editar.decisao);
        setCidPrincipal(editar.cidPrincipal ?? '');
        setCidSecundario(editar.cidSecundario ?? '');
        setVersaoCID(editar.versaoCID ?? '10');
        setObs(editar.observacao ?? '');
        setMedico(editar.medico);
      } else {
        setDecisao('deferido');
        setCidPrincipal('');
        setCidSecundario('');
        setVersaoCID('10');
        setObs('');
      }
      setTplOpen(false);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar]);

  function aplicarTemplate(tplId: string) {
    const tpl = templatesParecer.find((t) => t.id === tplId);
    if (!tpl) return;
    setObs(tpl.texto);
    setDecisao(tpl.categoria);
    setTplOpen(false);
  }

  function handleSalvar() {
    const payload = {
      decisao,
      cidPrincipal: cidPrincipal || undefined,
      cidSecundario: cidSecundario || undefined,
      versaoCID,
      observacao: obs || undefined,
      medico,
    };
    if (isEdicao && editar) {
      editarParecer(solicitacaoId, editar.id, payload);
    } else {
      addParecer(solicitacaoId, payload);
    }
    onClose();
  }

  // T2.AH — Cores específicas por decisão para destaque visual.
  const DEC_VISUAL: Record<DecisaoParecer, { borda: string; bg: string; fg: string; label: string }> = {
    deferido: { borda: '#15803D', bg: '#DCFCE7', fg: '#15803D', label: 'Deferido' },
    indeferido: { borda: '#B91C1C', bg: '#FEE2E2', fg: '#B91C1C', label: 'Indeferido' },
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar parecer médico' : 'Novo parecer médico'}
      subtitle="Decisão, CIDs e observações do médico regulador."
      width="560px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!medico.trim()}
          >
            {isEdicao ? 'Salvar alterações' : 'Salvar parecer'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}
      {/* T2.AH — Decisão (segmented control com 2 opções) */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Decisão
      </label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['deferido', 'indeferido'] as DecisaoParecer[]).map((d) => {
          const v = DEC_VISUAL[d];
          const ativo = decisao === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDecisao(d)}
              className="px-3 py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                border: '1px solid ' + (ativo ? v.borda : 'var(--tfd-surface-border)'),
                background: ativo ? v.bg : 'white',
                color: ativo ? v.fg : '#475569',
                borderRadius: 8,
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Templates */}
      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => setTplOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#475569',
          }}
        >
          <Sparkles size={13} style={{ color: 'var(--tfd-blue)' }} /> Inserir modelo
        </button>
        {tplOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setTplOpen(false)} />
            <div
              className="absolute z-40 mt-1 w-full max-w-[480px] p-1.5"
              style={{
                background: 'white',
                border: '1px solid var(--tfd-surface-border)',
                borderRadius: 10,
                boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
              }}
            >
              {templatesParecer.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => aplicarTemplate(tpl.id)}
                  className="w-full text-left px-3 py-2 transition-colors hover:bg-[#F8FAFC]"
                  style={{ borderRadius: 6 }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <DecisaoBadge decisao={tpl.categoria} />
                    <span className="text-[13px] font-semibold" style={{ color: '#1A1D2B' }}>
                      {tpl.titulo}
                    </span>
                  </div>
                  <p className="text-[11px] line-clamp-2" style={{ color: '#6B7280' }}>
                    {tpl.texto}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* T2.AI — Versão CID (pills) */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Versão CID
      </label>
      <div
        className="inline-flex items-center gap-0 mb-4 p-0.5"
        style={{
          background: '#F1F5F9',
          borderRadius: 999,
        }}
      >
        {(['10', '11'] as const).map((v) => {
          const ativo = versaoCID === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVersaoCID(v)}
              className="px-3 py-1 text-[12px] font-semibold transition-colors"
              style={{
                background: ativo ? 'white' : 'transparent',
                color: ativo ? '#1A1D2B' : '#64748B',
                borderRadius: 999,
                boxShadow: ativo ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                minWidth: 64,
              }}
            >
              CID-{v}
            </button>
          );
        })}
      </div>

      {/* CIDs */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        CIDs
      </label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <input
          ref={firstInputRef}
          value={cidPrincipal}
          onChange={(e) => setCidPrincipal(e.target.value)}
          placeholder="CID principal"
          className="px-3 py-2 text-[13px]"
          style={inputStyle}
        />
        <input
          value={cidSecundario}
          onChange={(e) => setCidSecundario(e.target.value)}
          placeholder="CID secundário"
          className="px-3 py-2 text-[13px]"
          style={inputStyle}
        />
      </div>

      {/* Observação */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Observação
      </label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={5}
        placeholder="Observações do parecer..."
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      />

      {/* Médico */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Médico responsável
      </label>
      <input
        value={medico}
        onChange={(e) => setMedico(e.target.value)}
        placeholder="Nome do médico"
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      />
    </Drawer>
  );
}

function DecisaoBadge({ decisao }: { decisao: DecisaoParecer }) {
  const map = {
    deferido: { bg: '#DCFCE7', fg: '#15803D', label: 'Deferido' },
    indeferido: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Indeferido' },
  } as const;
  const c = map[decisao];
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {c.label}
    </span>
  );
}
