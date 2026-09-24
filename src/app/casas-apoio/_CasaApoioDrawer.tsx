'use client';

import { useEffect, useState } from 'react';
import { Home, MapPin, Phone, Building2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import FormSection from '@/shared/components/drawer/FormSection';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import { useToast } from '@/shared/components/toast/Toast';
import { useUnidadesDestino } from '@/shared/hooks/useLookup';
import { criarCasaApoio, editarCasaApoio } from '@/app/fluxo-v2/_state/servicoSocialStore';
import type { CasaApoioMock } from '@/core/mocks/servico-social-seed';

interface Props {
  open: boolean;
  /** `null` cria uma casa nova. */
  casa: CasaApoioMock | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

const VAZIO = { nome: '', endereco: '', cidadeUf: '', contato: '', responsavel: '', unidadeVinculadaId: '' };

/**
 * Cadastro e edição de casa de apoio, no mesmo fluxo das Unidades de Saúde e
 * Regionais: drawer com seções, validação e confirmação com as diferenças
 * (antes e depois) antes de salvar.
 */
export default function CasaApoioDrawer({ open, casa, onClose, onSaved }: Props) {
  const toast = useToast();
  const { options: unidades } = useUnidadesDestino();
  const [form, setForm] = useState({ ...VAZIO });
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);

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
            unidadeVinculadaId: casa.unidadeVinculadaId ?? '',
          }
        : { ...VAZIO },
    );
  }, [open, casa]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((prev) => ({ ...prev, [k]: v }));
  const nomeUnidade = (id: string) => unidades.find((u) => u.value === id)?.label ?? '';

  /* -------- Validate + open confirm -------- */
  function handleRequestSubmit() {
    if (!form.nome.trim()) { toast.error('Campo obrigatório', 'Informe o nome da casa de apoio.'); return; }
    if (!form.endereco.trim()) { toast.error('Campo obrigatório', 'Informe o endereço.'); return; }
    if (!form.contato.trim()) { toast.error('Campo obrigatório', 'Informe o contato.'); return; }
    if (!form.responsavel.trim()) { toast.error('Campo obrigatório', 'Informe o responsável.'); return; }

    const after = {
      nome: form.nome.trim(),
      endereco: form.endereco.trim(),
      cidadeUf: form.cidadeUf.trim(),
      contato: form.contato.trim(),
      responsavel: form.responsavel.trim(),
      unidade: nomeUnidade(form.unidadeVinculadaId),
    };
    const campos = [
      { key: 'nome', label: 'Nome' },
      { key: 'endereco', label: 'Endereço' },
      { key: 'cidadeUf', label: 'Cidade e UF' },
      { key: 'contato', label: 'Contato' },
      { key: 'responsavel', label: 'Responsável' },
      { key: 'unidade', label: 'Unidade de saúde vinculada' },
    ] as const;

    if (casa) {
      const before = {
        nome: casa.nome,
        endereco: casa.endereco,
        cidadeUf: casa.cidadeUf ?? '',
        contato: casa.contato,
        responsavel: casa.responsavel,
        unidade: casa.unidadeVinculadaNome ?? '',
      };
      setSaveConfirm({ tone: 'edit', diff: buildDiff(before, after, [...campos]) });
    } else {
      setSaveConfirm({ tone: 'create', diff: campos.map((c) => ({ label: c.label, after: after[c.key] })) });
    }
  }

  /* -------- Submit -------- */
  function handleSubmit() {
    const payload = {
      nome: form.nome.trim(),
      endereco: form.endereco.trim(),
      cidadeUf: form.cidadeUf.trim() || undefined,
      contato: form.contato.trim(),
      responsavel: form.responsavel.trim(),
      unidadeVinculadaId: form.unidadeVinculadaId || undefined,
      unidadeVinculadaNome: nomeUnidade(form.unidadeVinculadaId) || undefined,
    };
    let id = casa?.id;
    if (casa) editarCasaApoio(casa.id, payload);
    else id = criarCasaApoio(payload).id;
    toast.success(
      casa ? 'Casa de apoio atualizada!' : 'Casa de apoio cadastrada!',
      casa ? 'Os dados foram atualizados com sucesso.' : 'A casa de apoio foi cadastrada com sucesso.',
    );
    if (id && onSaved) onSaved(id);
    onClose();
  }

  return (
    <>
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={casa ? 'Confirmar alterações na casa de apoio?' : 'Confirmar cadastro de casa de apoio?'}
        subject={form.nome.trim() || undefined}
        diff={saveConfirm?.diff}
        onClose={() => setSaveConfirm(null)}
        onConfirm={() => { handleSubmit(); setSaveConfirm(null); }}
      />

      <Drawer
        open={open}
        onClose={onClose}
        title={casa ? 'Editar Casa de Apoio' : 'Nova Casa de Apoio'}
        subtitle={casa ? 'Atualize os dados da casa de apoio' : 'Preencha os dados para cadastrar uma nova casa de apoio'}
        width="640px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSubmit}>
              {casa ? 'Salvar Alterações' : 'Cadastrar Casa de Apoio'}
            </button>
          </>
        }
      >
        <FormSection title="Dados da Casa" icon={<Home size={12} />} tone="primary">
          <FormField label="Nome" required>
            <input type="text" className="tfd-input" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Casa de Apoio Nossa Senhora da Vitória" />
          </FormField>
          <FormField label="Responsável" required>
            <input type="text" className="tfd-input" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} placeholder="Nome da pessoa responsável pela casa" />
          </FormField>
        </FormSection>

        <FormSection title="Endereço" icon={<MapPin size={12} />} tone="success">
          <FormField label="Endereço" required>
            <input type="text" className="tfd-input" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, número e bairro" />
          </FormField>
          <FormField label="Cidade e UF">
            <input type="text" className="tfd-input" value={form.cidadeUf} onChange={(e) => set('cidadeUf', e.target.value)} placeholder="Ex.: São Paulo - SP" />
          </FormField>
        </FormSection>

        <FormSection title="Contato" icon={<Phone size={12} />} tone="info">
          <FormField label="Contato" required>
            <input type="text" className="tfd-input" value={form.contato} onChange={(e) => set('contato', e.target.value)} placeholder="Telefone ou e-mail" />
          </FormField>
        </FormSection>

        <FormSection title="Unidade de Saúde Vinculada" icon={<Building2 size={12} />} hint="Opcional. A casa pode ficar sem vínculo.">
          <FormField label="Unidade de saúde">
            <select className="tfd-input" value={form.unidadeVinculadaId} onChange={(e) => set('unidadeVinculadaId', e.target.value)}>
              <option value="">Sem unidade vinculada</option>
              {unidades.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </FormField>
        </FormSection>
      </Drawer>
    </>
  );
}
