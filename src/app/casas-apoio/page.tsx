'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Home, ChevronDown, ChevronRight, Phone, User, MapPin,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import StatusDot from '@/app/fluxo-v2/_components/StatusDot';
import CasaApoioDrawer from './_CasaApoioDrawer';
import {
  useCasasApoio,
  encaminhamentosDaCasa,
} from '@/app/fluxo-v2/_state/servicoSocialStore';
import {
  SITUACAO_DEMANDA_LABEL,
  type CasaApoioMock,
} from '@/core/mocks/servico-social-seed';

type SituacaoFiltro = 'todas' | 'ativas' | 'inativas';

const SITUACAO_OPTIONS: { value: SituacaoFiltro; label: string }[] = [
  { value: 'todas', label: 'Todas as situações' },
  { value: 'ativas', label: 'Somente ativas' },
  { value: 'inativas', label: 'Somente inativas' },
];

function dataBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Cadastro de casas de apoio, que substitui o controle disperso em planilhas
 * e alimenta a escolha de casa no encaminhamento do Serviço Social. Casa
 * inativa continua no histórico, mas sai da escolha de novos encaminhamentos.
 * A exclusão não faz parte do escopo do protótipo: para tirar de uso, marque
 * a casa como inativa.
 */
export default function CasasApoioPage() {
  const casas = useCasasApoio();

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoFiltro>('todas');
  const [drawer, setDrawer] = useState<{ open: boolean; casa: CasaApoioMock | null }>({
    open: false, casa: null,
  });
  const [expandida, setExpandida] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: casas.length,
    ativas: casas.filter((c) => c.ativa).length,
    inativas: casas.filter((c) => !c.ativa).length,
  }), [casas]);

  const filtradas = useMemo(
    () => casas.filter((c) => {
      if (situacao === 'ativas' && !c.ativa) return false;
      if (situacao === 'inativas' && c.ativa) return false;
      if (busca.trim() && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    }),
    [casas, busca, situacao],
  );

  return (
    <div>
      <PageHeader
        title="Casas de Apoio"
        subtitle="Cadastro das casas usadas nos encaminhamentos do Serviço Social."
        actions={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={() => setDrawer({ open: true, casa: null })}
          >
            <Plus size={14} /> Nova casa de apoio
          </button>
        }
      />

      <StatsRow
        stats={[
          { label: 'Cadastradas', value: stats.total, hint: 'no total', title: 'Casas de apoio cadastradas no sistema' },
          { label: 'Ativas', value: stats.ativas, hint: 'disponíveis', title: 'Casas disponíveis para novos encaminhamentos' },
          { label: 'Inativas', value: stats.inativas, hint: 'só no histórico', title: 'Casas que continuam no histórico mas saíram da escolha de novos encaminhamentos' },
        ]}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, height: 36, minWidth: 280 }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
        <select
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as SituacaoFiltro)}
          style={{
            height: 36, padding: '0 12px', background: 'white',
            border: '1px solid var(--tfd-surface-border)', borderRadius: 8,
            fontSize: 13, color: '#1A1D2B',
          }}
        >
          {SITUACAO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden' }}>
        {filtradas.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Home size={22} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
            <p className="text-[13px]" style={{ color: '#64748B' }}>
              Nenhuma casa de apoio encontrada.
            </p>
          </div>
        ) : (
          <ul>
            {filtradas.map((c) => {
              const aberta = expandida === c.id;
              const historico = encaminhamentosDaCasa(c.id);
              return (
                <li key={c.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div
                    className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    onClick={() => setExpandida(aberta ? null : c.id)}
                  >
                    {aberta
                      ? <ChevronDown size={15} className="mt-0.5 shrink-0" style={{ color: '#94A3B8' }} />
                      : <ChevronRight size={15} className="mt-0.5 shrink-0" style={{ color: '#94A3B8' }} />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-medium" style={{ color: '#1A1D2B' }}>
                          {c.nome}
                        </span>
                        <StatusDot tone={c.ativa ? 'success' : 'muted'}>
                          {c.ativa ? 'Ativa' : 'Inativa'}
                        </StatusDot>
                      </div>
                      <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap mt-0.5 text-[12.5px]" style={{ color: '#64748B' }}>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} /> {c.endereco}{c.cidadeUf ? `, ${c.cidadeUf}` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1"><Phone size={11} /> {c.contato}</span>
                        <span className="inline-flex items-center gap-1"><User size={11} /> {c.responsavel}</span>
                      </div>
                      {c.unidadeVinculadaNome && (
                        <p className="text-[12px] mt-0.5" style={{ color: '#94A3B8' }}>
                          Unidade vinculada: {c.unidadeVinculadaNome}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      className="tfd-btn tfd-btn-ghost tfd-btn--sm shrink-0"
                      onClick={(e) => { e.stopPropagation(); setDrawer({ open: true, casa: c }); }}
                    >
                      <Pencil size={13} /> Editar
                    </button>
                  </div>

                  {aberta && (
                    <div className="px-4 pb-4" style={{ background: '#F8FAFC' }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] pt-3 pb-2" style={{ color: '#94A3B8' }}>
                        Encaminhamentos vinculados ({historico.length})
                      </p>
                      {historico.length === 0 ? (
                        <p className="text-[12.5px] pb-1" style={{ color: '#CBD5E1' }}>
                          Nenhum encaminhamento registrado para esta casa.
                        </p>
                      ) : (
                        <table className="w-full text-[12.5px]">
                          <thead>
                            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <ThMini>Paciente</ThMini>
                              <ThMini>Solicitação</ThMini>
                              <ThMini>Data</ThMini>
                              <ThMini>Situação</ThMini>
                            </tr>
                          </thead>
                          <tbody>
                            {historico.map(({ instrumento, demanda }) => (
                              <tr key={instrumento.id} style={{ borderBottom: '1px solid #EEF2F7' }}>
                                <td className="py-2 pr-3" style={{ color: '#1E293B' }}>
                                  {demanda?.pacienteNome ?? 'Paciente não localizado'}
                                </td>
                                <td className="py-2 pr-3 font-mono" style={{ color: '#146BFA' }}>
                                  {demanda?.solicitacaoNumero ?? '—'}
                                </td>
                                <td className="py-2 pr-3" style={{ color: '#64748B' }}>
                                  {dataBR(instrumento.dataCriacao)}
                                </td>
                                <td className="py-2" style={{ color: '#64748B' }}>
                                  {demanda ? SITUACAO_DEMANDA_LABEL[demanda.situacao] : 'Sem demanda vinculada'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CasaApoioDrawer
        open={drawer.open}
        casa={drawer.casa}
        onClose={() => setDrawer({ open: false, casa: null })}
      />
    </div>
  );
}

function ThMini({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left font-semibold pb-2 pr-3"
      style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
    >
      {children}
    </th>
  );
}
