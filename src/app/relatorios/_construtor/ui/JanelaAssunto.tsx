'use client';

import { useState } from 'react';
import { Check, Table2 } from 'lucide-react';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import { ASSUNTOS_ORDEM, assuntoPorId } from '../assuntos';
import { configInicial, ordenarSecoes } from '../motor';
import type { AssuntoId, ConfigRelatorio } from '../tipos';
import { C } from './estilo';

/** Alterna um assunto em uma lista de seções, mantendo a ordem fixa e o
 *  mesmo período em todas. Nunca deixa a lista sem assunto. */
export function alternarAssunto(secoes: ConfigRelatorio[], id: AssuntoId): ConfigRelatorio[] {
  if (secoes.some((s) => s.assunto === id)) return secoes.length > 1 ? secoes.filter((s) => s.assunto !== id) : secoes;
  const periodo = secoes[0]?.periodo ?? configInicial(id).periodo;
  return ordenarSecoes([...secoes, { ...configInicial(id), periodo }], ASSUNTOS_ORDEM);
}

/**
 * Única decisão obrigatória ao criar: o assunto. Esc, "Cancelar" e o fundo
 * fecham a janela sem criar nada. Depois dela o relatório abre pronto, com as
 * colunas e o período padrão do assunto e a tabela já carregada.
 */
export default function JanelaAssunto({ onConfirmar, onFechar }: { onConfirmar: (secoes: ConfigRelatorio[]) => void; onFechar: () => void }) {
  const [secoes, setSecoes] = useState<ConfigRelatorio[]>([configInicial('passagens')]);
  const marcados = secoes.map((s) => s.assunto);

  return (
    <ConfirmDialog
      open
      tone="create"
      icon={Table2}
      title="O que você quer analisar?"
      description="Marque um ou mais assuntos. Cada assunto vira uma tabela própria. Colunas, período e filtros você ajusta depois, já vendo os dados."
      confirmLabel="Ver tabela"
      confirmIcon={<Table2 size={15} />}
      onClose={onFechar}
      onConfirm={() => onConfirmar(secoes)}
    >
      <div role="group" aria-label="Assuntos" className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {ASSUNTOS_ORDEM.map((id) => {
          const a = assuntoPorId(id);
          const Icone = a.icone;
          const ativo = marcados.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              role="checkbox"
              aria-checked={ativo}
              title={ativo && marcados.length === 1 ? 'O relatório precisa de pelo menos um assunto' : a.pergunta}
              onClick={() => setSecoes((atual) => alternarAssunto(atual, a.id))}
              className="flex items-center gap-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                minHeight: 44, padding: '0 12px', borderRadius: 'var(--tfd-radius-md)',
                border: `1px solid ${ativo ? C.azul : C.campo}`, background: ativo ? C.azulSuave : 'white', outlineColor: C.azul,
              }}
            >
              <Icone size={18} style={{ color: ativo ? C.azul : C.apoio, flexShrink: 0 }} />
              <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: ativo ? C.azulTexto : C.ink }}>{a.label}</span>
              {ativo && <Check size={15} strokeWidth={2.5} style={{ color: C.azul, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-col gap-1" style={{ fontSize: 14, color: C.texto }} aria-live="polite">
        {secoes.map((s) => {
          const a = assuntoPorId(s.assunto);
          return (
            <li key={s.assunto}>
              {secoes.length > 1 ? <>Em <strong>{a.label}</strong>, cada linha será {a.cadaLinha}</> : <>Cada linha será <strong>{a.cadaLinha}</strong></>}
            </li>
          );
        })}
      </ul>
    </ConfirmDialog>
  );
}
