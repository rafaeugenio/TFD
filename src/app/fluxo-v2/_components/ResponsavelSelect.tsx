'use client';

import { useEffect, useState } from 'react';
import { listarUsuariosAtivos, type UsuarioAtivoResumo } from '@/services/usuarios.service';
import type { ResponsavelSolicitacao } from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  value: ResponsavelSolicitacao | null;
  onChange: (responsavel: ResponsavelSolicitacao | null) => void;
  disabled?: boolean;
}

/**
 * Seletor da pessoa responsável pela solicitação no setor de destino.
 *
 * Investigação em `usuarios.service.ts` e `papeis.service.ts`: o cadastro
 * de usuário tem `perfil` (papel geral, ex. SETOR_REGULACAO, FINANCEIRO) e
 * `papel_id` (permissões por tela), mas nenhum dos dois é um vínculo
 * usuário↔setor atual confiável — `perfil` não cobre Ajuda de Custo,
 * Acompanhamento, Dados Básicos nem Aprovação (criados depois da divisão do
 * antigo setor Financeiro), e nada impede um usuário mudar de time sem essa
 * coluna ser atualizada. Por isso a lista abaixo traz todos os usuários
 * ativos, para qualquer setor de destino, em vez de inventar um filtro.
 */
export default function ResponsavelSelect({ value, onChange, disabled }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioAtivoResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listarUsuariosAtivos().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setUsuarios([]);
      } else {
        setUsuarios(data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      value={value?.id ?? ''}
      onChange={(e) => {
        const id = e.target.value;
        if (!id) {
          onChange(null);
          return;
        }
        const usuario = usuarios.find((u) => u.id === id);
        onChange(usuario ? { id: usuario.id, nome: usuario.nome_completo } : null);
      }}
      disabled={disabled || loading}
      className="w-full px-3 py-2 text-[13px]"
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 8,
        color: '#1A1D2B',
      }}
    >
      <option value="">{loading ? 'Carregando usuários...' : 'Selecione a pessoa responsável...'}</option>
      {usuarios.map((u) => (
        <option key={u.id} value={u.id}>{u.nome_completo}</option>
      ))}
    </select>
  );
}
