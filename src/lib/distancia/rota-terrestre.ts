/**
 * Cliente para `/api/rota-terrestre` — calcula a distância rodoviária
 * entre duas coordenadas via OpenStreetMap/OpenRouteService.
 *
 * Diferente da haversine (linha reta), retorna a distância real seguindo
 * a malha viária — necessário para passagem terrestre (ônibus) onde
 * uma linha reta subestima a distância em até 30-40% em rotas com
 * desvios geográficos.
 */
import type { Coordenada } from './haversine';

export interface RotaTerrestre {
  /** Distância rodoviária em quilômetros. */
  distanciaKm: number;
  /** Duração estimada da viagem em minutos. */
  duracaoMin: number;
}

export async function rotaTerrestreEntre(
  origem: Coordenada,
  destino: Coordenada,
): Promise<RotaTerrestre> {
  const url =
    `/api/rota-terrestre?origemLat=${origem.lat}&origemLon=${origem.lon}` +
    `&destinoLat=${destino.lat}&destinoLon=${destino.lon}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as { error?: string };
    const code = body.error ?? `http_${resp.status}`;
    throw new Error(`rota_terrestre:${code}`);
  }
  return (await resp.json()) as RotaTerrestre;
}
