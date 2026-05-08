'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { ModalViagem, StatusViagem, ViagemMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { STATUS_VIAGEM_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

/**
 * Tipo do select. `'ida_e_volta'` é virtual: ao salvar, o provider expande
 * em duas ViagemMock independentes (T2.X). Os outros três persistem 1:1.
 */
type TipoOpcao = 'ida' | 'volta' | 'transfer' | 'ida_e_volta';

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição (sem opção de "ida e volta"). */
  editar?: ViagemMock;
}

export default function NewPassagemDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addViagem, addViagensIdaEVolta, editarViagem, getById } = useFluxoV2State();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [data, setData] = useState('');
  const [dataVolta, setDataVolta] = useState('');
  const [modal, setModal] = useState<ModalViagem>('aereo');
  const [tipo, setTipo] = useState<TipoOpcao>('ida');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState<StatusViagem>('agendada');
  // T2.AF — Beneficiário. Valor "p" = paciente; "a:<id>" = acompanhante.
  const [beneficiario, setBeneficiario] = useState<string>('p');

  useEffect(() => {
    if (open) {
      if (editar) {
        setOrigem(editar.origem);
        setDestino(editar.destino);
        setData(editar.data);
        setDataVolta('');
        setModal(editar.modal);
        setTipo(editar.tipo);
        setValor(String(editar.valor));
        setStatus(editar.status);
        setBeneficiario(
          editar.beneficiarioTipo === 'paciente'
            ? 'p'
            : `a:${editar.beneficiarioId ?? ''}`,
        );
      } else {
        setOrigem('');
        setDestino('');
        setData('');
        setDataVolta('');
        setModal('aereo');
        setTipo('ida');
        setValor('');
        setStatus('agendada');
        setBeneficiario('p');
      }
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar]);

  const isIdaEVolta = tipo === 'ida_e_volta';

  const beneficiarioPayload = useMemo(() => {
    if (beneficiario === 'p') {
      return { beneficiarioTipo: 'paciente' as const, beneficiarioId: undefined };
    }
    const id = beneficiario.startsWith('a:') ? beneficiario.slice(2) : beneficiario;
    return { beneficiarioTipo: 'acompanhante' as const, beneficiarioId: id };
  }, [beneficiario]);

  function handleSalvar() {
    if (!origem || !destino || !data || !valor) return;
    if (isEdicao && editar) {
      // T2.AL — Edição não suporta ida_e_volta (cada viagem é independente).
      editarViagem(solicitacaoId, editar.id, {
        origem,
        destino,
        data,
        modal,
        tipo: tipo as 'ida' | 'volta' | 'transfer',
        status,
        valor: Number(valor),
        ...beneficiarioPayload,
      });
      onClose();
      return;
    }
    if (isIdaEVolta) {
      if (!dataVolta) return;
      addViagensIdaEVolta(solicitacaoId, {
        origem,
        destino,
        modal,
        status,
        dataIda: data,
        dataVolta,
        valorTotal: Number(valor),
        ...beneficiarioPayload,
      });
    } else {
      addViagem(solicitacaoId, {
        origem,
        destino,
        data,
        modal,
        tipo: tipo as 'ida' | 'volta' | 'transfer',
        status,
        valor: Number(valor),
        ...beneficiarioPayload,
      });
    }
    onClose();
  }

  const valid =
    origem && destino && data && valor && (!isIdaEVolta || !!dataVolta);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar passagem' : 'Nova passagem'}
      subtitle={isIdaEVolta && !isEdicao ? 'Trecho com retorno — gera duas passagens.' : 'Trecho, modal e valor da viagem.'}
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
            disabled={!valid}
          >
            {isEdicao ? 'Salvar alterações' : isIdaEVolta ? 'Salvar (gera 2 passagens)' : 'Salvar passagem'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      {/* T2.AF — Beneficiário (obrigatório, no topo do form) */}
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
      {isIdaEVolta && (
        <p className="text-[11px] mb-3 -mt-2" style={{ color: '#94A3B8' }}>
          Ambas as passagens (ida + volta) ficam vinculadas ao mesmo beneficiário.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Origem
          </label>
          <input
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Cidade - UF"
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Destino
          </label>
          <input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Cidade - UF"
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
      </div>

      {isIdaEVolta ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                Data ida
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
                Data volta
              </label>
              <input
                type="date"
                value={dataVolta}
                onChange={(e) => setDataVolta(e.target.value)}
                className="w-full px-3 py-2 text-[13px]"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Valor total da ida e volta (R$)
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#6B7280' }}>
              O sistema criará 2 passagens separadas (ida e volta), com valor
              dividido 50/50, para permitir edições/remarcações independentes.
            </p>
          </div>
        </>
      ) : (
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
              Valor (R$)
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Modal
          </label>
          <select
            value={modal}
            onChange={(e) => setModal(e.target.value as ModalViagem)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            <option value="aereo">Aéreo</option>
            <option value="terrestre">Terrestre</option>
            <option value="fluvial">Fluvial</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOpcao)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            <option value="ida">Ida</option>
            <option value="volta">Volta</option>
            <option value="transfer">Transfer</option>
            {!isEdicao && <option value="ida_e_volta">Ida e volta</option>}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusViagem)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            {(Object.keys(STATUS_VIAGEM_LABEL) as StatusViagem[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_VIAGEM_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
        Anexo do bilhete poderá ser adicionado após salvar.
      </p>
    </Drawer>
  );
}
