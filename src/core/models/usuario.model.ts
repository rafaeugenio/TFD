export type PerfilUsuario =
  | 'ATENDENTE'
  | 'COORDENACAO'
  | 'MEDICO_AUDITOR'
  | 'REGULACAO'
  | 'PASSAGENS'
  | 'FINANCEIRO'
  | 'ASSISTENTE_SOCIAL'
  | 'GESTOR'
  | 'ADMIN';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  avatar?: string;
}
