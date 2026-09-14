'use client';

import { useEffect, useState } from 'react';
import { Home, Building2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { useUnidadesDestino } from '@/shared/hooks/useLookup';
import { criarCasaApoio, editarCasaApoio } from '@/app/fluxo-v2/_state/servicoSocialStore';
import type { CasaApoioMock } from '@/core/mocks/servico-social-seed';

interface Props {
  open: boolean;
  /** `null` cria uma casa nova. */
  casa: CasaApoioMock | null;
  onClose: () => void;
}

const VAZIO = {
  nome: '',
  endereco: '',
  cidadeUf: '',
  contato: '',
  responsavel: '',
  ativa: true,
  unidadeVinculadaId: '',
};

/**
 * Cadastro e edição de casa de apoio. A exclusão não faz parte do escopo do
 * protótipo: para tirar de uso, a casa é marcada como inativa e continua
 * aparecendo no histórico de encaminhamentos.
 */
export default function CasaApoioDrawer({ open, casa, onClose }: Props) {
  const { options: unidades } = useUnidadesDestino();
  const [form, setForm] = useState({ ...VAZIO });

  useEffect(() => {
    if (!open) return;
    setForm(
      casa
        ? {
            nome: casa.nome,
            endereco: casa.endereco,
            cidadeUf: casa.cidadeUf ?? '',
            contato: casa.contato,
            responsavel: casa.responsavel,
            ativa: casa.ativa,
            unidadeVinculadaId: casa.unidadeVinculadaId ?? '',
          }
        : { ...VAZIO },
    );
  }, [open, casa]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const valido =
    form.nome.trim() !== '' &&
    form.endereco.trim() !== '' &&
    form.contato.trim() !== '' &&
    form.responsavel.trim() !== '';

  function salvar() {
    if (!valido) return;
    const unidade = unidades.find((u) => u.value === form.unidadeVinculadaId);
    const payload = {
      nome: form.nome.trim(),
      endereco: form.endereco.trim(),
      cidadeUf: form.cidadeUf.trim() || undefined,
      contato: form.contato.trim(),
      responsavel: form.responsavel.trim(),
      ativa: form.ativa,
      unidadeVinculadaId: form.unidadeVinculadaId || undefined,
      unidadeVinculadaNome: unidade?.label,
    };
    if (casa) editarCasaApoio(casa.id, payload);
    else criarCasaApoio(payload);
    onClose();
  }

  const inputStyle = {
    height: 38,
    background: 'white',
    border: '1px solid var(--tfd-surface-border)',
    borderRadius: 8,
    color: '#1A1D2B',
  } as const;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={casa ? 'Editar casa de apoio' : 'Nova casa de apoio'}
      subtitle="Casas ativas aparecem na escolha do encaminhamento do Serviço Social."
      width="min(560px, 95vw)"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="tfd-btn tfd-btn-primary" disabled={!valido} onClick={salvar}>
            {casa ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <FormSection title="Identificação" icon={<Home size={12} />}>
        <Campo label="Nome" obrigatorio>
          <input
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Ex.: Casa de Apoio Nossa Senhora da Vitória"
            className="w-full text-[13px] px-3 outline-none"
            style={inputStyle}
          />
        </Campo>

        <Campo label="Endereço" obrigatorio>
          <input
            value={form.endereco}
            onChange={(e) => set('endereco', e.target.value)}
            placeholder="Rua, número e bairro"
            className="w-full text-[13px] px-3 outline-none"
            style={inputStyle}
          />
        </Campo>

        <Campo label="Cidade e UF">
          <input
            value={form.cidadeUf}
            onChange={(e) => set('cidadeUf', e.target.value)}
            placeholder="Ex.: São Paulo - SP"
            className="w-full text-[13px] px-3 outline-none"
            style={inputStyle}
          />
        </Campo>

        <Campo label="Contato" obrigatorio>
          <input
            value={form.contato}
            onChange={(e) => set('contato', e.target.value)}
            placeholder="Telefone ou e-mail"
            className="w-full text-[13px] px-3 outline-none"
            style={inputStyle}
          />
        </Campo>

        <Campo label="Responsável" obrigatorio>
          <input
            value={form.responsavel}
            onChange={(e) => set('responsavel', e.target.value)}
            placeholder="Nome da pessoa responsável pela casa"
            className="w-full text-[13px] px-3 outline-none"
            style={inputStyle}
          />
        </Campo>
      </FormSection>

      <FormSection
        title="Unidade de saúde vinculada"
        icon={<Building2 size={12} />}
        hint="Opcional. A casa pode permanecer sem vínculo."
      >
        <select
          value={form.unidadeVinculadaId}
          onChange={(e) => set('unidadeVinculadaId', e.target.value)}
          className="w-full text-[13px] px-3 outline-none"
          style={inputStyle}
        >
          <option value="">Sem unidade vinculada</option>
          {unidades.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </FormSection>

      <FormSection title="Situação">
        <label
          className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer text-[13px]"
          style={{
            background: form.ativa ? '#F0FDF4' : '#F8FAFC',
            border: `1px solid ${form.ativa ? '#BBF7D0' : '#E2E8F0'}`,
            borderRadius: 6,
            color: '#1A1D2B',
          }}
        >
          <input
            type="checkbox"
            checked={form.ativa}
            onChange={(e) => set('ativa', e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>
            <span className="font-medium">Casa ativa</span>
            <span className="block text-[12px] mt-0.5" style={{ color: '#64748B' }}>
              Casa inativa permanece no histórico de encaminhamentos, mas deixa de
              aparecer na escolha de novos encaminhamentos.
            </span>
          </span>
        </label>
      </FormSection>
    </Drawer>
  );
}

function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
        {label}
        {obrigatorio && <span style={{ color: '#DC2626' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
