'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { AdicionalMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { listarPorCategoria } from '@/services/tabelas-auxiliares.service';

interface TipoDespesaRow { codigo: string; nome: string }

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
  const { addAdicional, editarAdicional } = useFluxoV2State();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLTextAreaElement>(null);

  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [valor, setValor] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | null>(null);
  const [tipoDespesa, setTipoDespesa] = useState('');
  const [tiposDespesa, setTiposDespesa] = useState<TipoDespesaRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listarPorCategoria('tipo_despesa').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[NewAdicionalDrawer] tipo_despesa:', error.message);
        return;
      }
      setTiposDespesa(((data ?? []) as unknown as TipoDespesaRow[]));
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open) {
      if (editar) {
        setDescricao(editar.descricao);
        setData(editar.data);
        setValor(String(editar.valor));
        setAnexoNome(editar.documentoUrl?.replace(/^mock:\/\//, '') ?? null);
        setTipoDespesa(editar.tipoDespesa ?? '');
      } else {
        setDescricao('');
        setData('');
        setValor('');
        setAnexoNome(null);
        setTipoDespesa('');
      }
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar]);

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
      });
    }
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
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Descrição
      </label>
      <textarea
        ref={firstInputRef}
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-[13px] mb-1"
        style={inputStyle}
      />
      <p className="text-[11px] mb-4" style={{ color: '#9CA3AF' }}>
        Descreva o item: transfer extra, bagagem despachada, corrida de Uber, etc.
      </p>

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Tipo de despesa
      </label>
      <select
        value={tipoDespesa}
        onChange={(e) => setTipoDespesa(e.target.value)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        <option value="">Selecione...</option>
        {tiposDespesa.map((t) => (
          <option key={t.codigo} value={t.codigo}>{t.nome}</option>
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
