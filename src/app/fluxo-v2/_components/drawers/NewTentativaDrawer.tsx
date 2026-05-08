'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import {
  DESFECHO_TENTATIVA_LABEL,
  TIPO_PROCEDIMENTO_LABEL,
  type DesfechoTentativa,
  type TentativaUnidadeMock,
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
  /** T2.AL — Quando informado, drawer entra em modo edição. */
  editar?: TentativaUnidadeMock;
}

const DESFECHOS_ORDENADOS: DesfechoTentativa[] = [
  'pendente',
  'negou',
  'pediu_documento',
  'aceitou',
  'sem_resposta',
  'agendamento_confirmado',
];

export default function NewTentativaDrawer({ open, onClose, solicitacaoId, editar }: Props) {
  const { addTentativa, editarTentativa, getById } = useFluxoV2State();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [unidade, setUnidade] = useState('');
  const [data, setData] = useState('');
  const [desfecho, setDesfecho] = useState<DesfechoTentativa>('pendente');
  const [hora, setHora] = useState('');
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimento | ''>('');
  const [contatoUnidade, setContatoUnidade] = useState('');
  const [observacoesChegada, setObservacoesChegada] = useState('');
  const [obs, setObs] = useState('');
  const [forcarSubstituicao, setForcarSubstituicao] = useState(false);

  const isEdicao = !!editar;
  const solic = getById(solicitacaoId);
  const confirmadaAtual = solic ? agendamentoConfirmado(solic) : undefined;

  useEffect(() => {
    if (!open) return;
    if (editar) {
      setUnidade(editar.unidade);
      // Date input usa só YYYY-MM-DD; aceita ISO datetime cortando.
      setData(editar.data?.slice(0, 10) ?? '');
      setDesfecho(editar.desfecho);
      setHora(editar.hora ?? '');
      setTipoProcedimento(editar.tipoProcedimento ?? '');
      setContatoUnidade(editar.contatoUnidade ?? '');
      setObservacoesChegada(editar.observacoesChegada ?? '');
      setObs(editar.observacao ?? '');
    } else {
      setUnidade('');
      setData('');
      setDesfecho('pendente');
      setHora('');
      setTipoProcedimento('');
      setContatoUnidade('');
      setObservacoesChegada('');
      setObs('');
    }
    setForcarSubstituicao(false);
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [open, editar]);

  const isConfirmacao = desfecho === 'agendamento_confirmado';

  // Há uma OUTRA tentativa confirmada nessa solicitação? (ignora a própria, em edição)
  const conflitoConfirmacao = useMemo(() => {
    if (!isConfirmacao || !confirmadaAtual) return null;
    if (editar && confirmadaAtual.id === editar.id) return null;
    return confirmadaAtual;
  }, [isConfirmacao, confirmadaAtual, editar]);

  const valido =
    unidade.trim().length > 0 &&
    data.length > 0 &&
    (!isConfirmacao || hora.length > 0) &&
    (!conflitoConfirmacao || forcarSubstituicao);

  function handleSalvar() {
    if (!valido) return;
    const payload = {
      unidade: unidade.trim(),
      data,
      desfecho,
      observacao: obs.trim() || undefined,
      hora: isConfirmacao ? hora : undefined,
      tipoProcedimento: isConfirmacao ? (tipoProcedimento || undefined) : undefined,
      contatoUnidade: isConfirmacao ? (contatoUnidade.trim() || undefined) : undefined,
      observacoesChegada: isConfirmacao ? (observacoesChegada.trim() || undefined) : undefined,
    };
    if (isEdicao && editar) {
      editarTentativa(solicitacaoId, editar.id, payload);
    } else {
      addTentativa(solicitacaoId, payload);
    }
    onClose();
  }

  const titulo = isEdicao ? 'Editar tentativa' : 'Nova tentativa';
  const subtitulo = isEdicao
    ? 'Atualize unidade, desfecho ou detalhes do agendamento.'
    : 'Registre o contato com a unidade — e quando ela aceitar, marque como agendamento confirmado.';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={subtitulo}
      width="540px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!valido}
          >
            {isEdicao
              ? 'Salvar alterações'
              : isConfirmacao && conflitoConfirmacao && forcarSubstituicao
                ? 'Confirmar e substituir'
                : 'Salvar tentativa'}
          </button>
        </>
      }
    >
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Unidade contatada
      </label>
      <input
        ref={firstInputRef}
        value={unidade}
        onChange={(e) => setUnidade(e.target.value)}
        placeholder="Ex.: Hospital de Base"
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      />

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Data da tentativa
      </label>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      />

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Desfecho
      </label>
      <select
        value={desfecho}
        onChange={(e) => setDesfecho(e.target.value as DesfechoTentativa)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        {DESFECHOS_ORDENADOS.map((d) => (
          <option key={d} value={d}>
            {DESFECHO_TENTATIVA_LABEL[d]}
          </option>
        ))}
      </select>

      {isConfirmacao && (
        <div
          className="mb-4 px-4 py-3"
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 10,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} style={{ color: '#15803D' }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#15803D', letterSpacing: '0.06em' }}>
              Detalhes do agendamento
            </span>
          </div>

          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Hora
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full px-3 py-2 text-[13px] mb-4"
            style={inputStyle}
          />

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
      )}

      {/* Aviso de substituição */}
      {conflitoConfirmacao && (
        <div
          className="mb-4 px-3 py-3 flex items-start gap-2.5"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: 10,
            color: '#78350F',
          }}
        >
          <AlertTriangle size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 text-[12.5px] leading-relaxed">
            <strong style={{ color: '#92400E' }}>Já existe um agendamento confirmado</strong>
            {' em '}
            <strong>{conflitoConfirmacao.unidade}</strong>.
            <br />
            Salvar isso vai mover o agendamento confirmado para esta tentativa — a anterior volta para
            o desfecho <em>Aceitou</em>.
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forcarSubstituicao}
                onChange={(e) => setForcarSubstituicao(e.target.checked)}
              />
              <span className="text-[12px] font-medium" style={{ color: '#92400E' }}>
                Sim, substituir o agendamento confirmado.
              </span>
            </label>
          </div>
        </div>
      )}

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Observação
      </label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={3}
        placeholder="Detalhes da tentativa..."
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      />
    </Drawer>
  );
}
