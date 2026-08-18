'use client';

import { User } from 'lucide-react';
import HoverTooltip from './HoverTooltip';
import type { ResponsavelSolicitacao } from '@/core/mocks/fluxo-v2-v3-seed';

/** Mesmo cálculo de iniciais usado no avatar do usuário logado (Sidebar) e
 *  em `useCurrentUser` — primeira letra do primeiro e do último nome. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase() || '?';
}

/** Quantos círculos aparecem lado a lado antes de agrupar o resto em "+N". */
const MAX_VISIVEIS = 3;

/**
 * Avatares das pessoas responsáveis pela solicitação no setor atual, usados
 * nas colunas das tabelas do fluxo. Mais de uma pessoa pode responder pela
 * solicitação ao mesmo tempo — os avatares aparecem agrupados, sobrepostos
 * como em produção, com os primeiros nomes visíveis e o restante somado num
 * círculo "+N". Em hover mostra o nome completo de todas as pessoas. Quando
 * ainda não há responsável (antes da primeira tramitação), mostra um estado
 * neutro — círculo tracejado, sem cor de alerta — para não parecer erro.
 */
export default function ResponsavelAvatar({ responsaveis }: { responsaveis?: ResponsavelSolicitacao[] }) {
  if (!responsaveis || responsaveis.length === 0) {
    return (
      <HoverTooltip content="Sem responsável definido">
        <span
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '1.5px dashed #CBD5E1',
            color: '#CBD5E1',
          }}
          aria-label="Sem responsável definido"
        >
          <User size={12} strokeWidth={2} />
        </span>
      </HoverTooltip>
    );
  }

  const visiveis = responsaveis.slice(0, MAX_VISIVEIS);
  const excedente = responsaveis.length - visiveis.length;
  const nomesTooltip = responsaveis.map((r) => r.nome).join(', ');

  return (
    <HoverTooltip content={nomesTooltip}>
      <span className="inline-flex items-center" aria-label={nomesTooltip}>
        {visiveis.map((r, idx) => (
          <span
            key={r.id}
            className="inline-flex items-center justify-center shrink-0 text-white font-semibold"
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#4361EE',
              fontSize: 10.5,
              border: '2px solid white',
              marginLeft: idx === 0 ? 0 : -8,
              boxShadow: '0 0 0 1px #E2E8F0',
            }}
          >
            {iniciaisDoNome(r.nome)}
          </span>
        ))}
        {excedente > 0 && (
          <span
            className="inline-flex items-center justify-center shrink-0 font-semibold"
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#F1F5F9',
              color: '#475569',
              fontSize: 10,
              border: '2px solid white',
              marginLeft: -8,
              boxShadow: '0 0 0 1px #E2E8F0',
            }}
          >
            +{excedente}
          </span>
        )}
      </span>
    </HoverTooltip>
  );
}
