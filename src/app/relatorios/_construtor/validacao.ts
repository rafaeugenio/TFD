/* -------------------------------------------------------------------------- */
/*  Validação de um relatório salvo contra o catálogo atual. Campo, filtro ou */
/*  assunto que deixou de existir é listado, nunca ignorado em silêncio.      */
/* -------------------------------------------------------------------------- */

import { ASSUNTOS, camposDoAssunto, filtrosDoAssunto } from './assuntos';
import type { ConfigRelatorio } from './tipos';

export interface Pendencia {
  /** Assunto da seção afetada (texto cru quando o próprio assunto sumiu). */
  assunto: string;
  tipo: 'assunto' | 'coluna' | 'filtro' | 'agrupamento' | 'ordenacao' | 'data';
  /** Texto para a pessoa, ex.: `coluna "valorFoo"`. */
  descricao: string;
  /** Identificador cru do item (id da coluna, do filtro...). */
  id: string;
}

export function validarSecoes(secoes: ConfigRelatorio[]): Pendencia[] {
  const saida: Pendencia[] = [];
  for (const s of secoes) {
    const a = ASSUNTOS.find((x) => x.id === s.assunto);
    if (!a) {
      saida.push({ assunto: s.assunto, tipo: 'assunto', id: s.assunto, descricao: `assunto "${s.assunto}"` });
      continue;
    }
    const todos = new Set(camposDoAssunto(a).map((c) => c.id));
    const filtraveis = new Set(filtrosDoAssunto(a).map((c) => c.id));
    for (const id of s.colunas) if (!todos.has(id)) saida.push({ assunto: a.id, tipo: 'coluna', id, descricao: `coluna "${id}" de ${a.label}` });
    for (const f of s.filtros) {
      if (f.valores.some((v) => v !== '') && !filtraveis.has(f.campoId)) {
        saida.push({ assunto: a.id, tipo: 'filtro', id: f.campoId, descricao: `filtro "${f.campoId}" de ${a.label}` });
      }
    }
    if (s.agruparPor && a.id !== 'financeiro' && !camposDoAssunto(a).some((c) => c.id === s.agruparPor && c.agrupavel)) {
      saida.push({ assunto: a.id, tipo: 'agrupamento', id: s.agruparPor, descricao: `agrupamento por "${s.agruparPor}" em ${a.label}` });
    }
    if (s.ordenarPor && !todos.has(s.ordenarPor.campoId)) {
      saida.push({ assunto: a.id, tipo: 'ordenacao', id: s.ordenarPor.campoId, descricao: `ordenação por "${s.ordenarPor.campoId}" em ${a.label}` });
    }
    if (!a.datas.some((d) => d.id === s.referenciaData)) {
      saida.push({ assunto: a.id, tipo: 'data', id: s.referenciaData, descricao: `data de contagem "${s.referenciaData}" em ${a.label}` });
    }
  }
  return saida;
}

/** Remove das seções tudo o que a validação apontou. Usado pelo botão de
 *  ajuste, nunca de forma automática. */
export function removerPendencias(secoes: ConfigRelatorio[], pend: Pendencia[]): ConfigRelatorio[] {
  return secoes
    .filter((s) => ASSUNTOS.some((a) => a.id === s.assunto))
    .map((s) => {
      const meus = pend.filter((p) => p.assunto === s.assunto);
      if (meus.length === 0) return s;
      const a = ASSUNTOS.find((x) => x.id === s.assunto)!;
      const tem = (tipo: Pendencia['tipo'], id: string) => meus.some((p) => p.tipo === tipo && p.id === id);
      return {
        ...s,
        colunas: s.colunas.filter((id) => !tem('coluna', id)),
        filtros: s.filtros.filter((f) => !tem('filtro', f.campoId)),
        agruparPor: tem('agrupamento', s.agruparPor) ? '' : s.agruparPor,
        ordenarPor: s.ordenarPor && tem('ordenacao', s.ordenarPor.campoId) ? undefined : s.ordenarPor,
        referenciaData: tem('data', s.referenciaData) ? a.datas[0].id : s.referenciaData,
      };
    });
}
