/**
 * Mapeia o pathname atual para o `tela_id` correspondente em telas_sistema.
 * Usado pelo gate centralizado no AppLayout para checar a permissão
 * `<tela>.visualizar` antes de renderizar a página.
 *
 * Retorna `null` se a rota é pública ou se não exige permissão (ex: /meu-perfil,
 * /dashboard sem tela específica fora do RBAC).
 */

interface RouteRule {
  prefix: string;
  tela: string;
}

const RULES: RouteRule[] = [
  { prefix: '/dashboard',              tela: 'painel' },
  { prefix: '/fluxo-v2/solicitacoes',  tela: 'solicitacoes' },
  { prefix: '/fluxo-v2/regulacao',     tela: 'regulacao' },
  { prefix: '/fluxo-v2/financeiro',    tela: 'financeiro' },
  { prefix: '/fluxo-v2/acompanhamento', tela: 'acompanhamento' },
  { prefix: '/pacientes',              tela: 'pacientes' },
  { prefix: '/unidades-saude',         tela: 'unidades_saude' },
  { prefix: '/regionais-saude',        tela: 'regionais_saude' },
  { prefix: '/relatorios',             tela: 'relatorios' },
  { prefix: '/sistema/configuracoes',  tela: 'sys_configuracoes' },
  { prefix: '/sistema/papeis',         tela: 'sys_papeis' },
  { prefix: '/sistema/usuarios',       tela: 'sys_usuarios' },
  { prefix: '/sistema/logs',           tela: 'sys_logs' },
];

export function telaForPathname(pathname: string): string | null {
  for (const r of RULES) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + '/')) {
      return r.tela;
    }
  }
  return null;
}
