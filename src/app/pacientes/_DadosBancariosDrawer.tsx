'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, X, AlertTriangle, Landmark, Key } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { useToast } from '@/shared/components/toast/Toast';
import {
  criarConta,
  atualizarConta,
  type DadosBancariosRow,
} from '@/services/dados-bancarios.service';

type PixTipo = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | '';
type TipoContaSel = 'CORRENTE' | 'POUPANCA' | '';
type Modo = 'CONTA' | 'PIX' | 'AMBOS';

interface Props {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNome: string;
  pacienteCpf: string;
  /** Conta sendo editada; null/undefined = nova conta. */
  conta?: DadosBancariosRow | null;
  /** Callback após salvar — recebe a conta criada/atualizada. */
  onSaved?: (conta: DadosBancariosRow) => void;
}

interface FormState {
  modo: Modo;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: TipoContaSel;
  nome_titular: string;
  cpf_titular: string;
  /** Nome do vínculo (vindo da tabela auxiliar `vinculo`). */
  titular_vinculo: string;
  pix_tipo: PixTipo;
  pix_chave: string;
}

const EMPTY: FormState = {
  modo: 'CONTA',
  banco: '',
  agencia: '',
  conta: '',
  tipo_conta: '',
  nome_titular: '',
  cpf_titular: '',
  titular_vinculo: '',
  pix_tipo: '',
  pix_chave: '',
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}
function fmtCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function inferModoFromConta(c: DadosBancariosRow): Modo {
  const temConta = !!(c.banco || c.agencia || c.conta);
  const temPix = !!(c.pix_chave || c.pix_tipo);
  if (temConta && temPix) return 'AMBOS';
  if (temPix) return 'PIX';
  return 'CONTA';
}

