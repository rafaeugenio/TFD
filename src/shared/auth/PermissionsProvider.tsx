'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

interface SessionUser {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string;
  perfil: string;
  is_admin: boolean;
  papel_id: string | null;
  ativo: boolean;
}

interface PermissionsContextValue {
  /** Usuário autenticado + dados da tabela usuarios. `null` enquanto carrega. */
  user: SessionUser | null;
  /** `true` enquanto a sessão e/ou as permissões ainda estão carregando. */
  isLoading: boolean;
  /** Atalho: o usuário é admin master. */
  isAdmin: boolean;
  /**
   * Verifica se o usuário pode executar uma ação numa tela.
   * Aceita `"tela.acao"` (formato dot) ou `"tela.acao"` em snake_case combinados.
   * Admin master sempre retorna true.
   */
  can: (permission: string) => boolean;
  /** Conjunto de chaves `"tela.acao"` que o user tem permissão. */
  permissions: Set<string>;
  /** Recarrega permissões (útil após alterar papel do usuário). */
  refresh: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Compatibilidade com o modelo antigo de permissões (uma ação por tela, com
 * até 121 combinações). Chamadas que ainda usam a chave antiga `<tela>.<acao>`
 * continuam funcionando: são traduzidas para a chave equivalente do modelo
 * simplificado (`tela.<id>.visualizar`, `<item>.criar|editar|excluir` ou
 * `acao.<nome>`). Fonte do de-para: migration
 * `00068_pbi13230_permissoes_simplificadas.sql`, seção 5.
 */
const CHAVE_ANTIGA_PARA_NOVA: Record<string, string> = {
  // Acesso às telas
  'painel.visualizar': 'tela.painel.visualizar',
  'solicitacoes.visualizar': 'tela.solicitacoes.visualizar',
  'regulacao.visualizar': 'tela.regulacao.visualizar',
  'passagens.visualizar': 'tela.passagens.visualizar',
  'ajuda_custo.visualizar': 'tela.ajuda_custo.visualizar',
  'acompanhamento.visualizar': 'tela.acompanhamento.visualizar',
  'pacientes.visualizar': 'tela.pacientes.visualizar',
  'unidades_saude.visualizar': 'tela.unidades_saude.visualizar',
  'regionais_saude.visualizar': 'tela.regionais_saude.visualizar',
  'relatorios.visualizar': 'tela.relatorios.visualizar',
  'sys_configuracoes.visualizar': 'tela.sys_configuracoes.visualizar',
  'sys_papeis.visualizar': 'tela.sys_papeis.visualizar',
  'sys_usuarios.visualizar': 'tela.sys_usuarios.visualizar',
  'sys_logs.visualizar': 'tela.sys_logs.visualizar',
  'servico_social.visualizar': 'tela.servico_social.visualizar',
  'casas_apoio.visualizar': 'tela.casas_apoio.visualizar',
  'financeiro.visualizar': 'tela.financeiro.visualizar',

  // Cadastros — solicitação e ações de fluxo associadas
  'solicitacoes.criar': 'solicitacao.criar',
  'solicitacoes.editar': 'solicitacao.editar',
  'solicitacoes.excluir': 'solicitacao.excluir',
  'solicitacoes.reabrir': 'acao.reabrir',
  'solicitacoes.encerrar': 'acao.encerrar',
  'solicitacoes.enviar_setor': 'acao.tramitar',
  'solicitacoes.devolver_regulacao': 'acao.tramitar',

  // Cadastros — pacientes, acompanhantes e dados bancários
  'pacientes.criar': 'paciente.criar',
  'pacientes.editar': 'paciente.editar',
  'pacientes.excluir': 'paciente.excluir',
  'pacientes.gerenciar_dados_bancarios': 'dados_bancarios.editar',
  'pacientes.gerenciar_acompanhantes': 'acompanhante.editar',
  'pacientes.exportar_prontuario': 'acao.exportar',

  // Cadastros — financeiro (passagem, adicional, ajuda de custo)
  'financeiro.registrar_passagem': 'passagem.criar',
  'financeiro.editar_passagem': 'passagem.editar',
  'financeiro.cancelar_passagem': 'passagem.editar',
  'financeiro.reembolsar_passagem': 'passagem.editar',
  'financeiro.registrar_adicional': 'adicional.criar',
  'financeiro.registrar_ajuda_custo': 'ajuda_custo.criar',
  'financeiro.editar_ajuda_custo': 'ajuda_custo.editar',
  'financeiro.aprovar_ajuda_custo': 'ajuda_custo.editar',
  'financeiro.aprovar_lote': 'ajuda_custo.editar',
  'financeiro.criar_conta_bancaria_inline': 'dados_bancarios.criar',
  'financeiro.encaminhar_financeiro': 'acao.tramitar',

  // Cadastros — regulação (agendamentos) e parecer médico
  'regulacao.registrar_tentativa': 'agendamento.criar',
  'regulacao.registrar_agendamento': 'agendamento.criar',
  'regulacao.emitir_parecer': 'acao.emitir_parecer',
  'regulacao.editar_parecer': 'acao.emitir_parecer',
  'regulacao.aplicar_carimbo': 'acao.emitir_parecer',

  // Cadastros — unidades e regionais de saúde
  'unidades_saude.criar': 'unidade_saude.criar',
  'unidades_saude.editar': 'unidade_saude.editar',
  'unidades_saude.inativar': 'unidade_saude.editar',
  'regionais_saude.criar': 'regional.criar',
  'regionais_saude.editar': 'regional.editar',
  'regionais_saude.gerenciar_municipios': 'regional.editar',

  // Cadastros — usuários e papéis
  'sys_usuarios.criar': 'usuario.criar',
  'sys_usuarios.editar': 'usuario.editar',
  'sys_usuarios.ativar_desativar': 'usuario.editar',
  'sys_usuarios.excluir': 'usuario.excluir',
  'sys_papeis.criar': 'papel.criar',
  'sys_papeis.editar': 'papel.editar',
  'sys_papeis.permissoes_editar': 'papel.editar',
  'sys_papeis.excluir': 'papel.excluir',

  // Cadastros — tabelas auxiliares
  'sys_configuracoes.editar': 'tabela_auxiliar.editar',
  'sys_configuracoes.gerenciar_tabelas_auxiliares': 'tabela_auxiliar.editar',
  'sys_configuracoes.gerenciar_bancos': 'tabela_auxiliar.editar',

  // Ações de fluxo — tramitação e relatórios
  'tramitacao.tramitar': 'acao.tramitar',
  'tramitacao.enviar_setor': 'acao.tramitar',
  'tramitacao.encaminhar_financeiro': 'acao.tramitar',
  'tramitacao.devolver_regulacao': 'acao.tramitar',
  'relatorios.exportar': 'acao.exportar',
  'relatorios.imprimir': 'acao.exportar',
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  /** Evita que recargas em background (ex: TOKEN_REFRESHED ao voltar de alt-tab)
   *  forcem `isLoading=true` e re-montagem dos children — o que descartaria
   *  estado local de drawers/forms. Só o primeiro load mostra skeleton. */
  const hasLoadedRef = useRef(false);
  /** Última identidade conhecida — usado pra ignorar eventos de refresh de token
   *  que não mudam o usuário logado. */
  const lastUserIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setPermissions(new Set());
        return;
      }

