'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Plus,
  Search,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { maskPhone, maskCEP } from '@/shared/pipes/formatters';
import CepAutofill from '@/shared/components/cep-autofill/CepAutofill';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';

import {
  listarUnidadesSaude,
  buscarUnidadeSaude,
  criarUnidadeSaude,
  atualizarUnidadeSaude,
  desativarUnidadeSaude,
} from '@/services/unidades-saude.service';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UnidadesSaudePageWrapper() {
  return (
    <Suspense>
      <UnidadesSaudePage />
    </Suspense>
  );
}

function UnidadesSaudePage() {
  const toast = useToast();
  const router = useRouter();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Deactivate confirmation state ---- */
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [deactivateConfirmName, setDeactivateConfirmName] = useState('');

  /* ---- Form state: Dados da Unidade ---- */
  const [nome, setNome] = useState('');
  const [cnes, setCnes] = useState('');
  const [tipo, setTipo] = useState('');

  /* ---- Form state: Endereco ---- */
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

  /* ---- Data fetching via Supabase ---- */
  const { data: unidades, loading, refresh } = useSupabaseData(
    () => listarUnidadesSaude({ pageSize: 1000 }),
    [],
  );

  /* ---- Table controls (client-side search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: unidades as unknown as Record<string, unknown>[],
    searchFields: ['nome', 'cnes'],
    dateField: 'created_at',
  });

  const items = table.paginated as unknown as Record<string, unknown>[];
  const tipoFilterOptions = table.getFilterOptions('tipo');

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativas: 0 });

  const refreshCounts = useCallback(() => {
    listarUnidadesSaude({ pageSize: 1 }).then(({ count }) => {
      const total = count ?? 0;
      setCounts({ total, ativas: total });
    });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && unidades.length > 0) {
      editarHandled.current = editarParam;
      const uni = unidades.find((u: Record<string, unknown>) => u.id === editarParam);
      if (uni) {
        handleOpenEdit(uni as Record<string, unknown>);
      } else {
        buscarUnidadeSaude(editarParam).then(({ data }) => {
          if (data) handleOpenEdit(data as Record<string, unknown>);
        });
      }
      router.replace('/unidades-saude', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, unidades]);

  /* -------------------------------------------------- */
  /*  CNES autofill                                     */
  /* -------------------------------------------------- */

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
      if (data.tipoDescricao) {
        // Converte a descrição do CNES (UPPERCASE) para Title Case
        setTipo(toTitleCase(data.tipoDescricao));
      }
      // UF primeiro para o UfCidadeSelect carregar os municípios, depois seta o município com delay
      if (data.uf) setUf(data.uf);
      if (data.municipio) {
        const mun = toTitleCase(data.municipio);
        // Aguarda o fetch de municípios do IBGE antes de setar o valor
        setTimeout(() => setMunicipio(mun), 800);
      }
      toast.success('CNES encontrado', 'Dados importados automaticamente. Revise antes de salvar.');
    } catch {
      toast.error('CNES não encontrado', 'Verifique o código ou preencha os dados manualmente.');
    } finally {
      setCnesLoading(false);
    }
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

  function handleCnesChange(value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 7);
    setCnes(clean);
    if (clean.length === 7 && !editingId) {
      fetchCnesData(clean);
    }
  }

  /* -------------------------------------------------- */
  /*  Form reset & drawer handlers                      */
  /* -------------------------------------------------- */

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

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  function handleOpenEdit(uni: Record<string, unknown>) {
    const id = uni.id as string;
    setEditingId(id);
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
    setDrawerOpen(true);
  }

  function handleOpenDeactivate(uni: Record<string, unknown>) {
    setDeactivateConfirmId(uni.id as string);
    setDeactivateConfirmName((uni.nome as string) ?? 'Unidade');
  }

  async function handleConfirmDeactivate() {
    if (!deactivateConfirmId) return;
    try {
      const result = await desativarUnidadeSaude(deactivateConfirmId);
      if (result.error) {
        toast.error('Erro ao desativar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Unidade desativada', 'O registro foi desativado do sistema.');
      setDeactivateConfirmId(null);
      setDeactivateConfirmName('');
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------------------------------------------------- */
  /*  Submit unidade                                     */
  /* -------------------------------------------------- */

  async function handleSubmitUnidade() {
    try {
      if (!nome.trim()) {
        toast.error('Campo obrigatorio', 'Informe o nome da unidade.');
        return;
      }
      const cleanCnes = cnes.replace(/\D/g, '');
      if (!cleanCnes || cleanCnes.length !== 7) {
        toast.error('CNES invalido', 'O CNES deve conter exatamente 7 digitos.');
        return;
      }

      const cleanPhone = telefone.replace(/\D/g, '');
      const cleanCep = cep.replace(/\D/g, '');

      const uniData: Record<string, unknown> = {
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

      if (editingId) {
        const result = await atualizarUnidadeSaude(editingId, uniData as any);
        if (result.error) {
          toast.error('Erro ao atualizar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
          return;
        }
      } else {
        const result = await criarUnidadeSaude(uniData as any);
        if (result.error) {
          toast.error('Erro ao cadastrar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
          return;
        }
      }

      toast.success(
        editingId ? 'Unidade atualizada!' : 'Unidade cadastrada!',
        editingId
          ? 'Os dados foram atualizados com sucesso.'
          : 'A unidade foi cadastrada com sucesso.',
      );
      handleCloseDrawer();
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Unidades de Saude"
        subtitle="Gerenciamento de unidades de saude de destino TFD"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => { setEditingId(null); resetForm(); setDrawerOpen(true); }}>
            <Plus size={16} />
            Nova Unidade
          </button>
        }
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Unidades</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.total}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Unidades Ativas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.ativas}</p>
          </div>
        </div>

      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar por nome ou CNES..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateStart}
            onChange={(e) => table.setDateStart(e.target.value)}
            title="Data início"
          />
          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateEnd}
            onChange={(e) => table.setDateEnd(e.target.value)}
            title="Data fim"
          />
        </div>

        <p className="text-sm ml-auto" style={{ color: 'var(--tfd-text-muted)' }}>
          {table.filtered.length} resultado{table.filtered.length !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Nome"
                  sortDirection={table.getSortDirection('nome')}
                  onSort={() => table.toggleSort('nome')}
                />
                <SortableHeader
                  label="CNES"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('cnes')}
                  onSort={() => table.toggleSort('cnes')}
                />
                <SortableHeader
                  label="Tipo"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('tipo')}
                  onSort={() => table.toggleSort('tipo')}
                  filterOptions={tipoFilterOptions}
                  activeFilters={table.getActiveFilters('tipo')}
                  onFilterChange={(v) => table.setColumnFilter('tipo', v)}
                />
                <SortableHeader
                  label="Municipio"
                  className="hidden xl:table-cell"
                  sortDirection={table.getSortDirection('municipio')}
                  onSort={() => table.toggleSort('municipio')}
                />
                <th className="hidden md:table-cell">Telefone</th>
                <th className="w-[100px]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma unidade encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((uni: Record<string, unknown>) => (
                    <tr key={uni.id as string} className="cursor-pointer" onClick={() => router.push(`/unidades-saude/${uni.id}`)}>
                      <td className="max-w-[200px] truncate font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {uni.nome as string}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.cnes as string) || '\u2014'}
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.tipo as string) || '\u2014'}
                      </td>
                      <td className="hidden xl:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.municipio as string) || (uni.cidade as string) || '\u2014'}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.telefone as string) ? maskPhone(uni.telefone as string) : '\u2014'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Editar"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(uni as Record<string, unknown>); }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                            title="Desativar"
                            onClick={(e) => { e.stopPropagation(); handleOpenDeactivate(uni as Record<string, unknown>); }}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && table.filtered.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Exibindo{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {(table.page - 1) * 20 + 1}
              </span>
              {' '}&ndash;{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {Math.min(table.page * 20, table.filtered.length)}
              </span>
              {' '}de{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {table.filtered.length}
              </span>
              {' '}registros
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                onClick={() => table.setPage(Math.max(1, table.page - 1))}
                disabled={table.page === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="text-sm px-3 font-medium"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                {table.page} / {table.totalPages}
              </span>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                onClick={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
                disabled={table.page === table.totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Deactivate Confirmation Modal ========== */}
      {deactivateConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="tfd-card p-6 max-w-md w-full mx-4"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--tfd-status-error-bg)', color: 'var(--tfd-status-error)' }}
              >
                <Power size={20} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Confirmar desativacao
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--tfd-text-secondary)' }}>
              Tem certeza que deseja desativar a unidade{' '}
              <strong style={{ color: 'var(--tfd-text-primary)' }}>{deactivateConfirmName}</strong>?
              A unidade nao aparecera mais nas listagens.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="tfd-btn tfd-btn-secondary"
                onClick={() => { setDeactivateConfirmId(null); setDeactivateConfirmName(''); }}
              >
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-danger" onClick={handleConfirmDeactivate}>
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Unidade Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Unidade' : 'Nova Unidade'}
        subtitle={editingId ? 'Atualize os dados da unidade' : 'Preencha os dados para cadastrar uma nova unidade'}
        width="640px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitUnidade}>
              {editingId ? 'Salvar Alteracoes' : 'Cadastrar Unidade'}
            </button>
          </>
        }
      >
        {/* ── Section: Dados da Unidade ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados da Unidade
        </h3>

        <FormField label="Nome" required>
          <input
            type="text"
            className="tfd-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
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
            {!editingId && !cnesLoading && cnes.length < 7 && (
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

        {/* ── Section: Endereco ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Endereco
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

          <FormField label="Numero">
            <input
              type="text"
              className="tfd-input"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
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

        {/* ── Section: Contato ── */}
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
          <input
            type="email"
            className="tfd-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField label="Responsavel">
          <input
            type="text"
            className="tfd-input"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        </FormField>
      </Drawer>
    </>
  );
}
