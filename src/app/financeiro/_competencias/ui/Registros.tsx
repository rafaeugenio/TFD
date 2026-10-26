'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Eye, Plus, Trash2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useLookup } from '@/shared/hooks/useLookup';
import { fmtBRL, fmtDataBR } from '@/app/relatorios/_shared/format';
import type { LinhaObito, LinhaReembolso } from '../dados';
import { idDespesa, type DespesaObito, type RegistroDespesasObito, type RegistroReembolso } from '../store';
import { totalDespesas } from '../resumo';

const mono: React.CSSProperties = { fontFamily: 'var(--tfd-mono)' };
const apoio: React.CSSProperties = { fontSize: 13, color: 'var(--tfd-text-muted)' };

/** "12,50" ou "12.50" vira número; vazio ou inválido vira NaN. */
const lerValor = (t: string) => {
  const s = t.trim().replace(/^R\$\s*/, '');
  if (!s) return NaN;
  // Com vírgula, o ponto é separador de milhar (1.234,56); sem vírgula, é decimal.
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
};
const valorTexto = (v: number) => v.toFixed(2).replace('.', ',');

function Erro({ texto }: { texto: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 mb-4" style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--tfd-danger-bg)', color: 'var(--tfd-status-danger)', fontSize: 13.5 }}>
      <AlertTriangle size={15} /> {texto}
    </p>
  );
}

/** Resumo da passagem no topo dos drawers do Reembolso. */
function DadosPassagem({ l }: { l: LinhaReembolso }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5" style={{ fontSize: 13.5, padding: '12px 14px', borderRadius: 8, background: 'var(--tfd-50)', border: '1px solid var(--tfd-surface-border)' }}>
      <div><dt style={apoio}>Processo</dt><dd style={mono}>{l.processo || 'Sem número'}</dd></div>
      <div><dt style={apoio}>Passageiro</dt><dd>{l.passageiro}</dd></div>
      <div><dt style={apoio}>Trecho</dt><dd>{l.origem} para {l.destino}</dd></div>
      <div><dt style={apoio}>Valor da passagem</dt><dd style={mono}>{fmtBRL(l.valorPassagem)}</dd></div>
    </dl>
  );
}

/**
 * Registrar o reembolso de uma passagem: só o valor a receber, obrigatório.
 * Gravado na linha da competência, com evento no histórico.
 */
export function DrawerReembolso({ linha, registro, onClose, onSalvar }: {
  linha: LinhaReembolso | null;
  registro?: RegistroReembolso;
  onClose: () => void;
  /** Devolve false quando a gravação foi recusada (conflito). */
  onSalvar: (dados: { valor: number }) => boolean;
}) {
  return (
    <Drawer open={!!linha} onClose={onClose} title={registro ? 'Corrigir reembolso' : 'Registrar reembolso'} subtitle="Informe quanto o TFD tem a receber. O valor vale para o mês desta competência.">
      {linha && <FormReembolso key={linha.chave} linha={linha} registro={registro} onClose={onClose} onSalvar={onSalvar} />}
    </Drawer>
  );
}

function FormReembolso({ linha, registro, onClose, onSalvar }: {
  linha: LinhaReembolso; registro?: RegistroReembolso; onClose: () => void; onSalvar: (d: { valor: number }) => boolean;
}) {
  const [valor, setValor] = useState(registro ? valorTexto(registro.valor) : '');
  const [tentou, setTentou] = useState(false);
  const v = lerValor(valor);
  const erroValor = valor.trim() === '' ? 'Informe o valor a receber.' : !(v > 0) ? 'O valor precisa ser maior que zero.' : undefined;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (erroValor) return;
    if (onSalvar({ valor: Math.round(v * 100) / 100 })) onClose();
  };

  return (
    <form onSubmit={salvar} noValidate>
      <DadosPassagem l={linha} />
      <FormField label="Valor a receber (R$)" required error={tentou ? erroValor : undefined}>
        <input type="text" aria-label="Valor a receber" autoFocus inputMode="decimal" className="tfd-input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required aria-invalid={tentou && !!erroValor} style={mono} />
      </FormField>
      {registro && <p style={apoio}>Último registro por {registro.por} em {fmtDataBR(registro.em)}.</p>}
      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>Cancelar</button>
        <button type="submit" className="tfd-btn tfd-btn-primary"><Check size={15} /> Salvar reembolso</button>
      </div>
    </form>
  );
}

/* ── Óbito ───────────────────────────────────────────────────────────────── */

interface DespesaRascunho {
  id: string;
  codigo: string;
  descricao: string;
  valor: string;
}

const rascunhoVazio = (): DespesaRascunho => ({ id: idDespesa(), codigo: '', descricao: '', valor: '' });

