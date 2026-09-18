/* -------------------------------------------------------------------------- */
/*  Descrição em linguagem simples do que está sendo analisado. A mesma      */
/*  descrição aparece na faixa de resumo da tela e no cabeçalho dos arquivos */
/*  exportados, para ninguém exportar achando que aplicou outro filtro.      */
/* -------------------------------------------------------------------------- */

import { camposDoAssunto, filtrosDoAssunto } from './assuntos';
import { fmtMoeda } from './motor';
import type { ResultadoRelatorio } from './motor';
import { dataBR } from './periodo';
import type { ConfigRelatorio, FiltroAplicado } from './tipos';

export function descreverFiltro(res: ResultadoRelatorio, f: FiltroAplicado): string {
  const campo = filtrosDoAssunto(res.assunto).find((c) => c.id === f.campoId);
  if (!campo) return '';
  const valores = f.valores.filter((v) => v !== '');
  if (valores.length === 0) return '';
  if (campo.tipo === 'texto') return `${campo.label} contém "${valores[0]}"`;
  if (campo.tipo === 'numero' || campo.tipo === 'moeda') {
    const [min, max] = f.valores;
    const fmt = (v: string) => (campo.tipo === 'moeda' ? fmtMoeda(Number(v)) : v);
    if (min && max) return `${campo.label} entre ${fmt(min)} e ${fmt(max)}`;
    if (min) return `${campo.label} a partir de ${fmt(min)}`;
    return `${campo.label} até ${fmt(max)}`;
  }
  const lista = valores.length > 3 ? `${valores.slice(0, 3).join(', ')} e mais ${valores.length - 3}` : valores.join(', ');
  return `${campo.label}: ${lista}`;
}

export interface LinhaResumo {
  rotulo: string;
  valor: string;
}

/** `compacto` encurta listas longas na faixa da tela; exportação e tela de
 *  salvar usam sempre a versão completa. */
export function descreverRelatorio(cfg: ConfigRelatorio, res: ResultadoRelatorio, compacto = false, busca = ''): LinhaResumo[] {
  const filtros = cfg.filtros.map((f) => descreverFiltro(res, f)).filter(Boolean);
  const todos = camposDoAssunto(res.assunto);
  const colunas = cfg.colunas.map((id) => todos.find((c) => c.id === id)?.label).filter(Boolean);
  const grupo = cfg.agruparPor ? todos.find((c) => c.id === cfg.agruparPor)?.label : '';

  const linhas: LinhaResumo[] = [
    { rotulo: 'Assunto', valor: `${res.assunto.label}. Cada linha é ${res.assunto.cadaLinha}` },
    { rotulo: 'Período', valor: `${res.periodo.rotulo} (${dataBR(res.periodo.inicio)} a ${dataBR(res.periodo.fim)})` },
    { rotulo: 'Data usada no período', valor: res.referencia.label },
    { rotulo: 'Filtros', valor: filtros.length ? filtros.join(' · ') : 'Nenhum filtro. Todos os registros do período entram.' },
    ...(busca.trim() ? [{ rotulo: 'Busca', valor: `Só linhas com "${busca.trim()}" em alguma coluna` }] : []),
    {
      rotulo: 'Informações da tabela',
      valor: colunas.length === 0
        ? 'Nenhuma informação escolhida'
        : compacto && colunas.length > 5
          ? `${colunas.slice(0, 5).join(' · ')} e mais ${colunas.length - 5}`
          : colunas.join(' · '),
    },
    { rotulo: 'Organização', valor: grupo ? `Resumo agrupado por ${grupo}` : 'Lista completa, uma linha por registro' },
  ];
  if (res.assunto.id === 'financeiro' && cfg.metaAnualSigtap) {
    linhas.push({ rotulo: 'Meta anual SIGTAP (informada)', valor: `${cfg.metaAnualSigtap.toLocaleString('pt-BR')} procedimentos` });
  }
  return linhas;
}
