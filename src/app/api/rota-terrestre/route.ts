import type { NextRequest } from 'next/server';

/**
 * Proxy para o OpenRouteService — calcula a distância rodoviária entre
 * dois pontos (coordenadas lat/lon). Usado pela emissão de passagem
 * terrestre/rodoviária no fluxo TFD para substituir a haversine (linha
 * reta) por roteamento real sobre a malha viária do OpenStreetMap.
 *
 * A chave da API fica somente no servidor (`OPENROUTESERVICE_API_KEY`)
 * — o client chama esta rota com as coordenadas no querystring.
 *
 * Query params:
 *   - origemLat, origemLon, destinoLat, destinoLon (números decimais)
 *
 * Respostas:
 *   200 { distanciaKm: number, duracaoMin: number }
 *   400 { error: 'params_invalid' | 'rota_nao_encontrada' }
 *   500 { error: 'ors_unavailable' | 'no_api_key' }
 */
export async function GET(req: NextRequest) {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) {
    return Response.json({ error: 'no_api_key' }, { status: 500 });
  }

  const sp = req.nextUrl.searchParams;
  const origemLat = Number(sp.get('origemLat'));
  const origemLon = Number(sp.get('origemLon'));
  const destinoLat = Number(sp.get('destinoLat'));
  const destinoLon = Number(sp.get('destinoLon'));

  if (
    !Number.isFinite(origemLat) || !Number.isFinite(origemLon) ||
    !Number.isFinite(destinoLat) || !Number.isFinite(destinoLon)
  ) {
    return Response.json({ error: 'params_invalid' }, { status: 400 });
  }

  // ORS espera lon,lat na URL (ordem inversa do habitual).
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${origemLon},${origemLat}&end=${destinoLon},${destinoLat}`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: key, Accept: 'application/geo+json' },
      // Cache de 24h por par de coordenadas — rotas rodoviárias mudam pouco.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => '');
      console.warn('[api/rota-terrestre] ORS', resp.status, detalhe.slice(0, 200));
      return Response.json({ error: 'ors_unavailable', status: resp.status }, { status: 502 });
    }
    const data = await resp.json() as {
      features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }>;
    };
    const summary = data.features?.[0]?.properties?.summary;
    if (!summary || typeof summary.distance !== 'number') {
      return Response.json({ error: 'rota_nao_encontrada' }, { status: 400 });
    }
    return Response.json({
      distanciaKm: summary.distance / 1000,
      duracaoMin: (summary.duration ?? 0) / 60,
    });
  } catch (err) {
    console.warn('[api/rota-terrestre] fetch error:', err);
    return Response.json({ error: 'ors_unavailable' }, { status: 502 });
  }
}
