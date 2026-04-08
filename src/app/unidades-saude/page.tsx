'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Plus,
  Search,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useMunicipios } from '@/shared/hooks/useLookup';
import { maskPhone, maskCEP } from '@/shared/pipes/formatters';
import { createClient } from '@/lib/supabase/client';

import {
  listarUnidadesSaude,
  buscarUnidadeSaude,
  criarUnidadeSaude,
  atualizarUnidadeSaude,
  desativarUnidadeSaude,
} from '@/services/unidades-saude.service';

/* -------------------------------------------------- */
/*  Constants & helpers                                */
/* -------------------------------------------------- */

const ITEMS_PER_PAGE = 10;

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const TIPO_OPTIONS = [
  { value: 'UBS', label: 'UBS' },
  { value: 'UPA', label: 'UPA' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'CLINICA', label: 'Clinica' },
  { value: 'CAPS', label: 'CAPS' },
  { value: 'OUTRO', label: 'Outro' },
];

interface RegionalOption {
  value: string;   // id (UUID)
  label: string;    // nome
}

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
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
  const [regionalId, setRegionalId] = useState('');

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

  /* ---- Lookup hooks ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();

  /* ---- Regional options (from tabelas_auxiliares by id) ---- */
  const [regionaisOptions, setRegionaisOptions] = useState<RegionalOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from('tabelas_auxiliares')
      .select('id, nome')
      .eq('categoria', 'regional')
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const rows = data as unknown as { id: string; nome: string }[];
        setRegionaisOptions(rows.map((r) => ({ value: r.id, label: r.nome })));
      });
    return () => { cancelled = true; };
  }, []);

  /* ---- Data fetching via Supabase ---- */
  const { data: unidades, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarUnidadesSaude({ search, page: currentPage, pageSize: ITEMS_PER_PAGE }),
    [search, currentPage],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativas: 0, regionais: 0 });

  const refreshCounts = useCallback(() => {
    listarUnidadesSaude({ pageSize: 1 }).then(({ count }) => {
      const total = count ?? 0;
      setCounts((prev) => ({ ...prev, total, ativas: total }));
    });
    // Count distinct regionais
    createClient()
      .from('unidades_destino')
      .select('regional_id')
      .eq('ativo', true)
      .not('regional_id', 'is', null)
      .then(({ data }) => {
        if (!data) return;
        const unique = new Set((data as { regional_id: string }[]).map((r) => r.regional_id));
        setCounts((prev) => ({ ...prev, regionais: unique.size }));
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
  /*  Form reset & drawer handlers                      */
  /* -------------------------------------------------- */

  function resetForm() {
    setNome('');
    setCnes('');
    setTipo('');
    setRegionalId('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setMunicipio('');
    setUf('MA');
    setTelefone('');
    setEmail('');
    setResponsavel('');
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
    setRegionalId((uni.regional_id as string) ?? '');
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
        regional_id: regionalId || null,
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

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-info-bg)', color: 'var(--tfd-status-info)' }}
          >
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Regionais Cobertas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.regionais}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por nome ou CNES..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
          {totalCount} resultado{totalCount !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="hidden md:table-cell">CNES</th>
                <th className="hidden lg:table-cell">Tipo</th>
                <th className="hidden lg:table-cell">Regional</th>
                <th className="hidden xl:table-cell">Municipio</th>
                <th className="hidden md:table-cell">Telefone</th>
                <th className="w-[100px]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : unidades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma unidade encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                unidades.map((uni: Record<string, unknown>) => {
                  const regionalNome = (uni.tabelas_auxiliares as Record<string, unknown> | null)?.nome as string | undefined;
                  return (
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
                      <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {regionalNome || '\u2014'}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
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
            <input
              type="text"
              className="tfd-input"
              placeholder="0000000"
              maxLength={7}
              value={cnes}
              onChange={(e) => setCnes(e.target.value.replace(/\D/g, '').slice(0, 7))}
            />
          </FormField>

          <FormField label="Tipo">
            <select
              className="tfd-input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Selecione...</option>
              {TIPO_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Regional">
          <select
            className="tfd-input"
            value={regionalId}
            onChange={(e) => setRegionalId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {regionaisOptions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* ── Section: Endereco ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Endereco
        </h3>

        <FormField label="CEP">
          <input
            type="text"
            className="tfd-input"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => setCep(maskCEP(e.target.value))}
          />
        </FormField>

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
          <FormField label="Municipio">
            <select
              className="tfd-input"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              disabled={loadingMun}
            >
              <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
              {municipios.map((m) => (
                <option key={m.value} value={m.label}>{m.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="UF">
            <select
              className="tfd-input"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            >
              {UF_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>
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
