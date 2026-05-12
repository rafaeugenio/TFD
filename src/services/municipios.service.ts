import type { Coordenada } from '@/lib/distancia/haversine';

interface MunicipioRaw {
  n: string;
  u: string;
  lat: number;
  lon: number;
}

export interface Municipio extends Coordenada {
  nome: string;
  uf: string;
}

let cache: Map<string, Municipio> | null = null;
let carregando: Promise<Map<string, Municipio>> | null = null;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function chave(cidade: string, uf: string): string {
  return `${normalizar(cidade)}|${normalizar(uf)}`;
}

async function carregar(): Promise<Map<string, Municipio>> {
  if (cache) return cache;
  if (carregando) return carregando;
  carregando = fetch('/data/municipios-br.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Falha ao carregar municípios: ${r.status}`);
      return r.json() as Promise<MunicipioRaw[]>;
    })
    .then((rows) => {
      const m = new Map<string, Municipio>();
      for (const r of rows) {
        m.set(chave(r.n, r.u), { nome: r.n, uf: r.u, lat: r.lat, lon: r.lon });
      }
      cache = m;
      carregando = null;
      return m;
    })
    .catch((err) => {
      carregando = null;
      throw err;
    });
  return carregando;
}

export async function buscarMunicipio(
  cidade: string,
  uf: string,
): Promise<Municipio | null> {
  if (!cidade?.trim() || !uf?.trim()) return null;
  const m = await carregar();
  return m.get(chave(cidade, uf)) ?? null;
}
