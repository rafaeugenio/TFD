'use client';

import { useEffect, useRef, useState } from 'react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import {
  TIPO_PROCEDIMENTO_LABEL,
  type AgendamentoMock,
  type CarimboRegulacao,
  type TipoProcedimento,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { agendamentoConfirmado } from '../../_utils/agendamento';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  carimbo: CarimboRegulacao | null;
  /** Quando informado, drawer entra em modo remarcar e pré-preenche campos. */
  agendamentoAtual?: AgendamentoMock | null;
  snapshotPaciente?: SnapshotPacienteData;
}

export default function RegistrarAgendamentoDrawer({
  open,
  onClose,
  solicitacaoId,
  carimbo,
  agendamentoAtual,
  snapshotPaciente,
}: Props) {
  const { setAgendamento, getById } = useFluxoV2State();
  const firstInputRef = useRef<HTMLInputElement>(null);

  // T2.AM — campos do agendamento agora vivem na tentativa confirmada.
  const solic = getById(solicitacaoId);
  const confirmadaAtual = solic ? agendamentoConfirmado(solic) : undefined;
  const remarcar = !!agendamentoAtual && !!confirmadaAtual;

  const [unidade, setUnidade] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  // T2.AJ — campos adicionais (todos opcionais)
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimento | ''>('');
  const [contatoUnidade, setContatoUnidade] = useState('');
  const [observacoesChegada, setObservacoesChegada] = useState('');

  useEffect(() => {
    if (open) {
      setUnidade(confirmadaAtual?.unidade ?? '');
      setData(confirmadaAtual?.data?.slice(0, 10) ?? '');
      setHora(confirmadaAtual?.hora ?? '');
      setTipoProcedimento(confirmadaAtual?.tipoProcedimento ?? '');
      setContatoUnidade(confirmadaAtual?.contatoUnidade ?? '');
      setObservacoesChegada(confirmadaAtual?.observacoesChegada ?? '');
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmadaAtual?.id]);

  function handleSalvar() {
    if (!unidade || !data || !hora) return;
    // Mantém origem original em remarcação; em criação nova,
    // origem segue o carimbo (CNRAC/CET) — fluxo de exceção.
    const origem: AgendamentoMock['origem'] =
      agendamentoAtual?.origem ??
      (carimbo === 'CNRAC' ? 'excecao_cnrac' : 'excecao_cet');
    setAgendamento(solicitacaoId, {
      unidade,
      data,
      hora,
      origem,
      tipoProcedimento: tipoProcedimento || undefined,
      contatoUnidade: contatoUnidade || undefined,
      observacoesChegada: observacoesChegada || undefined,
    });
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={remarcar ? 'Remarcar agendamento' : 'Registrar agendamento'}
      subtitle={remarcar
        ? 'Atualize unidade, data ou horário do agendamento existente.'
        : 'Unidade que aceitou o paciente, data e horário.'}
      width="520px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!unidade || !data || !hora}
          >
            {remarcar ? 'Salvar alterações' : 'Salvar agendamento'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Unidade que aceitou
      </label>
      <input
        ref={firstInputRef}
        value={unidade}
        onChange={(e) => setUnidade(e.target.value)}
        placeholder="Ex.: Hospital A.C. Camargo"
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Data
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Hora
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
      </div>

      {/* T2.AJ — Campos adicionais opcionais, agrupados visualmente */}
      <div
        className="mt-2 pt-4"
        style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>
          Detalhes adicionais (opcionais)
        </p>

        <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
          Tipo de procedimento
        </label>
        <select
          value={tipoProcedimento}
          onChange={(e) => setTipoProcedimento(e.target.value as TipoProcedimento | '')}
          className="w-full px-3 py-2 text-[13px] mb-4"
          style={inputStyle}
        >
          <option value="">— não informado —</option>
          {(Object.keys(TIPO_PROCEDIMENTO_LABEL) as TipoProcedimento[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_PROCEDIMENTO_LABEL[t]}
            </option>
          ))}
        </select>

        <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
          Contato da unidade
        </label>
        <input
          type="tel"
          value={contatoUnidade}
          onChange={(e) => setContatoUnidade(e.target.value)}
          placeholder="(00) 0000-0000"
          className="w-full px-3 py-2 text-[13px] font-mono mb-4"
          style={inputStyle}
        />

        <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
          Observações de chegada
        </label>
        <textarea
          value={observacoesChegada}
          onChange={(e) => setObservacoesChegada(e.target.value)}
          rows={3}
          placeholder="Ex.: comparecer 1h antes, em jejum"
          className="w-full px-3 py-2 text-[13px]"
          style={inputStyle}
        />
      </div>
    </Drawer>
  );
}
