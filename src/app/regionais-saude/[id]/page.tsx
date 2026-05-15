'use client';

import { use, useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Building2,
  Users,
  Search,
  XCircle,
  Pencil,
  Compass,
} from 'lucide-react';
import { DetailPageSkeleton } from '@/shared/components/skeleton';
import { Skeleton } from '@/components/ui/skeleton';

import Pagination from '@/shared/components/pagination/Pagination';
import { formatDate, formatCPF, maskPhone } from '@/shared/pipes/formatters';

import {
  buscarRegionalSaude,
  listarMunicipiosPorRegional,
} from '@/services/regionais-saude.service';
import { createClient } from '@/lib/supabase/client';
import RegionalDrawer from '../_RegionalDrawer';

/* -------------------------------------------------- */
/*  Sort                                               */
/* -------------------------------------------------- */

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

  const [regional, setRegional] = useState<Record<string, unknown> | null>(null);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [pacientes, setPacientes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMun, setLoadingMun] = useState(true);
  const [loadingPac, setLoadingPac] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);

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
  }, [id, reloadFlag]);

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
    return <DetailPageSkeleton tabs={0} />;
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
          <button className="tfd-btn tfd-btn-primary shrink-0" onClick={() => setEditOpen(true)}>
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
            {email2 && (
              <>
                {(telefone || telefone2 || email) && <Sep />}
                <a href={`mailto:${email2}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA] truncate max-w-[260px]" title={email2}>
                  <Mail size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="truncate">{email2}</span>
                </a>
              </>
            )}
            {!telefone && !telefone2 && !email && !email2 && (
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
      <KpiBar
        items={[
          { label: 'Municípios',                value: loadingMun ? '...' : String(municipios.length) },
          { label: 'Pacientes Cadastrados',     value: loadingPac ? '...' : String(pacientes.length) },
          { label: 'Municípios com Pacientes',  value: loadingPac ? '...' : String(municipiosComPacientes) },
        ]}
      />

      {/* ============ Conteúdo ============ */}
      <div className="space-y-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
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
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={13} />
                Gerenciar Municípios
              </button>
            </>
          )}
        </Section>

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
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                        {Array.from({ length: 4 }).map((__, c) => (
                          <td key={c} className="px-4 py-3.5">
                            <Skeleton className={`h-4 ${c === 0 ? 'w-48' : 'w-28'}`} />
                          </td>
                        ))}
                      </tr>
                    ))
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
      </div>

      <style jsx>{`
        .header-groups { display: flex; flex-direction: column; gap: 6px; }
        .header-groups-divider { display: none; }
        @media (min-width: 1100px) {
          .header-groups { flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
          .header-groups-divider { display: inline-block; width: 1px; height: 16px; background: #E2E8F0; flex-shrink: 0; }
        }
      `}</style>

      <RegionalDrawer
        open={editOpen}
        editandoId={editOpen ? id : null}
        editandoData={editOpen ? regional : null}
        onClose={() => setEditOpen(false)}
        onSaved={() => setReloadFlag((n) => n + 1)}
      />
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

function KpiBar({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div
      className="mb-6 overflow-hidden"
      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 kpi-bar">
        {items.map((it, i) => (
          <div key={i} className="px-5 py-4 kpi-cell">
            <p className="text-[11px] font-medium uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>
              {it.label}
            </p>
            <p className="text-[22px] font-semibold leading-tight mt-1" style={{ color: '#0F172A' }}>
              {it.value}
            </p>
            {it.sub && (
              <p className="text-[12px] mt-1" style={{ color: '#94A3B8' }}>{it.sub}</p>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        @media (min-width: 640px) {
          .kpi-cell + .kpi-cell { border-left: 1px solid #F1F5F9; }
        }
      `}</style>
    </div>
  );
}