export default function DadosBancariosDrawer({
  open,
  onClose,
  pacienteId,
  pacienteNome,
  pacienteCpf,
  conta,
  onSaved,
}: Props) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const isEdit = !!conta;

  useEffect(() => {
    if (!open) return;
    if (conta) {
      setForm({
        modo: inferModoFromConta(conta),
        banco: conta.banco ?? '',
        agencia: conta.agencia ?? '',
        conta: conta.conta ?? '',
        tipo_conta: (conta.tipo_conta ?? '') as TipoContaSel,
        nome_titular: conta.nome_titular,
        cpf_titular: fmtCpf(conta.cpf_titular),
        titular_vinculo: conta.titular_vinculo ?? '',
        pix_tipo: (conta.pix_tipo ?? '') as PixTipo,
        pix_chave: conta.pix_chave ?? '',
      });
    } else {
      // Pré-popula com o paciente como titular (vínculo "Próprio paciente"
      // existe na tabela auxiliar `vinculo` desde a migration 00057).
      setForm({
        ...EMPTY,
        nome_titular: pacienteNome,
        cpf_titular: fmtCpf(pacienteCpf),
        titular_vinculo: 'Próprio paciente',
      });
    }
  }, [open, conta, pacienteCpf, pacienteNome]);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  const cpfPaciente = onlyDigits(pacienteCpf);
  const cpfTitular = onlyDigits(form.cpf_titular);
  const titularEhPaciente = cpfPaciente !== '' && cpfPaciente === cpfTitular;

  // Sincroniza "vínculo" e "CPF do titular" quando marca Próprio paciente
  useEffect(() => {
    if (form.titular_vinculo === 'Próprio paciente' && !titularEhPaciente) {
      setForm((s) => ({
        ...s,
        nome_titular: pacienteNome,
        cpf_titular: fmtCpf(pacienteCpf),
      }));
    }
    // só queremos disparar quando muda o vínculo, não a cada digitação
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.titular_vinculo]);

  const incluiConta = form.modo === 'CONTA' || form.modo === 'AMBOS';
  const incluiPix = form.modo === 'PIX' || form.modo === 'AMBOS';

  const podeSalvar = useMemo(() => {
    if (!form.nome_titular || !form.cpf_titular) return false;
    if (incluiConta) {
      if (!form.banco || !form.agencia || !form.conta || !form.tipo_conta) return false;
    }
    if (incluiPix) {
      if (!form.pix_tipo || !form.pix_chave) return false;
    }
    return true;
  }, [form, incluiConta, incluiPix]);

  async function handleSalvar() {
    if (!podeSalvar) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    setSaving(true);

    const payload = {
      paciente_id: pacienteId,
      nome_titular: form.nome_titular,
      cpf_titular: onlyDigits(form.cpf_titular),
      titular_vinculo: form.titular_vinculo || null,
      // Campos conta — null quando modo = PIX
      banco: incluiConta ? form.banco : null,
      agencia: incluiConta ? form.agencia : null,
      conta: incluiConta ? form.conta : null,
      tipo_conta: incluiConta
        ? (form.tipo_conta as 'CORRENTE' | 'POUPANCA')
        : null,
      // Campos PIX — null quando modo = CONTA
      pix_tipo: incluiPix
        ? (form.pix_tipo as 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA')
        : null,
      pix_chave: incluiPix ? form.pix_chave : null,
    };

    const res = isEdit
      ? await atualizarConta(conta!.id, payload)
      : await criarConta(payload);

    setSaving(false);

    if (res.error) {
      toast.error('Erro ao salvar', res.error.message);
      return;
    }
    toast.success(isEdit ? 'Conta atualizada' : 'Conta cadastrada');
    onSaved?.(res.data as DadosBancariosRow);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar dados bancários' : 'Cadastrar dados bancários'}
      subtitle={`Paciente: ${pacienteNome}`}
      width="560px"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            onClick={onClose}
            disabled={saving}
          >
            <X size={13} /> Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={handleSalvar}
            disabled={saving || !podeSalvar}
          >
            <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Toggle de modo: Conta / PIX / Ambos */}
        <div>
          <p
            className="text-[11px] font-semibold mb-1.5"
            style={{ color: '#475569' }}
          >
            Forma de recebimento
          </p>
          <div
            className="grid grid-cols-3 gap-1 p-1"
            style={{
              background: '#F1F5F9',
              borderRadius: 8,
            }}
          >
            <ModeToggle
              label="Conta bancária"
              icon={<Landmark size={13} />}
              active={form.modo === 'CONTA'}
              onClick={() => setField('modo', 'CONTA')}
            />
            <ModeToggle
              label="PIX"
              icon={<Key size={13} />}
              active={form.modo === 'PIX'}
              onClick={() => setField('modo', 'PIX')}
            />
            <ModeToggle
              label="Ambos"
              icon={
                <span className="inline-flex">
                  <Landmark size={11} />
                  <Key size={11} style={{ marginLeft: -2 }} />
                </span>
              }
              active={form.modo === 'AMBOS'}
              onClick={() => setField('modo', 'AMBOS')}
            />
          </div>
        </div>

        {/* Bloco Titular */}
        <FormSection title="Titular">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <LookupSelect
                categoria="vinculo"
                label="Vínculo com o paciente"
                value={form.titular_vinculo}
                onChange={(v) => setField('titular_vinculo', v)}
                valueField="nome"
                placeholder="Selecione o vínculo..."
              />
            </div>
            <Field label="Nome do titular" cls="col-span-2">
              <input
                className="tfd-input"
                value={form.nome_titular}
                onChange={(e) => setField('nome_titular', e.target.value)}
              />
            </Field>
            <Field label="CPF do titular" cls="col-span-2">
              <input
                className="tfd-input font-mono"
                value={form.cpf_titular}
                onChange={(e) => setField('cpf_titular', fmtCpf(e.target.value))}
                placeholder="000.000.000-00"
              />
            </Field>
          </div>

          {form.cpf_titular && !titularEhPaciente && (
            <div
              className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 text-[11px]"
              style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 6 }}
            >
              <AlertTriangle size={12} />
              Titular diferente do paciente. Anexe o Termo de Autorização à solicitação.
            </div>
          )}
        </FormSection>

        {/* Bloco Conta tradicional */}
        {incluiConta && (
          <FormSection title="Conta bancária" icon={<Landmark size={12} />} tone="primary">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-9">
                <LookupSelect
                  categoria="banco"
                  label="Banco"
                  value={form.banco}
                  onChange={(v) => setField('banco', v)}
                  valueField="nome"
                  orderBy="ordem"
                  placeholder="Selecione o banco..."
                />
              </div>
              <Field label="Tipo" cls="col-span-3">
                <select
                  className="tfd-input"
                  value={form.tipo_conta}
                  onChange={(e) => setField('tipo_conta', e.target.value as TipoContaSel)}
                >
                  <option value="">—</option>
                  <option value="CORRENTE">Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                </select>
              </Field>
              <Field label="Agência" cls="col-span-6">
                <input
                  className="tfd-input font-mono"
                  value={form.agencia}
                  onChange={(e) => setField('agencia', e.target.value)}
                  placeholder="0000"
                />
              </Field>
              <Field label="Conta" cls="col-span-6">
                <input
                  className="tfd-input font-mono"
                  value={form.conta}
                  onChange={(e) => setField('conta', e.target.value)}
                  placeholder="00000-0"
                />
              </Field>
            </div>
          </FormSection>
        )}

        {/* Bloco PIX */}
        {incluiPix && (
          <FormSection title="PIX" icon={<Key size={12} />} tone="info">
            <div className="grid grid-cols-12 gap-3">
              <Field label="Tipo de chave" cls="col-span-4">
                <select
                  className="tfd-input"
                  value={form.pix_tipo}
                  onChange={(e) => setField('pix_tipo', e.target.value as PixTipo)}
                >
                  <option value="">—</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="TELEFONE">Telefone</option>
                  <option value="ALEATORIA">Aleatória</option>
                </select>
              </Field>
              <Field label="Chave" cls="col-span-8">
                <input
                  className="tfd-input"
                  value={form.pix_chave}
                  onChange={(e) => setField('pix_chave', e.target.value)}
                />
              </Field>
            </div>
          </FormSection>
        )}
      </div>
    </Drawer>
  );
}

function ModeToggle({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-medium transition-all"
      style={{
        background: active ? 'white' : 'transparent',
        color: active ? 'var(--tfd-blue-700)' : '#475569',
        borderRadius: 6,
        boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  cls,
  children,
}: {
  label: string;
  cls?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${cls ?? ''}`}>
      <span className="text-[11px] font-semibold" style={{ color: '#475569' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