/** Dados da solicitação no topo dos drawers do Óbito. */
function DadosObito({ l }: { l: LinhaObito }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5" style={{ fontSize: 13.5, padding: '12px 14px', borderRadius: 8, background: 'var(--tfd-50)', border: '1px solid var(--tfd-surface-border)' }}>
      <div><dt style={apoio}>Processo</dt><dd style={mono}>{l.processo || 'Sem número'}</dd></div>
      <div><dt style={apoio}>Paciente</dt><dd>{l.paciente}</dd></div>
      <div><dt style={apoio}>Data do falecimento</dt><dd>{fmtDataBR(l.dataFalecimento)}</dd></div>
      <div><dt style={apoio}>Sinalizado por</dt><dd>{l.sinalizadoPor}</dd></div>
    </dl>
  );
}

/**
 * Despesas de óbito de uma linha: várias despesas (item da tabela auxiliar
 * `despesa_funeraria`, descrição opcional e valor) e uma data de pagamento.
 * Em modo leitura mostra os itens registrados.
 */
export function DrawerDespesasObito({ linha, registro, modo, onClose, onVer, onSalvar }: {
  linha: LinhaObito | null;
  registro?: RegistroDespesasObito;
  modo: 'ler' | 'editar';
  onClose: () => void;
  onVer: (solicitacaoId: string) => void;
  /** Devolve false quando a gravação foi recusada (conflito). */
  onSalvar?: (dados: { despesas: DespesaObito[] }) => boolean;
}) {
  const editar = modo === 'editar' && !!onSalvar;
  return (
    <Drawer
      open={!!linha}
      onClose={onClose}
      width="min(720px, 96vw)"
      title={editar ? 'Registrar despesas de óbito' : 'Despesas de óbito'}
      subtitle={editar ? 'Inclua cada item pago e o valor. O pagamento vale para o mês desta competência.' : undefined}
    >
      {linha && (editar
        ? <FormDespesas key={linha.chave} linha={linha} registro={registro} onClose={onClose} onSalvar={onSalvar!} />
        : <LeituraDespesas linha={linha} registro={registro} onVer={onVer} />)}
    </Drawer>
  );
}

