'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { AdicionalMock } from '@/core/mocks/fluxo-v2-v3-seed';
import AuxSelectInline from '@/shared/components/aux-select-inline/AuxSelectInline';
import { calcularIdade } from '@/shared/utils/idade';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição. */
  editar?: AdicionalMock;
}

export default function NewAdicionalDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addAdicional, editarAdicional, getById } = useFluxoV2State();
  const toast = useToast();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [valor, setValor] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [tipoDespesa, setTipoDespesa] = useState('');
  /** Beneficiário. "p" = paciente; "a:<id>" = acompanhante específico. */
  const [beneficiario, setBeneficiario] = useState<string>('p');
  /** Vínculo opcional com uma passagem da solicitação. */
  const [viagemId, setViagemId] = useState<string>('');

  useEffect(() => {
    if (open) {
      if (editar) {
        setDescricao(editar.descricao);
        setData(editar.data);
        setValor(String(editar.valor));
        setAnexoNome(editar.documentoUrl?.replace(/^mock:\/\//, '') ?? null);
        setTipoDespesa(editar.tipoDespesa ?? '');
        setBeneficiario(
          editar.beneficiarioTipo === 'acompanhante'
            ? `a:${editar.beneficiarioId ?? ''}`
            : 'p',
        );
        setViagemId(editar.viagemId ?? '');
      } else {
        setDescricao('');
        setData('');
        setValor('');
        setAnexoNome(null);
        setTipoDespesa('');
        setBeneficiario('p');
        setViagemId('');
      }
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar]);

  const isAjudaCusto = solicitacao?.tipoSolicitacao === 'ajuda_custo';

  /** Viagens da solicitação (todas), ordenadas: aéreas primeiro, depois por data.
   *  Exclui viagens canceladas/reembolso — não faz sentido vincular adicional a elas. */
  const viagensDisponiveis = useMemo(() => {
    const lista = (solicitacao?.viagens ?? []).filter(
      (v) => !['cancelada', 'reembolso'].includes(v.status),
    );
    return [...lista].sort((a, b) => {
      const aAereo = a.modal === 'aereo' ? 0 : 1;
      const bAereo = b.modal === 'aereo' ? 0 : 1;
      if (aAereo !== bAereo) return aAereo - bAereo;
      return a.data.localeCompare(b.data);
    });
  }, [solicitacao]);

  const fmtDataBR = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };

  const MODAL_LABEL: Record<string, string> = {
    aereo: 'Aéreo',
    terrestre: 'Terrestre',
    fluvial: 'Fluvial',
  };

  const beneficiarioPayload = useMemo(() => {
    if (beneficiario === 'p') {
      return { beneficiarioTipo: 'paciente' as const, beneficiarioId: undefined };
    }
    const id = beneficiario.startsWith('a:') ? beneficiario.slice(2) : beneficiario;
    return { beneficiarioTipo: 'acompanhante' as const, beneficiarioId: id };
  }, [beneficiario]);

  const valid = descricao.trim().length > 0 && data.length > 0 && Number(valor) > 0;

  function handleAnexoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAnexoNome(file.name);
    e.target.value = '';
  }

  function handleSalvar() {
    if (!valid) return;
    if (isEdicao && editar) {
      editarAdicional(solicitacaoId, editar.id, {
        descricao: descricao.trim(),
        data,
        valor: Number(valor),
        documentoUrl: anexoNome ? `mock://${anexoNome}` : undefined,
        tipoDespesa: tipoDespesa || undefined,
        viagemId: isAjudaCusto ? undefined : (viagemId || undefined),
        ...beneficiarioPayload,
      });
    } else {
      addAdicional(solicitacaoId, {
        categoria: 'outro',
        descricao: descricao.trim(),
        data,
        valor: Number(valor),
        status: 'pendente_aprovacao',
        documentoUrl: anexoNome ? `mock://${anexoNome}` : undefined,
        tipoDespesa: tipoDespesa || undefined,
        viagemId: isAjudaCusto ? undefined : (viagemId || undefined),
        ...beneficiarioPayload,
      });
    }
    toast.success(isEdicao ? 'Adicional atualizado' : 'Adicional registrado', descricao.trim());
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar adicional' : 'Novo adicional'}
      subtitle="Registre um item extra: transfer, bagagem, corrida de Uber, etc."
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
            {isEdicao ? 'Salvar alterações' : 'Salvar adicional'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      {/* Beneficiário — mesmo padrão de NewPassagemDrawer / NewAjudaCustoDrawer */}
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

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Descrição
      </label>
      <textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-[13px] mb-1"
        style={inputStyle}
      />
      <p className="text-[11px] mb-4" style={{ color: '#9CA3AF' }}>
        Descreva o item: transfer extra, bagagem despachada, corrida de Uber, etc.
      </p>

      <AuxSelectInline
        categoria="tipo_despesa"
        label="Tipo de despesa"
        value={tipoDespesa}
        onChange={setTipoDespesa}
        className="mb-4"
      />

      {!isAjudaCusto && (
        <>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Vincular a passagem
          </label>
          <select
            value={viagemId}
            onChange={(e) => setViagemId(e.target.value)}
            className="w-full px-3 py-2 text-[13px] mb-1"
            style={inputStyle}
            disabled={viagensDisponiveis.length === 0}
          >
            <option value="">Sem vínculo</option>
            {viagensDisponiveis.map((v) => {
              const origem = v.origem.split(' - ')[0];
              const destino = v.destino.split(' - ')[0];
              const modal = MODAL_LABEL[v.modal] ?? v.modal;
              return (
                <option key={v.id} value={v.id}>
                  {modal} · {origem} → {destino} · {fmtDataBR(v.data)}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] mb-4" style={{ color: '#9CA3AF' }}>
            {viagensDisponiveis.length === 0
              ? 'Nenhuma passagem cadastrada nesta solicitação.'
              : 'Quando vinculado, o valor é somado à passagem nos relatórios. Aéreas listadas primeiro.'}
          </p>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Data de pagamento
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
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
      </div>

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Anexo
      </label>
      {anexoNome ? (
        <div
          className="flex items-center gap-2 px-3 py-2 mb-1 text-[12px]"
          style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
        >
          <Paperclip size={14} style={{ color: '#475569' }} />
          <span className="flex-1 truncate" style={{ color: '#1A1D2B' }}>{anexoNome}</span>
          <button
            type="button"
            onClick={() => setAnexoNome(null)}
            className="inline-flex items-center justify-center"
            style={{ color: '#9CA3AF' }}
            aria-label="Remover anexo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          className="flex items-center gap-2 px-3 py-2 mb-1 text-[12px] cursor-pointer"
          style={{ background: 'white', border: '1px dashed var(--tfd-surface-border)', borderRadius: 8, color: '#6B7280' }}
        >
          <Paperclip size={14} />
          <span>Selecionar arquivo</span>
          <input type="file" className="hidden" onChange={handleAnexoChange} />
        </label>
      )}
      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
        Comprovante (opcional)
      </p>
    </Drawer>
  );
}
