'use client';

import { useEffect, useState } from 'react';
import { Landmark, Pencil, Save, X, AlertTriangle, Check } from 'lucide-react';
import {
  buscarPorSolicitacao,
  upsertPorSolicitacao,
  TITULAR_VINCULO_LABEL,
  type TitularVinculo,
} from '@/services/dados-bancarios.service';
import { useToast } from '@/shared/components/toast/Toast';

interface Props {
  solicitacaoId: string;
  pacienteId: string;
  pacienteCpf: string;
  pacienteNome: string;
  /** Quando `true`, bloqueia edição (solicitação encerrada etc.). */
  locked?: boolean;
  /** Tooltip exibido quando bloqueado. */
  lockedTip?: string;
  /** Notifica o pai quando o registro é salvo ou removido (refresca o estado de "tudo pronto"). */
  onChange?: () => void;
}

type PixTipo = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | '';
type TipoConta = 'CORRENTE' | 'POUPANCA' | '';

interface FormState {
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: TipoConta;
  nome_titular: string;
  cpf_titular: string;
  titular_vinculo: TitularVinculo | '';
  pix_tipo: PixTipo;
  pix_chave: string;
}

const EMPTY: FormState = {
  banco: '', agencia: '', conta: '', tipo_conta: '', nome_titular: '',
  cpf_titular: '', titular_vinculo: '', pix_tipo: '', pix_chave: '',
};

