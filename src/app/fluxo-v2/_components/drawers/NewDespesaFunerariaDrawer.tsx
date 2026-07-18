'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, X, FileText, DollarSign } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
}

export default function NewDespesaFunerariaDrawer({ open, onClose, solicitacaoId }: Props) {
  const { addDespesaFuneraria } = useFluxoV2State();
  const toast = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [valor, setValor] = useState('');
  const [anexoNome, setAnexoNome] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescricao('');
      setData('');
      setValor('');
      setAnexoNome(null);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open]);

  const valid = descricao.trim().length > 0 && data.length > 0 && Number(valor) > 0;

  function handleAnexoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAnexoNome(file.name);
    e.target.value = '';
  }

  function handleSalvar() {
    if (!valid) return;
    addDespesaFuneraria(solicitacaoId, {
      descricao: descricao.trim(),
      data,
      valor: Number(valor),
      anexoNome: anexoNome ?? undefined,
    });
    toast.success('Despesa de funerária registrada', descricao.trim());
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova despesa de funerária"
      subtitle="Registre um custo de funerária: transporte do corpo, urna, translado, etc."
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
            Salvar despesa
          </button>
        </>
      }
    >
      <FormSection title="Descrição da despesa" icon={<FileText size={12} />} tone="primary">
        <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
          Descrição
        </label>
        <input
          ref={firstInputRef}
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Transporte, Urna, Translado"
          className="w-full px-3 py-2 text-[13px] mb-1"
          style={inputStyle}
        />
        <p className="text-[11px] mb-4" style={{ color: '#9CA3AF' }}>
          Identifique o item: transporte do corpo, urna, translado, etc.
        </p>
      </FormSection>

      <FormSection title="Pagamento" icon={<DollarSign size={12} />} tone="success">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
              Data do gasto
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
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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

        <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
          Comprovante/recibo da despesa (opcional)
        </p>
      </FormSection>
    </Drawer>
  );
}
