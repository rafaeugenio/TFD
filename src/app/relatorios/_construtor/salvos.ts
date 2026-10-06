'use client';

/* -------------------------------------------------------------------------- */
/*  Relatórios salvos. No protótipo ficam no navegador (localStorage) de quem */
/*  salvou. No sistema real, vão para o banco vinculados ao usuário.          */
/* -------------------------------------------------------------------------- */

import { useSyncExternalStore } from 'react';
import type { ConfigRelatorio, RelatorioSalvo } from './tipos';

const CHAVE = 'tfd.relatorios.salvos.v1';
const listeners = new Set<() => void>();
let cache: RelatorioSalvo[] | null = null;

function ler(): RelatorioSalvo[] {
  if (cache) return cache;
  try {
    const bruto = typeof window !== 'undefined' ? window.localStorage.getItem(CHAVE) : null;
    // Relatórios salvos antes dos vários assuntos guardavam `config` único.
    const lista = bruto ? (JSON.parse(bruto) as Array<RelatorioSalvo & { config?: ConfigRelatorio }>) : [];
    cache = lista.map(({ config, ...r }) => ({ ...r, secoes: r.secoes ?? (config ? [config] : []) })).filter((r) => r.secoes.length > 0);
  } catch {
    cache = [];
  }
  return cache;
}

function gravar(lista: RelatorioSalvo[]) {
  cache = lista;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* navegador sem armazenamento: mantém só em memória */
  }
  listeners.forEach((l) => l());
}

const VAZIO: RelatorioSalvo[] = [];

export function useRelatoriosSalvos(): RelatorioSalvo[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    ler,
    () => VAZIO,
  );
}

export function salvarRelatorio(nome: string, secoes: ConfigRelatorio[], idExistente?: string, donoId?: string): RelatorioSalvo {
  const agora = new Date().toISOString();
  const lista = ler();
  if (idExistente) {
    const atualizado = lista.map((r) => (r.id === idExistente ? { ...r, nome: nome.trim(), secoes, atualizadoEm: agora } : r));
    gravar(atualizado);
    return atualizado.find((r) => r.id === idExistente)!;
  }
  const novo: RelatorioSalvo = {
    id: `rel-${Date.now().toString(36)}`,
    nome: nome.trim(),
    secoes,
    donoId,
    criadoEm: agora,
    atualizadoEm: agora,
  };
  gravar([novo, ...lista]);
  return novo;
}

export function excluirRelatorio(id: string) {
  gravar(ler().filter((r) => r.id !== id));
}

/** Privados por usuário. Os salvos sem dono (anteriores a esta regra) continuam
 *  visíveis para todos, para ninguém perder dados. */
export function doUsuario(lista: RelatorioSalvo[], usuarioId: string | undefined): RelatorioSalvo[] {
  return lista.filter((r) => !r.donoId || r.donoId === usuarioId);
}

export function relatorioSalvoPorId(id: string): RelatorioSalvo | undefined {
  return ler().find((r) => r.id === id);
}