function onlyDigits(v: string) { return v.replace(/\D/g, ''); }
function fmtCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export default function DadosBancariosBlock({
  solicitacaoId, pacienteId, pacienteCpf, pacienteNome,
  locked = false, lockedTip, onChange,
}: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await buscarPorSolicitacao(solicitacaoId);
      if (cancel) return;
      if (data) {
        setForm({
          banco: (data as { banco?: string }).banco ?? '',
          agencia: (data as { agencia?: string }).agencia ?? '',
          conta: (data as { conta?: string }).conta ?? '',
          tipo_conta: ((data as { tipo_conta?: TipoConta }).tipo_conta ?? '') as TipoConta,
          nome_titular: (data as { nome_titular?: string }).nome_titular ?? '',
          cpf_titular: fmtCpf((data as { cpf_titular?: string }).cpf_titular ?? ''),
          titular_vinculo: ((data as { titular_vinculo?: TitularVinculo | null }).titular_vinculo ?? '') as TitularVinculo | '',
          pix_tipo: ((data as { pix_tipo?: PixTipo }).pix_tipo ?? '') as PixTipo,
          pix_chave: (data as { pix_chave?: string }).pix_chave ?? '',
        });
        setEditing(false);
      } else {
        setForm(EMPTY);
        setEditing(false);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [solicitacaoId]);

  const hasRecord = form.banco !== '' && !editing && !loading;
  const titularEhPaciente = onlyDigits(form.cpf_titular) === onlyDigits(pacienteCpf);

  async function handleSalvar() {
    if (!form.banco || !form.agencia || !form.conta || !form.tipo_conta || !form.nome_titular || !form.cpf_titular) {
      toast.error('Preencha banco, agência, conta, tipo, nome e CPF do titular.');
      return;
    }
    setSaving(true);
    const { error } = await upsertPorSolicitacao(solicitacaoId, pacienteId, {
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      tipo_conta: form.tipo_conta as 'CORRENTE' | 'POUPANCA',
      nome_titular: form.nome_titular,
      cpf_titular: onlyDigits(form.cpf_titular),
      titular_vinculo: (form.titular_vinculo || null) as TitularVinculo | null,
      pix_tipo: (form.pix_tipo || null) as PixTipo extends '' ? null : Exclude<PixTipo, ''>,
      pix_chave: form.pix_chave || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar', error.message);
      return;
    }
    toast.success('Dados bancários salvos');
    setEditing(false);
    onChange?.();
  }

  function iniciarEdicao() {
    // Se for primeiro cadastro, pré-popula com paciente como titular
    if (!form.banco) {
      setForm({
        ...EMPTY,
        nome_titular: pacienteNome,
        cpf_titular: fmtCpf(pacienteCpf),
        titular_vinculo: 'PROPRIO',
      });
    }
    setEditing(true);
  }

  return (
    <div className="mt-5 pt-4" style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ color: '#0F172A' }}>
          <Landmark size={13} style={{ color: '#475569' }} />
          Dados bancários
        </h4>
        <span className="text-[11px]" style={{ color: '#94A3B8' }}>
          Conta de recebimento da ajuda de custo desta solicitação.
        </span>
      </div>

      {loading && (
        <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Carregando…</p>
      )}

      {!loading && !hasRecord && !editing && (
        <div className="flex items-center justify-between gap-3 px-3 py-3" style={{ background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
          <p className="text-[12px]" style={{ color: '#64748B' }}>
            Nenhum dado bancário cadastrado para esta solicitação.
          </p>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={iniciarEdicao}
            disabled={locked}
            title={locked ? lockedTip : undefined}
          >
            Cadastrar
          </button>
        </div>
      )}

      {hasRecord && (
        <div className="flex items-start gap-3 px-3 py-3" style={{ background: '#F8FAFC', borderRadius: 8 }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[13px]" style={{ color: '#0F172A' }}>
              <span style={{ fontWeight: 600 }}>{form.banco}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span className="font-mono">Ag. {form.agencia} / Conta {form.conta}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span style={{ color: '#475569' }}>{form.tipo_conta === 'POUPANCA' ? 'Poupança' : 'Corrente'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11.5px]" style={{ color: '#475569' }}>
              <span>Titular: <strong style={{ color: '#0F172A' }}>{form.nome_titular}</strong></span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span className="font-mono">{form.cpf_titular}</span>
              {form.titular_vinculo && (
                <>
                  <span style={{ color: '#CBD5E1' }}>·</span>
                  <span>{TITULAR_VINCULO_LABEL[form.titular_vinculo as TitularVinculo]}</span>
                </>
              )}
            </div>
            {form.pix_chave && (
              <div className="text-[11.5px] mt-0.5" style={{ color: '#475569' }}>
                PIX <strong style={{ color: '#0F172A' }}>{form.pix_tipo}</strong>: <span className="font-mono">{form.pix_chave}</span>
              </div>
            )}
            {!titularEhPaciente ? (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 text-[11px]" style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 6 }}>
                <AlertTriangle size={12} />
                Titular diferente do paciente — verifique se o <strong>Termo de Autorização</strong> está nos anexos da solicitação.
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 text-[11px]" style={{ background: '#DCFCE7', color: '#166534', borderRadius: 6 }}>
                <Check size={12} />
                Titular é o próprio paciente.
              </div>
            )}
          </div>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            onClick={iniciarEdicao}
            disabled={locked}
            title={locked ? lockedTip : 'Editar dados bancários'}
          >
            <Pencil size={13} /> Editar
          </button>
        </div>
      )}

      {editing && (
        <div className="px-3 py-3 mt-1" style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--tfd-surface-border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <Field label="Banco" cls="sm:col-span-6">
              <input className="tfd-input" value={form.banco} onChange={(e) => setField('banco', e.target.value)} placeholder="Ex.: Banco do Brasil" />
            </Field>
            <Field label="Tipo de conta" cls="sm:col-span-3">
              <select className="tfd-input" value={form.tipo_conta} onChange={(e) => setField('tipo_conta', e.target.value as TipoConta)}>
                <option value="">—</option>
                <option value="CORRENTE">Corrente</option>
                <option value="POUPANCA">Poupança</option>
              </select>
            </Field>
            <Field label="Agência" cls="sm:col-span-3">
              <input className="tfd-input font-mono" value={form.agencia} onChange={(e) => setField('agencia', e.target.value)} placeholder="0000" />
            </Field>
            <Field label="Conta" cls="sm:col-span-3">
              <input className="tfd-input font-mono" value={form.conta} onChange={(e) => setField('conta', e.target.value)} placeholder="00000-0" />
            </Field>
            <Field label="Nome do titular" cls="sm:col-span-6">
              <input className="tfd-input" value={form.nome_titular} onChange={(e) => setField('nome_titular', e.target.value)} />
            </Field>
            <Field label="CPF do titular" cls="sm:col-span-3">
              <input className="tfd-input font-mono" value={form.cpf_titular} onChange={(e) => setField('cpf_titular', fmtCpf(e.target.value))} placeholder="000.000.000-00" />
            </Field>
            <Field label="Vínculo com o paciente" cls="sm:col-span-6">
              <select className="tfd-input" value={form.titular_vinculo} onChange={(e) => setField('titular_vinculo', e.target.value as TitularVinculo | '')}>
                <option value="">—</option>
                <option value="PROPRIO">Próprio paciente</option>
                <option value="PAI">Pai</option>
                <option value="MAE">Mãe</option>
                <option value="CONJUGE">Cônjuge</option>
                <option value="RESPONSAVEL_LEGAL">Responsável legal</option>
                <option value="OUTRO">Outro</option>
              </select>
            </Field>
            <Field label="PIX — tipo" cls="sm:col-span-3">
              <select className="tfd-input" value={form.pix_tipo} onChange={(e) => setField('pix_tipo', e.target.value as PixTipo)}>
                <option value="">—</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="TELEFONE">Telefone</option>
                <option value="ALEATORIA">Aleatória</option>
              </select>
            </Field>
            <Field label="PIX — chave" cls="sm:col-span-9">
              <input className="tfd-input" value={form.pix_chave} onChange={(e) => setField('pix_chave', e.target.value)} />
            </Field>
          </div>

          {form.cpf_titular && !titularEhPaciente && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 text-[11px]" style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 6 }}>
              <AlertTriangle size={12} />
              Titular diferente do paciente. Lembre de verificar o Termo de Autorização nos anexos.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-3">
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => setEditing(false)} disabled={saving}>
              <X size={13} /> Cancelar
            </button>
            <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleSalvar} disabled={saving}>
              <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, cls, children }: { label: string; cls?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${cls ?? ''}`}>
      <span className="text-[11px] font-semibold" style={{ color: '#475569' }}>{label}</span>
      {children}
    </label>
  );
}
