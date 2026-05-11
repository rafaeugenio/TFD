'use client';

import { use, useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  Info,
  Compass,
} from 'lucide-react';

import Pagination from '@/shared/components/pagination/Pagination';
import { formatDate, formatCPF, maskPhone } from '@/shared/pipes/formatters';

import {
  buscarRegionalSaude,
  listarMunicipiosPorRegional,
} from '@/services/regionais-saude.service';
import { createClient } from '@/lib/supabase/client';

/* -------------------------------------------------- */
/*  Tabs & sort                                        */
/* -------------------------------------------------- */

type TabKey = 'identificacao' | 'endereco' | 'municipios' | 'pacientes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'identificacao', label: 'Identificação' },
  { key: 'endereco',      label: 'Endereço' },
  { key: 'municipios',    label: 'Municípios' },
  { key: 'pacientes',     label: 'Pacientes' },
];

const DEFAULT_PAGE_SIZE = 25;
type SortField = 'nome_completo' | 'cpf' | 'municipio' | 'created_at';
type SortDir = 'asc' | 'desc';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RegionalSaudeDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <RegionalSaudeDetalheInner id={id} />
    </Suspense>
  );
}

function RegionalSaudeDetalheInner({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = tabParam && TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'identificacao';

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'identificacao') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

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
      <div className="text-center py-20">
        <XCircle size={40} className="inline-block mb-3" style={{ color: '#94A3B8' }} />
        <p className="text-[14px]" style={{ color: '#6B7280' }}>Regional não encontrada.</p>
        <Link href="/regionais-saude" className="tfd-btn tfd-btn-ghost mt-4 inline-flex">
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
  const regiaoNome = (regional.regiao as { nome?: string } | null | undefined)?.nome;

  const enderecoCompleto = [logradouro, bairro, municipioEscritorio].filter(Boolean).join(', ');
  const municipiosComPacientes = new Set(pacientes.map((p) => p.municipio as string)).size;

  return (
    <div>
      <Link
        href="/regionais-saude"
        className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]"
        style={{ color: '#6B7280' }}
      >
        <ArrowLeft size={12} /> Voltar para Regionais
      </Link>

      {/* ============ Header card ============ */}
      <div
        className="mb-6 overflow-hidden"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {/* Linha 1 — Nome + código + Editar */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[20px] font-semibold" style={{ color: '#146BFA', letterSpacing: '-0.02em' }}>
                {nome}
              </h1>
              <span
                className="text-[12px] font-bold px-2 py-[2px]"
                style={{ background: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)', borderRadius: 999 }}
              >
                {codigo}
              </span>
            </div>
          </div>
          <button className="tfd-btn tfd-btn-primary shrink-0" onClick={() => router.push(`/regionais-saude?editar=${id}`)}>
            <Pencil size={14} /> Editar
          </button>
        </div>

        {/* Linha 2 — sede + região */}
        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            {municipioSede && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span><span style={{ color: '#94A3B8' }}>Sede </span>{municipioSede}</span>
                </span>
                {regiaoNome && <Sep />}
              </>
            )}
            {regiaoNome && (
              <span className="inline-flex items-center gap-1.5">
                <Compass size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span><span style={{ color: '#94A3B8' }}>Região </span>{regiaoNome}</span>
              </span>
            )}
          </div>
        </div>

        {/* Linha 3 — Contato | Endereço escritório */}
        <div className="header-groups px-6 pb-5 text-[13px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            {telefone && (
              <a href={`tel:${telefone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]" title="Ligar">
                <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span className="font-mono">{maskPhone(telefone)}</span>
              </a>
            )}
            {telefone2 && (
              <>
                {telefone && <Sep />}
                <a href={`tel:${telefone2.replace(/\D/g, '')}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]" title="Ligar">
                  <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="font-mono">{maskPhone(telefone2)}</span>
                </a>
              </>
            )}
            {email && (
              <>
                {(telefone || telefone2) && <Sep />}
                <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA] truncate max-w-[260px]" title={email}>
                  <Mail size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="truncate">{email}</span>
                </a>
              </>
            )}
            {!telefone && !telefone2 && !email && (
              <span style={{ color: '#94A3B8' }}>Sem contatos cadastrados</span>
            )}
          </div>

          <span aria-hidden className="header-groups-divider" />

          {enderecoCompleto && (
            <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span className="truncate max-w-[420px]">{enderecoCompleto}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiTile icon={<Building2 size={18} />} label="Municípios" value={loadingMun ? '...' : String(municipios.length)} tone="primary" />
        <KpiTile icon={<Users size={18} />} label="Pacientes Cadastrados" value={loadingPac ? '...' : String(pacientes.length)} tone="warning" />
        <KpiTile icon={<CheckCircle2 size={18} />} label="Municípios com Pacientes" value={loadingPac ? '...' : String(municipiosComPacientes)} tone="success" />
      </div>

      {/* ============ Tabs ============ */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative px-4 py-3 text-[14px] font-medium transition-colors"
              style={{ color: active ? '#146BFA' : '#64748B', background: 'transparent' }}
            >
              {t.label}
              {active && <span className="absolute left-2 right-2 -bottom-px h-[2px]" style={{ background: '#146BFA' }} />}
            </button>
          );
        })}
      </div>

      {/* ============ Tab content ============ */}
      <div className="animate-fade-in">
        {activeTab === 'identificacao' && (
          <Section title="Identificação" icon={<Info size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome" value={nome} />
              <InfoRow label="Código" value={codigo} mono />
              {municipioSede && <InfoRow label="Município sede" value={municipioSede} />}
              {regiaoNome && <InfoRow label="Região" value={regiaoNome} />}
              {telefone && <InfoRow label="Telefone 1" value={maskPhone(telefone)} />}
              {telefone2 && <InfoRow label="Telefone 2" value={maskPhone(telefone2)} />}
              {email && <InfoRow label="E-mail institucional" value={email} />}
              {email2 && <InfoRow label="E-mail secundário" value={email2} />}
            </div>
          </Section>
        )}

        {activeTab === 'endereco' && (
          <Section title="Endereço do Escritório" icon={<MapPin size={18} />}>
            {enderecoCompleto ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {logradouro && <InfoRow label="Logradouro" value={logradouro} />}
                {bairro && <InfoRow label="Bairro" value={bairro} />}
                {municipioEscritorio && <InfoRow label="Município" value={municipioEscritorio} />}
              </div>
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Endereço do escritório não cadastrado.
              </p>
            )}
          </Section>
        )}

        {activeTab === 'municipios' && (
          <Section
            title="Municípios Vinculados"
            icon={<Building2 size={18} />}
            badge={
              !loadingMun ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
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
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto rounded-lg p-2"
                  style={{ border: '1px solid var(--tfd-surface-border)' }}
                >
                  {municipios.map((mun) => (
                    <div key={mun} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
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
        )}

        {activeTab === 'pacientes' && (
          <Section
            title="Pacientes Vinculados"
            icon={<Users size={18} />}
            badge={
              !loadingPac ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                  {filtered.length}
                </span>
              ) : undefined
            }
          >
            <div className="mb-3">
              <div
                className="flex items-center gap-2 px-3"
                style={{
                  background: 'white', border: '1px solid var(--tfd-surface-border)',
                  borderRadius: 8, height: 36, maxWidth: 360,
                }}
              >
                <Search size={14} style={{ color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Buscar paciente, CPF ou município..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[13px]"
                />
              </div>
            </div>

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
                      <th
                        className="px-4 py-3 font-semibold text-left cursor-pointer select-none"
                        style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        onClick={() => toggleSort('nome_completo')}
                      >
                        Paciente{sortIndicator('nome_completo')}
                      </th>
                      <th
                        className="px-4 py-3 font-semibold text-left hidden sm:table-cell cursor-pointer select-none"
                        style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        onClick={() => toggleSort('cpf')}
                      >
                        CPF{sortIndicator('cpf')}
                      </th>
                      <th
                        className="px-4 py-3 font-semibold text-left hidden md:table-cell cursor-pointer select-none"
                        style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        onClick={() => toggleSort('municipio')}
                      >
                        Município{sortIndicator('municipio')}
                      </th>
                      <th
                        className="px-4 py-3 font-semibold text-left hidden lg:table-cell cursor-pointer select-none"
                        style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                        onClick={() => toggleSort('created_at')}
                      >
                        Cadastro{sortIndicator('created_at')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPac ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                          <div className="inline-flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Carregando pacientes...
                          </div>
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                          {search ? 'Nenhum paciente encontrado para esta busca.' : 'Nenhum paciente vinculado.'}
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
                            style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                            className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                            onClick={() => router.push(`/pacientes/${pacId}?from=regionais-saude`)}
                          >
                            <td className="px-4 py-3.5">
                              <span className="font-medium" style={{ color: 'var(--tfd-primary-500)' }}>
                                {nomePac}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 hidden sm:table-cell font-mono text-[12px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {cpfPac ? formatCPF(cpfPac) : '—'}
                            </td>
                            <td className="px-4 py-3.5 hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {munPac || '—'}
                            </td>
                            <td className="px-4 py-3.5 hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-muted)' }}>
                              {dataCadastro ? formatDate(dataCadastro) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > 0 && (
                <Pagination
                  total={filtered.length}
                  pageSize={pageSize}
                  page={currentPage}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                  recordLabel="pacientes"
                />
              )}
            </div>
          </Section>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 180ms ease-out; }
        .header-groups { display: flex; flex-direction: column; gap: 6px; }
        .header-groups-divider { display: none; }
        @media (min-width: 1100px) {
          .header-groups { flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
          .header-groups-divider { display: inline-block; width: 1px; height: 16px; background: #E2E8F0; flex-shrink: 0; }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Helpers visuais                                    */
/* -------------------------------------------------- */

function Sep() {
  return <span aria-hidden style={{ color: '#CBD5E1' }}>·</span>;
}

function Section({
  title, icon, children, badge,
}: { title: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode; }) {
  return (
    <div className="tfd-card tfd-card--flat">
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
      <span className="text-sm font-medium shrink-0 w-40" style={{ color: 'var(--tfd-text-secondary)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--tfd-text-primary)', fontFamily: mono ? 'var(--tfd-font-mono)' : undefined }}>
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
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'warning' | 'success'; }) {
  const c = KPI_TONES[tone];
  return (
    <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: c.bg, border: '1px solid var(--tfd-surface-border)' }}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: c.iconBg, color: c.fg }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight" style={{ color: c.fg }}>{value}</p>
        <p className="text-xs" style={{ color: c.fg, opacity: 0.8 }}>{label}</p>
      </div>
    </div>
  );
}
