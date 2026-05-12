const RAIO_TERRA_KM = 6371;
const KM_POR_MILHA = 1.609344;
const KM_POR_MILHA_NAUTICA = 1.852;

export interface Coordenada {
  lat: number;
  lon: number;
}

function toRad(graus: number): number {
  return (graus * Math.PI) / 180;
}

export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export function distanciaMilhas(a: Coordenada, b: Coordenada): number {
  return distanciaKm(a, b) / KM_POR_MILHA;
}

export function distanciaMilhasNauticas(a: Coordenada, b: Coordenada): number {
  return distanciaKm(a, b) / KM_POR_MILHA_NAUTICA;
}
