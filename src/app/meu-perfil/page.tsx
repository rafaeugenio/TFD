'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Plus,
  Trash2,
  Save,
  Shield,
  Stethoscope,
  Camera,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { createClient } from '@/lib/supabase/client';
import { maskCPF, maskPhone } from '@/shared/pipes/formatters';

/* -------------------------------------------------- */
/*  Perfil labels                                      */
/* -------------------------------------------------- */

const perfilLabels: Record<string, { label: string; bg: string; text: string }> = {
  ATENDENTE_MUNICIPAL: { label: 'Atendente Municipal', bg: '#DBEAFE', text: '#1D4ED8' },
  ATENDENTE_REGIONAL: { label: 'Atendente Regional', bg: '#E0E7FF', text: '#4338CA' },
  COORDENACAO_ESTADUAL: { label: 'Coordenacao Estadual', bg: '#EDE9FE', text: '#7C3AED' },
  MEDICO_AUDITOR: { label: 'Medico Auditor', bg: '#DCFCE7', text: '#15803D' },
  SETOR_REGULACAO: { label: 'Setor de Regulacao', bg: '#FFF7ED', text: '#C2410C' },
  SETOR_PASSAGENS: { label: 'Setor de Passagens', bg: '#FFEDD5', text: '#EA580C' },
  FINANCEIRO: { label: 'Financeiro', bg: '#FEF3C7', text: '#92400E' },
  ASSISTENTE_SOCIAL: { label: 'Assistente Social', bg: '#FCE7F3', text: '#BE185D' },
  CONTROLE_INTERNO: { label: 'Controle Interno', bg: '#F5F3FF', text: '#7C3AED' },
  ADMINISTRADOR: { label: 'Administrador', bg: '#FEE2E2', text: '#B91C1C' },
};

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function MeuPerfilPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');

  // Form fields
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [descricao, setDescricao] = useState('');
  const [perfil, setPerfil] = useState('');
  const [telefones, setTelefones] = useState<string[]>([]);
  const [fotoUrl, setFotoUrl] = useState('');

  // Medical fields (MEDICO_AUDITOR)
  const [crm, setCrm] = useState('');
  const [crmUf, setCrmUf] = useState('');
  const [especialidadeMedica, setEspecialidadeMedica] = useState('');

  const isMedico = perfil === 'MEDICO_AUDITOR';

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        setUserId(data.id);
        setNomeCompleto(data.nome_completo ?? '');
        setEmail(data.email ?? authUser.email ?? '');
        setCpf(data.cpf ? maskCPF(data.cpf) : '');
        setDescricao((data as any).descricao ?? '');
        setPerfil(data.perfil ?? '');
        setTelefones((data as any).telefones ?? []);
        setFotoUrl((data as any).foto_url ?? '');
        setCrm((data as any).crm ?? '');
        setCrmUf((data as any).crm_uf ?? '');
        setEspecialidadeMedica((data as any).especialidade_medica ?? '');
      }

      setLoading(false);
    }
    load();
  }, []);

  function handleAddTelefone() {
    setTelefones([...telefones, '']);
  }

  function handleRemoveTelefone(idx: number) {
    setTelefones(telefones.filter((_, i) => i !== idx));
  }

  function handleTelefoneChange(idx: number, value: string) {
    const updated = [...telefones];
    updated[idx] = maskPhone(value);
    setTelefones(updated);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    const supabase = createClient();
    const payload: any = {
      descricao: descricao || null,
      telefones: telefones.filter(Boolean),
      foto_url: fotoUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (isMedico) {
      payload.crm = crm || null;
      payload.crm_uf = crmUf || null;
      payload.especialidade_medica = especialidadeMedica || null;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao salvar', (error as any).message);
    } else {
      toast.success('Perfil atualizado!', 'As alteracoes foram salvas com sucesso.');
    }
    setSaving(false);
  }

  // Initials for avatar
  const iniciais = nomeCompleto
    ? nomeCompleto.split(' ').filter(Boolean).length >= 2
      ? (nomeCompleto.split(' ')[0][0] + nomeCompleto.split(' ').pop()![0]).toUpperCase()
      : nomeCompleto.slice(0, 2).toUpperCase()
    : 'US';

  const perfilInfo = perfilLabels[perfil] ?? { label: perfil, bg: 'var(--tfd-surface-100)', text: 'var(--tfd-text-secondary)' };

  if (loading) {
    return (
      <>
        <PageHeader title="Meu Perfil" subtitle="Informacoes pessoais e configuracoes" />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Meu Perfil" subtitle="Informacoes pessoais e configuracoes" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== Left: Avatar + Role Card ========== */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar card */}
          <div className="tfd-card flex flex-col items-center py-8">
            <div
              className="flex items-center justify-center text-white text-2xl font-bold rounded-full mb-4"
              style={{
                width: 80,
                height: 80,
                background: 'var(--tfd-blue)',
                border: '3px solid white',
                boxShadow: '0 0 0 2px var(--tfd-primary-200)',
              }}
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt={nomeCompleto} className="w-full h-full rounded-full object-cover" />
              ) : (
                iniciais
              )}
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{nomeCompleto}</p>
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>{email}</p>

            <div className="mt-3">
              <span
                className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                style={{ backgroundColor: perfilInfo.bg, color: perfilInfo.text }}
              >
                {perfilInfo.label}
              </span>
            </div>

            {/* Photo URL input */}
            <div className="w-full mt-6 px-4">
              <label className="tfd-label">
                <Camera size={12} className="inline mr-1" />
                URL da foto
              </label>
              <input
                type="url"
                className="tfd-input tfd-input--sm"
                placeholder="https://..."
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Role card */}
          <div className="tfd-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: 'var(--tfd-primary-500)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Cargo e Setor</h3>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Perfil</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{perfilInfo.label}</p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Status</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-status-success)' }}>Ativo</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== Right: Form ========== */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal info */}
          <div className="tfd-card">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} style={{ color: 'var(--tfd-primary-500)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Dados Pessoais</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <FormField label="Nome completo">
                <input
                  type="text"
                  className="tfd-input"
                  value={nomeCompleto}
                  disabled
                  style={{ opacity: 0.7 }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                  Alteracao via administrador
                </p>
              </FormField>

              <FormField label="CPF">
                <input
                  type="text"
                  className="tfd-input"
                  value={cpf}
                  disabled
                  style={{ opacity: 0.7, fontFamily: 'var(--tfd-font-mono)' }}
                />
              </FormField>

              <FormField label="E-mail">
                <div className="flex items-center gap-2">
                  <Mail size={14} style={{ color: 'var(--tfd-text-muted)' }} />
                  <input
                    type="email"
                    className="tfd-input"
                    value={email}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                  Vinculado a conta de acesso
                </p>
              </FormField>
            </div>

            <FormField label="Descricao">
              <textarea
                className="tfd-input"
                rows={3}
                placeholder="Uma breve descricao sobre voce..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </FormField>
          </div>

          {/* Phones */}
          <div className="tfd-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Phone size={16} style={{ color: 'var(--tfd-primary-500)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Telefones</h3>
              </div>
              <button
                type="button"
                className="tfd-btn tfd-btn-primary tfd-btn--sm"
                onClick={handleAddTelefone}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {telefones.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum telefone cadastrado (opcional)
              </p>
            ) : (
              <div className="space-y-3">
                {telefones.map((tel, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold shrink-0" style={{ color: 'var(--tfd-text-muted)', width: 20 }}>
                      {idx + 1}.
                    </span>
                    <input
                      type="tel"
                      className="tfd-input flex-1"
                      placeholder="(00) 00000-0000"
                      value={tel}
                      onChange={(e) => handleTelefoneChange(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                      title="Remover telefone"
                      onClick={() => handleRemoveTelefone(idx)}
                    >
                      <Trash2 size={14} style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medical data (MEDICO_AUDITOR only) */}
          {isMedico && (
            <div className="tfd-card" style={{ border: '1px solid #BBF7D0' }}>
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope size={16} style={{ color: '#15803D' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Dados Medicos</h3>
              </div>

              <div className="tfd-message tfd-message--info mb-4">
                <span className="tfd-message-icon mt-0.5 shrink-0"><Stethoscope size={14} /></span>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Essas informacoes sao obrigatorias para emissao de pareceres medicos e serao exibidas automaticamente no registro do parecer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <FormField label="CRM" required>
                  <input
                    type="text"
                    className="tfd-input"
                    placeholder="000000"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ fontFamily: 'var(--tfd-font-mono)' }}
                  />
                </FormField>

                <FormField label="UF do CRM" required>
                  <select
                    className="tfd-input"
                    value={crmUf}
                    onChange={(e) => setCrmUf(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Especialidade medica">
                <input
                  type="text"
                  className="tfd-input"
                  placeholder="Ex: Cardiologia, Oncologia..."
                  value={especialidadeMedica}
                  onChange={(e) => setEspecialidadeMedica(e.target.value)}
                />
              </FormField>

              {crm && crmUf && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <CheckCircle2 size={14} style={{ color: '#15803D' }} />
                  <span className="text-xs font-medium" style={{ color: '#15803D' }}>
                    CRM {crm}/{crmUf}{especialidadeMedica ? ` — ${especialidadeMedica}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Salvando...</>
              ) : (
                <><Save size={16} /> Salvar Alteracoes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
