export interface RotaDeslocamento {
  id: number;
  cidade_origem: string;
  uf_origem: string;
  cidade_destino: string;
  uf_destino: string;
  distancia_milhas?: number;
  distancia_km?: number;
  distancia_milhas_nauticas?: number;
  /** Código de bilhete padrão associado à rota (opcional). */
  codigo_bilhete?: string;
  /** URL pública do anexo (e.g. tabela de tarifa, contrato). */
  anexo_url?: string;
  /** Nome do arquivo anexado (para exibição). */
  anexo_nome?: string;
  ativo: boolean;
}
