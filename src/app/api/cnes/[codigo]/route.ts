import type { NextRequest } from 'next/server';

const CNES_ENDPOINT = 'https://servicos.saude.gov.br/cnes/EstabelecimentoSaudeService/v1r0';
const CNES_USER = 'CNES.PUBLICO';
const CNES_PASS = 'cnes#2015public';

function buildSoapEnvelope(codigo: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope
  xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
  xmlns:est="http://servicos.saude.gov.br/cnes/v1r0/estabelecimentosaudeservice"
  xmlns:fil="http://servicos.saude.gov.br/wsdl/mensageria/v1r0/filtropesquisaestabelecimentosaude"
  xmlns:cod="http://servicos.saude.gov.br/schema/cnes/v1r0/codigocnes">
  <soap:Header>
    <wsse:Security soap:mustUnderstand="true">
      <wsse:UsernameToken>
        <wsse:Username>${CNES_USER}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${CNES_PASS}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <est:requestConsultarEstabelecimentoSaude>
      <fil:FiltroPesquisaEstabelecimentoSaude>
        <cod:CodigoCNES>
          <cod:codigo>${codigo}</cod:codigo>
        </cod:CodigoCNES>
      </fil:FiltroPesquisaEstabelecimentoSaude>
    </est:requestConsultarEstabelecimentoSaude>
  </soap:Body>
</soap:Envelope>`;
}

/** Extrai o texto de uma tag pelo localName (ignora prefixo de namespace). */
function tagValue(xml: string, localName: string): string {
  const re = new RegExp(
    `<(?:[\\w]+:)?${localName}(?:\\s[^>]*)?>\\s*([^<\\s][^<]*?)\\s*</(?:[\\w]+:)?${localName}>`,
  );
  return xml.match(re)?.[1]?.trim() ?? '';
}

/** Extrai o conteúdo completo (inner xml) de uma tag pelo localName. */
function tagSection(xml: string, localName: string): string {
  const re = new RegExp(
    `<(?:[\\w]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${localName}>`,
  );
  return xml.match(re)?.[1] ?? '';
}


export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/cnes/[codigo]'>,
) {
  const { codigo } = await ctx.params;

  if (!/^\d{7}$/.test(codigo)) {
    return Response.json({ error: 'CNES deve ter 7 dígitos' }, { status: 400 });
  }

  let xmlResponse: string;
  try {
    const res = await fetch(CNES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
      },
      body: buildSoapEnvelope(codigo),
    });

    xmlResponse = await res.text();

    if (!res.ok) {
      return Response.json({ error: 'Erro ao consultar CNES' }, { status: 502 });
    }
  } catch {
    return Response.json({ error: 'Não foi possível conectar ao CNES' }, { status: 502 });
  }

  // Verifica se há fault ou ausência de dados
  if (xmlResponse.includes('Fault') || !xmlResponse.includes('DadosGeraisEstabelecimentoSaude')) {
    return Response.json({ error: 'CNES não encontrado' }, { status: 404 });
  }

  // --- Extração dos campos ---
  const nomeFantasiaSection = tagSection(xmlResponse, 'nomeFantasia');
  const nomeEmpresarialSection = tagSection(xmlResponse, 'nomeEmpresarial');
  const nome =
    tagValue(nomeFantasiaSection, 'Nome') ||
    tagValue(nomeEmpresarialSection, 'Nome');

  const endSection = tagSection(xmlResponse, 'Endereco');
  const logradouro = tagValue(endSection, 'nomeLogradouro');
  const numero = tagValue(endSection, 'numero');
  const bairroSection = tagSection(endSection, 'Bairro');
  const bairro = tagValue(bairroSection, 'descricaoBairro');
  const cepSection = tagSection(endSection, 'CEP');
  const cep = tagValue(cepSection, 'numeroCEP');
  const munSection = tagSection(endSection, 'Municipio');
  const municipio = tagValue(munSection, 'nomeMunicipio');
  const ufSection = tagSection(munSection, 'UF');
  const uf = tagValue(ufSection, 'siglaUF');

  const telSection = tagSection(xmlResponse, 'Telefone');
  const ddd = tagValue(telSection, 'DDD');
  const numTel = tagValue(telSection, 'numeroTelefone');
  const telefone = ddd && numTel ? `${ddd}${numTel}` : '';

  const emailSection = tagSection(xmlResponse, 'Email');
  const email = tagValue(emailSection, 'descricaoEmail');

  const dirSection = tagSection(xmlResponse, 'Diretor');
  const dirNomeSection = tagSection(dirSection, 'nome');
  const responsavel = tagValue(dirNomeSection, 'Nome');

  const tipoSection = tagSection(xmlResponse, 'tipoUnidade');
  const tipoCodigo = tagValue(tipoSection, 'codigo');
  const tipoDescricao = tagValue(tipoSection, 'descricao');

  return Response.json({
    nome,
    logradouro,
    numero,
    bairro,
    cep,
    municipio,
    uf,
    telefone,
    email,
    responsavel,
    tipo: tipoCodigo,
    tipoDescricao,
  });
}
