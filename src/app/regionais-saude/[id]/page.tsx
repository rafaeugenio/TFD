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
  Search,
  Loader2,
  XCircle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Info,
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

      setLoadingMun(true);
      const munResult = await listarMunicipiosPorRegional(id);
      const munNames = munResult.data
        ? (munResult.data as { municipio_nome: string }[]).map((r) => r.municipio_nome)
        : [];
      setMunicipios(munNames);
      setLoadingMun(false);

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

  const enderecoCompleto = [logradouro, bairro, municipioEscritorio].filter(Boolean).join(', ');
  const municipiosComPacientes = new Set(pacientes.map((p) => p.municipio as string)).size;

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ====== LEFT (2/3) ====== */}
        <div className="xl:col-span-2 space-y-4">
          {/* ── Identificação ── */}
          <Section title="Identificação" icon={<Info size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome" value={nome} />
              <InfoRow label="Código" value={codigo} mono />
              {municipioSede && <InfoRow label="Município sede" value={municipioSede} />}
              {telefone && <InfoRow label="Telefone 1" value={maskPhone(telefone)} />}
              {telefone2 && <InfoRow label="Telefone 2" value={maskPhone(telefone2)} />}
              {email && <InfoRow label="E-mail institucional" value={email} />}
              {email2 && <InfoRow label="E-mail secundário" value={email2} />}
            </div>
          </Section>

          {/* ── Endereço do Escritório ── */}
          {enderecoCompleto && (
            <Section title="Endereço do Escritório" icon={<MapPin size={18} />}>
              <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{enderecoCompleto}</p>
            </Section>
          )}

          {/* ── Municípios ── */}
          <Section
            title="Municípios"
            icon={<Building2 size={18} />}
            badge={
              !loadingMun ? (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  {municipios.length}
                </span>
              ) : undefined
            }
          >
            {loadingMun ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
              </div>
            ) : municipios.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum município vinculado.
              </p>
            ) : (
              <>
                <div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto rounded-lg p-2"
                  style={{ border: '1px solid var(--tfd-surface-border)' }}
                >
                  {municipios.map((mun) => (
                    <div
                      key={mun}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm"
                      style={{ color: 'var(--tfd-text-secondary)' }}
                    >
                      <MapPin size={12} style={{ color: 'var(--tfd-primary-400)', flexShrink: 0 }} />
                      <span className="truncate">{mun}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="tfd-btn tfd-btn-secondary tfd-btn--sm mt-3"
                  onClick={() => router.push(`/regionais-saude?editar=${id}`)}
                >
                  <Pencil size={13} />
                  Gerenciar Municípios
                </button>
              </>
            )}
          </Section>

          {/* ── Pacientes Vinculados ── */}
          <Section
            title="Pacientes Vinculados"
            icon={<Users size={18} />}
            badge={
              !loadingPac ? (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  {filtered.length}
                </span>
              ) : undefined
            }
          >
            <div className="flex justify-end mb-3">
              <div className="relative min-w-[220px]">
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

            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--tfd-surface-border)' }}>
              <table className="tfd-table">
                <thead>
                  <tr>
                    <th className="cursor-pointer select-none" onClick={() => toggleSort('nome_completo')}>
                      Paciente{sortIndicator('nome_completo')}
                    </th>
                    <th className="cursor-pointer select-none hidden sm:table-cell" onClick={() => toggleSort('cpf')}>
                      CPF{sortIndicator('cpf')}
                    </th>
                    <th className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort('municipio')}>
                      Município{sortIndicator('municipio')}
                    </th>
                    <th className="cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('created_at')}>
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
                            {search ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum paciente vinculado.'}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
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
          </Section>
        </div>

        {/* ====== RIGHT (1/3) ====== */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Contato" icon={<Phone size={18} />}>
            <div className="space-y-3">
              {telefone && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Telefone 1</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{maskPhone(telefone)}</p>
                </div>
              )}
              {telefone2 && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Telefone 2</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{maskPhone(telefone2)}</p>
                </div>
              )}
              {email && (
                <div>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                    <Mail size={11} /> E-mail institucional
                  </p>
                  <p className="text-sm break-all" style={{ color: 'var(--tfd-text-primary)' }}>{email}</p>
                </div>
              )}
              {!telefone && !telefone2 && !email && (
                <p className="text-sm text-center py-2" style={{ color: 'var(--tfd-text-muted)' }}>
                  Sem contatos cadastrados
                </p>
              )}
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-3">
            <KpiTile
              icon={<Building2 size={18} />}
              label="Municípios"
              value={loadingMun ? '...' : String(municipios.length)}
              tone="primary"
            />
            <KpiTile
              icon={<Users size={18} />}
              label="Pacientes Cadastrados"
              value={loadingPac ? '...' : String(pacientes.length)}
              tone="warning"
            />
            <KpiTile
              icon={<CheckCircle2 size={18} />}
              label="Municípios com Pacientes"
              value={loadingPac ? '...' : String(municipiosComPacientes)}
              tone="success"
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function Section({
  title,
  icon,
  children,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="tfd-card">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
      <span className="text-sm font-medium shrink-0 w-40" style={{ color: 'var(--tfd-text-secondary)' }}>
        {label}
      </span>
      <span
        className="text-sm"
        style={{
          color: 'var(--tfd-text-primary)',
          fontFamily: mono ? 'var(--tfd-font-mono)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const KPI_TONES: Record<string, { bg: string; fg: string; iconBg: string }> = {
  primary: { bg: 'var(--tfd-primary-50)', fg: 'var(--tfd-primary-500)', iconBg: 'var(--tfd-primary-100)' },
  warning: { bg: '#FFFBEB', fg: '#D97706', iconBg: '#FEF3C7' },
  success: { bg: '#ECFDF5', fg: '#059669', iconBg: '#D1FAE5' },
};

function KpiTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'warning' | 'success';
}) {
  const c = KPI_TONES[tone];
  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3"
      style={{ backgroundColor: c.bg, border: '1px solid var(--tfd-surface-border)' }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ backgroundColor: c.iconBg, color: c.fg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight" style={{ color: c.fg }}>{value}</p>
        <p className="text-xs" style={{ color: c.fg, opacity: 0.8 }}>{label}</p>
      </div>
    </div>
  );
}
