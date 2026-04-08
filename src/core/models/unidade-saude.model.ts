export interface UnidadeSaude {
  id: string;
  nome: string;
  cnes: string;
  tipo?: string;
  regional_id?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  endereco?: string;
  contato?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}
