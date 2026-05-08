'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import {
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
}

export default function NewAjudaCustoDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addAjudaCusto, editarAjudaCusto, getById } = useFluxoV2State();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  // T2.AQ — beneficiário no formato dos passagens: "p" = paciente, "a:<id>" = acompanhante.
  const [beneficiario, setBeneficiario] = useState<string>('p');
  const [pernoiteRetorno, setPernoiteRetorno] = useState(false);

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
      } else {
        setDataInicio('');
        setDataFim('');
        setBeneficiario('p');
        setPernoiteRetorno(false);
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

  const valid = !!dataInicio && !!dataFim && !!beneficiario;

  function handleSalvar() {
    if (!valid) return;
    if (isEdicao && editar) {
      editarAjudaCusto(solicitacaoId, editar.id, {
        dataInicio,
        dataFim,
        ...beneficiarioPayload,
        pernoiteRetorno: pernoiteRetorno || undefined,
      });
    } else {
      addAjudaCusto(solicitacaoId, {
        dataInicio,
        dataFim,
        status: 'em_analise' as StatusAjuda,
        ...beneficiarioPayload,
        pernoiteRetorno: pernoiteRetorno || undefined,
      });
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

      {/* T2.AQ — Select de beneficiário (mesmo padrão de NewPassagemDrawer). */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
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
            Acompanhante — {a.nome} ({calcularIdade(a.dataNascimento)} anos) — {a.vinculo}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
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
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
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

      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
        Status inicial: <strong>em análise</strong>.
      </p>
    </Drawer>
  );
}
