'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import { useToast } from '@/shared/components/toast/Toast';
import { maskPhone, maskCEP } from '@/shared/pipes/formatters';
import CepAutofill from '@/shared/components/cep-autofill/CepAutofill';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';

import {
  buscarUnidadeSaude,
  criarUnidadeSaude,
  atualizarUnidadeSaude,
} from '@/services/unidades-saude.service';

export interface UnidadeDrawerProps {
  open: boolean;
  editandoId?: string | null;
  editandoData?: Record<string, unknown> | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => {
      if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

export default function UnidadeDrawer({ open, editandoId, editandoData, onClose, onSaved }: UnidadeDrawerProps) {
  const toast = useToast();

  /* ---- Form state: Dados da Unidade ---- */
  const [nome, setNome] = useState('');
  const [cnes, setCnes] = useState('');
  const [tipo, setTipo] = useState('');

  /* ---- Form state: Endereço ---- */
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('MA');

  /* ---- Form state: Contato ---- */
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [responsavel, setResponsavel] = useState('');

  /* ---- CNES autofill ---- */
  const [cnesLoading, setCnesLoading] = useState(false);

  /* ---- Confirmação ---- */
  const [editingSnapshot, setEditingSnapshot] = useState<Record<string, string> | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [saving, setSaving] = useState(false);

  /* -------- Carregar/reset quando abrir -------- */
  useEffect(() => {
    if (!open) return;
    if (!editandoId) {
      resetForm();
      setEditingSnapshot(null);
      return;
    }
    (async () => {
      let uni = editandoData;
      if (!uni) {
        const { data } = await buscarUnidadeSaude(editandoId);
        uni = (data as Record<string, unknown> | null) ?? null;
      }
      if (!uni) return;
      hydrateFromRow(uni);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editandoId, editandoData]);

  function resetForm() {
    setNome('');
    setCnes('');
    setTipo('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setMunicipio('');
    setUf('MA');
    setTelefone('');
    setEmail('');
    setResponsavel('');
    setCnesLoading(false);
  }

  function hydrateFromRow(uni: Record<string, unknown>) {
    setEditingSnapshot({
      nome: (uni.nome as string) ?? '',
      cnes: (uni.cnes as string) ?? '',
      tipo: (uni.tipo as string) ?? '',
      cep: (uni.cep as string) ?? '',
      logradouro: (uni.logradouro as string) ?? '',
      numero: (uni.numero as string) ?? '',
      bairro: (uni.bairro as string) ?? '',
      municipio: (uni.municipio as string) ?? (uni.cidade as string) ?? '',
      uf: (uni.uf as string) ?? 'MA',
      telefone: (uni.telefone as string) ?? '',
      email: (uni.email as string) ?? '',
      responsavel: (uni.responsavel as string) ?? '',
    });
    setNome((uni.nome as string) ?? '');
    setCnes((uni.cnes as string) ?? '');
    setTipo((uni.tipo as string) ?? '');
    setCep(maskCEP((uni.cep as string) ?? ''));
    setLogradouro((uni.logradouro as string) ?? '');
    setNumero((uni.numero as string) ?? '');
    setBairro((uni.bairro as string) ?? '');
    setMunicipio((uni.municipio as string) ?? (uni.cidade as string) ?? '');
    setUf((uni.uf as string) ?? 'MA');
    setTelefone(maskPhone((uni.telefone as string) ?? ''));
    setEmail((uni.email as string) ?? '');
    setResponsavel((uni.responsavel as string) ?? '');
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      resetForm();
      setEditingSnapshot(null);
    }, 250);
  }

  /* -------- CNES autofill -------- */
  async function fetchCnesData(codigo: string) {
    setCnesLoading(true);
    try {
      const res = await fetch(`/api/cnes/${codigo}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json() as Record<string, string>;
      if (data.nome) setNome(data.nome);
      if (data.logradouro) setLogradouro(data.logradouro);
      if (data.numero) setNumero(data.numero);
      if (data.bairro) setBairro(data.bairro);
      if (data.cep) setCep(maskCEP(data.cep));
      if (data.telefone) setTelefone(maskPhone(data.telefone));
      if (data.email) setEmail(data.email);
      if (data.responsavel) setResponsavel(data.responsavel);
      if (data.tipoDescricao) setTipo(toTitleCase(data.tipoDescricao));
      if (data.uf) setUf(data.uf);
      if (data.municipio) {
        const mun = toTitleCase(data.municipio);
        setTimeout(() => setMunicipio(mun), 800);
      }
      toast.success('CNES encontrado', 'Dados importados automaticamente. Revise antes de salvar.');
    } catch {
      toast.error('CNES não encontrado', 'Verifique o código ou preencha os dados manualmente.');
    } finally {
      setCnesLoading(false);
    }
  }

  function handleCnesChange(value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 7);
    setCnes(clean);
    if (clean.length === 7 && !editandoId) {
      fetchCnesData(clean);
    }
  }

  /* -------- Validate + open confirm -------- */
  function handleRequestSubmit() {
    if (!nome.trim()) { toast.error('Campo obrigatório', 'Informe o nome da unidade.'); return; }
    if (cnes && cnes.length !== 7) { toast.error('CNES inválido', 'O CNES deve conter exatamente 7 dígitos.'); return; }

    if (editandoId && editingSnapshot) {
      const before = {
        nome: editingSnapshot.nome,
        cnes: editingSnapshot.cnes,
        tipo: editingSnapshot.tipo,
        endereco: [editingSnapshot.logradouro, editingSnapshot.numero, editingSnapshot.bairro].filter(Boolean).join(', '),
        municipio: editingSnapshot.municipio ? `${editingSnapshot.municipio}/${editingSnapshot.uf}` : '',
        cep: editingSnapshot.cep,
        telefone: editingSnapshot.telefone ? maskPhone(editingSnapshot.telefone) : '',
        email: editingSnapshot.email,
        responsavel: editingSnapshot.responsavel,
      };
      const after = {
        nome: nome.trim(),
        cnes,
        tipo,
        endereco: [logradouro.trim(), numero.trim(), bairro.trim()].filter(Boolean).join(', '),
        municipio: municipio ? `${municipio}/${uf}` : '',
        cep,
        telefone,
        email: email.trim(),
        responsavel: responsavel.trim(),
      };
      const diff = buildDiff(before, after, [
        { key: 'nome', label: 'Nome' },
        { key: 'cnes', label: 'CNES' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'endereco', label: 'Endereço' },
        { key: 'municipio', label: 'Município' },
        { key: 'cep', label: 'CEP' },
        { key: 'telefone', label: 'Telefone' },
        { key: 'email', label: 'E-mail' },
        { key: 'responsavel', label: 'Responsável' },
      ]);
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Nome', after: nome.trim() },
          { label: 'CNES', after: cnes },
          { label: 'Tipo', after: tipo },
          { label: 'Município', after: municipio ? `${municipio}/${uf}` : '' },
          { label: 'Endereço', after: [logradouro.trim(), numero.trim(), bairro.trim()].filter(Boolean).join(', ') },
          { label: 'Telefone', after: telefone },
          { label: 'E-mail', after: email.trim() },
          { label: 'Responsável', after: responsavel.trim() },
        ],
      });
    }
  }

  /* -------- Submit -------- */
  async function handleSubmit() {
    const cleanCnes = cnes.replace(/\D/g, '');
    const cleanPhone = telefone.replace(/\D/g, '');
    const cleanCep = cep.replace(/\D/g, '');

    const payload: Record<string, unknown> = {
      nome: nome.trim(),
      cnes: cleanCnes,
      tipo: tipo || null,
      cep: cleanCep || null,
      logradouro: logradouro.trim() || null,
      numero: numero.trim() || null,
      bairro: bairro.trim() || null,
      municipio: municipio.trim() || null,
      uf: uf || 'MA',
      telefone: cleanPhone || null,
      email: email.trim() || null,
      responsavel: responsavel.trim() || null,
    };

    let savedId = editandoId ?? null;

    if (editandoId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await atualizarUnidadeSaude(editandoId, payload as any);
      if (result.error) {
        toast.error('Erro ao atualizar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await criarUnidadeSaude(payload as any);
      if (result.error) {
        toast.error('Erro ao cadastrar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      savedId = (result.data as { id: string } | null)?.id ?? null;
    }

    toast.success(
      editandoId ? 'Unidade atualizada!' : 'Unidade cadastrada!',
      editandoId
        ? 'Os dados foram atualizados com sucesso.'
        : 'A unidade foi cadastrada com sucesso.',
    );
    if (savedId && onSaved) onSaved(savedId);
    handleClose();
  }

  return (
    <>
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editandoId ? 'Confirmar alterações na unidade?' : 'Confirmar cadastro de unidade?'}
        subject={nome.trim() || undefined}
        diff={saveConfirm?.diff}
        busy={saving}
        onClose={() => setSaveConfirm(null)}
        onConfirm={async () => {
          setSaving(true);
          try {
            await handleSubmit();
            setSaveConfirm(null);
          } finally {
            setSaving(false);
          }
        }}
      />

      <Drawer
        open={open}
        onClose={handleClose}
        title={editandoId ? 'Editar Unidade' : 'Nova Unidade'}
        subtitle={editandoId ? 'Atualize os dados da unidade' : 'Preencha os dados para cadastrar uma nova unidade'}
        width="640px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleClose}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSubmit} disabled={saving}>
              {editandoId ? 'Salvar Alterações' : 'Cadastrar Unidade'}
            </button>
          </>
        }
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados da Unidade
        </h3>

        <FormField label="Nome" required>
          <input type="text" className="tfd-input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="CNES" required>
            <div className="relative">
              <input
                type="text"
                className="tfd-input"
                placeholder="0000000"
                maxLength={7}
                value={cnes}
                onChange={(e) => handleCnesChange(e.target.value)}
                disabled={cnesLoading}
              />
              {cnesLoading && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                  style={{ color: 'var(--tfd-primary-500)' }}
                >
                  <Loader2 size={16} />
                </span>
              )}
            </div>
            {!editandoId && !cnesLoading && cnes.length < 7 && (
              <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                Ao digitar 7 dígitos, os dados serão preenchidos automaticamente.
              </p>
            )}
          </FormField>

          <LookupSelect
            categoria="tipo_unidade"
            label="Tipo"
            value={tipo}
            onChange={setTipo}
            valueField="nome"
            orderBy="ordem"
          />
        </div>

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Endereço
        </h3>

        <CepAutofill
          initialCep={cep}
          onAddressFound={(address) => {
            setCep(maskCEP(address.cep));
            setLogradouro(address.logradouro);
            setBairro(address.bairro);
            setUf(address.uf);
            if (address.cidade) setMunicipio(address.cidade);
          }}
        />

        <FormField label="Logradouro">
          <input type="text" className="tfd-input" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Bairro">
            <input type="text" className="tfd-input" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </FormField>
          <FormField label="Número">
            <input type="text" className="tfd-input" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <UfCidadeSelect
            ufLabel="UF"
            cidadeLabel="Município"
            uf={uf}
            cidade={municipio}
            onUfChange={(v) => { setUf(v); setMunicipio(''); }}
            onCidadeChange={setMunicipio}
          />
        </div>

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Contato
        </h3>

        <FormField label="Telefone">
          <input
            type="tel"
            className="tfd-input"
            placeholder="(99) 99999-0000"
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
          />
        </FormField>

        <FormField label="E-mail">
          <input type="email" className="tfd-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>

        <FormField label="Responsável">
          <input type="text" className="tfd-input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </FormField>
      </Drawer>
    </>
  );
}
