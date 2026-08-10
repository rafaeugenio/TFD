'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Calculator, Hash, Lock, Info, Wallet } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { useSaldoPaciente } from '../../_state/saldoAjudaCustoStore';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import {
  STATUS_AJUDA_LABEL,
  VALOR_DIARIA_PERNOITE,
  VALOR_DIARIA_RETORNO,
  calcularValorAjuda,
  type AjudaCustoMock,
  type StatusAjuda,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';

/** PBI — Período base sem data de volta comprada (07/08/2026): 5 dias
 *  contados a partir do início (mesma convenção de `calcularValorAjuda`,
 *  onde início = fim conta 1 dia — logo início + 4 dias fecha 5 dias). */
const DIAS_PERIODO_BASE = 5;

function addDias(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição. */
  editar?: AjudaCustoMock;
  /** PBI 13237 — Acompanhamento edita pelo drawer, mas só o status é
   *  editável e salvável; os demais campos ficam somente leitura. */
  somenteStatus?: boolean;
  /** PBI — pré-preenche um lançamento novo (usado pelo complemento de
   *  "Recalcular pela volta real" quando a volta é postergada). Ignorado em
   *  modo edição. */
  prefill?: { dataInicio: string; dataFim: string; observacao?: string };
}

export default function NewAjudaCustoDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar, somenteStatus, prefill }: Props) {
  const { addAjudaCusto, editarAjudaCusto, getById, addAnexos, aplicarDebitoSaldo } = useFluxoV2State();
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const toast = useToast();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);
  const { saldo: saldoPaciente } = useSaldoPaciente(solicitacao?.paciente.id);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [fimTocadoManualmente, setFimTocadoManualmente] = useState(false);
  // T2.AQ — beneficiário no formato dos passagens: "p" = paciente, "a:<id>" = acompanhante.
  const [beneficiario, setBeneficiario] = useState<string>('p');
  const [pernoiteRetorno, setPernoiteRetorno] = useState(false);
  const [status, setStatus] = useState<StatusAjuda>('emitido');
  const [observacao, setObservacao] = useState('');
  // PBI 13218 — cada ajuda de custo abre processo próprio no SEI, distinto
  // do processo da solicitação. Ambos os campos são obrigatórios.
  const [numeroSEI, setNumeroSEI] = useState('');
  const [linkProcesso, setLinkProcesso] = useState('');
  // PBI — abatimento do saldo do paciente no pagamento (07/08/2026).
  const [abaterSaldo, setAbaterSaldo] = useState(true);

  // PBI — Período base de 5 dias quando ainda não há passagem de volta com
  // data definida. Só se aplica a lançamentos NOVOS.
  const temVoltaComprada = useMemo(
    () => (solicitacao?.viagens ?? []).some((v) => v.tipo === 'volta' && v.ativa !== false && !!v.data),
    [solicitacao],
  );
  const mostraAvisoPeriodoBase = !isEdicao && !temVoltaComprada;

  useEffect(() => {
    if (open) {
      if (editar) {
        setDataInicio(editar.dataInicio);
        setDataFim(editar.dataFim);
        setBeneficiario(
          editar.beneficiarioTipo === 'paciente'
            ? 'p'
            : `a:${editar.beneficiarioId ?? ''}`,
        );
        setPernoiteRetorno(!!editar.pernoiteRetorno);
        setStatus(editar.status);
        setObservacao(editar.observacao ?? '');
        setNumeroSEI(editar.numeroSEI ?? '');
        setLinkProcesso(editar.linkProcesso ?? '');
        setFimTocadoManualmente(true);
      } else if (prefill) {
        setDataInicio(prefill.dataInicio);
        setDataFim(prefill.dataFim);
        setBeneficiario('p');
        setPernoiteRetorno(false);
        setStatus('emitido');
        setObservacao(prefill.observacao ?? '');
        setNumeroSEI('');
        setLinkProcesso('');
        setFimTocadoManualmente(true);
      } else {
        setDataInicio('');
        setDataFim('');
        setBeneficiario('p');
        setPernoiteRetorno(false);
        setStatus('emitido');
        setObservacao('');
        setNumeroSEI('');
        setLinkProcesso('');
        setFimTocadoManualmente(false);
      }
      setAbaterSaldo(true);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar, prefill]);

  function handleDataInicioChange(value: string) {
    setDataInicio(value);
    // Sem passagem de volta comprada: sugere período base de 5 dias,
    // continua editável — só sugere se o usuário ainda não mexeu no fim.
    if (!isEdicao && !temVoltaComprada && !fimTocadoManualmente && value) {
      setDataFim(addDias(value, DIAS_PERIODO_BASE - 1));
    }
  }

  function handleDataFimChange(value: string) {
    setFimTocadoManualmente(true);
    setDataFim(value);
  }

  const beneficiarioPayload = useMemo(() => {
    if (beneficiario === 'p') {
      return { beneficiarioTipo: 'paciente' as const, beneficiarioId: undefined };
    }
    const id = beneficiario.startsWith('a:') ? beneficiario.slice(2) : beneficiario;
    return { beneficiarioTipo: 'acompanhante' as const, beneficiarioId: id };
  }, [beneficiario]);

  const calc =
    dataInicio && dataFim
      ? calcularValorAjuda(dataInicio, dataFim, pernoiteRetorno)
      : null;

  const linkProcessoInvalido =
    linkProcesso.trim().length > 0 && !/^https?:\/\//i.test(linkProcesso.trim());

  const valid =
    !!dataInicio &&
    !!dataFim &&
    !!beneficiario &&
    !!numeroSEI.trim() &&
    !!linkProcesso.trim() &&
    !linkProcessoInvalido;

  // PBI — abatimento do saldo só faz sentido no momento em que a ajuda passa
  // a ser 'concluido' (paga). Editar uma ajuda já concluída sem trocar o
  // status não reabate — o débito já foi aplicado quando ela foi concluída.
  const transicionandoParaConcluido =
    status === 'concluido' && (!isEdicao || editar?.status !== 'concluido');
  const mostraAbatimento = transicionandoParaConcluido && !somenteStatus && saldoPaciente > 0.005;
  const valorAbatido = mostraAbatimento && abaterSaldo && calc ? Math.min(saldoPaciente, calc.valor) : 0;

  function handleSalvar() {
    if (!valid) return;
    // Data de conclusão: gravada ao marcar como "Concluído". Em edição,
    // preserva a data já registrada; senão usa hoje. Limpa se sair de concluído.
    const hoje = new Date().toISOString().slice(0, 10);
    const dataConclusao = status === 'concluido'
      ? (isEdicao && editar?.status === 'concluido' && editar.dataConclusao ? editar.dataConclusao : hoje)
      : undefined;
    if (isEdicao && editar) {
      editarAjudaCusto(solicitacaoId, editar.id, {
        dataInicio,
        dataFim,
        status,
        dataConclusao,
        observacao: observacao.trim() || undefined,
        ...beneficiarioPayload,
        pernoiteRetorno: pernoiteRetorno || undefined,
        numeroSEI: numeroSEI.trim(),
        linkProcesso: linkProcesso.trim(),
      });
    } else {
      addAjudaCusto(solicitacaoId, {
        dataInicio,
        dataFim,
        status,
        dataConclusao,
        observacao: observacao.trim() || undefined,
        ...beneficiarioPayload,
        pernoiteRetorno: pernoiteRetorno || undefined,
        numeroSEI: numeroSEI.trim(),
        linkProcesso: linkProcesso.trim(),
      });
    }
    toast.success(isEdicao ? 'Ajuda de custo atualizada' : 'Ajuda de custo registrada', `${dataInicio} → ${dataFim}`);

    if (valorAbatido > 0.005 && solicitacao) {
      aplicarDebitoSaldo({
        pacienteId: solicitacao.paciente.id,
        valor: valorAbatido,
        motivo: `Abatido no pagamento da ajuda de custo de ${dataInicio} a ${dataFim} (processo ${numeroSEI.trim()}).`,
        solicitacaoDestinoNumero: solicitacao.numero,
      });
      toast.success('Saldo abatido', `${fmtBRL(valorAbatido)} descontados do saldo do paciente`);
    }

    if (anexos.length > 0) {
      addAnexos(solicitacaoId, anexos, 'ajuda_custo');
      setAnexos([]);
    }
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar período de ajuda' : 'Novo período de ajuda'}
      subtitle="Beneficiário, datas e cálculo automático."
      width="480px"
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
            {isEdicao ? 'Salvar alterações' : 'Salvar período'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      {/* Aviso do Acompanhamento — só o status pode ser alterado aqui. */}
      {somenteStatus && (
        <div
          className="flex items-start gap-3 mb-4 px-4 py-3"
          style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, color: '#475569' }}
        >
          <Lock size={16} style={{ flexShrink: 0, marginTop: 1, color: '#64748B' }} />
          <div className="text-[12.5px] leading-relaxed">
            <strong style={{ color: '#1A1D2B' }}>Somente leitura em Acompanhamento.</strong>{' '}
            Os demais campos ficam travados. Apenas o status pode ser atualizado aqui.
          </div>
        </div>
      )}

      {/* T2.AQ — Select de beneficiário (mesmo padrão de NewPassagemDrawer). */}
      <FormSection title="Beneficiário e Período" icon={<CalendarRange size={12} />} tone="primary" disabled={somenteStatus}>
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Beneficiário
      </label>
      <select
        ref={firstInputRef}
        value={beneficiario}
        onChange={(e) => setBeneficiario(e.target.value)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        {solicitacao && (
          <option value="p">
            Paciente — {solicitacao.paciente.nome} ({calcularIdade(solicitacao.paciente.dataNascimento)} anos)
          </option>
        )}
        {solicitacao?.acompanhantes.map((a) => (
          <option key={a.id} value={`a:${a.id}`}>
            {a.doador ? "Acompanhante Doador" : "Acompanhante"} — {a.nome} ({calcularIdade(a.dataNascimento)} anos) — {a.vinculo}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            Data início
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => handleDataInicioChange(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            Data fim
          </label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => handleDataFimChange(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
      </div>

      {/* PBI — Período base de 5 dias quando ainda não há volta comprada. */}
      {mostraAvisoPeriodoBase && (
        <div
          className="flex items-start gap-2 mb-4 px-3 py-2.5"
          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}
        >
          <Info size={14} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
          <span className="text-[11.5px] leading-relaxed" style={{ color: '#1E40AF' }}>
            Período base de {DIAS_PERIODO_BASE} dias. Sem data de volta comprada; recalcule quando a
            volta for emitida.
          </span>
        </div>
      )}

      {/* T2.Y — Pernoite no retorno */}
      <label
        className="flex items-start gap-2 mb-4 cursor-pointer px-3 py-2.5"
        style={{
          background: pernoiteRetorno ? '#EBF0FF' : '#F8FAFC',
          border: '1px solid ' + (pernoiteRetorno ? '#C7DAFF' : 'var(--tfd-surface-border)'),
          borderRadius: 8,
        }}
      >
        <input
          type="checkbox"
          checked={pernoiteRetorno}
          onChange={(e) => setPernoiteRetorno(e.target.checked)}
          className="mt-[3px] shrink-0"
        />
        <span className="flex-1">
          <span className="block text-[13px] font-medium" style={{ color: '#1A1D2B' }}>
            Pernoite no retorno (chegou após meia-noite)
          </span>
          <span className="block text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
            Quando o paciente chega ao destino após meia-noite no dia final,
            soma uma diária extra de {fmtBRL(VALOR_DIARIA_PERNOITE)} (regra Ata 7).
          </span>
        </span>
      </label>

      </FormSection>

      <FormSection title="Cálculo e Status" icon={<Calculator size={12} />} tone="info">
      <div
        className="p-3 mb-4"
        style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--tfd-surface-border)' }}
      >
        <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#6B7280' }}>
          Memória de cálculo
        </p>
        <p className="text-[12px] mb-1" style={{ color: '#475569' }}>
          {pernoiteRetorno ? (
            <code>
              (dias − 1) × {fmtBRL(VALOR_DIARIA_PERNOITE)} + {fmtBRL(VALOR_DIARIA_RETORNO)} +{' '}
              {fmtBRL(VALOR_DIARIA_PERNOITE)} <em>(pernoite retorno)</em>
            </code>
          ) : (
            <code>(dias − 1) × {fmtBRL(VALOR_DIARIA_PERNOITE)} + {fmtBRL(VALOR_DIARIA_RETORNO)}</code>
          )}
        </p>
        {calc ? (
          <>
            <p className="text-[14px] font-semibold" style={{ color: '#1A1D2B' }}>
              {calc.dias} dia(s) — <span style={{ color: 'var(--tfd-blue)' }}>{fmtBRL(calc.valor)}</span>
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
              Base: {fmtBRL(calc.base)}
              {calc.pernoiteRetornoExtra > 0 && (
                <> + pernoite retorno: {fmtBRL(calc.pernoiteRetornoExtra)}</>
              )}
            </p>
          </>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
            Selecione as datas para visualizar o valor.
          </p>
        )}
      </div>

      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Status
      </label>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as StatusAjuda)}
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      >
        {(Object.keys(STATUS_AJUDA_LABEL) as StatusAjuda[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_AJUDA_LABEL[s]}
          </option>
        ))}
      </select>

      <label className="block text-[12px] font-semibold mb-2 mt-4" style={{ color: '#6B7280' }}>
        Observação <span className="font-normal" style={{ color: '#94A3B8' }}>(opcional)</span>
      </label>
      <textarea
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        rows={2}
        placeholder="Ex.: complemento por remarcação da volta..."
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      />

      {/* PBI — abatimento do saldo do paciente no momento do pagamento. */}
      {mostraAbatimento && calc && (
        <div
          className="flex items-start gap-3 mt-4 px-3 py-2.5"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}
        >
          <input
            type="checkbox"
            checked={abaterSaldo}
            onChange={(e) => setAbaterSaldo(e.target.checked)}
            className="mt-[3px] shrink-0"
          />
          <label className="flex-1 cursor-pointer" onClick={() => setAbaterSaldo((v) => !v)}>
            <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: '#15803D' }}>
              <Wallet size={13} /> Saldo do paciente: {fmtBRL(saldoPaciente)}
            </span>
            <span className="block text-[11px] mt-0.5" style={{ color: '#166534' }}>
              Abater do valor desta ajuda de custo. Valor a pagar: {fmtBRL(calc.valor - valorAbatido)}
              {valorAbatido < saldoPaciente - 0.005 && ', que abate parcialmente o saldo'}.
            </span>
          </label>
        </div>
      )}
      </FormSection>

      {/* PBI 13218 — Processo SEI próprio da ajuda de custo (obrigatório). */}
      <FormSection
        title="Processo SEI"
        icon={<Hash size={12} />}
        tone="default"
        hint="Obrigatório — cada ajuda de custo abre um processo próprio no SEI."
        disabled={somenteStatus}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={numeroSEI}
            onChange={(e) => setNumeroSEI(e.target.value)}
            placeholder="Número SEI (ex.: 00100.000456/2026-12)"
            className="px-3 py-2 text-[13px] font-mono"
            style={inputStyle}
          />
          <input
            value={linkProcesso}
            onChange={(e) => setLinkProcesso(e.target.value)}
            placeholder="URL do processo (https://...)"
            className="px-3 py-2 text-[13px]"
            style={{
              background: 'white',
              border: `1px solid ${linkProcessoInvalido ? '#FCA5A5' : 'var(--tfd-surface-border)'}`,
              borderRadius: 8,
            }}
          />
        </div>
        {linkProcessoInvalido && (
          <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
            URL inválida — comece com http:// ou https://
          </p>
        )}
      </FormSection>

      <AnexosUploadField value={anexos} onChange={setAnexos} disabled={somenteStatus} />
    </Drawer>
  );
}
