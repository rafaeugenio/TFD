'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Shield,
  Trash2,
  Loader2,
  AlertTriangle,
  UserPlus,
  Package,
  KeyRound,
  Mail,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import Pagination from '@/shared/components/pagination/Pagination';
import ConfirmDialog, { type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import SortTh, { type SortDir, nextSort, compareValues } from '@/shared/components/sort-th/SortTh';
import { maskCPF } from '@/shared/pipes/formatters';

import PageHeader from '@/shared/components/page-header/PageHeader';
import EmptyState from '@/shared/components/empty-state/EmptyState';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarUsuarios,
  atualizarUsuario,
} from '@/services/usuarios.service';
import {
  listarPapeis,
  listarTelas,
  listarTelasDoPapel,
  type Papel,
  type TelaSistema,
} from '@/services/papeis.service';
import { TableRowsSkeleton } from '@/shared/components/skeleton';
import { Can } from '@/shared/auth/Can';

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

const DEFAULT_PAGE_SIZE = 25;

const isRealUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UsuariosPage() {
  return <UsuariosPanel showHeader />;
}

export function UsuariosPanel({ showHeader = true }: { showHeader?: boolean }) {
  const toast = useToast();

  /* ---- State ---- */
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [telas, setTelas] = useState<TelaSistema[]>([]);
  const [telasMap, setTelasMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ---- Filter / sort / pagination ---- */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterPapel, setFilterPapel] = useState<string>('');
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'nome_completo', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* ---- Create user drawer state ---- */
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createNome, setCreateNome] = useState('');
  const [createCpf, setCreateCpf] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPapelId, setCreatePapelId] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  /* ---- Reset password confirmation ---- */
  const [resetTarget, setResetTarget] = useState<UsuarioRow | null>(null);
  const [resetting, setResetting] = useState(false);

  /* ---- Papel change loading ---- */
  const [savingPapelFor, setSavingPapelFor] = useState<string | null>(null);

  /* ---- Delete confirmation ---- */
  const [deleteTarget, setDeleteTarget] = useState<UsuarioRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  /* ---- Create confirmation ---- */
  const [createConfirm, setCreateConfirm] = useState<{ diff: DiffField[] } | null>(null);

  /* ---- Debounce search (300ms) ---- */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [filterPapel]);

  /* ---- Data loading ---- */
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const [usersRes, papeisRes, telasRes] = await Promise.all([
        listarUsuarios(),
        listarPapeis() as Promise<{ data: unknown; error: unknown }>,
        listarTelas() as Promise<{ data: unknown; error: unknown }>,
      ]);

      if (usersRes.error) {
        setErrorMsg('Não foi possível carregar a lista de usuários.');
        setUsuarios([]);
      } else {
        setUsuarios((usersRes.data ?? []) as unknown as UsuarioRow[]);
      }

      if (!papeisRes.error && papeisRes.data) {
        setPapeis(papeisRes.data as Papel[]);
      }
      if (!telasRes.error && telasRes.data) {
        setTelas(telasRes.data as TelaSistema[]);
      }
    } catch {
      setErrorMsg('Não foi possível carregar a lista de usuários.');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---- Load telas for each papel ---- */
  const loadPapelTelas = useCallback(async (papelId: string) => {
    if (!papelId) return;
    const res = (await listarTelasDoPapel(papelId)) as { data: unknown; error: unknown };
    if (!res.error && res.data) {
      const telaIds = [...new Set((res.data as { tela_id: string; acao: string }[]).map((r) => r.tela_id))];
      setTelasMap((prev) => ({ ...prev, [papelId]: telaIds }));
    }
  }, []);

  useEffect(() => {
    papeis.forEach((p) => {
      if (!telasMap[p.id]) loadPapelTelas(p.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papeis, loadPapelTelas]);

  /* ---- Derived helpers ---- */
  const getPapel = useCallback(
    (papelId: string | null) => (papelId ? papeis.find((p) => p.id === papelId) : undefined),
    [papeis],
  );

  const countTelas = useCallback(
    (papelId: string | null) => (papelId ? (telasMap[papelId] ?? []).length : 0),
    [telasMap],
  );

  /* ---- Filtragem, ordenação, paginação ---- */
  const filtered = useMemo(() => {
    let result = usuarios;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.nome_completo.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.cpf.includes(q),
      );
    }

    if (filterPapel === '__sem_papel') {
      result = result.filter((u) => !u.is_admin && !u.papel_id);
    } else if (filterPapel === '__admin') {
      result = result.filter((u) => u.is_admin);
    } else if (filterPapel) {
      result = result.filter((u) => u.papel_id === filterPapel);
    }

    if (sort.dir) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (sort.field === 'papel') {
          const aName = a.is_admin ? 'Administrador' : (getPapel(a.papel_id)?.nome ?? '');
          const bName = b.is_admin ? 'Administrador' : (getPapel(b.papel_id)?.nome ?? '');
          return compareValues(aName, bName) * dir;
        }
        if (sort.field === 'telas') {
          const aC = a.is_admin ? Number.MAX_SAFE_INTEGER : countTelas(a.papel_id);
          const bC = b.is_admin ? Number.MAX_SAFE_INTEGER : countTelas(b.papel_id);
          return (aC - bC) * dir;
        }
        const field = sort.field as keyof UsuarioRow;
        return compareValues(a[field], b[field]) * dir;
      });
    }
    return result;
  }, [usuarios, search, filterPapel, sort, getPapel, countTelas]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  /* ---- Handlers ---- */
  const handlePapelChange = async (userId: string, newPapelId: string) => {
    setSavingPapelFor(userId);
    setErrorMsg(null);

    if (!isRealUUID(userId)) {
      setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, papel_id: newPapelId || null } : u)));
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
      setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, papel_id: newPapelId || null } : u)));
      toast.success('Papel alterado!', 'O papel do usuário foi atualizado.');
    }
    setSavingPapelFor(null);
  };

  const confirmRemoveUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    if (!isRealUUID(deleteTarget.id)) {
      setUsuarios((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success('Usuário removido!', 'O usuário foi desvinculado do sistema.');
      setDeleteTarget(null);
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Erro ao excluir', json.error ?? 'Tente novamente.');
        setDeleting(false);
        return;
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success('Usuário excluído!', 'A conta foi removida do sistema permanentemente.');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Erro ao excluir', err instanceof Error ? err.message : 'Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Create user drawer handlers ---- */
  function handleOpenCreateDrawer() {
    setCreateNome(''); setCreateCpf(''); setCreateEmail('');
    setCreatePapelId('');
    setCreateSaving(false);
    setCreateDrawerOpen(true);
  }

  function handleCloseCreateDrawer() { setCreateDrawerOpen(false); }

  /** Valida e abre modal de confirmação antes de criar. */
  function handleRequestCreate() {
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
    const papelNome = createPapelId ? (papeis.find((p) => p.id === createPapelId)?.nome ?? '') : '';
    const diff: DiffField[] = [
      { label: 'Nome', after: createNome.trim() },
      { label: 'CPF', after: createCpf },
      { label: 'E-mail', after: createEmail.trim() },
      { label: 'Papel', after: papelNome || '(sem papel)' },
    ];
    setCreateConfirm({ diff });
  }

  async function handleCreateUser() {
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
          papelId: createPapelId || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error('Erro ao cadastrar', json.error ?? 'Tente novamente.');
        setCreateSaving(false);
        return;
      }

      if (json.emailEnviado) {
        toast.success(
          'Usuário cadastrado!',
          `${createNome.trim()} receberá um e-mail em ${createEmail.trim()} com o link para definir a senha.`,
        );
      } else {
        toast.warning(
          'Usuário cadastrado, mas o e-mail não foi enviado',
          json.emailError
            ? `Configure o SMTP do Supabase. Detalhe: ${json.emailError}`
            : 'Verifique a configuração de SMTP do projeto.',
        );
      }
      handleCloseCreateDrawer();
      loadData();
    } catch {
      toast.error('Erro inesperado', 'Verifique sua conexão e tente novamente.');
      setCreateSaving(false);
    }
  }

  /* ---- Reset password handler ---- */
  async function handleConfirmResetSenha() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/usuarios/${resetTarget.id}/redefinir-senha`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error('Erro ao redefinir senha', json.error ?? 'Tente novamente.');
        setResetting(false);
        return;
      }
      if (json.emailEnviado) {
        toast.success(
          'Senha redefinida!',
          `${resetTarget.nome_completo} receberá um e-mail em ${resetTarget.email} com o link para definir uma nova senha.`,
        );
      } else {
        toast.warning(
          'Senha redefinida, mas o e-mail não foi enviado',
          json.emailError
            ? `Configure o SMTP do Supabase. Detalhe: ${json.emailError}`
            : 'Verifique a configuração de SMTP do projeto.',
        );
      }
      setResetTarget(null);
      setResetting(false);
    } catch {
      toast.error('Erro inesperado', 'Verifique sua conexão e tente novamente.');
      setResetting(false);
    }
  }

  const totalTelas = telas.length;
  const isFiltered = Boolean(search || filterPapel);

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <div>
      {showHeader ? (
        <PageHeader
          title="Usuários"
          subtitle="Gerencie os usuários do sistema e seus papéis de acesso"
          breadcrumbs={[
            { label: 'Sistema', href: '/sistema' },
            { label: 'Usuários' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Can action="sys_papeis.visualizar">
                <Link href="/sistema/papeis" className="tfd-btn tfd-btn-secondary">
                  <Shield size={16} />
                  Gerenciar Permissões
                </Link>
              </Can>
              <Can action="sys_usuarios.criar">
                <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreateDrawer}>
                  <Plus size={16} />
                  Adicionar Usuário
                </button>
              </Can>
            </div>
          }
        />
      ) : (
        <div className="flex items-center justify-end mb-4">
          <Can action="sys_usuarios.criar">
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleOpenCreateDrawer}>
              <Plus size={16} />
              Adicionar Usuário
            </button>
          </Can>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            height: 36,
            minWidth: 280,
            flex: 1,
            maxWidth: 420,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

        <select
          value={filterPapel}
          onChange={(e) => setFilterPapel(e.target.value)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          <option value="">Todos os papéis</option>
          <option value="__admin">Administradores</option>
          <option value="__sem_papel">Sem papel</option>
          {papeis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="tfd-message tfd-message--danger mb-4">
          <AlertTriangle size={16} className="tfd-message-icon" />
          <div>
            <p className="text-sm font-medium">Erro</p>
            <p className="text-xs mt-0.5 opacity-80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Empty state — sem nenhum usuário cadastrado */}
      {!loading && usuarios.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Nenhum usuário cadastrado"
          description="Adicione o primeiro usuário ao sistema."
          action={
            <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreateDrawer}>
              <Plus size={16} />
              Adicionar Usuário
            </button>
          }
        />
      ) : (
        /* Tabela */
        <div
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 'var(--tfd-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  <SortTh label="Usuário" field="nome_completo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                  <Th>CPF</Th>
                  <SortTh label="Papel" field="papel" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                  <SortTh label="Telas" field="telas" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowsSkeleton rows={6} columns={5} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className="flex items-center justify-center w-14 h-14 rounded-2xl"
                          style={{ backgroundColor: 'var(--tfd-primary-50)' }}
                        >
                          <Package size={26} style={{ color: 'var(--tfd-primary-400)' }} />
                        </div>
                        <p className="text-sm">Nenhum usuário para os filtros selecionados.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((user) => {
                    const papel = getPapel(user.papel_id);
                    const avatarColor = getAvatarColor(user.nome_completo);
                    const telaCount = countTelas(user.papel_id);
                    const acessoTotal = user.is_admin;

                    return (
                      <tr
                        key={user.id}
                        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        {/* Usuário */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-[11px] font-semibold"
                              style={{ backgroundColor: avatarColor, color: '#FFFFFF' }}
                            >
                              {getInitials(user.nome_completo)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate" style={{ color: '#1A1D2B' }}>
                                {user.nome_completo}
                              </p>
                              <p className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* CPF */}
                        <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                          {user.cpf ? maskCPF(user.cpf) : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}
                        </td>

                        {/* Papel — inline select */}
                        <td className="px-4 py-3.5">
                          {user.is_admin ? (
                            <span
                              className="tfd-tag tfd-tag--rounded"
                              style={{ backgroundColor: 'var(--tfd-surface-900)', color: '#FFFFFF' }}
                            >
                              <Shield size={12} />
                              Administrador
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {papel && (
                                <span
                                  className="inline-block shrink-0"
                                  style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    backgroundColor: papel.cor,
                                  }}
                                />
                              )}
                              <select
                                value={user.papel_id ?? ''}
                                onChange={(e) => handlePapelChange(user.id, e.target.value)}
                                disabled={savingPapelFor === user.id}
                                style={{
                                  height: 30,
                                  padding: '0 8px',
                                  background: 'white',
                                  border: '1px solid var(--tfd-surface-border)',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  color: papel ? '#1A1D2B' : 'var(--tfd-text-muted)',
                                  fontWeight: papel ? 500 : 400,
                                  cursor: savingPapelFor === user.id ? 'not-allowed' : 'pointer',
                                  minWidth: 160,
                                }}
                              >
                                <option value="">Sem papel</option>
                                {papeis.map((p) => (
                                  <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                              </select>
                              {savingPapelFor === user.id && (
                                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                              )}
                            </div>
                          )}
                        </td>

                        {/* Telas */}
                        <td className="px-4 py-3.5 text-right">
                          {acessoTotal ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{
                                backgroundColor: 'var(--tfd-status-success-bg)',
                                color: 'var(--tfd-status-success)',
                              }}
                            >
                              Acesso total
                            </span>
                          ) : papel ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{
                                backgroundColor: 'var(--tfd-primary-50)',
                                color: 'var(--tfd-primary-500)',
                              }}
                            >
                              {telaCount} / {totalTelas}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Redefinir senha"
                              onClick={() => setResetTarget(user)}
                              style={{ color: 'var(--tfd-text-secondary)' }}
                            >
                              <KeyRound size={15} />
                            </button>
                            <button
                              className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                              title="Remover do sistema"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            total={filtered.length}
            pageSize={pageSize}
            page={page}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            recordLabel={`usuário${filtered.length === 1 ? '' : 's'}${isFiltered ? ' (filtrado)' : ''}`}
          />
        </div>
      )}

      {/* Modal: Confirmar remoção */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="tfd-card tfd-card--flat w-full max-w-md" style={{ backgroundColor: 'var(--tfd-surface-card)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: '#fef2f2' }}>
                <AlertTriangle size={18} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
                  Remover &ldquo;{deleteTarget.nome_completo}&rdquo; do sistema?
                </h3>
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  O usuário será desativado e perderá acesso imediato. O histórico de ações é preservado nos logs de auditoria.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-danger" onClick={confirmRemoveUser} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Removendo...</> : <><Trash2 size={14} /> Remover</>}
              </button>
            </div>
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
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestCreate} disabled={createSaving}>
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
            <Mail size={16} />
          </span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
            O sistema gera uma senha temporária e envia ao usuário por e-mail, junto com o link para o primeiro acesso. Ao entrar, ele define a própria senha. Por segurança e rastreabilidade dos logs, <strong>nome, CPF e e-mail não poderão ser alterados depois</strong> — só o papel de acesso é editável. Cada CPF só pode ter um cadastro no sistema.
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

      {/* Confirmação de cadastro de usuário */}
      <ConfirmDialog
        open={!!createConfirm}
        tone="create"
        title="Confirmar cadastro de usuário?"
        subject={createNome.trim() || undefined}
        diff={createConfirm?.diff}
        busy={createSaving}
        onClose={() => setCreateConfirm(null)}
        onConfirm={async () => {
          await handleCreateUser();
          setCreateConfirm(null);
        }}
      />

      {/* Modal: Confirmar redefinição de senha */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="tfd-card tfd-card--flat w-full max-w-md" style={{ backgroundColor: 'var(--tfd-surface-card)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--tfd-primary-50)' }}
              >
                <KeyRound size={18} style={{ color: 'var(--tfd-primary-500)' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
                  Redefinir senha de {resetTarget.nome_completo}?
                </h3>
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  O sistema vai gerar uma nova senha temporária e enviar para <strong>{resetTarget.email}</strong> junto com o link para definir uma nova senha. O usuário será forçado a redefinir no próximo acesso.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => setResetTarget(null)} disabled={resetting}>
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-primary" onClick={handleConfirmResetSenha} disabled={resetting}>
                {resetting ? (
                  <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                ) : (
                  <><Mail size={14} /> Enviar e-mail</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  const cls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`px-4 py-3 font-semibold ${cls}`}
      style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {children}
    </th>
  );
}
