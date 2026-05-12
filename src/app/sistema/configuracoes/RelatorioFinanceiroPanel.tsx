'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Printer, Pencil, Check, X } from 'lucide-react';
import {
  obterRelatorioFinanceiro,
  salvarMetaAnual,
  type RelatorioFinanceiro,
  type MesDados,
  type QuadriDados,
} from '@/services/relatorio-financeiro.service';
import { useToast } from '@/shared/components/toast/Toast';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'] as const;
const QUADRIS_LABEL = ['1º Q', '2º Q', '3º Q'] as const;

function fmtBRL(v: number | null | undefined): string {
  const n = typeof v === 'number' ? v : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtInt(v: number | null | undefined): string {
  const n = typeof v === 'number' ? v : 0;
  return n.toLocaleString('pt-BR');
}

function anosDisponiveis(): number[] {
  const atual = new Date().getFullYear();
  return [atual + 1, atual, atual - 1, atual - 2, atual - 3];
}

function mesesDoQuadri(quadri: 1 | 2 | 3): number[] {
  if (quadri === 1) return [1, 2, 3, 4];
  if (quadri === 2) return [5, 6, 7, 8];
  return [9, 10, 11, 12];
}

export default function RelatorioFinanceiroPanel() {
  const toast = useToast();
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [quadriFiltro, setQuadriFiltro] = useState<0 | 1 | 2 | 3>(0); // 0 = todos
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
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
        Nenhum dado disponível.
      </div>
    );
  }

  return (
    <div className="rel-fin">
      {/* ========== Filtros + Imprimir (escondidos no print) ========== */}
      <div className="rel-fin__toolbar flex items-center justify-between gap-3 mb-6 flex-wrap no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
              Ano
            </label>
            <select
              className="tfd-input"
              style={{ width: 'auto', minWidth: 100 }}
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10))}
            >
              {anosDisponiveis().map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            {([0, 1, 2, 3] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuadriFiltro(q)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                style={{
                  backgroundColor: quadriFiltro === q ? 'var(--tfd-primary-500)' : 'var(--tfd-surface-100)',
                  color: quadriFiltro === q ? 'white' : 'var(--tfd-text-secondary)',
                }}
              >
                {q === 0 ? 'Todos' : QUADRIS_LABEL[q - 1]}
              </button>
            ))}
          </div>
        </div>

        <button className="tfd-btn tfd-btn-primary" onClick={() => window.print()}>
          <Printer size={14} /> Imprimir
        </button>
      </div>

      {/* ========== Cabeçalho do relatório ========== */}
      <div className="rel-fin__header mb-4">
        <h2 className="text-base font-bold uppercase" style={{ color: 'var(--tfd-text-primary)' }}>
          Secretaria de Estado da Saúde
        </h2>
        <h3 className="text-sm font-bold uppercase" style={{ color: 'var(--tfd-text-primary)' }}>
          Tratamento Fora do Domicílio — TFD
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
          Acompanhamento Quadrimestral — {data.ano}
        </p>

        <div className="flex items-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: 'var(--tfd-text-muted)' }}>
              META:
            </span>
            {editandoMeta ? (
              <>
                <input
                  type="text"
                  className="tfd-input"
                  style={{ width: 100, padding: '2px 6px' }}
                  value={novaMeta}
                  onChange={(e) => setNovaMeta(e.target.value)}
                  autoFocus
                />
                <button onClick={handleSalvarMeta} className="p-1 rounded" title="Salvar" style={{ color: 'var(--tfd-status-success)' }}>
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditandoMeta(false)}
                  className="p-1 rounded"
                  title="Cancelar"
                  style={{ color: 'var(--tfd-status-danger)' }}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {fmtInt(data.meta_anual)} procedimentos
                </span>
                <button
                  onClick={() => {
                    setNovaMeta(String(data.meta_anual));
                    setEditandoMeta(true);
                  }}
                  className="p-1 rounded no-print"
                  title="Editar meta"
                  style={{ color: 'var(--tfd-primary-500)' }}
                >
                  <Pencil size={12} />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: 'var(--tfd-text-muted)' }}>
              ALCANÇADA:
            </span>
            <span className="font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
              {fmtInt(data.alcancada)}
            </span>
          </div>
        </div>
      </div>

      {/* ========== Bloco 1: Acompanhamento Quantitativo ========== */}
      <Bloco titulo="Acompanhamento Quantitativo">
        <table className="rel-fin__table">
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>AJ. CUSTO LANÇADA</th>
              <th>AJ. CUSTO APROVADA</th>
              <th>QTD. DIÁRIAS</th>
              <th>TOTAL/QUADR.</th>
              <th>DESLOC. LANÇADO</th>
              <th>DESLOC. APROVADO</th>
              <th>QTD. DESLOC./QUADR.</th>
              <th>QTD. MENSAL DE PROC.</th>
              <th>QTD. PROC./QUADRIMESTRE</th>
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
        </table>
      </Bloco>

      {/* ========== Bloco 2: Acompanhamento Financeiro ========== */}
      <Bloco titulo="Acompanhamento Financeiro de Procedimentos">
        <table className="rel-fin__table">
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>AJ. CUSTO LANÇADA</th>
              <th>AJ. CUSTO APROVADA</th>
              <th>VALOR AC/QUADR.</th>
              <th>DESLOC. LANÇADO</th>
              <th>DESLOC. APROVADO</th>
              <th>VALOR DESLOC./QUADR.</th>
              <th>VALOR MENSAL</th>
              <th>VALOR/QUADR.</th>
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
        </table>
      </Bloco>

      {/* ========== Bloco 3: Processos Formalizados ========== */}
      <div className="rel-fin__grid-2">
        <Bloco titulo="Quantidade de Processos Formalizados">
          <table className="rel-fin__table">
            <thead>
              <tr>
                <th>{data.ano}</th>
                <th>QTD. PROCESSOS</th>
                <th>TOTAL/QUADR.</th>
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
          </table>
        </Bloco>

        {/* ========== Bloco 4: Assistência Funerária ========== */}
        <Bloco titulo="Assistência Funerária">
          <table className="rel-fin__table">
            <thead>
              <tr>
                <th>{data.ano}</th>
                <th>QTD. ÓBITO</th>
                <th>TOTAL/QUADR.</th>
                <th>VALOR/MÊS</th>
                <th>VALOR/QUADR.</th>
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
          </table>
        </Bloco>
      </div>

      {/* ========== Bloco 5: Bilhetes Emitidos ========== */}
      <Bloco titulo="Quantidade de Bilhetes Emitidos">
        <table className="rel-fin__table">
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>QTD. BILHETES</th>
              <th>TOTAL/QUADR.</th>
              <th>VALOR/PERÍODO</th>
              <th>VALOR/QUADR.</th>
              <th>FATURA/MÊS (PAGO)</th>
              <th>VALOR FATURA/QUADR.</th>
              <th>DESLOC. APROVADO BPA</th>
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
        </table>
      </Bloco>

      {/* ========== Bloco 6: Ajuda Custo FES ========== */}
      <Bloco titulo="Solicitações de Ajuda de Custo Pagas pelo FES">
        <table className="rel-fin__table">
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>AJ. CUSTO PAG. (DONE)</th>
              <th>VALOR AC PAG./QUADR.</th>
              <th>AC APROVADA BPA</th>
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
        </table>
      </Bloco>

      {/* ========== Bloco 7: Demanda TFD ========== */}
      <Bloco titulo="Quantidade de Demanda TFD">
        <table className="rel-fin__table">
          <thead>
            <tr>
              <th>{data.ano}</th>
              <th>QTD. PACIENTE S/REPETIÇÕES</th>
              <th>QTD. ACOMP. S/REPETIÇÕES</th>
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
        </table>
      </Bloco>

      {/* ========== Bloco 8 e 9: Avaliação Meta ========== */}
      <div className="rel-fin__grid-2">
        <Bloco titulo="Avaliação de Meta Anual">
          <table className="rel-fin__table">
            <thead>
              <tr>
                <th>META-{data.ano}</th>
                <th>PREVISTA</th>
                <th>EXECUTADA</th>
                <th>DIFERENÇA</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rel-fin__row-label">ANUAL</td>
                <td>{fmtInt(data.avaliacao_meta.prevista_anual)}</td>
                <td>{fmtInt(data.avaliacao_meta.executada_anual)}</td>
                <td>{fmtInt(data.avaliacao_meta.diferenca)}</td>
                <td>{data.avaliacao_meta.percentual}%</td>
              </tr>
            </tbody>
          </table>
        </Bloco>

        <Bloco titulo="Avaliação de Meta Quadrimestral">
          <table className="rel-fin__table">
            <thead>
              <tr>
                <th>META-{data.ano}</th>
                <th>PREVISTA</th>
                <th>1º Q EXEC.</th>
                <th>2º Q EXEC.</th>
                <th>3º Q EXEC.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rel-fin__row-label">QUADRIMESTRAL</td>
                <td>{fmtInt(data.avaliacao_meta.prevista_quadri)}</td>
                <td>{fmtInt(data.quadrimestres.find((q) => q.quadri === 1)?.qtd_proc ?? 0)}</td>
                <td>{fmtInt(data.quadrimestres.find((q) => q.quadri === 2)?.qtd_proc ?? 0)}</td>
                <td>{fmtInt(data.quadrimestres.find((q) => q.quadri === 3)?.qtd_proc ?? 0)}</td>
              </tr>
            </tbody>
          </table>
        </Bloco>
      </div>

      {/* ========== Styles ========== */}
      <style jsx>{`
        .rel-fin {
          font-size: 12px;
        }
        .rel-fin__grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .rel-fin__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .rel-fin__table th,
        .rel-fin__table td {
          border: 1px solid #d1d5db;
          padding: 4px 6px;
          text-align: right;
        }
        .rel-fin__table th {
          background-color: var(--tfd-surface-100);
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          color: var(--tfd-text-secondary);
          text-align: center;
        }
        .rel-fin__row-label {
          font-weight: 600;
          text-align: left !important;
          background-color: var(--tfd-surface-50);
        }
        .rel-fin__total {
          background-color: var(--tfd-primary-50);
          font-weight: 600;
          color: var(--tfd-primary-700);
        }
        .rel-fin__footer-row td {
          font-weight: 700;
          background-color: var(--tfd-surface-100);
          color: var(--tfd-text-primary);
          border-top: 2px solid var(--tfd-text-primary);
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
          .rel-fin__table th,
          .rel-fin__table td {
            border: 1px solid #000;
            padding: 2px 4px;
            font-size: 9px;
          }
          .rel-fin__total,
          .rel-fin__footer-row td,
          .rel-fin__row-label,
          .rel-fin__table th {
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

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4
        className="text-[11px] font-bold uppercase tracking-wider mb-2"
        style={{ color: 'var(--tfd-text-primary)' }}
      >
        ({titulo})
      </h4>
      {children}
    </div>
  );
}
