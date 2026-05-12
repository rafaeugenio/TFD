'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import {
  type AgendamentoMock,
  type CarimboRegulacao,
  type TipoProcedimento,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { agendamentoConfirmado } from '../../_utils/agendamento';
import { useTiposProcedimento } from '@/shared/hooks/useTiposProcedimento';
import { listarUnidadesSaude } from '@/services/unidades-saude.service';

interface UnidadeRow {
  id: string;
  nome: string;
  cnes: string | null;
  cidade: string;
  uf: string;
}

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
  const firstInputRef = useRef<HTMLSelectElement>(null);
  const { tipos: tiposProcedimento, loading: tiposLoading } = useTiposProcedimento();

  // T2.AM — campos do agendamento agora vivem na tentativa confirmada.
  const solic = getById(solicitacaoId);
  const confirmadaAtual = solic ? agendamentoConfirmado(solic) : undefined;
  const remarcar = !!agendamentoAtual && !!confirmadaAtual;

  const [unidadeId, setUnidadeId] = useState('');
  const [unidades, setUnidades] = useState<UnidadeRow[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  // T2.AJ — campos adicionais (todos opcionais)
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimento | ''>('');
  const [contatoUnidade, setContatoUnidade] = useState('');
  const [observacoesChegada, setObservacoesChegada] = useState('');

  // Carrega unidades do banco quando o drawer abre
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUnidades(true);
    listarUnidadesSaude({ pageSize: 9999 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[RegistrarAgendamento] erro unidades:', error.message);
      setUnidades(((data ?? []) as unknown as UnidadeRow[]).filter((u) => u.nome));
      setLoadingUnidades(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      // Tenta resolver o nome legado armazenado em confirmadaAtual.unidade -> id
      const nomeAtual = confirmadaAtual?.unidade ?? '';
      const match = unidades.find(
        (u) =>
          nomeAtual.startsWith(u.nome) ||
          (u.cnes && nomeAtual.includes(u.cnes)),
      );
      setUnidadeId(match?.id ?? '');
      setData(confirmadaAtual?.data?.slice(0, 10) ?? '');
      setHora(confirmadaAtual?.hora ?? '');
      setTipoProcedimento(confirmadaAtual?.tipoProcedimento ?? '');
      setContatoUnidade(confirmadaAtual?.contatoUnidade ?? '');
      setObservacoesChegada(confirmadaAtual?.observacoesChegada ?? '');
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmadaAtual?.id, unidades]);

  const unidadeSelecionada = unidades.find((u) => u.id === unidadeId);

  function handleSalvar() {
    if (!unidadeSelecionada || !data || !hora) return;
    // Mantém origem original em remarcação; em criação nova,
    // origem segue o carimbo (CNRAC/CET) — fluxo de exceção.
    const origem: AgendamentoMock['origem'] =
      agendamentoAtual?.origem ??
      (carimbo === 'CNRAC' ? 'excecao_cnrac' : 'excecao_cet');
    const unidadeNome = `${unidadeSelecionada.nome}${
      unidadeSelecionada.cnes ? ` (CNES ${unidadeSelecionada.cnes})` : ''
    }`;
    setAgendamento(solicitacaoId, {
      unidade: unidadeNome,
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
            disabled={!unidadeId || !data || !hora}
          >
            {remarcar ? 'Salvar alterações' : 'Salvar agendamento'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
          Unidade que aceitou
        </label>
        <a
          href="/unidades-saude"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] inline-flex items-center gap-1 hover:underline"
          style={{ color: 'var(--tfd-blue)' }}
        >
          <ExternalLink size={11} />
          Cadastrar nova unidade
        </a>
      </div>
      <select
        ref={firstInputRef}
        value={unidadeId}
        onChange={(e) => setUnidadeId(e.target.value)}
        disabled={loadingUnidades}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        <option value="">
          {loadingUnidades
            ? 'Carregando unidades...'
            : unidades.length === 0
              ? 'Nenhuma unidade cadastrada — cadastre uma primeiro'
              : 'Selecione a unidade de saúde...'}
        </option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
            {u.cnes ? ` — CNES ${u.cnes}` : ''}
            {u.cidade ? ` (${u.cidade}${u.uf ? `/${u.uf}` : ''})` : ''}
          </option>
        ))}
      </select>

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
          disabled={tiposLoading}
        >
          <option value="">{tiposLoading ? 'Carregando...' : '— não informado —'}</option>
          {tiposProcedimento.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.nome}
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
