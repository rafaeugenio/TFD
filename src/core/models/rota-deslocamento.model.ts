export interface RotaDeslocamento {
  id: number;
  cidade_origem: string;
  uf_origem: string;
  cidade_destino: string;
  uf_destino: string;
  distancia_milhas?: number;
  distancia_km?: number;
  distancia_milhas_nauticas?: number;
  ativo: boolean;
}