function LeituraDespesas({ linha, registro, onVer }: { linha: LinhaObito; registro?: RegistroDespesasObito; onVer: (sid: string) => void }) {
  const th: React.CSSProperties = { padding: '0 10px', height: 38, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', background: 'var(--tfd-50)', borderBottom: '1px solid var(--tfd-surface-border)', textAlign: 'left' };
  const td: React.CSSProperties = { padding: '10px', fontSize: 13.5, borderBottom: '1px solid var(--tfd-100)', verticalAlign: 'top' };
  return (
    <>
      <DadosObito l={linha} />
      {!registro || registro.despesas.length === 0 ? (
        <p style={{ ...apoio, padding: '24px 0', textAlign: 'center' }}>Nenhuma despesa registrada nesta linha.</p>
      ) : (
        <>
          <p className="mb-3" style={{ fontSize: 13.5, color: 'var(--tfd-text-secondary)' }}>
            Registrado por {registro.por} em {fmtDataBR(registro.em)}.
          </p>
          <div style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Item</th><th style={th}>Descrição</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
              <tbody>
                {registro.despesas.map((d) => (
                  <tr key={d.id}>
                    <td style={td}>{d.item}</td>
                    <td style={{ ...td, color: d.descricao ? 'var(--tfd-text-primary)' : 'var(--tfd-text-muted)' }}>{d.descricao || 'Sem descrição'}</td>
                    <td style={{ ...td, ...mono, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtBRL(d.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ ...td, fontWeight: 600, borderBottom: 'none' }}>Total ({registro.despesas.length} {registro.despesas.length === 1 ? 'item' : 'itens'})</td>
                  <td style={{ ...td, ...mono, fontWeight: 700, textAlign: 'right', borderBottom: 'none' }}>{fmtBRL(totalDespesas(registro))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
      <button type="button" className="tfd-btn tfd-btn-secondary mt-5" onClick={() => onVer(linha.solicitacaoId)}>
        <Eye size={15} /> Ver solicitação
      </button>
    </>
  );
}

function FormDespesas({ linha, registro, onClose, onSalvar }: {
  linha: LinhaObito; registro?: RegistroDespesasObito; onClose: () => void;
  onSalvar: (d: { despesas: DespesaObito[] }) => boolean;
}) {
  const { options, loading } = useLookup('despesa_funeraria');
  const [linhas, setLinhas] = useState<DespesaRascunho[]>(
    registro?.despesas.length
      ? registro.despesas.map((d) => ({ id: d.id, codigo: d.codigo, descricao: d.descricao ?? '', valor: valorTexto(d.valor) }))
      : [rascunhoVazio()],
  );
  const [tentou, setTentou] = useState(false);

  const mudar = (id: string, campo: keyof DespesaRascunho, v: string) => setLinhas((ls) => ls.map((l) => (l.id === id ? { ...l, [campo]: v } : l)));
  const erroLinha = (l: DespesaRascunho) => (!l.codigo ? 'Escolha o item.' : !(lerValor(l.valor) > 0) ? 'Informe um valor maior que zero.' : undefined);
  const erroLista = linhas.length === 0 ? 'Inclua pelo menos uma despesa.' : undefined;
  const invalido = !!erroLista || linhas.some((l) => erroLinha(l));
  const total = linhas.reduce((s, l) => s + (lerValor(l.valor) > 0 ? lerValor(l.valor) : 0), 0);
  // Item que saiu da tabela auxiliar continua com o nome gravado.
  const nomeItem = (codigo: string) => options.find((o) => o.value === codigo)?.label ?? registro?.despesas.find((d) => d.codigo === codigo)?.item ?? codigo;

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (invalido) return;
    const despesas: DespesaObito[] = linhas.map((l) => ({
      id: l.id, codigo: l.codigo, item: nomeItem(l.codigo), descricao: l.descricao.trim() || undefined, valor: Math.round(lerValor(l.valor) * 100) / 100,
    }));
    if (onSalvar({ despesas })) onClose();
  };

  return (
    <form onSubmit={salvar} noValidate>
      <DadosObito l={linha} />
      <fieldset>
        <legend className="tfd-label mb-2">Despesas <span style={{ color: 'var(--tfd-status-danger)' }}>*</span></legend>
        {tentou && erroLista && <Erro texto={erroLista} />}
        <ol className="flex flex-col gap-3">
          {linhas.map((l, i) => {
            const erro = tentou ? erroLinha(l) : undefined;
            const opcoes = options.some((o) => o.value === l.codigo) || !l.codigo ? options : [...options, { value: l.codigo, label: nomeItem(l.codigo) }];
            return (
              <li key={l.id} className="grid gap-2 items-start" style={{ gridTemplateColumns: 'minmax(160px, 1.2fr) minmax(140px, 1.4fr) 120px 36px', padding: 10, borderRadius: 8, border: `1px solid ${erro ? 'var(--tfd-status-danger)' : 'var(--tfd-surface-border)'}` }}>
                <label>
                  <span className="sr-only">Item da despesa {i + 1}</span>
                  <select className="tfd-input" value={l.codigo} onChange={(e) => mudar(l.id, 'codigo', e.target.value)} disabled={loading} aria-invalid={!!erro && !l.codigo}>
                    <option value="">{loading ? 'Carregando...' : 'Item...'}</option>
                    {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Descrição da despesa {i + 1} (opcional)</span>
                  <input className="tfd-input" value={l.descricao} onChange={(e) => mudar(l.id, 'descricao', e.target.value)} placeholder="Descrição (opcional)" />
                </label>
                <label>
                  <span className="sr-only">Valor da despesa {i + 1} em reais</span>
                  <input className="tfd-input" inputMode="decimal" value={l.valor} onChange={(e) => mudar(l.id, 'valor', e.target.value)} placeholder="0,00" style={{ ...mono, textAlign: 'right' }} aria-invalid={!!erro && !!l.codigo} />
                </label>
                <button
                  type="button" title="Remover despesa" aria-label={`Remover despesa ${i + 1}`}
                  onClick={() => setLinhas((ls) => ls.filter((x) => x.id !== l.id))}
                  className="inline-flex items-center justify-center hover:bg-[var(--tfd-danger-bg)]" style={{ width: 36, height: 36, borderRadius: 6, color: 'var(--tfd-danger)' }}
                >
                  <Trash2 size={15} />
                </button>
                {erro && <p className="tfd-field-error" style={{ gridColumn: '1 / -1' }}>{erro}</p>}
              </li>
            );
          })}
        </ol>
        <button type="button" className="tfd-btn tfd-btn-secondary mt-3" onClick={() => setLinhas((ls) => [...ls, rascunhoVazio()])}>
          <Plus size={15} /> Adicionar despesa
        </button>
        {!loading && options.length === 0 && (
          <p className="mt-2" style={{ fontSize: 13, color: 'var(--tfd-status-caution-accent)' }}>A tabela auxiliar de despesas funerárias está vazia. Cadastre os itens em Sistema, Tabelas auxiliares.</p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
        <span style={{ fontSize: 14, color: 'var(--tfd-text-secondary)' }}>
          {linhas.length} {linhas.length === 1 ? 'item' : 'itens'} · <strong style={{ ...mono, color: 'var(--tfd-text-primary)' }}>{fmtBRL(total)}</strong>
        </span>
        <span className="flex gap-2">
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="tfd-btn tfd-btn-primary"><Check size={15} /> Salvar despesas</button>
        </span>
      </div>
    </form>
  );
}
