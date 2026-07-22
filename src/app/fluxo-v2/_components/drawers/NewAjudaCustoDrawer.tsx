'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Calculator, Hash, Lock } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
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
}

export default function NewAjudaCustoDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar, somenteStatus }: Props) {
  const { addAjudaCusto, editarAjudaCusto, getById, addAnexos } = useFluxoV2State();
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const toast = useToast();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  // T2.AQ — beneficiário no formato dos passagens: "p" = paciente, "a:<id>" = acompanhante.
  const [beneficiario, setBeneficiario] = useState<string>('p');
  const [pernoiteRetorno, setPernoiteRetorno] = useState(false);
  const [status, setStatus] = useState<StatusAjuda>('emitido');
  // PBI 13218 — cada ajuda de custo abre processo próprio no SEI, distinto
  // do processo da solicitação. Ambos os campos são obrigatórios.
  const [numeroSEI, setNumeroSEI] = useState('');
  const [linkProcesso, setLinkProcesso] = useState('');

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
        setNumeroSEI(editar.numeroSEI ?? '');
        setLinkProcesso(editar.linkProcesso ?? '');
      } else {
        setDataInicio('');
        setDataFim('');
        setBeneficiario('p');
        setPernoiteRetorno(false);
        setStatus('emitido');
        setNumeroSEI('');
        setLinkProcesso('');
      }
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar]);

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
        ...beneficiarioPayload,
        pernoiteRetorno: pernoiteRetorno || undefined,
        numeroSEI: numeroSEI.trim(),
        linkProcesso: linkProcesso.trim(),
      });
    }
    toast.success(isEdicao ? 'Ajuda de custo atualizada' : 'Ajuda de custo registrada', `${dataInicio} → ${dataFim}`);
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
            Os demais campos ficam travados — apenas o status pode ser atualizado aqui.
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
            onChange={(e) => setDataInicio(e.target.value)}
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
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
      </div>

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
