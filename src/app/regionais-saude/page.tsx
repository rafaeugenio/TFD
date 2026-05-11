'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin,
  CheckCircle2,
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { maskPhone } from '@/shared/pipes/formatters';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';

import {
  listarRegionaisSaude,
  buscarRegionalSaude,
  criarRegionalSaude,
  atualizarRegionalSaude,
  desativarRegionalSaude,
  listarMunicipiosPorRegional,
  atualizarMunicipiosRegional,
} from '@/services/regionais-saude.service';
import { listarRegioes } from '@/services/regioes.service';
import type { Regiao } from '@/core/models/regiao.model';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

interface IbgeMunicipio {
  id: number;
  nome: string;
}

/* -------------------------------------------------- */
/*  Wrapper                                            */
/* -------------------------------------------------- */

export default function RegionaisSaudePageWrapper() {
  return (
    <Suspense>
      <RegionaisSaudePage />
    </Suspense>
  );
}

function RegionaisSaudePage() {
  const toast = useToast();
  const router = useRouter();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Deactivate confirmation ---- */
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [deactivateConfirmName, setDeactivateConfirmName] = useState('');

  /* ---- Confirmação de cadastro/edição ---- */
  const [editingSnapshot, setEditingSnapshot] = useState<Record<string, string> | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [savingRegional, setSavingRegional] = useState(false);

  /* ---- Form: Identificação ---- */
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [municipioSede, setMunicipioSede] = useState('');

  /* ---- Form: Endereço ---- */
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');

  /* ---- Form: Contato ---- */
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [email, setEmail] = useState('');
  const [email2, setEmail2] = useState('');

  /* ---- Form: Região ---- */
  const [regiaoId, setRegiaoId] = useState<string>('');
  const [regioes, setRegioes] = useState<Regiao[]>([]);

  /* ---- Form: Municípios ---- */
  const [municipioSearch, setMunicipioSearch] = useState('');
  const [allMunicipiosMA, setAllMunicipiosMA] = useState<string[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedMunicipios, setSelectedMunicipios] = useState<Set<string>>(new Set());

  /* ---- Data fetching ---- */
  const { data: regionaisRaw, loading, refresh } = useSupabaseData(
    () => listarRegionaisSaude({ pageSize: 1000 }),
    [],
  );

  /* ---- Table controls (search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: regionaisRaw as unknown as Record<string, unknown>[],
    searchFields: ['nome', 'codigo', 'municipio_sede'],
    dateField: 'created_at',
  });

  const items = table.paginated as unknown as Record<string, unknown>[];

  /* ---- Summary counters (derived from fetched data) ---- */
  const counts = { total: regionaisRaw.length, ativas: regionaisRaw.length };

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && regionaisRaw.length > 0) {
      editarHandled.current = editarParam;
      const reg = regionaisRaw.find((r: Record<string, unknown>) => r.id === editarParam);
      if (reg) {
        handleOpenEdit(reg as Record<string, unknown>);
      } else {
        buscarRegionalSaude(editarParam).then(({ data }) => {
          if (data) handleOpenEdit(data as Record<string, unknown>);
        });
      }
      router.replace('/regionais-saude', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, regionaisRaw]);

  /* ---- Carregar regiões (uma vez) ---- */
  useEffect(() => {
    listarRegioes().then(({ data }) => {
      if (data) setRegioes(data as Regiao[]);
    });
  }, []);

  /* ---- Carregar municípios do MA via IBGE ao abrir drawer ---- */
  useEffect(() => {
    if (!drawerOpen || allMunicipiosMA.length > 0) return;
    setLoadingMunicipios(true);
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/MA/municipios?orderBy=nome')
      .then((r) => r.json())
      .then((data: IbgeMunicipio[]) => {
        setAllMunicipiosMA(data.map((m) => m.nome));
      })
      .catch(() => {
        toast.error('Erro ao carregar municípios', 'Não foi possível carregar a lista do IBGE.');
      })
      .finally(() => setLoadingMunicipios(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  /* -------------------------------------------------- */
  /*  Form reset & drawer handlers                      */
  /* -------------------------------------------------- */

  function resetForm() {
    setCodigo('');
    setNome('');
    setMunicipioSede('');
    setLogradouro('');
    setBairro('');
    setMunicipio('');
    setTelefone('');
    setTelefone2('');
    setEmail('');
    setEmail2('');
    setRegiaoId('');
    setMunicipioSearch('');
    setSelectedMunicipios(new Set());
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  async function handleOpenEdit(reg: Record<string, unknown>) {
    const id = reg.id as string;
    setEditingId(id);
    setEditingSnapshot({
      codigo: (reg.codigo as string) ?? '',
      nome: (reg.nome as string) ?? '',
      municipioSede: (reg.municipio_sede as string) ?? '',
      logradouro: (reg.logradouro as string) ?? '',
      bairro: (reg.bairro as string) ?? '',
      municipio: (reg.municipio as string) ?? '',
      telefone: (reg.telefone as string) ?? '',
      telefone2: (reg.telefone2 as string) ?? '',
      email: (reg.email as string) ?? '',
      email2: (reg.email2 as string) ?? '',
      regiaoId: (reg.regiao_id as string) ?? '',
    });
    setCodigo((reg.codigo as string) ?? '');
    setNome((reg.nome as string) ?? '');
    setMunicipioSede((reg.municipio_sede as string) ?? '');
    setLogradouro((reg.logradouro as string) ?? '');
    setBairro((reg.bairro as string) ?? '');
    setMunicipio((reg.municipio as string) ?? '');
    setTelefone(maskPhone((reg.telefone as string) ?? ''));
    setTelefone2(maskPhone((reg.telefone2 as string) ?? ''));
    setEmail((reg.email as string) ?? '');
    setEmail2((reg.email2 as string) ?? '');
    setRegiaoId((reg.regiao_id as string) ?? '');

    // Carrega municípios já associados
    const { data: munRows } = await listarMunicipiosPorRegional(id);
    if (munRows) {
      setSelectedMunicipios(new Set((munRows as { municipio_nome: string }[]).map((r) => r.municipio_nome)));
    }

    setDrawerOpen(true);
  }

  function handleOpenDeactivate(reg: Record<string, unknown>) {
    setDeactivateConfirmId(reg.id as string);
    setDeactivateConfirmName((reg.nome as string) ?? 'Regional');
  }

  async function handleConfirmDeactivate() {
    if (!deactivateConfirmId) return;
    const result = await desativarRegionalSaude(deactivateConfirmId);
    if (result.error) {
      toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
      return;
    }
    toast.success('Regional excluída', 'O registro foi desativado do sistema.');
    setDeactivateConfirmId(null);
    setDeactivateConfirmName('');
    refresh();
  }

  /* -------------------------------------------------- */
  /*  Municipality multi-select toggle                  */
  /* -------------------------------------------------- */

  function toggleMunicipio(nome: string) {
    setSelectedMunicipios((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  }

  const filteredMunicipios = municipioSearch.trim()
    ? allMunicipiosMA.filter((m) =>
        m.toLowerCase().includes(municipioSearch.toLowerCase()),
      )
    : allMunicipiosMA;

  /* -------------------------------------------------- */
  /*  Submit                                             */
  /* -------------------------------------------------- */

  /** Valida e abre o modal de confirmação. */
  function handleRequestSubmit() {
    if (!codigo.trim()) { toast.error('Campo obrigatório', 'Informe o código da regional (ex: URS I).'); return; }
    if (!nome.trim()) { toast.error('Campo obrigatório', 'Informe o nome da regional.'); return; }

    const enderecoCompleto = [logradouro.trim(), bairro.trim(), municipio.trim()].filter(Boolean).join(', ');
    const regiaoNomeFromId = (id: string) => regioes.find((r) => r.id === id)?.nome ?? '';

    if (editingId && editingSnapshot) {
      const before = {
        codigo: editingSnapshot.codigo,
        nome: editingSnapshot.nome,
        municipioSede: editingSnapshot.municipioSede,
        endereco: [editingSnapshot.logradouro, editingSnapshot.bairro, editingSnapshot.municipio].filter(Boolean).join(', '),
        telefone: editingSnapshot.telefone ? maskPhone(editingSnapshot.telefone) : '',
        telefone2: editingSnapshot.telefone2 ? maskPhone(editingSnapshot.telefone2) : '',
        email: editingSnapshot.email,
        email2: editingSnapshot.email2,
        regiao: regiaoNomeFromId(editingSnapshot.regiaoId),
      };
      const after = {
        codigo: codigo.trim().toUpperCase(),
        nome: nome.trim(),
        municipioSede: municipioSede.trim(),
        endereco: enderecoCompleto,
        telefone: telefone,
        telefone2: telefone2,
        email: email.trim(),
        email2: email2.trim(),
        regiao: regiaoNomeFromId(regiaoId),
      };
      const diff = buildDiff(before, after, [
        { key: 'codigo', label: 'Código' },
        { key: 'nome', label: 'Nome' },
        { key: 'municipioSede', label: 'Município sede' },
        { key: 'regiao', label: 'Região' },
        { key: 'endereco', label: 'Endereço' },
        { key: 'telefone', label: 'Telefone 1' },
        { key: 'telefone2', label: 'Telefone 2' },
        { key: 'email', label: 'E-mail' },
        { key: 'email2', label: 'E-mail 2' },
      ]);
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Código', after: codigo.trim().toUpperCase() },
          { label: 'Nome', after: nome.trim() },
          { label: 'Município sede', after: municipioSede.trim() },
          { label: 'Região', after: regiaoNomeFromId(regiaoId) },
          { label: 'Endereço', after: enderecoCompleto },
          { label: 'Telefone', after: telefone },
          { label: 'E-mail', after: email.trim() },
        ],
      });
    }
  }

  async function handleSubmit() {

    const cleanTel = telefone.replace(/\D/g, '');
    const cleanTel2 = telefone2.replace(/\D/g, '');

    const payload = {
      codigo: codigo.trim().toUpperCase(),
      nome: nome.trim(),
      municipio_sede: municipioSede.trim() || null,
      logradouro: logradouro.trim() || null,
      bairro: bairro.trim() || null,
      municipio: municipio.trim() || null,
      uf: 'MA',
      telefone: cleanTel || null,
      telefone2: cleanTel2 || null,
      email: email.trim() || null,
      email2: email2.trim() || null,
      regiao_id: regiaoId || null,
      ativo: true,
    } as Parameters<typeof criarRegionalSaude>[0];

    let savedId = editingId;

    if (editingId) {
      const result = await atualizarRegionalSaude(editingId, payload);
      if (result.error) {
        toast.error('Erro ao atualizar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
    } else {
      const result = await criarRegionalSaude(payload);
      if (result.error) {
        toast.error('Erro ao cadastrar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      savedId = (result.data as { id: string } | null)?.id ?? null;
    }

    if (savedId) {
      await atualizarMunicipiosRegional(savedId, Array.from(selectedMunicipios));
    }

    toast.success(
      editingId ? 'Regional atualizada!' : 'Regional cadastrada!',
      editingId ? 'Os dados foram atualizados com sucesso.' : 'A regional foi cadastrada com sucesso.',
    );
    handleCloseDrawer();
    refresh();
  }

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Regionais"
        subtitle="Unidades Regionais de Saúde (URS) do estado do Maranhão"
        actions={
          <button
            className="tfd-btn tfd-btn-primary"
            onClick={() => { setEditingId(null); resetForm(); setDrawerOpen(true); }}
          >
            <Plus size={16} />
            Nova Regional
          </button>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Regionais', value: counts.total },
          { label: 'Regionais Ativas', value: counts.ativas },
        ]}
      />

      {/* ========== Toolbar (estilo v2) ========== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36, minWidth: 280,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por nome, código ou sede..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

      </div>

      {/* ========== Table (estilo v2) ========== */}
      <div className="tfd-table-wrap">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Código"
                  sortDirection={table.getSortDirection('codigo')}
                  onSort={() => table.toggleSort('codigo')}
                  filterOptions={table.getFilterOptions('codigo')}
                  activeFilters={table.getActiveFilters('codigo')}
                  onFilterChange={(v) => table.setColumnFilter('codigo', v)}
                />
                <SortableHeader
                  label="Nome"
                  sortDirection={table.getSortDirection('nome')}
                  onSort={() => table.toggleSort('nome')}
                />
                <SortableHeader
                  label="Sede"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('municipio_sede')}
                  onSort={() => table.toggleSort('municipio_sede')}
                  filterOptions={table.getFilterOptions('municipio_sede')}
                  activeFilters={table.getActiveFilters('municipio_sede')}
                  onFilterChange={(v) => table.setColumnFilter('municipio_sede', v)}
                />
                <SortableHeader
                  label="Região"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('regiao_nome')}
                  onSort={() => table.toggleSort('regiao_nome')}
                  filterOptions={table.getFilterOptions('regiao_nome', (row) =>
                    ((row.regiao as { nome?: string } | null)?.nome) ?? '')}
                  activeFilters={table.getActiveFilters('regiao_nome')}
                  onFilterChange={(v) => table.setColumnFilter('regiao_nome', v)}
                />
                <SortableHeader
                  label="Telefone"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('telefone')}
                  onSort={() => table.toggleSort('telefone')}
                />
                <SortableHeader
                  label="E-mail"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('email')}
                  onSort={() => table.toggleSort('email')}
                />
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma regional encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((reg: Record<string, unknown>) => (
                  <tr
                    key={reg.id as string}
                    className="cursor-pointer"
                    onClick={() => router.push(`/regionais-saude/${reg.id}`)}
                  >
                    <td>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                      >
                        {reg.codigo as string}
                      </span>
                    </td>
                    <td className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {reg.nome as string}
                    </td>
                    <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(reg.municipio_sede as string) || '\u2014'}
                    </td>
                    <td className="hidden md:table-cell">
                      {(() => {
                        const r = (reg.regiao as { nome?: string } | null) ?? null;
                        return r?.nome ? (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--tfd-surface-100, #F1F5F9)', color: 'var(--tfd-text-secondary)' }}
                          >
                            {r.nome}
                          </span>
                        ) : <span style={{ color: 'var(--tfd-text-muted)' }}>\u2014</span>;
                      })()}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(reg.telefone as string) ? maskPhone(reg.telefone as string) : '\u2014'}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(reg.email as string) || '\u2014'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(reg as Record<string, unknown>); }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                          title="Excluir"
                          style={{ color: '#DC2626' }}
                          onClick={(e) => { e.stopPropagation(); handleOpenDeactivate(reg as Record<string, unknown>); }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {table.filtered.length > 0 && (
          <Pagination
            total={table.filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="regionais"
          />
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      {deactivateConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="tfd-card p-6 max-w-md w-full mx-4" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--tfd-status-error-bg)', color: 'var(--tfd-status-error)' }}
              >
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Confirmar exclusão
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--tfd-text-secondary)' }}>
              Tem certeza que deseja excluir a regional{' '}
              <strong style={{ color: 'var(--tfd-text-primary)' }}>{deactivateConfirmName}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDeactivateConfirmId(null); setDeactivateConfirmName(''); }}>
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-danger" onClick={handleConfirmDeactivate}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Regional' : 'Nova Regional'}
        subtitle={editingId ? 'Atualize os dados da regional de saúde' : 'Preencha os dados para cadastrar uma nova regional'}
        width="680px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmit}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Regional'}
            </button>
          </>
        }
      >
        {/* ── Identificação ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Identificação
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Código" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Ex: URS I"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </FormField>

          <FormField label="Nome" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Ex: Rosário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Município Sede">
            <select
              className="tfd-input"
              value={municipioSede}
              onChange={(e) => setMunicipioSede(e.target.value)}
              disabled={loadingMunicipios}
            >
              <option value="">
                {loadingMunicipios ? 'Carregando municípios...' : 'Selecione o município...'}
              </option>
              {allMunicipiosMA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Região">
            <select
              className="tfd-input"
              value={regiaoId}
              onChange={(e) => setRegiaoId(e.target.value)}
            >
              <option value="">Sem região definida</option>
              {regioes.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
              Agrupamento geográfico da regional (configurável em Sistema › Configurações).
            </p>
          </FormField>
        </div>

        <hr className="tfd-divider" />

        {/* ── Endereço do escritório ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Endereço do Escritório
        </h3>

        <FormField label="Logradouro">
          <input
            type="text"
            className="tfd-input"
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Bairro">
            <input
              type="text"
              className="tfd-input"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
            />
          </FormField>

          <FormField label="Município">
            <input
              type="text"
              className="tfd-input"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
            />
          </FormField>
        </div>

        <hr className="tfd-divider" />

        {/* ── Contato ── */}
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
          <Phone size={14} /> Contato
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Informe até dois telefones e dois e-mails (institucional e secundário).
        </p>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Telefone 1">
            <input
              type="tel"
              className="tfd-input"
              placeholder="(99) 99999-0000"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
            />
          </FormField>

          <FormField label="Telefone 2">
            <input
              type="tel"
              className="tfd-input"
              placeholder="(99) 99999-0000"
              value={telefone2}
              onChange={(e) => setTelefone2(maskPhone(e.target.value))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="E-mail Institucional">
            <div className="relative">
              <Mail size={14} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
              <input
                type="email"
                className="tfd-input tfd-input--with-leading-icon"
                placeholder="urs.xxx@saude.ma.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="E-mail Secundário">
            <div className="relative">
              <Mail size={14} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
              <input
                type="email"
                className="tfd-input tfd-input--with-leading-icon"
                placeholder="urs.xxx@gmail.com"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
              />
            </div>
          </FormField>
        </div>

        <hr className="tfd-divider" />

        {/* ── Municípios ── */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
            <Building2 size={14} /> Municípios da Regional
          </h3>
          {selectedMunicipios.size > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
            >
              {selectedMunicipios.size} selecionado{selectedMunicipios.size !== 1 && 's'}
            </span>
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Selecione os municípios que pertencem a esta regional. Você pode adicionar ou remover a qualquer momento.
        </p>

        {/* Barra de busca de municípios */}
        <div className="relative mb-2">
          <Search size={14} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Filtrar municípios..."
            value={municipioSearch}
            onChange={(e) => setMunicipioSearch(e.target.value)}
          />
        </div>

        {/* Lista de municípios */}
        <div
          className="rounded-lg overflow-y-auto"
          style={{
            maxHeight: '240px',
            border: '1px solid var(--tfd-surface-border)',
            backgroundColor: 'var(--tfd-surface-card)',
          }}
        >
          {loadingMunicipios ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
              <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando municípios...</span>
            </div>
          ) : filteredMunicipios.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum município encontrado.</p>
            </div>
          ) : (
            <ul>
              {filteredMunicipios.map((mun) => {
                const checked = selectedMunicipios.has(mun);
                return (
                  <li key={mun}>
                    <label
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-100"
                      style={{
                        borderBottom: '1px solid var(--tfd-surface-border)',
                        backgroundColor: checked ? 'var(--tfd-primary-50)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.backgroundColor = 'var(--tfd-surface-hover, #F5F7FA)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = checked ? 'var(--tfd-primary-50)' : ''; }}
                    >
                      <input
                        type="checkbox"
                        className="shrink-0"
                        checked={checked}
                        onChange={() => toggleMunicipio(mun)}
                        style={{ accentColor: 'var(--tfd-primary-500)' }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: checked ? 'var(--tfd-primary-500)' : 'var(--tfd-text-primary)' }}
                      >
                        {mun}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Drawer>
    </>
  );
}
