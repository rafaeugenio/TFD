'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Calculator, Hash, Lock, Info, Wallet, Link2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import { useToast } from '@/shared/components/toast/Toast';
import { fmtDataBR } from '@/shared/utils/fmtData';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { useSaldoPaciente } from '../../_state/saldoAjudaCustoStore';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import {
  STATUS_AJUDA_LABEL,
  DEFAULT_VALOR_DIARIA_FINAL,
  OPCOES_VALOR_DIARIA_FINAL,
  VALOR_DIARIA_PERNOITE,
  calcularAjudaCustoTipo,
  type AjudaCustoMock,
  type StatusAjuda,
  type TipoCalculoAjuda,
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

/** Formato dos valores no controle de beneficiários: "p" = paciente,
 *  "a:<id>" = acompanhante (mesmo padrão do NewPassagemDrawer). */
function beneficiarioPayloadDoValor(valor: string) {
  if (valor === 'p') {
    return { beneficiarioTipo: 'paciente' as const, beneficiarioId: undefined };
  }
  const id = valor.startsWith('a:') ? valor.slice(2) : valor;
  return { beneficiarioTipo: 'acompanhante' as const, beneficiarioId: id };
}

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
  const { addAjudaCusto, editarAjudaCusto, getById, addAnexos, aplicarDebitoSaldo, criarCreditoSaldo } = useFluxoV2State();
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const toast = useToast();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLInputElement>(null);

  const solicitacao = getById(solicitacaoId);
  const { saldo: saldoPaciente } = useSaldoPaciente(solicitacao?.paciente.id);

  // Refinamento (11/08/2026) — o operador não escolhe mais o tipo de
  // cálculo. Ele escolhe a diária do último dia e, opcionalmente, uma ajuda
  // de referência; o sistema deduz sozinho se é padrão/integral (sem
  // referência) ou aditiva/subtrativa (com referência, comparando valores).
  const [valorDiariaFinal, setValorDiariaFinal] = useState<number>(DEFAULT_VALOR_DIARIA_FINAL.padrao);
  const [ajudaReferenciaId, setAjudaReferenciaId] = useState('');

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [fimTocadoManualmente, setFimTocadoManualmente] = useState(false);
  // T2.AQ, ampliado (11/08/2026) — multi-select de beneficiários: "p" =
  // paciente, "a:<id>" = acompanhante. Ao salvar um lançamento novo com N
  // marcados, criam-se N ajudas idênticas, uma por beneficiário.
  const [beneficiarios, setBeneficiarios] = useState<string[]>(['p']);
  const [pernoiteRetorno, setPernoiteRetorno] = useState(false);
  const [status, setStatus] = useState<StatusAjuda>('emitido');
  const [observacao, setObservacao] = useState('');
  // PBI 13218 — cada ajuda de custo pode abrir processo próprio no SEI,
  // distinto do processo da solicitação. Opcional.
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

  // Ajudas anteriores ATIVAS da mesma solicitação — base do select de
  // referência. Só períodos base (padrão/integral) entram: não há suporte a
  // encadear um ajuste sobre outro ajuste. Exclui a própria ajuda em edição.
  const ajudasAnteriores = useMemo(
    () => (solicitacao?.ajudasCusto ?? []).filter(
      (a) => a.ativa !== false && a.id !== editar?.id && (a.tipoCalculo ?? 'padrao') !== 'aditiva' && (a.tipoCalculo ?? 'padrao') !== 'subtrativa',
    ),
    [solicitacao, editar],
  );
  const ajudaReferencia = ajudasAnteriores.find((a) => a.id === ajudaReferenciaId);

  useEffect(() => {
    if (open) {
      if (editar) {
        setValorDiariaFinal(editar.valorDiariaFinal ?? DEFAULT_VALOR_DIARIA_FINAL[editar.tipoCalculo ?? 'padrao']);
        setAjudaReferenciaId(editar.ajudaReferenciaId ?? '');
        setDataInicio(editar.dataInicio);
        setDataFim(editar.dataFim);
        setBeneficiarios([
          editar.beneficiarioTipo === 'paciente' ? 'p' : `a:${editar.beneficiarioId ?? ''}`,
        ]);
        setPernoiteRetorno(!!editar.pernoiteRetorno);
        setStatus(editar.status);
        setObservacao(editar.observacao ?? '');
        setNumeroSEI(editar.numeroSEI ?? '');
        setLinkProcesso(editar.linkProcesso ?? '');
        setFimTocadoManualmente(true);
      } else if (prefill) {
        setValorDiariaFinal(DEFAULT_VALOR_DIARIA_FINAL.padrao);
        setAjudaReferenciaId('');
        setDataInicio(prefill.dataInicio);
        setDataFim(prefill.dataFim);
        setBeneficiarios(['p']);
        setPernoiteRetorno(false);
        setStatus('emitido');
        setObservacao(prefill.observacao ?? '');
        setNumeroSEI('');
        setLinkProcesso('');
        setFimTocadoManualmente(true);
      } else {
        setValorDiariaFinal(DEFAULT_VALOR_DIARIA_FINAL.padrao);
        setAjudaReferenciaId('');
        setDataInicio('');
        setDataFim('');
        setBeneficiarios(['p']);
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

  // Em edição, a ajuda já pertence a UM beneficiário — trocar a marcação
  // substitui a seleção em vez de acumular. Num lançamento novo, cada clique
  // soma ou remove do conjunto.
  function toggleBeneficiario(valor: string) {
    if (isEdicao) {
      setBeneficiarios([valor]);
      return;
    }
    setBeneficiarios((prev) =>
      prev.includes(valor) ? prev.filter((v) => v !== valor) : [...prev, valor],
    );
  }

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

  // Diária final escolhida decide a base entre 'padrao' (retorno) e
  // 'integral' (completa) — usada tanto sem referência quanto para calcular
  // o valor do novo período que entra na comparação com a referência.
  const tipoBase: TipoCalculoAjuda = valorDiariaFinal === VALOR_DIARIA_PERNOITE ? 'integral' : 'padrao';

  const calcBase =
    dataInicio && dataFim
      ? calcularAjudaCustoTipo({ tipoCalculo: tipoBase, dataInicio, dataFim, valorDiariaFinal, pernoiteRetorno })
      : null;

  const calcReferencia = ajudaReferencia
    ? calcularAjudaCustoTipo({
        tipoCalculo: (ajudaReferencia.tipoCalculo === 'aditiva' || ajudaReferencia.tipoCalculo === 'subtrativa')
          ? 'padrao'
          : (ajudaReferencia.tipoCalculo ?? 'padrao'),
        dataInicio: ajudaReferencia.dataInicio,
        dataFim: ajudaReferencia.dataFim,
        valorDiariaFinal: ajudaReferencia.valorDiariaFinal,
        pernoiteRetorno: ajudaReferencia.pernoiteRetorno,
      })
    : null;

  const diferenca = calcBase && calcReferencia ? Math.round((calcBase.valor - calcReferencia.valor) * 100) / 100 : 0;

  // Dedução automática do tipo — o operador nunca escolhe.
  const tipoDeduzido: TipoCalculoAjuda = !ajudaReferenciaId
    ? tipoBase
    : diferenca > 0.005
    ? 'aditiva'
    : diferenca < -0.005
    ? 'subtrativa'
    : tipoBase;

  const calc =
    tipoDeduzido === tipoBase
      ? calcBase
      : dataInicio && dataFim
      ? calcularAjudaCustoTipo({ tipoCalculo: tipoDeduzido, dataInicio, dataFim, valorDiariaFinal, pernoiteRetorno, ajudaReferencia })
      : null;

  // Texto discreto explicando, em linguagem do usuário, o que o sistema
  // deduziu a partir da referência escolhida.
  const refPeriodoLabel = ajudaReferencia
    ? `${fmtDataBR(ajudaReferencia.dataInicio)} → ${fmtDataBR(ajudaReferencia.dataFim)}`
    : '';
  const deducaoTexto = !ajudaReferencia
    ? null
    : tipoDeduzido === 'aditiva'
    ? `Complemento sobre a ajuda de ${refPeriodoLabel}.`
    : tipoDeduzido === 'subtrativa'
    ? `Acerto sobre a ajuda de ${refPeriodoLabel}, diferença creditada ao paciente.`
    : `Ajuste de datas sobre a ajuda de ${refPeriodoLabel}, sem diferença de valor.`;

  const linkProcessoInvalido =
    linkProcesso.trim().length > 0 && !/^https?:\/\//i.test(linkProcesso.trim());

  const valid =
    !!dataInicio &&
    !!dataFim &&
    beneficiarios.length > 0 &&
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

    const payloadBase = {
      dataInicio,
      dataFim,
      status,
      dataConclusao,
      observacao: observacao.trim() || undefined,
      pernoiteRetorno: pernoiteRetorno || undefined,
      numeroSEI: numeroSEI.trim() || undefined,
      linkProcesso: linkProcesso.trim() || undefined,
      tipoCalculo: tipoDeduzido,
      ajudaReferenciaId: ajudaReferenciaId || undefined,
      valorDiariaFinal,
    };

    if (isEdicao && editar) {
      editarAjudaCusto(solicitacaoId, editar.id, { ...payloadBase, ...beneficiarioPayloadDoValor(beneficiarios[0]) });
    } else {
      // Um beneficiário marcado = um lançamento; N marcados = N lançamentos
      // idênticos (mesmo período, diária final, status, SEI e anexos).
      beneficiarios.forEach((valor) => {
        addAjudaCusto(solicitacaoId, { ...payloadBase, ...beneficiarioPayloadDoValor(valor) });
      });
    }
    toast.success(
      isEdicao ? 'Ajuda de custo atualizada' : `Ajuda de custo registrada${beneficiarios.length > 1 ? ` (${beneficiarios.length} beneficiários)` : ''}`,
      `${dataInicio} → ${dataFim}`,
    );

    // Movimentações de saldo do paciente são únicas por lançamento (mesmo
    // quando N ajudas idênticas são criadas para N beneficiários) — o saldo é
    // sempre do paciente da solicitação, não se multiplica por beneficiário.
    if (valorAbatido > 0.005 && solicitacao) {
      aplicarDebitoSaldo({
        pacienteId: solicitacao.paciente.id,
        valor: valorAbatido,
        motivo: `Abatido no pagamento da ajuda de custo de ${dataInicio} a ${dataFim}${numeroSEI.trim() ? ` (processo ${numeroSEI.trim()})` : ''}.`,
        solicitacaoDestinoNumero: solicitacao.numero,
      });
      toast.success('Saldo abatido', `${fmtBRL(valorAbatido)} descontados do saldo do paciente`);
    }

    // Subtrativa — a diferença entre o pago e o devido pelos dias reais nunca
    // é devolvida em dinheiro, vira crédito do paciente para o próximo ciclo.
    if (tipoDeduzido === 'subtrativa' && calc?.creditoGerado && calc.creditoGerado > 0.005 && solicitacao) {
      criarCreditoSaldo({
        pacienteId: solicitacao.paciente.id,
        valor: calc.creditoGerado,
        motivo: `Ajuda subtrativa: ${calc.memoria}`,
        solicitacaoOrigemNumero: solicitacao.numero,
      });
      toast.success('Saldo creditado', `${fmtBRL(calc.creditoGerado)} para o próximo ciclo do paciente`);
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
      subtitle="Beneficiários, datas e cálculo automático."
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

      {/* Refinamento (11/08/2026) — beneficiários, agora multi-select: marcar
          mais de um cria um lançamento idêntico para cada um. */}
      <FormSection
        title="Beneficiários"
        icon={<CalendarRange size={12} />}
        tone="primary"
        disabled={somenteStatus}
        hint={isEdicao ? undefined : 'Marque mais de um para lançar o mesmo período para todos, sem repetir o preenchimento.'}
      >
      <div className="flex flex-col gap-2">
        {solicitacao && (
          <label
            className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5"
            style={{
              background: beneficiarios.includes('p') ? '#EBF0FF' : '#F8FAFC',
              border: '1px solid ' + (beneficiarios.includes('p') ? '#C7DAFF' : 'var(--tfd-surface-border)'),
              borderRadius: 8,
            }}
          >
            <input
              ref={firstInputRef}
              type="checkbox"
              checked={beneficiarios.includes('p')}
              onChange={() => toggleBeneficiario('p')}
              className="shrink-0"
            />
            <span className="text-[13px] font-medium" style={{ color: '#1A1D2B' }}>
              Paciente: {solicitacao.paciente.nome} ({calcularIdade(solicitacao.paciente.dataNascimento)} anos)
            </span>
          </label>
        )}
        {solicitacao?.acompanhantes.map((a) => {
          const valor = `a:${a.id}`;
          return (
            <label
              key={a.id}
              className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5"
              style={{
                background: beneficiarios.includes(valor) ? '#EBF0FF' : '#F8FAFC',
                border: '1px solid ' + (beneficiarios.includes(valor) ? '#C7DAFF' : 'var(--tfd-surface-border)'),
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={beneficiarios.includes(valor)}
                onChange={() => toggleBeneficiario(valor)}
                className="shrink-0"
              />
              <span className="text-[13px] font-medium" style={{ color: '#1A1D2B' }}>
                {a.doador ? "Acompanhante Doador" : "Acompanhante"}: {a.nome} ({calcularIdade(a.dataNascimento)} anos), {a.vinculo}
              </span>
            </label>
          );
        })}
      </div>
      {beneficiarios.length === 0 && (
        <p className="text-[12px] mt-2 flex items-center gap-1.5" style={{ color: '#B91C1C' }}>
          <Info size={13} /> Selecione ao menos um beneficiário.
        </p>
      )}
      </FormSection>

      <FormSection title="Ajuda de custo de referência" icon={<Link2 size={12} />} tone="primary" disabled={somenteStatus} hint="Opcional. Escolha quando este lançamento é um complemento ou um acerto sobre uma ajuda já cadastrada; o sistema deduz o tipo sozinho a partir das datas informadas abaixo.">
      {ajudasAnteriores.length > 0 ? (
        <select
          value={ajudaReferenciaId}
          onChange={(e) => setAjudaReferenciaId(e.target.value)}
          className="w-full px-3 py-2 text-[13px]"
          style={inputStyle}
        >
          <option value="">Nenhuma, lançamento novo</option>
          {ajudasAnteriores.map((a) => {
            const calcA = calcularAjudaCustoTipo({
              tipoCalculo: a.tipoCalculo ?? 'padrao',
              dataInicio: a.dataInicio,
              dataFim: a.dataFim,
              valorDiariaFinal: a.valorDiariaFinal,
              pernoiteRetorno: a.pernoiteRetorno,
            });
            return (
              <option key={a.id} value={a.id}>
                {fmtDataBR(a.dataInicio)} → {fmtDataBR(a.dataFim)} ({fmtBRL(calcA.valor)})
              </option>
            );
          })}
        </select>
      ) : (
        <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
          Nenhuma ajuda de custo anterior nesta solicitação para referenciar.
        </p>
      )}
      </FormSection>

      <FormSection title="Período e Cálculo" icon={<CalendarRange size={12} />} tone="primary" disabled={somenteStatus}>
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
            min={dataInicio || undefined}
            onChange={(e) => handleDataFimChange(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Refinamento (11/08/2026) — diária do último dia, configurável em
          qualquer lançamento. É essa escolha, e não mais um seletor de tipo,
          que decide o valor do último dia do período. */}
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Diária do último dia
      </label>
      <div className="flex gap-2 mb-4">
        {OPCOES_VALOR_DIARIA_FINAL.map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => setValorDiariaFinal(op.valor)}
            className="flex-1 px-3 py-2 text-[12.5px] font-medium text-left"
            style={{
              borderRadius: 8,
              border: '1px solid ' + (valorDiariaFinal === op.valor ? '#C7DAFF' : 'var(--tfd-surface-border)'),
              background: valorDiariaFinal === op.valor ? '#EBF0FF' : 'white',
              color: valorDiariaFinal === op.valor ? 'var(--tfd-blue-700)' : '#475569',
            }}
          >
            {op.label}
          </button>
        ))}
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

      {/* T2.Y — Pernoite no retorno. */}
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

      <div
        className="p-3"
        style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--tfd-surface-border)' }}
      >
        <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#6B7280' }}>
          Memória de cálculo
        </p>
        {calc ? (
          <>
            <p className="text-[14px] font-semibold" style={{ color: '#1A1D2B' }}>
              {calc.dias} dia(s) — <span style={{ color: 'var(--tfd-blue)' }}>{fmtBRL(calc.valor)}</span>
            </p>
            <p className="text-[11px] mt-1 font-mono" style={{ color: '#6B7280' }}>{calc.memoria}</p>
            {deducaoTexto && (
              <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>{deducaoTexto}</p>
            )}
          </>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
            Selecione as datas para visualizar o valor.
          </p>
        )}
      </div>

      {/* Subtrativa deduzida — resumo pago × devido × diferença que vira saldo. */}
      {tipoDeduzido === 'subtrativa' && calc && calc.valorPago !== undefined && calc.valorDevido !== undefined && (
        <div
          className="flex items-start gap-3 mt-4 px-3 py-2.5"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8 }}
        >
          <Wallet size={15} style={{ color: '#15803D', flexShrink: 0, marginTop: 1 }} />
          <div className="text-[12px]" style={{ color: '#15803D' }}>
            <p>Valor pago na referência: <strong>{fmtBRL(calc.valorPago)}</strong></p>
            <p>Valor devido pelo período real: <strong>{fmtBRL(calc.valorDevido)}</strong></p>
            <p className="mt-1">
              Diferença de <strong>{fmtBRL(calc.creditoGerado ?? 0)}</strong> vira saldo do paciente
              para o próximo ciclo, sem devolução em dinheiro.
            </p>
          </div>
        </div>
      )}
      </FormSection>

      <FormSection title="Status" icon={<Calculator size={12} />} tone="info">
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

      {/* PBI 13218 — Processo SEI próprio da ajuda de custo (opcional). */}
      <FormSection
        title="Processo SEI"
        icon={<Hash size={12} />}
        tone="default"
        hint="Opcional — cada ajuda de custo pode abrir um processo próprio no SEI."
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
