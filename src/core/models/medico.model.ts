export interface Medico {
  id: string;
  nome_completo: string;
  crm: string;
  crm_uf: string;
  cpf?: string;
  especialidade?: string;
  ativo: boolean;
}
