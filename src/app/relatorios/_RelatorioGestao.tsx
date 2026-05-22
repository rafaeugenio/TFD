'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Stethoscope,
  Hospital,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  FilterField,
  PrintButton,
  ReportHero,
  StatsRow,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { ReportTable, type ReportColumn } from './_shared/ReportTable';
import { anosDisponiveis, MES_LABEL, MES_LABEL_SHORT } from './_shared/format';
import { listarRegionaisSaudeAdmin, listarMunicipiosPorRegional } from '@/services/regionais-saude.service';

/**
 * Relatório de Gestão — visão "uma linha por paciente/solicitação"
 * solicitado pela gestora do TFD para acompanhamento estratégico.
 *
 * Cada linha consolida:
 *  - Identificação do paciente (nome + contato + município de residência)
 *  - Diagnóstico (CID + descrição)
 *  - Origem do laudo (unidade de saúde onde o laudo foi emitido) ← novo
 *  - Destino: cidade + hospital onde foi agendado o atendimento
 *  - Decisão do parecer médico
 *  - Observação livre
 */
interface GestaoRow {
  id: string;
  numero_processo: string;
  nome_paciente: string;
  contato: string;
  municipio_residencia: string;
  cid: string;
  diagnostico: string;
  unidade_origem: string;
  cidade_origem: string;
  cidade_destino: string;
  hospital_destino: string;
  parecer: string | null;
  parecer_decisao: 'deferido' | 'indeferido' | null;
  observacao: string | null;
  created_at: string;
}

interface RegionalOpt {
  id: string;
  nome: string;
  codigo: string;
}

