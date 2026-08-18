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

/**
 * Avatar da pessoa responsável pela solicitação no setor atual, usado nas
 * colunas das tabelas do fluxo. Em hover mostra o nome completo como está
 * registrado no sistema. Quando ainda não há responsável (antes da primeira
 * tramitação), mostra um estado neutro — círculo tracejado, sem cor de
 * alerta — para não parecer erro.
 */
export default function ResponsavelAvatar({ responsavel }: { responsavel?: ResponsavelSolicitacao }) {
  if (!responsavel) {
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

  return (
    <HoverTooltip content={responsavel.nome}>
      <span
        className="inline-flex items-center justify-center shrink-0 text-white font-semibold"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#4361EE',
          fontSize: 10.5,
        }}
        aria-label={responsavel.nome}
      >
        {iniciaisDoNome(responsavel.nome)}
      </span>
    </HoverTooltip>
  );
}
