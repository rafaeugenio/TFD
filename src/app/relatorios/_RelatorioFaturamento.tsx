'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plane, Receipt, Loader2, FileText, ArrowRightLeft, Wallet, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ReportToolbar,
  FilterField,
  PillButton,
  PrintButton,
  ReportHero,
  StatsRow,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { ReportTable, TipoBeneficiarioBadge, TipoPercursoBadge, type ReportColumn } from './_shared/ReportTable';
import {
  MES_LABEL,
  MES_LABEL_SHORT,
  fmtBRL,
  fmtDataBR,
  anosDisponiveis,
  valorPorExtenso,
  numeroRelatorioMensal,
} from './_shared/format';

interface ViagemRow {
  id: string;
  numero_processo?: string | null;
  numero_documento?: string | null;
  passageiro_nome: string;
  beneficiario_tipo: 'paciente' | 'acompanhante';
  tipo: 'IDA' | 'VOLTA' | 'IDA_E_VOLTA';
  data_viagem?: string | null;
  data_viagem_volta?: string | null;
  data_bilhete: string;
  trecho_origem: string;
  trecho_destino: string;
  valor: number;
}

export default function RelatorioFaturamento() {
  const hoje = new Date();
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1); // 1..12 (0 = ano inteiro)
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ViagemRow[]>([]);

  const periodo = useMemo(() => {
    if (mes === 0) {
      return {
        inicio: `${ano}-01-01`,
        fim: `${ano}-12-31`,
        label: `Ano de ${ano}`,
        numero: `ANO-${ano}`,
      };
    }
    const lastDay = new Date(ano, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    return {
      inicio: `${ano}-${mm}-01`,
      fim: `${ano}-${mm}-${String(lastDay).padStart(2, '0')}`,
      label: `${MES_LABEL[mes - 1]} de ${ano}`,
      numero: numeroRelatorioMensal(ano, mes),
    };
  }, [ano, mes]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      // Busca viagens cuja data_bilhete cai no período. Inclui dados do paciente
      // via solicitação. Acompanhantes vêm pelo beneficiario_id (resolvido depois).
      const { data, error } = await supabase
        .from('viagens')
        .select(
          'id, numero_bilhete, tipo, beneficiario_tipo, beneficiario_id, ' +
          'data_embarque_prevista, data_retorno_prevista, created_at, ' +
          'origem_cidade, origem_uf, destino_cidade, destino_uf, valor, ' +
          'solicitacoes!inner(numero_processo, pacientes(nome_completo)), ' +
          'acompanhantes:beneficiario_id(nome_completo)'
        )
        .gte('created_at', periodo.inicio)
        .lte('created_at', `${periodo.fim}T23:59:59`)
        .order('created_at', { ascending: true });

      if (cancel) return;
      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      const mapped: ViagemRow[] = (data as unknown as Array<Record<string, unknown>>).map((r, i) => {
        const sol = r.solicitacoes as Record<string, unknown> | null;
        const pac = sol?.pacientes as Record<string, unknown> | null;
        const acomp = r.acompanhantes as Record<string, unknown> | null;
        const beneficiarioTipo = (r.beneficiario_tipo as string)?.toLowerCase() === 'acompanhante'
          ? 'acompanhante' : 'paciente';
        const nomeBeneficiario = beneficiarioTipo === 'acompanhante'
          ? ((acomp?.nome_completo as string) ?? 'Acompanhante')
          : ((pac?.nome_completo as string) ?? 'Paciente');
        const sufixo = beneficiarioTipo === 'acompanhante' ? ' (A)' : ' (P)';
        return {
          id: (r.id as string) ?? `tmp-${i}`,
          numero_processo: (sol?.numero_processo as string) ?? null,
          numero_documento: (r.numero_bilhete as string) ?? null,
          passageiro_nome: `${nomeBeneficiario}${sufixo}`,
          beneficiario_tipo: beneficiarioTipo,
          tipo: (r.tipo as ViagemRow['tipo']) ?? 'IDA',
          data_viagem: (r.data_embarque_prevista as string) ?? null,
          data_viagem_volta: (r.data_retorno_prevista as string) ?? null,
          data_bilhete: (r.created_at as string) ?? '',
          trecho_origem: `${(r.origem_uf as string) ?? ''}/${(r.origem_cidade as string) ?? ''}`,
          trecho_destino: `${(r.destino_uf as string) ?? ''}/${(r.destino_cidade as string) ?? ''}`,
          valor: Number(r.valor) || 0,
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [periodo]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.valor, 0), [rows]);
  const qtdItens = rows.length;
  const qtdPaciente = rows.filter((r) => r.beneficiario_tipo === 'paciente').length;
  const qtdAcomp = qtdItens - qtdPaciente;

  const columns: ReportColumn<ViagemRow>[] = [
    {
      key: 'doc',
      header: 'Doc.',
      width: '72px',
      align: 'left',
      mono: true,
      render: (r, i) => r.numero_documento ?? String(i + 1).padStart(3, '0'),
    },
    {
      key: 'processo',
      header: 'Processo',
      width: '104px',
      mono: true,
      render: (r) => r.numero_processo ?? '—',
    },
    {
      key: 'data',
      header: 'Data bilhete',
      width: '104px',
      render: (r) => fmtDataBR(r.data_bilhete),
    },
    {
      key: 'passageiro',
      header: 'Passageiro',
      render: (r) => (
        <div className="flex items-start gap-1.5">
          <TipoBeneficiarioBadge tipo={r.beneficiario_tipo} />
          <span style={{ fontWeight: 500 }}>{r.passageiro_nome.replace(/\s*\([PA]\)\s*$/, '')}</span>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: '88px',
      align: 'center',
      render: (r) => <TipoPercursoBadge tipo={r.tipo} />,
    },
    {
      key: 'data_viagem',
      header: 'Data viagem',
      width: '116px',
      render: (r) =>
        r.tipo === 'IDA_E_VOLTA'
          ? `${fmtDataBR(r.data_viagem)} | ${fmtDataBR(r.data_viagem_volta)}`
          : fmtDataBR(r.data_viagem),
    },
    {
      key: 'trecho',
      header: 'Trecho',
      width: '180px',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-[12px]">
          <span className="font-mono">{r.trecho_origem}</span>
          <ArrowRightLeft size={10} style={{ color: '#94A3B8' }} />
          <span className="font-mono">{r.trecho_destino}</span>
        </span>
      ),
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      width: '112px',
      render: (r) => fmtBRL(r.valor),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: '112px',
      render: (r) => <strong>{fmtBRL(r.valor)}</strong>,
    },
  ];

  return (
    <div className="space-y-4">
      <ReportPrintStyles />

      {/* Toolbar */}
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
                <PillButton active={mes === 0} onClick={() => setMes(0)}>Ano inteiro</PillButton>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <PillButton key={m} active={mes === m} onClick={() => setMes(m)}>
                    {MES_LABEL_SHORT[m - 1]}
                  </PillButton>
                ))}
              </div>
            </FilterField>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost"
              onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); }}
              title="Voltar para o mês atual"
            >
              <RefreshCw size={13} /> Mês atual
            </button>
            <PrintButton />
          </>
        }
      />

      {/* Hero */}
      <ReportHero
        numero={periodo.numero}
        titulo="Relatório de Faturamento — Passagens"
        periodoLabel={periodo.label}
        rightSlot={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Total a pagar</p>
            <p className="text-[20px] font-bold font-mono">{fmtBRL(total)}</p>
            <p className="text-[10.5px] opacity-80 mt-0.5">{qtdItens} item(ns)</p>
          </div>
        }
      />

      {/* Stats */}
      <StatsRow
        items={[
          {
            label: 'Bilhetes emitidos',
            value: String(qtdItens),
            hint: `${qtdPaciente} pac. · ${qtdAcomp} acomp.`,
            icon: <Plane size={11} />,
          },
          {
            label: 'Valor bruto',
            value: fmtBRL(total),
            hint: 'Soma dos bilhetes do período',
            tone: 'info',
            icon: <Wallet size={11} />,
          },
          {
            label: 'Créditos do fornecedor',
            value: fmtBRL(0),
            hint: 'A ser preenchido pela agência',
            icon: <FileText size={11} />,
          },
          {
            label: 'Reembolsos ao TFD',
            value: fmtBRL(0),
            hint: 'Devoluções já aplicadas',
            icon: <Receipt size={11} />,
          },
        ]}
      />

      {/* Tabela principal */}
      <TableCard
        title="Itens faturados"
        subtitle={loading ? 'Carregando...' : undefined}
        count={qtdItens}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : (
          <ReportTable
            columns={columns}
            rows={rows}
            emptyLabel={`Nenhuma viagem registrada em ${periodo.label.toLowerCase()}.`}
            footerRow={
              rows.length > 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{ color: '#475569' }}>Total · {qtdItens} item(ns)</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>
                  <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtBRL(total)}</td>
                  <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtBRL(total)}</td>
                </tr>
              ) : undefined
            }
          />
        )}
      </TableCard>

      {/* Créditos do fornecedor */}
      <TableCard
        title="Créditos para o fornecedor"
        subtitle="Faturas, descontos e ajustes concedidos pela agência"
        count={0}
      >
        <ReportTable
          columns={[
            { key: 'fat',        header: 'Nº fatura',    width: '100px', mono: true, render: () => '—' },
            { key: 'item',       header: 'Item',         width: '70px',  mono: true, render: () => '—' },
            { key: 'proc',       header: 'Processo',     width: '110px', mono: true, render: () => '—' },
            { key: 'passageiro', header: 'Passageiro',   render: () => '—' },
            { key: 'descricao',  header: 'Descrição',    render: () => '—' },
            { key: 'emissao',    header: 'Emissão',      width: '100px', render: () => '—' },
            { key: 'valor',      header: 'Valor',        align: 'right', width: '120px', render: () => '—' },
            { key: 'just',       header: 'Justificativa', render: () => '—' },
          ]}
          rows={[]}
          emptyLabel="Nenhum crédito registrado."
        />
      </TableCard>

      {/* Reembolsos */}
      <TableCard
        title="Reembolsos concedidos ao TFD"
        subtitle="Devoluções aplicadas pelo fornecedor"
        count={0}
      >
        <ReportTable
          columns={[
            { key: 'data',       header: 'Data viagem',  width: '100px', render: () => '—' },
            { key: 'passageiro', header: 'Passageiro',   render: () => '—' },
            { key: 'rel',        header: 'Nº relatório', width: '110px', mono: true, render: () => '—' },
            { key: 'trecho',     header: 'Trecho',       render: () => '—' },
            { key: 'proc',       header: 'Processo',     width: '110px', mono: true, render: () => '—' },
            { key: 'tipo',       header: 'Tipo movim.',  width: '110px', render: () => '—' },
            { key: 'valor',      header: 'A reembolsar', align: 'right', width: '120px', render: () => '—' },
            { key: 'just',       header: 'Justificativa', render: () => '—' },
          ]}
          rows={[]}
          emptyLabel="Nenhum reembolso registrado."
        />
      </TableCard>

      {/* Total a pagar — destaque final */}
      <div
        className="px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 60%)',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#15803D', letterSpacing: '0.08em' }}>
              Total do Faturamento
            </p>
            <p className="text-[12.5px] italic" style={{ color: '#475569' }}>
              {valorPorExtenso(total)}.
            </p>
          </div>
          <p className="text-[26px] font-bold font-mono" style={{ color: '#15803D', letterSpacing: '-0.01em' }}>
            {fmtBRL(total)}
          </p>
        </div>
      </div>
    </div>
  );
}
