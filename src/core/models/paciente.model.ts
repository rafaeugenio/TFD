export interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  cns: string; // Cartao Nacional de Saude
  dataNascimento: string;
  sexo: 'M' | 'F';
  telefone: string;
  email?: string;
  endereco: Endereco;
  municipioOrigem: string;
  ufOrigem: string;
  prontuario?: string;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface Acompanhante {
  id: string;
  nome: string;
  cpf: string;
  parentesco: string;
  telefone: string;
  justificativa?: string;
}
