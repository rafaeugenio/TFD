'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Loader2,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';

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
  const [editingSnapshot, setEditingSnapshot] = useState<Record<string, string> | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [savingUnidade, setSavingUnidade] = useState(false);

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
    setDrawerOpen(true);
  }

  /** Valida e abre o modal de confirmação. */
  function handleRequestSubmit() {
    if (!nome.trim()) { toast.error('Campo obrigatório', 'Informe o nome da unidade.'); return; }
    if (cnes && cnes.length !== 7) { toast.error('CNES inválido', 'O CNES deve conter exatamente 7 dígitos.'); return; }

    if (editingId && editingSnapshot) {
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
        cnes: cnes,
        tipo: tipo,
        endereco: [logradouro.trim(), numero.trim(), bairro.trim()].filter(Boolean).join(', '),
        municipio: municipio ? `${municipio}/${uf}` : '',
        cep: cep,
        telefone: telefone,
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

  function handleOpenDeactivate(uni: Record<string, unknown>) {
    setDeactivateConfirmId(uni.id as string);
    setDeactivateConfirmName((uni.nome as string) ?? 'Unidade');
  }

  async function handleConfirmDeactivate() {
    if (!deactivateConfirmId) return;
    try {
      const result = await desativarUnidadeSaude(deactivateConfirmId);
      if (result.error) {
        toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Unidade excluida', 'O registro foi desativado do sistema.');
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
          <Can action="unidades_saude.criar">
            <button className="tfd-btn tfd-btn-primary" onClick={() => { setEditingId(null); resetForm(); setDrawerOpen(true); }}>
              <Plus size={16} />
              Nova Unidade
            </button>
          </Can>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Unidades', value: counts.total },
          { label: 'Unidades Ativas', value: counts.ativas },
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
            placeholder="Buscar por nome ou CNES..."
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 6 }).map((__, c) => (
                      <td key={c} className="px-4 py-3.5">
                        <Skeleton className={`h-4 ${c === 0 ? 'w-48' : c === 5 ? 'w-16 ml-auto' : 'w-28'}`} />
                      </td>
                    ))}
                  </tr>
                ))
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
                          <Can action="unidades_saude.editar">
                            <button
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Editar"
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(uni as Record<string, unknown>); }}
                            >
                              <Pencil size={15} />
                            </button>
                          </Can>
                          <Can action="unidades_saude.excluir">
                            <button
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Excluir"
                              style={{ color: '#DC2626' }}
                              onClick={(e) => { e.stopPropagation(); handleOpenDeactivate(uni as Record<string, unknown>); }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && table.filtered.length > 0 && (
          <Pagination
            total={table.filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="unidades"
          />
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!deactivateConfirmId}
        tone="delete"
        title="Excluir unidade?"
        subject={deactivateConfirmName}
        description="Esta ação não pode ser desfeita."
        onClose={() => { setDeactivateConfirmId(null); setDeactivateConfirmName(''); }}
        onConfirm={handleConfirmDeactivate}
      />

      {/* ========== Save Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editingId ? 'Confirmar alterações na unidade?' : 'Confirmar cadastro de unidade?'}
        subject={nome.trim() || undefined}
        diff={saveConfirm?.diff}
        busy={savingUnidade}
        onClose={() => setSaveConfirm(null)}
        onConfirm={async () => {
          setSavingUnidade(true);
          try {
            await handleSubmitUnidade();
            setSaveConfirm(null);
          } finally {
            setSavingUnidade(false);
          }
        }}
      />

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
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSubmit} disabled={savingUnidade}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Unidade'}
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
