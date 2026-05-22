'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Stamp, MessageSquare } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import StatusDot, { type StatusDotTone } from '../StatusDot';
import {
  type CarimboRegulacao,
  type CarimboOutrosInfo,
} from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  open: boolean;
  onClose: () => void;
  carimboAtual?: CarimboRegulacao;
  observacaoAtual?: string;
  outrosInfoAtual?: CarimboOutrosInfo;
  onSalvar: (
    carimbo: CarimboRegulacao,
    observacao?: string,
    outrosInfo?: CarimboOutrosInfo,
  ) => void;
  snapshotPaciente?: SnapshotPacienteData;
  /** Quando informado, permite anexar documentos ligados ao carimbo. */
  solicitacaoId?: string;
}

interface CarimboOption {
  value: CarimboRegulacao;
  label: string;
  desc: string;
  tone: StatusDotTone;
  abrev: string;
}

/**
 * Opções de carimbo. Aprovação direta + 3 exceções (CNRAC, CET, SAAS) +
 * "Agendamento" (contato manual via tentativas — antigo "OUTROS"). As cores
 * semânticas aparecem só como acento via StatusDot.
 */
const OPTIONS: CarimboOption[] = [
  {
    value: 'APROVADO_DIRETO',
    abrev: 'APR',
    label: 'Aprovado direto',
    desc: 'Solicitação segue sem encaminhamento de exceção.',
    tone: 'success',
  },
  {
    value: 'CNRAC',
    abrev: 'CNRAC',
    label: 'CNRAC',
    desc: 'Central Nacional de Regulação — alta complexidade fora do estado.',
    tone: 'info',
  },
  {
    value: 'CET',
    abrev: 'CET',
    label: 'CET',
    desc: 'Central Estadual de Tratamento — busca de vaga via central estadual.',
    tone: 'info',
  },
  {
    value: 'SAAS',
    abrev: 'SAAS',
    label: 'SAAS',
    desc: 'Encaminhamento via SAAS — caso de exceção.',
    tone: 'info',
  },
  {
    value: 'AGENDAMENTO',
    abrev: 'AGND',
    label: 'Agendamento',
    desc: 'A regulação fará os agendamentos e as tentativas manualmente até obter resposta.',
    tone: 'warning',
  },
];

export default function CarimboRegulacaoDrawer({
  open,
  onClose,
  carimboAtual,
  observacaoAtual,
  outrosInfoAtual,
  onSalvar,
  snapshotPaciente,
  solicitacaoId,
}: Props) {
  const { addAnexos } = useFluxoV2State();
  const [selecionado, setSelecionado] = useState<CarimboRegulacao | undefined>(carimboAtual);
  const [observacao, setObservacao] = useState(observacaoAtual ?? '');
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);

  useEffect(() => {
    if (open) {
      setSelecionado(carimboAtual);
      setObservacao(observacaoAtual ?? '');
    }
  }, [open, carimboAtual, observacaoAtual]);

  // Mantemos `outrosInfoAtual` por compatibilidade com chamadas existentes,
  // mas a UI atual não edita esses campos (movidos para tentativas).
  void outrosInfoAtual;

  const editando = !!carimboAtual;
  const exigeAgendamento =
    selecionado === 'CNRAC' ||
    selecionado === 'CET' ||
    selecionado === 'SAAS' ||
    selecionado === 'AGENDAMENTO';
  // Os detalhes do contato vivem em Agendamentos & tentativas.
  const valid = !!selecionado;

  function handleSalvar() {
    if (!selecionado) return;
    onSalvar(
      selecionado,
      observacao.trim() ? observacao.trim() : undefined,
      undefined,
    );
    if (solicitacaoId && anexos.length > 0) {
      addAnexos(solicitacaoId, anexos, 'carimbo');
      setAnexos([]);
    }
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editando ? 'Editar carimbo de regulação' : 'Definir carimbo de regulação'}
      subtitle="Selecione o encaminhamento dado pela regulação para esta solicitação."
      width="500px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!valid}
          >
            Salvar carimbo
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}
      <FormSection title="Encaminhamento" icon={<Stamp size={12} />} tone="primary">
      <label
        className="block text-[12px] font-semibold mb-2"
        style={{ color: '#6B7280' }}
      >
        Encaminhamento
      </label>
      <div className="flex flex-col gap-2 mb-5">
        {OPTIONS.map((opt) => {
          const active = selecionado === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelecionado(opt.value)}
              className="text-left px-3 py-3 transition-colors"
              style={{
                background: active ? '#F8FAFC' : 'white',
                border: '1px solid ' + (active ? '#146BFA' : 'var(--tfd-surface-border)'),
                boxShadow: active ? '0 0 0 3px rgba(20,107,250,0.10)' : 'none',
                borderRadius: 10,
              }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="inline-flex items-center justify-center shrink-0 mt-[2px] text-[10.5px] font-bold uppercase tracking-wider"
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                    minWidth: 32,
                    height: 22,
                    padding: '0 8px',
                    borderRadius: 4,
                    letterSpacing: '0.06em',
                  }}
                >
                  {opt.abrev}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: '#1A1D2B' }}
                    >
                      {opt.label}
                    </span>
                    <StatusDot tone={opt.tone}>
                      {opt.value === 'APROVADO_DIRETO'
                        ? 'Aprovação'
                        : opt.value === 'AGENDAMENTO'
                          ? 'Manual'
                          : 'Exceção'}
                    </StatusDot>
                    {active && <CheckCircle2 size={14} style={{ color: '#146BFA' }} />}
                  </div>
                  <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: '#6B7280' }}>
                    {opt.desc}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {exigeAgendamento && (
        <div
          className="mb-5 p-3 text-[12px]"
          style={{
            background: '#FBFCFE',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#475569',
          }}
        >
          Os detalhes do contato com a unidade ficam registrados em{' '}
          <strong>Agendamentos &amp; tentativas</strong>.
        </div>
      )}
      </FormSection>

      <FormSection title="Observação" icon={<MessageSquare size={12} />} tone="info">
      <label
        className="block text-[12px] font-semibold mb-2"
        style={{ color: '#6B7280' }}
      >
        Observação geral <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
      </label>
      <textarea
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        rows={4}
        placeholder="Ex.: encaminhamento via CNRAC por alta complexidade oncológica."
        className="w-full px-3 py-2 text-[13px]"
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8,
        }}
      />
      </FormSection>

      {solicitacaoId && <AnexosUploadField value={anexos} onChange={setAnexos} />}
    </Drawer>
  );
}