      const { data: row } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, cpf, perfil, is_admin, papel_id, ativo')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!row) {
        setUser(null);
        setPermissions(new Set());
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      const sessionUser: SessionUser = {
        id: r.id,
        nome_completo: r.nome_completo,
        email: r.email,
        cpf: r.cpf,
        perfil: r.perfil,
        is_admin: r.is_admin === true,
        papel_id: r.papel_id,
        ativo: r.ativo !== false,
      };
      setUser(sessionUser);

      // Admin master não precisa carregar permissões.
      if (sessionUser.is_admin) {
        setPermissions(new Set());
        return;
      }

      if (!sessionUser.papel_id) {
        setPermissions(new Set());
        return;
      }

      // `permissao_id` já é a chave plena do modelo simplificado
      // (`tela.<id>.visualizar`, `<item>.criar|editar|excluir`, `acao.<nome>`),
      // então nenhum join com `permissoes` é necessário aqui.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: perms } = await (supabase as any)
        .from('papel_permissoes')
        .select('permissao_id')
        .eq('papel_id', sessionUser.papel_id);

      const acc = new Set<string>();
      for (const p of (perms ?? []) as Array<{ permissao_id: string }>) {
        acc.add(p.permissao_id);
      }
      setPermissions(acc);
    } finally {
      setIsLoading(false);
      hasLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    load();
    // Só recarrega em mudança real de identidade (login/logout/troca de user).
    // `TOKEN_REFRESHED` e `INITIAL_SESSION` mantêm o mesmo user e não devem
    // re-disparar o load — caso contrário, voltar de alt-tab re-monta tudo
    // e fecha drawers/formulários abertos.
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const novoUserId = session?.user?.id ?? null;
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      if (novoUserId === lastUserIdRef.current) return;
      lastUserIdRef.current = novoUserId;
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // Sincroniza a ref de identidade após o primeiro load.
  useEffect(() => {
    lastUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.is_admin) return true;
      if (permissions.has(permission)) return true;
      const chaveNova = CHAVE_ANTIGA_PARA_NOVA[permission];
      return chaveNova ? permissions.has(chaveNova) : false;
    },
    [user, permissions],
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      user,
      isLoading,
      isAdmin: user?.is_admin === true,
      can,
      permissions,
      refresh: load,
    }),
    [user, isLoading, can, permissions, load],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
