'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Check, X, Calendar, Target, TrendingUp } from 'lucide-react';
import {
  obterRelatorioFinanceiro,
  salvarMetaAnual,
  type RelatorioFinanceiro,
  type MesDados,
  type QuadriDados,
} from '@/services/relatorio-financeiro.service';
import { useToast } from '@/shared/components/toast/Toast';
import { ReportToolbar, FilterField, PillButton, PrintButton, ReportHero, ReportPrintStyles } from './_shared/ReportShell';
import { fmtBRL, fmtInt, anosDisponiveis } from './_shared/format';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'] as const;
const QUADRIS_LABEL = ['1º Quadrimestre', '2º Quadrimestre', '3º Quadrimestre'] as const;
const QUADRIS_SHORT = ['1º Q', '2º Q', '3º Q'] as const;

export default function RelatorioFinanceiro() {
  const toast = useToast();
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [quadriFiltro, setQuadriFiltro] = useState<0 | 1 | 2 | 3>(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RelatorioFinanceiro | null>(null);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [novaMeta, setNovaMeta] = useState<string>('');

  const carregar = async (anoAlvo: number) => {
    setLoading(true);
    const { data: rel, error } = await obterRelatorioFinanceiro(anoAlvo);
    if (error) {
      toast.error('Erro ao carregar relatório', error.message);
      setLoading(false);
      return;
    }
    setData(rel);
    setLoading(false);
  };

  useEffect(() => {
    carregar(ano);
  }, [ano]);

  const handleSalvarMeta = async () => {
    const valor = parseInt(novaMeta.replace(/\D/g, ''), 10);
    if (!valor || valor < 0) {
      toast.error('Valor inválido', 'Informe um número inteiro positivo.');
      return;
    }
    const { error } = await salvarMetaAnual(ano, valor);
    if (error) {
      toast.error('Erro ao salvar meta', error.message);
      return;
    }
    toast.success('Meta atualizada!', `Meta de ${ano}: ${fmtInt(valor)} procedimentos.`);
    setEditandoMeta(false);
    carregar(ano);
  };

  const mesesVisiveis: MesDados[] = useMemo(() => {
    if (!data) return [];
    if (quadriFiltro === 0) return data.meses;
    return data.meses.filter((m) => m.quadri === quadriFiltro);
  }, [data, quadriFiltro]);

  const quadrisVisiveis: QuadriDados[] = useMemo(() => {
    if (!data) return [];
    if (quadriFiltro === 0) return data.quadrimestres;
    return data.quadrimestres.filter((q) => q.quadri === quadriFiltro);
  }, [data, quadriFiltro]);

  const demandaPorQuadri = (q: 1 | 2 | 3) =>
    data?.demanda.find((d) => d.quadri === q) ?? { quadri: q, pacientes: 0, acompanhantes: 0 };

  if (loading) {
    return (
      <div className="tfd-card flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="tfd-card text-center py-12 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
        Nenhum dado disponível.
      </div>
    );
  }

  const percentualMeta = data.avaliacao_meta.percentual;

  return (
    <div className="rel-fin space-y-4">
      <ReportPrintStyles />

      {/* ========== Toolbar (padrão unificado) ========== */}
      <ReportToolbar
        filters={
          <>
            <FilterField label="Ano" icon={<Calendar size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 110 }}
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10))}
              >
                {anosDisponiveis().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Quadrimestre">
              <div className="flex items-center gap-1.5 flex-wrap">
                {([0, 1, 2, 3] as const).map((q) => (
                  <PillButton key={q} active={quadriFiltro === q} onClick={() => setQuadriFiltro(q)}>
                    {q === 0 ? 'Todos' : QUADRIS_SHORT[q - 1]}
                  </PillButton>
                ))}
              </div>
            </FilterField>
          </>
        }
        actions={<PrintButton />}
      />

      {/* ========== Hero (padrão unificado, com SES + período) ========== */}
      <ReportHero
        titulo="Relatório Financeiro Quadrimestral"
        periodoLabel={`Ano de ${data.ano}${quadriFiltro > 0 ? ' · ' + QUADRIS_LABEL[quadriFiltro - 1] : ''}`}
        rightSlot={
          <div className="flex items-stretch gap-3 flex-wrap">
            <MetaBox
              label="Meta Anual"
              icon={<Target size={14} />}
              value={
                editandoMeta ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="tfd-input"
                      style={{ width: 110, padding: '4px 8px' }}
                      value={novaMeta}
                      onChange={(e) => setNovaMeta(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={handleSalvarMeta}
                      className="p-1 rounded"
                      title="Salvar"
                      style={{ color: '#86EFAC' }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditandoMeta(false)}
                      className="p-1 rounded"
                      title="Cancelar"
                      style={{ color: '#FCA5A5' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>{fmtInt(data.meta_anual)} proc.</span>
                    <button
                      onClick={() => {
                        setNovaMeta(String(data.meta_anual));
                        setEditandoMeta(true);
                      }}
                      className="p-1 rounded no-print"
                      title="Editar meta"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                    >
                      <Pencil size={12} />
                    </button>
                  </span>
                )
              }
            />
            <MetaBox
              label="Executada"
              icon={<TrendingUp size={14} />}
              value={`${fmtInt(data.alcancada)} proc.`}
            />
            <MetaBox
              label="% da Meta"
              icon={<TrendingUp size={14} />}
              accent={percentualMeta >= 80 ? 'success' : percentualMeta >= 50 ? 'warning' : 'danger'}
              value={`${percentualMeta}%`}
            />
          </div>
        }
      />

      {/* ========== Bloco 1: Acompanhamento Quantitativo ========== */}
      <Bloco titulo="Acompanhamento Quantitativo">
        <ReportTable>
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>AJ. Custo Lançada</th>
              <th>AJ. Custo Aprovada</th>
              <th>Qtd. Diárias</th>
              <th>Total/Quadr.</th>
              <th>Desloc. Lançado</th>
              <th>Desloc. Aprovado</th>
              <th>Qtd. Desloc./Quadr.</th>
              <th>Qtd. Mensal Proc.</th>
              <th>Qtd. Proc./Quadr.</th>
            </tr>
          </thead>
          <tbody>
            {mesesVisiveis.map((m) => {
              const isUltimoQ = m.mes === 4 || m.mes === 8 || m.mes === 12;
              const q = data.quadrimestres.find((x) => x.quadri === m.quadri);
              return (
                <tr key={m.mes}>
                  <td className="rel-fin__row-label">{MESES[m.mes - 1]}</td>
                  <td>{fmtInt(m.ac_qtd_lanc)}</td>
                  <td>{fmtInt(m.ac_qtd_aprov)}</td>
                  <td>{fmtInt(m.ac_diarias)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtInt(q?.ac_diarias ?? 0) : ''}</td>
                  <td>{fmtInt(m.vi_qtd_lanc)}</td>
                  <td>{fmtInt(m.vi_qtd_aprov)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtInt(q?.vi_qtd_aprov ?? 0) : ''}</td>
                  <td>{fmtInt(m.qtd_proc)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtInt(q?.qtd_proc ?? 0) : ''}</td>
                </tr>
              );
            })}
            <tr className="rel-fin__footer-row">
              <td>TOTAL</td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.ac_qtd_lanc, 0))}</td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.ac_qtd_aprov, 0))}</td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.ac_diarias, 0))}</td>
              <td></td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.vi_qtd_lanc, 0))}</td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.vi_qtd_aprov, 0))}</td>
              <td></td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.qtd_proc, 0))}</td>
              <td></td>
            </tr>
          </tbody>
        </ReportTable>
      </Bloco>

      {/* ========== Bloco 2: Acompanhamento Financeiro ========== */}
      <Bloco titulo="Acompanhamento Financeiro de Procedimentos">
        <ReportTable>
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>AJ. Custo Lançada</th>
              <th>AJ. Custo Aprovada</th>
              <th>Valor AC/Quadr.</th>
              <th>Desloc. Lançado</th>
              <th>Desloc. Aprovado</th>
              <th>Valor Desloc./Quadr.</th>
              <th>Valor Mensal</th>
              <th>Valor/Quadr.</th>
            </tr>
          </thead>
          <tbody>
            {mesesVisiveis.map((m) => {
              const isUltimoQ = m.mes === 4 || m.mes === 8 || m.mes === 12;
              const q = data.quadrimestres.find((x) => x.quadri === m.quadri);
              const mensal = m.ac_valor_aprov + m.vi_valor_aprov;
              const quadriValorMensal = q ? q.ac_valor_aprov + q.vi_valor_aprov : 0;
              return (
                <tr key={m.mes}>
                  <td className="rel-fin__row-label">{MESES[m.mes - 1]}</td>
                  <td>{fmtBRL(m.ac_valor_lanc)}</td>
                  <td>{fmtBRL(m.ac_valor_aprov)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtBRL(q?.ac_valor_aprov ?? 0) : ''}</td>
                  <td>{fmtBRL(m.vi_valor_lanc)}</td>
                  <td>{fmtBRL(m.vi_valor_aprov)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtBRL(q?.vi_valor_aprov ?? 0) : ''}</td>
                  <td>{fmtBRL(mensal)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtBRL(quadriValorMensal) : ''}</td>
                </tr>
              );
            })}
            <tr className="rel-fin__footer-row">
              <td>TOTAL</td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.ac_valor_lanc, 0))}</td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.ac_valor_aprov, 0))}</td>
              <td></td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.vi_valor_lanc, 0))}</td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.vi_valor_aprov, 0))}</td>
              <td></td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.ac_valor_aprov + q.vi_valor_aprov, 0))}</td>
              <td></td>
            </tr>
          </tbody>
        </ReportTable>
      </Bloco>

      {/* ========== Bloco 3 + 4: lado a lado ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bloco titulo="Quantidade de Processos Formalizados">
          <ReportTable>
            <thead>
              <tr>
                <th>{data.ano}</th>
                <th>Qtd. Processos</th>
                <th>Total/Quadr.</th>
              </tr>
            </thead>
            <tbody>
              {mesesVisiveis.map((m) => {
                const isUltimoQ = m.mes === 4 || m.mes === 8 || m.mes === 12;
                const q = data.quadrimestres.find((x) => x.quadri === m.quadri);
                return (
                  <tr key={m.mes}>
                    <td className="rel-fin__row-label">{MESES[m.mes - 1]}</td>
                    <td>{fmtInt(m.qtd_processos)}</td>
                    <td className="rel-fin__total">{isUltimoQ ? fmtInt(q?.qtd_processos ?? 0) : ''}</td>
                  </tr>
                );
              })}
              <tr className="rel-fin__footer-row">
                <td>TOTAL</td>
                <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.qtd_processos, 0))}</td>
                <td></td>
              </tr>
            </tbody>
          </ReportTable>
        </Bloco>

        <Bloco titulo="Assistência Funerária">
          <ReportTable>
            <thead>
              <tr>
                <th>{data.ano}</th>
                <th>Qtd. Óbito</th>
                <th>Total/Quadr.</th>
                <th>Valor/Mês</th>
                <th>Valor/Quadr.</th>
              </tr>
            </thead>
            <tbody>
              {mesesVisiveis.map((m) => {
                const isUltimoQ = m.mes === 4 || m.mes === 8 || m.mes === 12;
                const q = data.quadrimestres.find((x) => x.quadri === m.quadri);
                return (
                  <tr key={m.mes}>
                    <td className="rel-fin__row-label">{MESES[m.mes - 1]}</td>
                    <td>{fmtInt(m.qtd_obitos)}</td>
                    <td className="rel-fin__total">{isUltimoQ ? fmtInt(q?.qtd_obitos ?? 0) : ''}</td>
                    <td>{fmtBRL(m.valor_funeraria)}</td>
                    <td className="rel-fin__total">{isUltimoQ ? fmtBRL(q?.valor_funeraria ?? 0) : ''}</td>
                  </tr>
                );
              })}
              <tr className="rel-fin__footer-row">
                <td>TOTAL</td>
                <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.qtd_obitos, 0))}</td>
                <td></td>
                <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.valor_funeraria, 0))}</td>
                <td></td>
              </tr>
            </tbody>
          </ReportTable>
        </Bloco>
      </div>

      {/* ========== Bloco 5: Bilhetes Emitidos ========== */}
      <Bloco titulo="Quantidade de Bilhetes Emitidos">
        <ReportTable>
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>Qtd. Bilhetes</th>
              <th>Total/Quadr.</th>
              <th>Valor/Período</th>
              <th>Valor/Quadr.</th>
              <th>Fatura/Mês (Pago)</th>
              <th>Valor Fatura/Quadr.</th>
              <th>Desloc. Aprov. BPA</th>
            </tr>
          </thead>
          <tbody>
            {mesesVisiveis.map((m) => {
              const isUltimoQ = m.mes === 4 || m.mes === 8 || m.mes === 12;
              const q = data.quadrimestres.find((x) => x.quadri === m.quadri);
              return (
                <tr key={m.mes}>
                  <td className="rel-fin__row-label">{MESES[m.mes - 1]}</td>
                  <td>{fmtInt(m.vi_qtd_lanc)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtInt(q?.vi_qtd_lanc ?? 0) : ''}</td>
                  <td>{fmtBRL(m.vi_valor_lanc)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtBRL(q?.vi_valor_lanc ?? 0) : ''}</td>
                  <td>{fmtBRL(m.vi_fatura_paga)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtBRL(q?.vi_fatura_paga ?? 0) : ''}</td>
                  <td>{fmtBRL(m.vi_bpa)}</td>
                </tr>
              );
            })}
            <tr className="rel-fin__footer-row">
              <td>TOTAL</td>
              <td>{fmtInt(quadrisVisiveis.reduce((s, q) => s + q.vi_qtd_lanc, 0))}</td>
              <td></td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.vi_valor_lanc, 0))}</td>
              <td></td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.vi_fatura_paga, 0))}</td>
              <td></td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.vi_bpa, 0))}</td>
            </tr>
          </tbody>
        </ReportTable>
      </Bloco>

      {/* ========== Bloco 6: Ajuda Custo FES ========== */}
      <Bloco titulo="Solicitações de Ajuda de Custo Pagas pelo FES">
        <ReportTable>
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>AJ. Custo Pag. (Done)</th>
              <th>Valor AC Pag./Quadr.</th>
              <th>AC Aprovada BPA</th>
            </tr>
          </thead>
          <tbody>
            {mesesVisiveis.map((m) => {
              const isUltimoQ = m.mes === 4 || m.mes === 8 || m.mes === 12;
              const q = data.quadrimestres.find((x) => x.quadri === m.quadri);
              return (
                <tr key={m.mes}>
                  <td className="rel-fin__row-label">{MESES[m.mes - 1]}</td>
                  <td>{fmtBRL(m.ac_valor_pago)}</td>
                  <td className="rel-fin__total">{isUltimoQ ? fmtBRL(q?.ac_valor_pago ?? 0) : ''}</td>
                  <td>{fmtBRL(m.ac_valor_aprov)}</td>
                </tr>
              );
            })}
            <tr className="rel-fin__footer-row">
              <td>TOTAL</td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.ac_valor_pago, 0))}</td>
              <td></td>
              <td>{fmtBRL(quadrisVisiveis.reduce((s, q) => s + q.ac_valor_aprov, 0))}</td>
            </tr>
          </tbody>
        </ReportTable>
      </Bloco>

      {/* ========== Bloco 7: Demanda TFD ========== */}
      <Bloco titulo="Quantidade de Demanda TFD">
        <ReportTable>
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>Qtd. Paciente s/ Repetições</th>
              <th>Qtd. Acomp. s/ Repetições</th>
            </tr>
          </thead>
          <tbody>
            {([1, 2, 3] as const)
              .filter((q) => quadriFiltro === 0 || quadriFiltro === q)
              .map((q) => {
                const d = demandaPorQuadri(q);
                return (
                  <tr key={q}>
                    <td className="rel-fin__row-label">{QUADRIS_LABEL[q - 1]}</td>
                    <td>{fmtInt(d.pacientes)}</td>
                    <td>{fmtInt(d.acompanhantes)}</td>
                  </tr>
                );
              })}
          </tbody>
        </ReportTable>
      </Bloco>

      {/* ========== Bloco 8 e 9: Avaliação Meta ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bloco titulo="Avaliação de Meta Anual">
          <ReportTable>
            <thead>
              <tr>
                <th>Meta {data.ano}</th>
                <th>Prevista</th>
                <th>Executada</th>
                <th>Diferença</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rel-fin__row-label">Anual</td>
                <td>{fmtInt(data.avaliacao_meta.prevista_anual)}</td>
                <td>{fmtInt(data.avaliacao_meta.executada_anual)}</td>
                <td>{fmtInt(data.avaliacao_meta.diferenca)}</td>
                <td>{data.avaliacao_meta.percentual}%</td>
              </tr>
            </tbody>
          </ReportTable>
        </Bloco>

        <Bloco titulo="Avaliação de Meta Quadrimestral">
          <ReportTable>
            <thead>
              <tr>
                <th>Meta {data.ano}</th>
                <th>Prevista</th>
                <th>1º Q Exec.</th>
                <th>2º Q Exec.</th>
                <th>3º Q Exec.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rel-fin__row-label">Quadrimestral</td>
                <td>{fmtInt(data.avaliacao_meta.prevista_quadri)}</td>
                <td>{fmtInt(data.quadrimestres.find((q) => q.quadri === 1)?.qtd_proc ?? 0)}</td>
                <td>{fmtInt(data.quadrimestres.find((q) => q.quadri === 2)?.qtd_proc ?? 0)}</td>
                <td>{fmtInt(data.quadrimestres.find((q) => q.quadri === 3)?.qtd_proc ?? 0)}</td>
              </tr>
            </tbody>
          </ReportTable>
        </Bloco>
      </div>

      {/* ========== Estilos do bloco/tabela ========== */}
      <style jsx>{`
        :global(.rel-fin__table) {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background: var(--tfd-white);
        }
        :global(.rel-fin__table thead tr) {
          background: var(--tfd-surface-50, #F8FAFC);
        }
        :global(.rel-fin__table thead th) {
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--tfd-text-secondary);
          text-align: right;
          white-space: nowrap;
          border-bottom: 1px solid var(--tfd-surface-border);
        }
        :global(.rel-fin__table thead th:first-child) {
          text-align: left;
        }
        :global(.rel-fin__table tbody td) {
          padding: 7px 10px;
          color: var(--tfd-text-primary);
          border-bottom: 1px solid var(--tfd-surface-border, #E2E8F0);
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        :global(.rel-fin__table tbody tr:hover) {
          background: var(--tfd-surface-50, #F8FAFC);
        }
        :global(.rel-fin__row-label) {
          font-weight: 600;
          text-align: left !important;
          color: var(--tfd-text-primary);
          background: var(--tfd-surface-50, #F8FAFC);
        }
        :global(.rel-fin__total) {
          background: var(--tfd-primary-50, #EBF0FF);
          font-weight: 600;
          color: var(--tfd-primary-700, #0D4FBD);
        }
        :global(.rel-fin__footer-row td) {
          font-weight: 700;
          background: var(--tfd-surface-100, #F1F5F9);
          color: var(--tfd-text-primary);
          border-top: 2px solid var(--tfd-surface-border);
        }

        @media print {
          :global(body) {
            background: white !important;
          }
          :global(.no-print),
          :global(aside),
          :global(nav),
          :global(header),
          :global(footer) {
            display: none !important;
          }
          .rel-fin {
            font-size: 10px;
            color: black !important;
          }
          :global(.tfd-card) {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          :global(.rel-fin__table th),
          :global(.rel-fin__table td) {
            border: 1px solid #000 !important;
            padding: 2px 4px !important;
            font-size: 9px !important;
          }
          :global(.rel-fin__total),
          :global(.rel-fin__footer-row td),
          :global(.rel-fin__row-label),
          :global(.rel-fin__table th) {
            background-color: transparent !important;
            color: black !important;
          }
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Componentes auxiliares                             */
/* -------------------------------------------------- */

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="tfd-card" style={{ padding: 0, overflow: 'hidden' }}>
      <header
        className="px-4 py-3"
        style={{
          borderBottom: '1px solid var(--tfd-surface-border)',
          background: 'var(--tfd-white)',
        }}
      >
        <h4
          className="text-sm font-semibold"
          style={{ color: 'var(--tfd-text-primary)' }}
        >
          {titulo}
        </h4>
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function ReportTable({ children }: { children: React.ReactNode }) {
  return <table className="rel-fin__table">{children}</table>;
}

/**
 * Caixa de KPI usada dentro do hero do relatório financeiro.
 * O hero tem gradient azul escuro como fundo — então a paleta interna é
 * invertida: fundo translúcido claro, texto branco, accents em tons que
 * contrastam bem com azul (verde-lima para sucesso, amarelo para aviso,
 * laranja-rosado para perigo). NÃO usa cores escuras nem vermelho.
 */
function MetaBox({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: 'success' | 'warning' | 'danger';
}) {
  const accentColor =
    accent === 'success' ? '#86EFAC'   // green-300 — lime sobre azul
    : accent === 'warning' ? '#FDE68A' // amber-200
    : accent === 'danger' ? '#FCA5A5'  // red-300, suave o suficiente
    : '#FFFFFF';
  return (
    <div
      className="px-3 py-2 rounded-lg flex flex-col gap-0.5 min-w-[140px]"
      style={{
        background: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.28)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
        style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}
      >
        {icon}
        {label}
      </span>
      <span className="text-[15px] font-bold" style={{ color: accentColor, lineHeight: 1.2 }}>
        {value}
      </span>
    </div>
  );
}
