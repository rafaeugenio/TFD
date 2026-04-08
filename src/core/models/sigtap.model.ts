export interface SigtapProcedimento {
  id: number;
  codigo: string;
  descricao: string;
  tipo: 'ajuda_custo' | 'deslocamento';
  subtipo?: 'aereo' | 'terrestre' | 'fluvial';
  beneficiario: 'paciente' | 'acompanhante';
  valor_unitario: number;
  unidade_medida?: string;
  cnrac: boolean;
  portaria_referencia?: string;
  data_vigencia?: string;
  ativo: boolean;
}
