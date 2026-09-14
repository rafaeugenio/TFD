/**
 * Mapa de origem (`?from=<slug>`) usado quando o usuário entra no detalhe de
 * uma solicitação a partir de outra tela. Permite que a sidebar mantenha o
 * item da tela de origem ativo e que o botão "Voltar" retorne para o lugar
 * certo, com o rótulo correto.
 */
export type OrigemSolicitacao =
  | 'solicitacoes'
  | 'financeiro'
  | 'regulacao'
  | 'dashboard'
  | 'pacientes'
  | 'unidades-saude'
  | 'regionais-saude'
  | 'relatorios'
  | 'servico-social';

export const ORIGEM_SOLICITACAO: Record<
  OrigemSolicitacao,
  { href: string; label: string }
> = {
  solicitacoes:     { href: '/fluxo-v2/solicitacoes',   label: 'Solicitações' },
  financeiro:       { href: '/fluxo-v2/financeiro',     label: 'Financeiro' },
  regulacao:        { href: '/fluxo-v2/regulacao',      label: 'Regulação' },
  dashboard:        { href: '/dashboard',               label: 'Painel' },
  pacientes:        { href: '/pacientes',               label: 'Pacientes' },
  'unidades-saude': { href: '/unidades-saude',          label: 'Unidades de Saúde' },
  'regionais-saude':{ href: '/regionais-saude',         label: 'Regionais' },
  relatorios:       { href: '/relatorios',              label: 'Relatórios' },
  'servico-social': { href: '/fluxo-v2/servico-social', label: 'Serviço Social' },
};

export function resolverOrigem(from: string | null | undefined) {
  if (!from) return null;
  return ORIGEM_SOLICITACAO[from as OrigemSolicitacao] ?? null;
}
