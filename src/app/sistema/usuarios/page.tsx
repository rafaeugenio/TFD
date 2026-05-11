'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Shield,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  AlertTriangle,
  Info,
  Monitor,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { maskCPF } from '@/shared/pipes/formatters';

import PageHeader from '@/shared/components/page-header/PageHeader';
import EmptyState from '@/shared/components/empty-state/EmptyState';
import { useToast } from '@/shared/components/toast/Toast';
import { MOCK_USUARIOS } from '@/core/mocks/usuarios.mock';
import {
  listarUsuarios,
  atualizarUsuario,
  desativarUsuario,
} from '@/services/usuarios.service';
import {
  listarPapeis,
  listarTelas,
  listarTelasDoPapel,
  type Papel,
  type TelaSistema,
} from '@/services/papeis.service';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface UsuarioRow {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  perfil: string;
  ativo: boolean;
  papel_id: string | null;
  is_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    '#3B82F6', '#7C3AED', '#0D9488', '#EA580C',
    '#E11D48', '#0284C7', '#16A34A', '#D97706',
    '#6366F1', '#059669', '#DC2626', '#7C2D12',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Convert mock Usuario to UsuarioRow shape */
function mockToRow(mock: (typeof MOCK_USUARIOS)[number]): UsuarioRow {
  return {
    id: mock.id,
    nome_completo: mock.nome,
    cpf: '',
    email: mock.email,
    perfil: mock.perfil,
    ativo: mock.ativo,
    papel_id: null,
    is_admin: mock.perfil === 'ADMIN',
  };
}

/* -------------------------------------------------- */
/*  MODULOS — mirrors PermissoesPanel                  */
/* -------------------------------------------------- */

const MODULOS = [
  {
    key: 'operacional',
    label: 'Operacional',
    telas: ['Dashboard', 'Solicitações', 'Regulação Médica'],
  },
  {
    key: 'atendimento',
    label: 'Atendimento e Viagem',
    telas: ['Agendamentos', 'Viagens e Passagens'],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    telas: ['Ajuda de Custo / Diárias', 'Permanência'],
  },
  {
    key: 'gestao',
    label: 'Gestão',
    telas: ['Altas e Encerramento', 'Relatórios', 'Configurações'],
  },
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UsuariosPage() {
  const toast = useToast();

  /* ---- State ---- */
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [telas, setTelas] = useState<TelaSistema[]>([]);
  const [telasMap, setTelasMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---- Create user drawer state ---- */
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createNome, setCreateNome] = useState('');
  const [createCpf, setCreateCpf] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createSenha, setCreateSenha] = useState('');
  const [createPapelId, setCreatePapelId] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [showCreateSenha, setShowCreateSenha] = useState(false);

  /* ---- Papel change loading ---- */
  const [savingPapelFor, setSavingPapelFor] = useState<string | null>(null);

  /* ---- Data loading ---- */

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Fire all requests in parallel
      const usersPromise = listarUsuarios();
      const papeisPromise = listarPapeis() as Promise<{ data: unknown; error: unknown }>;
      const telasPromise = listarTelas() as Promise<{ data: unknown; error: unknown }>;

      const usersRes = await usersPromise;
      const papeisRes = await papeisPromise;
      const telasRes = await telasPromise;

      // Users: fallback to mocks if Supabase table is empty or errors
      if (usersRes.error || !usersRes.data || (usersRes.data as unknown[]).length === 0) {
        setUsuarios(MOCK_USUARIOS.map(mockToRow));
      } else {
        setUsuarios(usersRes.data as unknown as UsuarioRow[]);
      }

      // Papeis
      if (!papeisRes.error && papeisRes.data) {
        setPapeis(papeisRes.data as Papel[]);
      }

      // Telas
      if (!telasRes.error && telasRes.data) {
        setTelas(telasRes.data as TelaSistema[]);
      }

    } catch {
      setUsuarios(MOCK_USUARIOS.map(mockToRow));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Load telas for each papel ---- */

  const loadPapelTelas = useCallback(async (papelId: string) => {
    if (!papelId) return;
    const res = await listarTelasDoPapel(papelId) as { data: unknown; error: unknown };
    if (!res.error && res.data) {
      const telaIds = [...new Set((res.data as { tela_id: string; acao: string }[]).map((r) => r.tela_id))];
      setTelasMap((prev) => ({ ...prev, [papelId]: telaIds }));
    }
  }, []);

  useEffect(() => {
    papeis.forEach((p) => {
      if (!telasMap[p.id]) {
        loadPapelTelas(p.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papeis, loadPapelTelas]);

  /* ---- Derived data ---- */

  const filtered = useMemo(() => {
    if (!search.trim()) return usuarios;
    const q = search.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nome_completo.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.cpf.includes(q),
    );
  }, [usuarios, search]);

  /* ---- Helpers for telas display ---- */

  function getTelaNames(papelId: string): { modulo: string; telas: string[] }[] {
    const telaIds = telasMap[papelId] ?? [];
    if (telaIds.length === 0) return [];

    const matched = telas.filter((t) => telaIds.includes(t.id));
    const grouped: Record<string, string[]> = {};
    matched.forEach((t) => {
      if (!grouped[t.modulo]) grouped[t.modulo] = [];
      grouped[t.modulo].push(t.nome);
    });
    return Object.entries(grouped).map(([modulo, names]) => ({ modulo, telas: names }));
  }

  function countTelas(papelId: string): number {
    return (telasMap[papelId] ?? []).length;
  }

  /* ---- Papel for user ---- */

  function getPapel(papelId: string | null): Papel | undefined {
    if (!papelId) return undefined;
    return papeis.find((p) => p.id === papelId);
  }

  /* ---- Handlers ---- */

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const isRealUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const handlePapelChange = async (userId: string, newPapelId: string) => {
    setSavingPapelFor(userId);
    setErrorMsg(null);

    // Mock users (non-UUID IDs) — update only local state
    if (!isRealUUID(userId)) {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, papel_id: newPapelId || null } : u,
        ),
      );
      toast.success('Papel alterado!', 'O papel do usuário foi atualizado.');
      setSavingPapelFor(null);
      return;
    }

    const { error } = await atualizarUsuario(userId, {
      papel_id: newPapelId || null,
    } as unknown as Parameters<typeof atualizarUsuario>[1]);

    if (error) {
      setErrorMsg(`Erro ao atualizar papel: ${error.message}`);
    } else {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, papel_id: newPapelId || null } : u,
        ),
      );
      toast.success('Papel alterado!', 'O papel do usuário foi atualizado.');
    }
    setSavingPapelFor(null);
  };

  const handleRemoveUser = async (user: UsuarioRow) => {
    if (
      !window.confirm(
        `Remover "${user.nome_completo}" do sistema? O usuario sera desativado.`,
      )
    )
      return;

    // Mock users — just remove from local state
    if (!isRealUUID(user.id)) {
      setUsuarios((prev) => prev.filter((u) => u.id !== user.id));
      toast.success('Usuário removido!', 'O usuário foi desvinculado do sistema.');
      return;
    }

    const { error } = await desativarUsuario(user.id);
    if (error) {
      setErrorMsg(`Erro ao desativar: ${error.message}`);
      return;
    }
    setUsuarios((prev) => prev.filter((u) => u.id !== user.id));
    toast.success('Usuário removido!', 'O usuário foi desvinculado do sistema.');
  };

  /* ---- Create user drawer handlers ---- */

  function handleOpenCreateDrawer() {
    setCreateNome('');
    setCreateCpf('');
    setCreateEmail('');
    setCreateSenha('');
    setCreatePapelId('');
    setCreateSaving(false);
    setShowCreateSenha(false);
    setCreateDrawerOpen(true);
  }

  function handleCloseCreateDrawer() {
    setCreateDrawerOpen(false);
  }

  async function handleCreateUser() {
    if (!createNome.trim()) {
      toast.warning('Campo obrigatório', 'Informe o nome do usuário.');
      return;
    }
    if (createCpf.replace(/\D/g, '').length !== 11) {
      toast.warning('CPF inválido', 'Informe um CPF com 11 dígitos.');
      return;
    }
    if (!createEmail.trim() || !createEmail.includes('@')) {
      toast.warning('Campo obrigatório', 'Informe um e-mail válido.');
      return;
    }
    if (createSenha.length < 6) {
      toast.warning('Senha muito curta', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setCreateSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/usuarios/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: createNome.trim(),
          cpf: createCpf,
          email: createEmail.trim(),
          senha: createSenha,
          papelId: createPapelId || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error('Erro ao cadastrar', json.error ?? 'Tente novamente.');
        setCreateSaving(false);
        return;
      }

      toast.success('Usuário cadastrado!', `${createNome.trim()} foi adicionado ao sistema.`);
      handleCloseCreateDrawer();
      loadData();
    } catch {
      toast.error('Erro inesperado', 'Verifique sua conexão e tente novamente.');
      setCreateSaving(false);
    }
  }

  /* ---- Render ---- */

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Usuarios"
        subtitle="Gerencie os usuarios do sistema e seus papeis de acesso"
        breadcrumbs={[
          { label: 'Sistema', href: '/sistema' },
          { label: 'Usuarios' },
        ]}
      />

      {/* Toolbar (estilo v2) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36, minWidth: 280, maxWidth: 320,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

        <span className="text-[13px] whitespace-nowrap" style={{ color: '#94A3B8' }}>
          {filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/sistema/papeis"
            className="tfd-btn tfd-btn-secondary tfd-btn--sm"
          >
            <Shield size={14} />
            Gerenciar Permissões
          </Link>
          <button
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={handleOpenCreateDrawer}
          >
            <Plus size={14} />
            Adicionar Usuário
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          className="tfd-message tfd-message--danger mb-4"
        >
          <AlertTriangle size={16} className="tfd-message-icon" />
          <div>
            <p className="text-sm font-medium">Erro</p>
            <p className="text-xs mt-0.5 opacity-80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ========== Create User Drawer ========== */}
      <Drawer
        open={createDrawerOpen}
        onClose={handleCloseCreateDrawer}
        title="Adicionar Usuário"
        subtitle="Cadastre um novo membro diretamente no sistema"
        width="460px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseCreateDrawer} disabled={createSaving}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleCreateUser} disabled={createSaving}>
              {createSaving ? (
                <><Loader2 size={14} className="animate-spin" /> Cadastrando...</>
              ) : (
                <><UserPlus size={14} /> Cadastrar Usuário</>
              )}
            </button>
          </>
        }
      >
        <div className="tfd-message tfd-message--info mb-4">
          <span className="tfd-message-icon mt-0.5 shrink-0">
            <Info size={16} />
          </span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
            O usuário receberá acesso imediato ao sistema com a senha temporária definida aqui. Ele pode redefini-la no próprio perfil.
          </p>
        </div>

        <FormField label="Nome completo" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Nome do novo usuário"
            value={createNome}
            onChange={(e) => setCreateNome(e.target.value)}
          />
        </FormField>

        <FormField label="CPF" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="000.000.000-00"
            value={createCpf}
            onChange={(e) => setCreateCpf(maskCPF(e.target.value))}
            style={{ fontFamily: 'var(--tfd-font-mono)' }}
          />
        </FormField>

        <FormField label="E-mail institucional" required>
          <input
            type="email"
            className="tfd-input"
            placeholder="email@exemplo.gov.br"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
          />
        </FormField>

        <FormField label="Senha temporária" required>
          <div className="relative">
            <input
              type={showCreateSenha ? 'text' : 'password'}
              className="tfd-input pr-10"
              placeholder="Mínimo 6 caracteres"
              value={createSenha}
              onChange={(e) => setCreateSenha(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
              style={{ color: 'var(--tfd-text-muted)' }}
              onClick={() => setShowCreateSenha((p) => !p)}
              tabIndex={-1}
            >
              {showCreateSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <FormField label="Papel de acesso">
          <select
            className="tfd-input"
            value={createPapelId}
            onChange={(e) => setCreatePapelId(e.target.value)}
          >
            <option value="">Selecione um papel (opcional)...</option>
            {papeis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </FormField>
      </Drawer>

      {/* Loading */}
      {loading && (
        <div
          className="flex items-center justify-center py-16 gap-2"
          style={{ color: 'var(--tfd-text-muted)' }}
        >
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Carregando usuarios...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={<Users />}
          title="Nenhum usuario encontrado"
          description={
            search
              ? 'Tente ajustar os termos de busca.'
              : 'Adicione o primeiro usuario ao sistema.'
          }
        />
      )}

      {/* User cards */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((user) => {
            const isExpanded = expandedId === user.id;
            const papel = getPapel(user.papel_id);
            const avatarColor = getAvatarColor(user.nome_completo);
            const telaCount = user.papel_id ? countTelas(user.papel_id) : 0;

            return (
              <div key={user.id} className="tfd-card" style={{ padding: 0 }}>
                {/* Collapsed row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleToggleExpand(user.id)}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{
                      backgroundColor: avatarColor,
                      color: '#FFFFFF',
                    }}
                  >
                    {getInitials(user.nome_completo)}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--tfd-text-primary)' }}
                    >
                      {user.nome_completo}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--tfd-text-muted)' }}
                    >
                      {user.email}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Papel or Admin badge */}
                    {user.is_admin ? (
                      <span
                        className="tfd-tag tfd-tag--rounded"
                        style={{
                          backgroundColor: 'var(--tfd-surface-900)',
                          color: '#FFFFFF',
                        }}
                      >
                        <Shield size={12} />
                        Administrador
                      </span>
                    ) : papel ? (
                      <span
                        className="tfd-tag tfd-tag--rounded"
                        style={{
                          backgroundColor: `${papel.cor}18`,
                          color: papel.cor,
                        }}
                      >
                        {papel.nome}
                      </span>
                    ) : (
                      <span className="tfd-tag tfd-tag--rounded tfd-tag--secondary">
                        Sem papel
                      </span>
                    )}

                    {/* Tela count badge */}
                    {!user.is_admin && papel && telaCount > 0 && (
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--secondary"
                        style={{ fontSize: '0.6875rem' }}
                      >
                        <Monitor size={11} />
                        {telaCount} {telaCount === 1 ? 'tela' : 'telas'}
                      </span>
                    )}

                    {/* Chevron */}
                    <span style={{ color: 'var(--tfd-text-muted)' }}>
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4"
                    style={{
                      borderTop: '1px solid var(--tfd-surface-border)',
                    }}
                  >
                    <div className="pt-4">
                      {user.is_admin ? (
                        /* ---- Admin expanded ---- */
                        <div>
                          <div
                            className="flex items-center gap-2 mb-3"
                          >
                            <span
                              className="tfd-tag tfd-tag--rounded"
                              style={{
                                backgroundColor: 'var(--tfd-surface-900)',
                                color: '#FFFFFF',
                              }}
                            >
                              <Shield size={12} />
                              Administrador
                            </span>
                          </div>
                          <div
                            className="tfd-message tfd-message--info mb-4"
                          >
                            <Info size={16} className="tfd-message-icon" />
                            <p className="text-sm">
                              Administradores tem acesso total a todos os
                              modulos do sistema.
                            </p>
                          </div>

                          <button
                            className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm"
                            onClick={() => handleRemoveUser(user)}
                          >
                            <Trash2 size={14} />
                            Remover do sistema
                          </button>
                        </div>
                      ) : (
                        /* ---- Regular user expanded ---- */
                        <div>
                          {/* Papel selector */}
                          <div className="mb-4">
                            <label
                              className="tfd-label"
                              htmlFor={`papel-${user.id}`}
                            >
                              Papel de Acesso
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                id={`papel-${user.id}`}
                                className="tfd-input tfd-input--sm"
                                style={{ maxWidth: '280px' }}
                                value={user.papel_id ?? ''}
                                onChange={(e) =>
                                  handlePapelChange(user.id, e.target.value)
                                }
                                disabled={savingPapelFor === user.id}
                              >
                                <option value="">Selecione um papel...</option>
                                {papeis.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                              </select>
                              {savingPapelFor === user.id && (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                  style={{ color: 'var(--tfd-primary-500)' }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Telas list */}
                          {user.papel_id && (
                            <div className="mb-4">
                              <p
                                className="text-xs font-semibold uppercase tracking-wider mb-2"
                                style={{ color: 'var(--tfd-text-muted)' }}
                              >
                                Telas do papel
                              </p>

                              {(() => {
                                const groups = getTelaNames(user.papel_id!);
                                if (groups.length === 0) {
                                  return (
                                    <p
                                      className="text-sm"
                                      style={{
                                        color: 'var(--tfd-text-muted)',
                                      }}
                                    >
                                      Nenhuma tela atribuida a este papel.
                                    </p>
                                  );
                                }

                                return (
                                  <div
                                    className="rounded-lg overflow-hidden"
                                    style={{
                                      border:
                                        '1px solid var(--tfd-surface-border)',
                                    }}
                                  >
                                    {groups.map((group, gIdx) => (
                                      <div key={group.modulo}>
                                        {/* Module header */}
                                        <div
                                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                                          style={{
                                            backgroundColor:
                                              'var(--tfd-surface-50)',
                                            color:
                                              'var(--tfd-text-secondary)',
                                            borderTop:
                                              gIdx > 0
                                                ? '1px solid var(--tfd-surface-border)'
                                                : undefined,
                                          }}
                                        >
                                          {group.modulo}
                                        </div>
                                        {/* Tela rows */}
                                        {group.telas.map((tela) => (
                                          <div
                                            key={tela}
                                            className="flex items-center gap-2 px-3 py-1.5 pl-6 text-sm"
                                            style={{
                                              borderTop:
                                                '1px solid var(--tfd-surface-border)',
                                              color:
                                                'var(--tfd-text-primary)',
                                            }}
                                          >
                                            <Monitor
                                              size={13}
                                              style={{
                                                color:
                                                  'var(--tfd-text-muted)',
                                              }}
                                            />
                                            {tela}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}

                              {/* Fallback: if no telas from DB, show static MODULOS */}
                              {telas.length === 0 &&
                                (telasMap[user.papel_id!] ?? []).length === 0 && (
                                  <div
                                    className="rounded-lg overflow-hidden"
                                    style={{
                                      border:
                                        '1px solid var(--tfd-surface-border)',
                                    }}
                                  >
                                    {MODULOS.map((mod, mIdx) => (
                                      <div key={mod.key}>
                                        <div
                                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                                          style={{
                                            backgroundColor:
                                              'var(--tfd-surface-50)',
                                            color:
                                              'var(--tfd-text-secondary)',
                                            borderTop:
                                              mIdx > 0
                                                ? '1px solid var(--tfd-surface-border)'
                                                : undefined,
                                          }}
                                        >
                                          {mod.label}
                                        </div>
                                        {mod.telas.map((tela) => (
                                          <div
                                            key={tela}
                                            className="flex items-center gap-2 px-3 py-1.5 pl-6 text-sm"
                                            style={{
                                              borderTop:
                                                '1px solid var(--tfd-surface-border)',
                                              color:
                                                'var(--tfd-text-muted)',
                                            }}
                                          >
                                            <Monitor
                                              size={13}
                                              style={{
                                                color:
                                                  'var(--tfd-surface-300)',
                                              }}
                                            />
                                            {tela}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}

                          <hr className="tfd-divider" />

                          {/* Remove button */}
                          <button
                            className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm"
                            onClick={() => handleRemoveUser(user)}
                          >
                            <Trash2 size={14} />
                            Remover do sistema
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
