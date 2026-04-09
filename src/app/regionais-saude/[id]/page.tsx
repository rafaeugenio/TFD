'use client';

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  XCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { useReferrerBreadcrumb } from '@/shared/hooks/useReferrerBreadcrumb';
import { formatDate, formatCPF, maskPhone } from '@/shared/pipes/formatters';

import {
  buscarRegionalSaude,
  listarMunicipiosPorRegional,
} from '@/services/regionais-saude.service';
import { createClient } from '@/lib/supabase/client';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const PAGE_SIZE = 10;

type SortField = 'nome_completo' | 'cpf' | 'municipio' | 'created_at';
type SortDir = 'asc' | 'desc';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RegionalSaudeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const parentCrumb = useReferrerBreadcrumb({ label: 'Regionais', href: '/regionais-saude' });

  const [regional, setRegional] = useState<Record<string, unknown> | null>(null);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [pacientes, setPacientes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMun, setLoadingMun] = useState(true);
  const [loadingPac, setLoadingPac] = useState(true);

  /* ---- Search, sort, pagination ---- */
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome_completo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarRegionalSaude(id);
      if (data) setRegional(data as Record<string, unknown>);
      setLoading(false);

      // Municípios da regional
      setLoadingMun(true);
      const munResult = await listarMunicipiosPorRegional(id);
      const munNames = munResult.data
        ? (munResult.data as { municipio_nome: string }[]).map((r) => r.municipio_nome)
        : [];
      setMunicipios(munNames);
      setLoadingMun(false);

      // Pacientes cujo município de residência pertence a esta regional
      setLoadingPac(true);
      if (munNames.length > 0) {
        const supabase = createClient();
        const { data: pacData } = await supabase
          .from('pacientes')
          .select('id, nome_completo, cpf, cns, municipio, uf, telefone_celular, created_at')
          .eq('ativo', true)
          .in('municipio', munNames)
          .order('nome_completo', { ascending: true });
        setPacientes((pacData ?? []) as Record<string, unknown>[]);
      } else {
        setPacientes([]);
      }
      setLoadingPac(false);
    }
    load();
  }, [id]);

  /* ---- Filtered + sorted + paginated ---- */
  const filtered = useMemo(() => {
    let result = pacientes;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const nome = ((p.nome_completo as string) ?? '').toLowerCase();
        const cpf = ((p.cpf as string) ?? '').toLowerCase();
        const mun = ((p.municipio as string) ?? '').toLowerCase();
        return nome.includes(q) || cpf.includes(q) || mun.includes(q);
      });
    }

    result = [...result].sort((a, b) => {
      const aVal = ((a[sortField] as string) ?? '').toLowerCase();
      const bVal = ((b[sortField] as string) ?? '').toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [pacientes, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page on search
  useEffect(() => { setCurrentPage(1); }, [search]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  /* ---- Loading / error states ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
      </div>
    );
  }

  if (!regional) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Regional não encontrada</p>
        <Link href="/regionais-saude" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = regional.nome as string;
  const codigo = regional.codigo as string;
  const municipioSede = regional.municipio_sede as string | undefined;
  const logradouro = regional.logradouro as string | undefined;
  const bairro = regional.bairro as string | undefined;
  const municipioEscritorio = regional.municipio as string | undefined;
  const telefone = regional.telefone as string | undefined;
  const telefone2 = regional.telefone2 as string | undefined;
  const email = regional.email as string | undefined;
  const email2 = regional.email2 as string | undefined;

  const enderecoCompleto = [
    logradouro,
    bairro && `${bairro}`,
    municipioEscritorio,
  ].filter(Boolean).join(', ');

  return (
    <>
      <PageHeader
        title={nome}
        subtitle={`${codigo} — Regional de Saúde do Maranhão`}
        breadcrumbs={[
          { label: parentCrumb.label, href: parentCrumb.href },
          { label: nome },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => router.push(`/regionais-saude?editar=${id}`)}
            >
              <Pencil size={16} />
              Editar Regional
            </button>
            <Link href="/regionais-saude" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon={<Building2 size={20} />}
          label="Municípios"
          value={loadingMun ? '...' : String(municipios.length)}
          color="primary"
        />
        <SummaryCard
          icon={<Users size={20} />}
          label="Pacientes Cadastrados"
          value={loadingPac ? '...' : String(pacientes.length)}
          color="warning"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Municípios com Pacientes"
          value={loadingPac ? '...' : String(new Set(pacientes.map((p) => p.municipio as string)).size)}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== Coluna Esquerda: Dados da Regional ========== */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card: Dados principais */}
          <div className="tfd-card">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full text-white shrink-0"
                style={{ backgroundColor: 'var(--tfd-primary-500)' }}
              >
                <MapPin size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {nome}
                </h2>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  {codigo}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {municipioSede && (
                <InfoRow icon={<MapPin size={14} />} label="Município Sede" value={municipioSede} />
              )}
              {telefone && (
                <InfoRow icon={<Phone size={14} />} label="Telefone 1" value={maskPhone(telefone)} />
              )}
              {telefone2 && (
                <InfoRow icon={<Phone size={14} />} label="Telefone 2" value={maskPhone(telefone2)} />
              )}
              {email && (
                <InfoRow icon={<Mail size={14} />} label="E-mail Institucional" value={email} />
              )}
              {email2 && (
                <InfoRow icon={<Mail size={14} />} label="E-mail Secundário" value={email2} />
              )}
            </div>

            {enderecoCompleto && (
              <>
                <hr className="tfd-divider my-4" />
                <h3
                  className="text-xs font-semibold mb-2 uppercase tracking-wide"
                  style={{ color: 'var(--tfd-text-muted)' }}
                >
                  Endereço do Escritório
                </h3>
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  {enderecoCompleto}
                </p>
              </>
            )}
          </div>

          {/* Card: Municípios da Regional */}
          <div className="tfd-card">
            <h3
              className="text-sm font-semibold flex items-center gap-2 mb-3"
              style={{ color: 'var(--tfd-text-primary)' }}
            >
              <Building2 size={14} style={{ color: 'var(--tfd-primary-500)' }} />
              Municípios
              {!loadingMun && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  {municipios.length}
                </span>
              )}
            </h3>

            {loadingMun ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
              </div>
            ) : municipios.length === 0 ? (
              <p className="text-sm py-2" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum município vinculado.
              </p>
            ) : (
              <div
                className="overflow-y-auto rounded-lg"
                style={{
                  maxHeight: '320px',
                  border: '1px solid var(--tfd-surface-border)',
                }}
              >
                <ul>
                  {municipios.map((mun, i) => (
                    <li
                      key={mun}
                      className="flex items-center gap-2 px-3 py-2 text-sm"
                      style={{
                        borderBottom: i < municipios.length - 1 ? '1px solid var(--tfd-surface-border)' : 'none',
                        color: 'var(--tfd-text-secondary)',
                      }}
                    >
                      <MapPin size={12} style={{ color: 'var(--tfd-primary-400)', flexShrink: 0 }} />
                      {mun}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              className="tfd-btn tfd-btn-secondary tfd-btn--sm w-full mt-3"
              onClick={() => router.push(`/regionais-saude?editar=${id}`)}
            >
              <Pencil size={13} />
              Gerenciar Municípios
            </button>
          </div>
        </div>

        {/* ========== Coluna Direita: Pacientes Vinculados ========== */}
        <div className="lg:col-span-2">
          <div className="tfd-card p-0 overflow-hidden">
            {/* Header + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <h3
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                <Users size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                Pacientes Vinculados
                {!loadingPac && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                  >
                    {filtered.length}
                  </span>
                )}
              </h3>

              <div className="relative min-w-[200px]">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--tfd-text-muted)' }}
                />
                <input
                  type="text"
                  className="tfd-input tfd-input--sm"
                  style={{ paddingLeft: '2rem' }}
                  placeholder="Buscar paciente, CPF ou município..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="tfd-table">
                <thead>
                  <tr>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort('nome_completo')}
                    >
                      Paciente{sortIndicator('nome_completo')}
                    </th>
                    <th
                      className="cursor-pointer select-none hidden sm:table-cell"
                      onClick={() => toggleSort('cpf')}
                    >
                      CPF{sortIndicator('cpf')}
                    </th>
                    <th
                      className="cursor-pointer select-none hidden md:table-cell"
                      onClick={() => toggleSort('municipio')}
                    >
                      Município{sortIndicator('municipio')}
                    </th>
                    <th
                      className="cursor-pointer select-none hidden lg:table-cell"
                      onClick={() => toggleSort('created_at')}
                    >
                      Cadastro{sortIndicator('created_at')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPac ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando pacientes...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                            {search ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum paciente vinculado a esta regional.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((pac) => {
                      const pacId = pac.id as string;
                      const nomePac = pac.nome_completo as string;
                      const cpfPac = pac.cpf as string;
                      const munPac = pac.municipio as string;
                      const dataCadastro = pac.created_at as string;

                      return (
                        <tr
                          key={pacId}
                          className="cursor-pointer"
                          onClick={() => router.push(`/pacientes/${pacId}?from=regionais-saude`)}
                        >
                          <td>
                            <span className="font-medium text-sm" style={{ color: 'var(--tfd-primary-500)' }}>
                              {nomePac}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                            {cpfPac ? formatCPF(cpfPac) : '—'}
                          </td>
                          <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                            {munPac || '—'}
                          </td>
                          <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-muted)' }}>
                            {dataCadastro ? formatDate(dataCadastro) : '—'}
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
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} — Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Helpers ── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--tfd-text-muted)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{label}:</span>
      <span className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>{value}</span>
    </div>
  );
}

const SUMMARY_COLORS: Record<string, { bg: string; fg: string; iconBg: string }> = {
  primary: { bg: 'var(--tfd-primary-50)', fg: 'var(--tfd-primary-500)', iconBg: 'var(--tfd-primary-100)' },
  warning: { bg: '#FFFBEB', fg: '#D97706', iconBg: '#FEF3C7' },
  success: { bg: '#ECFDF5', fg: '#059669', iconBg: '#D1FAE5' },
};

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'warning' | 'success';
}) {
  const c = SUMMARY_COLORS[color];
  return (
    <div className="tfd-card flex items-center gap-4" style={{ backgroundColor: c.bg }}>
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: c.iconBg, color: c.fg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: c.fg }}>{value}</p>
        <p className="text-xs" style={{ color: c.fg, opacity: 0.8 }}>{label}</p>
      </div>
    </div>
  );
}