export default function RelatorioGestao() {
  const hoje = new Date();
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  /** mes = 0 significa "ano inteiro". */
  const [mes, setMes] = useState<number>(0);
  /** Filtro de regional — 'todas' = sem filtro. */
  const [regionalId, setRegionalId] = useState<string>('todas');
  /** Filtro de município — 'todos' = sem filtro. Reseta quando regional muda. */
  const [municipio, setMunicipio] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GestaoRow[]>([]);
  const [regionais, setRegionais] = useState<RegionalOpt[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);

  const periodo = useMemo(() => {
    if (mes === 0) {
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, label: `Ano de ${ano}` };
    }
    const lastDay = new Date(ano, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    const fim = `${ano}-${mm}-${String(lastDay).padStart(2, '0')}`;
    return {
      inicio: `${ano}-${mm}-01`,
      fim,
      label: `${MES_LABEL_SHORT[mes - 1]}/${ano}`,
    };
  }, [ano, mes]);

  async function carregar() {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('solicitacoes')
      .select(
        'id, numero_processo, cid10_principal, descricao_diagnostico, created_at, ' +
          'pacientes(nome_completo, telefone_celular, telefone_fixo, email, municipio), ' +
          'origem_laudo_unidade:unidades_destino!solicitacoes_origem_laudo_unidade_id_fkey(nome, municipio, uf), ' +
          'agendamentos(unidades_destino!agendamentos_unidade_destino_id_fkey(nome, municipio, uf)), ' +
          'pareceres(decisao, observacoes_medicas, created_at)',
      )
      .gte('created_at', periodo.inicio)
      .lte('created_at', `${periodo.fim}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setRows([]);
      setLoading(false);
      return;
    }

    const mapped: GestaoRow[] = (data as unknown as Array<Record<string, unknown>>).map((s) => {
      const pac = (s.pacientes as Record<string, unknown> | null) ?? {};
      const origem = (s.origem_laudo_unidade as { nome?: string; municipio?: string; uf?: string } | null) ?? null;
      const agendamentos = (s.agendamentos as Array<{ unidades_destino?: { nome?: string; municipio?: string; uf?: string } | null }> | null) ?? [];
      const agPrimeiro = agendamentos.find((a) => a.unidades_destino) ?? null;
      const hospitalUnid = agPrimeiro?.unidades_destino;
      // Maior parecer (último) — assume um por solicitação na maioria dos casos.
      const pareceresArr = (s.pareceres as Array<{ decisao: string; observacoes_medicas: string | null; created_at: string }> | null) ?? [];
      const ultimoParecer = pareceresArr.length > 0
        ? [...pareceresArr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : null;

      const contatos = [pac.telefone_celular, pac.telefone_fixo, pac.email].filter(Boolean).join(' / ');

      return {
        id: s.id as string,
        numero_processo: (s.numero_processo as string) ?? '—',
        nome_paciente: (pac.nome_completo as string) ?? '—',
        contato: contatos || '—',
        municipio_residencia: (pac.municipio as string) ?? '—',
        cid: (s.cid10_principal as string) ?? '—',
        diagnostico: (s.descricao_diagnostico as string) ?? '—',
        unidade_origem: origem?.nome ?? '—',
        cidade_origem: origem
          ? `${origem.municipio ?? ''}${origem.uf ? `/${origem.uf}` : ''}`.trim() || '—'
          : '—',
        cidade_destino: hospitalUnid
          ? `${hospitalUnid.municipio ?? ''}${hospitalUnid.uf ? `/${hospitalUnid.uf}` : ''}`.trim() || '—'
          : '—',
        hospital_destino: hospitalUnid?.nome ?? '—',
        parecer: ultimoParecer?.decisao ?? null,
        parecer_decisao: (ultimoParecer?.decisao as 'deferido' | 'indeferido' | null) ?? null,
        observacao: ultimoParecer?.observacoes_medicas ?? null,
        created_at: s.created_at as string,
      };
    });

    setRows(mapped);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.inicio, periodo.fim]);

  // Carrega regionais uma vez.
  useEffect(() => {
    (async () => {
      const { data } = await listarRegionaisSaudeAdmin();
      if (data) {
        setRegionais(
          (data as Array<{ id: string; nome: string; codigo: string }>).map((r) => ({ id: r.id, nome: r.nome, codigo: r.codigo })),
        );
      }
    })();
  }, []);

  // Carrega municípios quando a regional muda. Reseta filtro de município.
  useEffect(() => {
    if (regionalId === 'todas') {
      setMunicipios([]);
      setMunicipio('todos');
      return;
    }
    (async () => {
      const { data } = await listarMunicipiosPorRegional(regionalId);
      if (data) {
        const nomes = Array.from(new Set((data as Array<{ municipio_nome: string }>).map((m) => m.municipio_nome))).sort();
        setMunicipios(nomes);
        setMunicipio('todos');
      }
    })();
  }, [regionalId]);

  const rowsFiltradas = useMemo(() => {
    const munSet = municipio !== 'todos' ? municipio.toLowerCase() : null;
    const munListaRegional = regionalId !== 'todas' && municipio === 'todos'
      ? new Set(municipios.map((m) => m.toLowerCase()))
      : null;
    return rows.filter((r) => {
      const munRow = (r.municipio_residencia ?? '').toLowerCase();
      if (munSet && munRow !== munSet) return false;
      if (munListaRegional && !munListaRegional.has(munRow)) return false;
      return true;
    });
  }, [rows, regionalId, municipio, municipios]);

  const totalDeferidos = rows.filter((r) => r.parecer_decisao === 'deferido').length;
  const totalIndeferidos = rows.filter((r) => r.parecer_decisao === 'indeferido').length;
  const totalSemParecer = rows.filter((r) => r.parecer_decisao === null).length;

  const columns: ReportColumn<GestaoRow>[] = [
    {
      key: 'paciente',
      header: 'Paciente',
      width: '220px',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
            {r.nome_paciente}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
            <Phone size={9} style={{ flexShrink: 0 }} />
            <span className="font-mono truncate">{r.contato}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
            <MapPin size={9} style={{ flexShrink: 0 }} />
            <span className="truncate">{r.municipio_residencia}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'diagnostico',
      header: 'Diagnóstico',
      width: '260px',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className="inline-block font-mono text-[10.5px] font-bold px-1.5 py-[1px] rounded self-start"
            style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
          >
            {r.cid}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.4 }}>
            {r.diagnostico}
          </span>
        </div>
      ),
    },
    {
      key: 'origem',
      header: 'Unidade de Origem',
      width: '200px',
      render: (r) => (
        <div className="flex items-start gap-1.5 min-w-0">
          <Stethoscope size={12} style={{ color: '#3730A3', flexShrink: 0, marginTop: 2 }} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
              {r.unidade_origem}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
              {r.cidade_origem}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'destino',
      header: 'Hospital de Agendamento',
      width: '200px',
      render: (r) => (
        <div className="flex items-start gap-1.5 min-w-0">
          <Hospital size={12} style={{ color: '#047857', flexShrink: 0, marginTop: 2 }} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
              {r.hospital_destino}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
              {r.cidade_destino}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'parecer',
      header: 'Parecer',
      width: '110px',
      align: 'center',
      render: (r) => {
        if (r.parecer_decisao === 'deferido') {
          return (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#15803D' }}>
              <CheckCircle2 size={11} /> Deferido
            </span>
          );
        }
        if (r.parecer_decisao === 'indeferido') {
          return (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              <XCircle size={11} /> Indeferido
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded" style={{ background: '#F1F5F9', color: '#64748B' }}>
            <Clock size={11} /> —
          </span>
        );
      },
    },
    {
      key: 'observacao',
      header: 'Observação',
      width: '220px',
      render: (r) => (
        <span className="text-[11.5px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          {r.observacao ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ReportHero
        titulo="Relatório de Gestão — Solicitações TFD"
        periodoLabel={periodo.label}
      />

      <div className="report-toolbar-single no-print" style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}>
        <div className="flex items-end gap-3" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          <FilterField label="Ano" icon={<Calendar size={11} />}>
            <select
              className="tfd-input"
              style={{ minWidth: 90 }}
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10))}
            >
              {anosDisponiveis().map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Mês" icon={<Calendar size={11} />}>
            <select
              className="tfd-input"
              style={{ minWidth: 130 }}
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value, 10))}
            >
              <option value={0}>Ano inteiro</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{MES_LABEL[m - 1]}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Regional">
            <select
              className="tfd-input"
              style={{ minWidth: 200 }}
              value={regionalId}
              onChange={(e) => setRegionalId(e.target.value)}
            >
              <option value="todas">Todas as regionais</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo} — {r.nome}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Município">
            <select
              className="tfd-input"
              style={{ minWidth: 180 }}
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              disabled={regionalId === 'todas'}
              title={regionalId === 'todas' ? 'Selecione uma regional primeiro' : ''}
            >
              <option value="todos">
                {regionalId === 'todas' ? '— escolha uma regional —' : 'Todos os municípios'}
              </option>
              {municipios.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FilterField>

          <div className="flex items-center gap-2 ml-auto" style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={carregar}
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              disabled={loading}
              title="Recarregar dados"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Atualizar
            </button>
            <PrintButton label="Imprimir / PDF" />
          </div>
        </div>
      </div>

      <StatsRow
        items={[
          { label: 'Total no período', value: String(rows.length), icon: <FileSpreadsheet size={11} /> },
          { label: 'Após filtros', value: String(rowsFiltradas.length), hint: 'visíveis na tabela' },
          { label: 'Deferidos', value: String(totalDeferidos), tone: 'success', icon: <CheckCircle2 size={11} /> },
          { label: 'Indeferidos', value: String(totalIndeferidos), tone: 'danger', icon: <XCircle size={11} /> },
          { label: 'Sem parecer', value: String(totalSemParecer), tone: 'warning', icon: <Clock size={11} /> },
        ]}
      />

      <TableCard
        title="Linhas do relatório"
        subtitle="Uma linha por solicitação no período selecionado"
        count={rowsFiltradas.length}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px]" style={{ color: 'var(--tfd-text-muted)' }}>
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <ReportTable<GestaoRow>
              columns={columns}
              rows={rowsFiltradas}
              emptyLabel="Nenhuma solicitação encontrada para o período + filtros aplicados."
            />
          </div>
        )}
      </TableCard>

      <ReportPrintStyles />
    </div>
  );
}
