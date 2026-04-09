export interface RegionalSaude {
  id: string;
  codigo: string;         // 'URS I', 'URS III', ...
  nome: string;           // 'Rosário', 'Itapecuru-Mirim', ...
  municipio_sede?: string;
  logradouro?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  telefone2?: string;
  email?: string;
  email2?: string;
  ativo: boolean;
  ordem?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RegionalSaudeMunicipio {
  id: string;
  regional_saude_id: string;
  municipio_nome: string;
  created_at?: string;
}
