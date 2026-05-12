'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Phone,
  Plus,
  Trash2,
  Save,
  Stethoscope,
  Camera,
  Loader2,
  CheckCircle2,
  Upload,
  Video,
  X,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { DetailHeaderSkeleton, SectionSkeleton } from '@/shared/components/skeleton';
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

  // Password reset
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [senhaAtualError, setSenhaAtualError] = useState('');

  // Photo / webcam
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

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

  /* ---- Cleanup webcam on unmount ---- */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* ---- Phone helpers ---- */
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

  /* ---- Photo: file upload ---- */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo invalido', 'Selecione uma imagem (JPG, PNG, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  /* ---- Photo: webcam ---- */
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      setWebcamActive(true);

      // Wait for ref to be available after state update
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      toast.error('Webcam indisponivel', 'Verifique as permissoes do navegador.');
    }
  }, [toast]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setFotoUrl(canvas.toDataURL('image/jpeg', 0.85));
    stopWebcam();
  }

  function stopWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  }

  function handleRemovePhoto() {
    setFotoUrl('');
  }

  /* ---- Password reset ---- */
  async function handleAtualizarSenha() {
    setSenhaAtualError('');

    if (novaSenha.length < 6) {
      toast.warning('Senha muito curta', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.warning('Senhas não coincidem', 'A nova senha e a confirmação devem ser iguais.');
      return;
    }

    setSavingSenha(true);
    const supabase = createClient();

    // Verificar senha atual via reautenticação
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual,
    });

    if (authError) {
      setSenhaAtualError('Senha atual incorreta');
      setSavingSenha(false);
      return;
    }

    // Atualizar para a nova senha
    const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });

    if (updateError) {
      toast.error('Erro ao atualizar senha', updateError.message);
    } else {
      toast.success('Senha alterada!', 'Sua senha foi atualizada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    }
    setSavingSenha(false);
  }

  /* ---- Save ---- */
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
        <DetailHeaderSkeleton />
        <SectionSkeleton rows={6} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Meu Perfil" subtitle="Informacoes pessoais e configuracoes" />

      <div className="space-y-4 tfd-stagger">

        {/* ========== Dados Pessoais ========== */}
        <div className="tfd-card">
          <div className="flex items-center gap-2 mb-6">
            <User size={16} style={{ color: 'var(--tfd-primary-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Dados Pessoais</h3>
          </div>

          {/* Avatar section — horizontal layout */}
          <div className="flex items-start gap-6 mb-6 pb-6" style={{ borderBottom: '1px solid var(--tfd-border)' }}>
            <div className="relative shrink-0">
              <div
                className="flex items-center justify-center text-white text-3xl font-bold rounded-full overflow-hidden"
                style={{
                  width: 120,
                  height: 120,
                  background: fotoUrl ? 'transparent' : 'var(--tfd-blue)',
                  border: '4px solid white',
                  boxShadow: '0 0 0 2px var(--tfd-primary-200), 0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt={nomeCompleto} className="w-full h-full object-cover" />
                ) : (
                  iniciais
                )}
              </div>
              {fotoUrl && (
                <button
                  type="button"
                  className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
                  style={{
                    width: 24,
                    height: 24,
                    background: 'var(--tfd-status-danger)',
                    color: 'white',
                    border: '2px solid white',
                  }}
                  title="Remover foto"
                  onClick={handleRemovePhoto}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold mb-0.5" style={{ color: 'var(--tfd-text-primary)' }}>{nomeCompleto}</p>
              <p className="text-sm mb-3" style={{ color: 'var(--tfd-text-muted)' }}>{email}</p>

              <div className="mb-4">
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{ backgroundColor: perfilInfo.bg, color: perfilInfo.text }}
                >
                  {perfilInfo.label}
                </span>
              </div>

              {/* Webcam capture area */}
              {webcamActive && (
                <div className="mb-3 rounded-lg overflow-hidden inline-block" style={{ border: '2px solid var(--tfd-primary-200)' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: 280, height: 210, objectFit: 'cover', display: 'block' }}
                  />
                  <div className="flex gap-2 p-2 justify-center" style={{ background: 'var(--tfd-surface-50)' }}>
                    <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={capturePhoto}>
                      <Camera size={14} /> Capturar
                    </button>
                    <button type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={stopWebcam}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />

              {/* Photo action buttons */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="tfd-btn tfd-btn-outline tfd-btn--sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Importar foto
                </button>
                {!webcamActive && (
                  <button
                    type="button"
                    className="tfd-btn tfd-btn-outline tfd-btn--sm"
                    onClick={startWebcam}
                  >
                    <Video size={14} /> Usar webcam
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormField label="Nome completo">
              <input
                type="text"
                className="tfd-input"
                value={nomeCompleto}
                disabled
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
                style={{ fontFamily: 'var(--tfd-font-mono)' }}
              />
            </FormField>

            <FormField label="E-mail">
              <input
                type="email"
                className="tfd-input"
                value={email}
                disabled
              />
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

          {/* Telefones — dentro de Dados Pessoais */}
          <div className="pt-4 mt-2" style={{ borderTop: '1px solid var(--tfd-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Phone size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Telefones</span>
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
              <p className="text-sm py-2 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
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
        </div>

        {/* ========== Dados Medicos (MEDICO_AUDITOR only) ========== */}
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

        {/* ========== Segurança ========== */}
        <div className="tfd-card">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound size={16} style={{ color: 'var(--tfd-primary-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Segurança</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormField label="Senha atual" required>
              <div className="relative">
                <input
                  type={showSenhaAtual ? 'text' : 'password'}
                  className="tfd-input pr-10"
                  placeholder="Digite sua senha atual"
                  value={senhaAtual}
                  onChange={(e) => { setSenhaAtual(e.target.value); setSenhaAtualError(''); }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--tfd-text-muted)' }}
                  onClick={() => setShowSenhaAtual((p) => !p)}
                  tabIndex={-1}
                >
                  {showSenhaAtual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {senhaAtualError && (
                <p className="text-xs mt-1" style={{ color: 'var(--tfd-status-danger)' }}>
                  {senhaAtualError}
                </p>
              )}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <FormField label="Nova senha" required>
              <div className="relative">
                <input
                  type={showNovaSenha ? 'text' : 'password'}
                  className="tfd-input pr-10"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--tfd-text-muted)' }}
                  onClick={() => setShowNovaSenha((p) => !p)}
                  tabIndex={-1}
                >
                  {showNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>

            <FormField label="Confirmar nova senha" required>
              <input
                type={showNovaSenha ? 'text' : 'password'}
                className="tfd-input"
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
              {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                <p className="text-xs mt-1" style={{ color: 'var(--tfd-status-danger)' }}>
                  As senhas não coincidem
                </p>
              )}
            </FormField>
          </div>

          <div className="flex justify-end">
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={savingSenha || !senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha}
              onClick={handleAtualizarSenha}
            >
              {savingSenha ? (
                <><Loader2 size={16} className="animate-spin" /> Atualizando...</>
              ) : (
                <><KeyRound size={16} /> Redefinir Senha</>
              )}
            </button>
          </div>
        </div>

        {/* ========== Save button ========== */}
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
    </>
  );
}
