'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Search, Loader2, Printer, Wallet, Users, CheckCircle2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ReportToolbar,
  FilterField,
  PillButton,
  ReportHero,
  StatsRow,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { ReportTable, TipoBeneficiarioBadge, type ReportColumn } from './_shared/ReportTable';
import {
  MES_LABEL,
  MES_LABEL_SHORT,
  fmtBRL,
  fmtDataBR,
  anosDisponiveis,
  valorPorExtenso,
} from './_shared/format';
import { formatCPF } from '@/shared/pipes/formatters';

interface ReciboRow {
  id: string;
  ciclo: number;
  status: string;
  numero_processo: string;
  paciente_nome: string;
  paciente_cpf: string;
  beneficiario_tipo: 'paciente' | 'acompanhante';
  beneficiario_nome: string;
  data_inicio: string;
  data_fim: string;
  valor_calculado: number;
  valor_pago: number;
  data_pagamento?: string | null;
}

export default function RecibosAjudaCusto() {
  const hoje = new Date();
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReciboRow[]>([]);
  const [reciboSelecionado, setReciboSelecionado] = useState<ReciboRow | null>(null);

  const periodo = useMemo(() => {
    if (mes === 0) {
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, label: `Ano de ${ano}` };
    }
    const lastDay = new Date(ano, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    return {
      inicio: `${ano}-${mm}-01`,
      fim: `${ano}-${mm}-${String(lastDay).padStart(2, '0')}`,
      label: `${MES_LABEL[mes - 1]} de ${ano}`,
    };
  }, [ano, mes]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ajudas_custo')
        .select(
          'id, beneficiario_tipo, beneficiario_id, data_inicio, data_fim, valor_total, valor_pago, ' +
          'status, created_at, ' +
          'solicitacoes!inner(numero_processo, pacientes(nome_completo, cpf)), ' +
          'acompanhantes:beneficiario_id(nome_completo)'
        )
        .gte('data_inicio', periodo.inicio)
        .lte('data_inicio', periodo.fim)
        .order('data_inicio', { ascending: false });

      if (cancel) return;
      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      const mapped: ReciboRow[] = (data as unknown as Array<Record<string, unknown>>).map((r, i) => {
        const sol = r.solicitacoes as Record<string, unknown> | null;
        const pac = sol?.pacientes as Record<string, unknown> | null;
        const acomp = r.acompanhantes as Record<string, unknown> | null;
        const beneficiarioTipo = (r.beneficiario_tipo as string)?.toLowerCase() === 'acompanhante'
          ? 'acompanhante' : 'paciente';
        return {
          id: (r.id as string) ?? `tmp-${i}`,
          ciclo: i + 1,
          status: ((r.status as string) ?? 'em_analise').toLowerCase(),
          numero_processo: (sol?.numero_processo as string) ?? '—',
          paciente_nome: (pac?.nome_completo as string) ?? '—',
          paciente_cpf: (pac?.cpf as string) ?? '',
          beneficiario_tipo: beneficiarioTipo,
          beneficiario_nome:
            beneficiarioTipo === 'acompanhante'
              ? ((acomp?.nome_completo as string) ?? 'Acompanhante')
              : ((pac?.nome_completo as string) ?? 'Paciente'),
          data_inicio: (r.data_inicio as string) ?? '',
          data_fim: (r.data_fim as string) ?? '',
          valor_calculado: Number(r.valor_total) || Number(r.valor_pago) || 0,
          valor_pago: Number(r.valor_pago) || 0,
          data_pagamento: (r.created_at as string) ?? null,
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [periodo]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.paciente_nome.toLowerCase().includes(q) ||
      r.beneficiario_nome.toLowerCase().includes(q) ||
      r.numero_processo.toLowerCase().includes(q) ||
      r.paciente_cpf.includes(q.replace(/\D/g, '')),
    );
  }, [rows, search]);

  const totalPago = useMemo(() => filtered.reduce((s, r) => s + r.valor_pago, 0), [filtered]);
  const totalAprovado = useMemo(() => filtered.reduce((s, r) => s + r.valor_calculado, 0), [filtered]);
  const qtdPagas = filtered.filter((r) => r.valor_pago > 0).length;

  const columns: ReportColumn<ReciboRow>[] = [
    {
      key: 'recibo',
      header: 'Recibo',
      width: '90px',
      mono: true,
      render: (r, i) => `#${String(i + 1).padStart(4, '0')}`,
    },
    {
      key: 'processo',
      header: 'Processo',
      width: '110px',
      mono: true,
      render: (r) => r.numero_processo,
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (r) => (
        <div>
          <p className="text-[12.5px] font-medium leading-tight" style={{ color: '#0F172A' }}>
            {r.paciente_nome}
          </p>
          {r.paciente_cpf && (
            <p className="text-[11px] font-mono mt-0.5" style={{ color: '#94A3B8' }}>
              {formatCPF(r.paciente_cpf)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'beneficiario',
      header: 'Beneficiário',
      width: '180px',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <TipoBeneficiarioBadge tipo={r.beneficiario_tipo} />
          <span className="text-[12px]">{r.beneficiario_nome}</span>
        </div>
      ),
    },
    {
      key: 'periodo',
      header: 'Período',
      width: '160px',
      render: (r) => `${fmtDataBR(r.data_inicio)} → ${fmtDataBR(r.data_fim)}`,
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      align: 'center',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'calculado',
      header: 'Valor calculado',
      align: 'right',
      width: '120px',
      render: (r) => fmtBRL(r.valor_calculado),
    },
    {
      key: 'pago',
      header: 'Valor pago',
      align: 'right',
      width: '120px',
      render: (r) => (
        <strong style={{ color: r.valor_pago > 0 ? '#15803D' : '#94A3B8' }}>
          {r.valor_pago > 0 ? fmtBRL(r.valor_pago) : '—'}
        </strong>
      ),
    },
    {
      key: 'acoes',
      header: '',
      width: '64px',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          className="inline-flex items-center justify-center"
          title="Imprimir recibo"
          onClick={() => setReciboSelecionado(r)}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--tfd-primary-50, #EBF0FF)',
            color: 'var(--tfd-primary-500)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Printer size={13} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportPrintStyles />

      <ReportToolbar
        filters={
          <>
            <FilterField label="Ano" icon={<Calendar size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 100 }}
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10))}
              >
                {anosDisponiveis().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Mês">
              <div className="flex items-center gap-1 flex-wrap">
                <PillButton active={mes === 0} onClick={() => setMes(0)}>Ano</PillButton>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <PillButton key={m} active={mes === m} onClick={() => setMes(m)}>
                    {MES_LABEL_SHORT[m - 1]}
                  </PillButton>
                ))}
              </div>
            </FilterField>

            <FilterField label="Busca" icon={<Search size={11} />}>
              <input
                type="text"
                className="tfd-input"
                placeholder="Paciente, CPF ou processo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 240 }}
              />
            </FilterField>
          </>
        }
      />

      <ReportHero
        titulo="Recibos de Ajuda de Custo"
        periodoLabel={periodo.label}
        rightSlot={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Total pago</p>
            <p className="text-[20px] font-bold font-mono">{fmtBRL(totalPago)}</p>
            <p className="text-[10.5px] opacity-80 mt-0.5">{qtdPagas} de {filtered.length} pagas</p>
          </div>
        }
      />

      <StatsRow
        items={[
          {
            label: 'Recibos no período',
            value: String(filtered.length),
            hint: search ? 'Após filtro de busca' : 'Total bruto',
            icon: <Users size={11} />,
          },
          {
            label: 'Valor aprovado',
            value: fmtBRL(totalAprovado),
            hint: 'Soma do valor calculado',
            tone: 'info',
            icon: <Wallet size={11} />,
          },
          {
            label: 'Valor pago',
            value: fmtBRL(totalPago),
            hint: `${qtdPagas} ajuda(s) finalizada(s)`,
            tone: 'success',
            icon: <CheckCircle2 size={11} />,
          },
        ]}
      />

      <TableCard
        title="Recibos emitidos"
        subtitle={loading ? 'Carregando...' : undefined}
        count={filtered.length}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : (
          <ReportTable columns={columns} rows={filtered} />
        )}
      </TableCard>

      {/* Modal de impressão do recibo individual */}
      {reciboSelecionado && (
        <ReciboPrintModal recibo={reciboSelecionado} onClose={() => setReciboSelecionado(null)} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { label: string; bg: string; fg: string }> = {
    em_analise:        { label: 'Em análise', bg: '#FEF3C7', fg: '#92400E' },
    aprovada:          { label: 'Aprovada',   bg: '#DBEAFE', fg: '#1E40AF' },
    em_pagamento:      { label: 'Em pgto',    bg: '#FFEDD5', fg: '#9A3412' },
    concluida:         { label: 'Paga',       bg: '#DCFCE7', fg: '#15803D' },
    pago_parcialmente: { label: 'Parcial',    bg: '#FFEDD5', fg: '#9A3412' },
    glosada:           { label: 'Glosada',    bg: '#FEE2E2', fg: '#B91C1C' },
  };
  const v = MAP[status] ?? { label: status, bg: '#F1F5F9', fg: '#475569' };
  return (
    <span
      className="inline-flex items-center text-[10.5px] font-bold uppercase px-1.5 py-0.5"
      style={{ background: v.bg, color: v.fg, borderRadius: 4, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
    >
      {v.label}
    </span>
  );
}

/* ====================================================== */
/*  Modal de impressão do recibo (Doc 1 simplificado)     */
/* ====================================================== */

function ReciboPrintModal({ recibo, onClose }: { recibo: ReciboRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 12,
          width: 'min(720px, 95vw)',
          maxHeight: '92vh',
          overflow: 'auto',
        }}
      >
        <header
          className="flex items-center justify-between px-5 py-3 sticky top-0 no-print"
          style={{ background: 'white', borderBottom: '1px solid var(--tfd-surface-border)', zIndex: 1 }}
        >
          <h3 className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>
            Recibo de Pagamento — Pré-visualização
          </h3>
          <div className="flex items-center gap-2">
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={() => window.print()}>
              <Printer size={13} /> Imprimir
            </button>
            <button onClick={onClose} className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
        </header>

        <ReciboPrintLayout recibo={recibo} />
      </div>
    </div>
  );
}

function ReciboPrintLayout({ recibo }: { recibo: ReciboRow }) {
  const valorPago = recibo.valor_pago > 0 ? recibo.valor_pago : recibo.valor_calculado;
  return (
    <div className="recibo-print p-8" style={{ background: 'white' }}>
      {/* Cabeçalho com brasão */}
      <div
        className="flex items-center justify-between pb-3 mb-4"
        style={{ borderBottom: '2px solid #0F172A' }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
            Governo do Maranhão · Secretaria de Saúde
          </p>
          <h2 className="text-[15px] font-bold uppercase mt-1" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
            TFD — Recibo de Pagamento a Beneficiário
          </h2>
        </div>
        <span
          className="text-[14px] font-mono font-bold px-3 py-1"
          style={{ background: 'var(--tfd-primary-50, #EBF0FF)', color: 'var(--tfd-primary-500)', borderRadius: 6 }}
        >
          #{recibo.id.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* Identificação enxuta (só nome + CPF, conforme pedido) */}
      <section className="mb-5">
        <h3 className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B', letterSpacing: '0.08em' }}>
          Identificação
        </h3>
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <p className="text-[10px] uppercase font-semibold" style={{ color: '#94A3B8' }}>Paciente</p>
              <p className="font-semibold" style={{ color: '#0F172A' }}>{recibo.paciente_nome}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold" style={{ color: '#94A3B8' }}>CPF</p>
              <p className="font-mono" style={{ color: '#0F172A' }}>{recibo.paciente_cpf ? formatCPF(recibo.paciente_cpf) : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold" style={{ color: '#94A3B8' }}>Processo</p>
              <p className="font-mono" style={{ color: '#0F172A' }}>{recibo.numero_processo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold" style={{ color: '#94A3B8' }}>Beneficiário</p>
              <p style={{ color: '#0F172A' }}>
                {recibo.beneficiario_tipo === 'paciente' ? 'Paciente' : `Acompanhante · ${recibo.beneficiario_nome}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valores do ciclo — o coração do recibo */}
      <section className="mb-5">
        <h3 className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B', letterSpacing: '0.08em' }}>
          Valores da Ajuda de Custo
        </h3>
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F1F5F9' }}>
              <th className="text-left px-3 py-2 font-bold" style={{ color: '#475569', fontSize: 10.5, textTransform: 'uppercase' }}>Período</th>
              <th className="text-center px-3 py-2 font-bold" style={{ color: '#475569', fontSize: 10.5, textTransform: 'uppercase' }}>Status</th>
              <th className="text-right px-3 py-2 font-bold" style={{ color: '#475569', fontSize: 10.5, textTransform: 'uppercase' }}>Valor calculado</th>
              <th className="text-right px-3 py-2 font-bold" style={{ color: '#475569', fontSize: 10.5, textTransform: 'uppercase' }}>Valor pago</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
              <td className="px-3 py-2">{fmtDataBR(recibo.data_inicio)} → {fmtDataBR(recibo.data_fim)}</td>
              <td className="px-3 py-2 text-center"><StatusBadge status={recibo.status} /></td>
              <td className="px-3 py-2 text-right font-mono">{fmtBRL(recibo.valor_calculado)}</td>
              <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: '#15803D' }}>{fmtBRL(recibo.valor_pago)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Valor líquido em destaque */}
      <div
        className="px-4 py-3 mb-5"
        style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 60%)',
          border: '1px solid #BBF7D0',
          borderRadius: 8,
        }}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#15803D' }}>
              Valor líquido
            </p>
            <p className="text-[11.5px] italic" style={{ color: '#475569' }}>
              {valorPorExtenso(valorPago)}.
            </p>
          </div>
          <p className="text-[22px] font-bold font-mono" style={{ color: '#15803D' }}>
            {fmtBRL(valorPago)}
          </p>
        </div>
      </div>

      {/* Assinatura */}
      <section className="mt-10 pt-6">
        <div
          style={{
            borderTop: '1px solid #0F172A',
            paddingTop: 6,
            maxWidth: 320,
            margin: '40px auto 0',
            textAlign: 'center',
          }}
        >
          <p className="text-[11.5px]" style={{ color: '#475569' }}>
            Assinatura do beneficiário
          </p>
          <p className="text-[10px]" style={{ color: '#94A3B8' }}>
            {recibo.beneficiario_nome} · CPF {recibo.paciente_cpf ? formatCPF(recibo.paciente_cpf) : '—'}
          </p>
        </div>
      </section>

      {/* Rodapé do recibo */}
      <footer className="mt-6 pt-3 text-[10px]" style={{ color: '#94A3B8', borderTop: '1px solid #E2E8F0' }}>
        Emitido em {new Date().toLocaleString('pt-BR')} · TFD — Tratamento Fora do Domicílio
      </footer>

      <style jsx>{`
        @media print {
          :global(body) { background: white !important; }
          :global(.no-print) { display: none !important; }
          .recibo-print { padding: 0 !important; }
          @page { size: A4 portrait; margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
