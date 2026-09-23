import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { fmtBRL, fmtDataBR, valorPorExtenso } from '@/app/relatorios/_shared/format';
import ReciboToolbar from './ReciboToolbar';
import './print.css';

/**
 * Ajuste do cliente (2026-07): o recibo de ajuda de custo (SEI) deixa de
 * referenciar um ciclo único e passa a reunir, num só documento, uma ou
 * mais ajudas de custo escolhidas pelo usuário no `ReciboAjudaCustoDrawer`,
 * cada uma com a própria justificativa. Os ids escolhidos, as justificativas
 * e o nome de cada beneficiário chegam pela querystring (`ids`, `just`,
 * `nomes`): o recibo não é persistido, então não há onde guardar esse texto
 * livre além do próprio link gerado na hora. Ciclo, status do ciclo,
 * situação do recibo, rota de aprovação e auditoria saíram do documento a
 * pedido do cliente.
 */

interface AjudaCustoRow {
  id: string;
  solicitacao_id: string;
  tipo: 'PACIENTE' | 'ACOMPANHANTE';
  data_inicio: string;
  data_fim: string | null;
  dias_elegiveis: number | null;
  valor_diaria: number | null;
  valor_total: number | null;
  /** PBI 16404 — processo SEI da própria ajuda de custo. */
  numero_sei: string | null;
}

interface SolicitacaoRow {
  id: string;
  numero_processo: string;
  paciente_id: string;
  snapshot_banco: string | null;
  snapshot_agencia: string | null;
  snapshot_conta: string | null;
  snapshot_nome_titular: string | null;
  snapshot_cpf_titular: string | null;
  /** Par legado — processo SEI único, de antes do histórico de processos. */
  numero_protocolo: string | null;
  /** Migration 00081 (ainda não aplicada) — histórico completo de processos
   *  SEI; o último item é o vigente. Enquanto a migration não roda, vem
   *  `undefined` e o recibo cai para `numero_protocolo`. */
  processos_sei: Array<{ numero?: string }> | null;
}


interface PacienteRow {
  nome_completo: string;
  cns: string | null;
  data_nascimento: string | null;
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
}

interface UnidadeDestinoRow {
  nome: string;
  cidade: string;
  uf: string;
}

interface TentativaRow {
  data_agendamento: string | null;
  unidades_destino: UnidadeDestinoRow | UnidadeDestinoRow[] | null;
}

function formatCep(cep: string | null | undefined): string {
  if (!cep) return '—';
  const digitos = cep.replace(/\D/g, '');
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : cep;
}

/** Número sequencial estável derivado do id (não há coluna de numeração
 *  própria neste protótipo). Usa o primeiro id selecionado como referência. */
function derivarNumeroRecibo(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, '').slice(0, 6);
  const num = (parseInt(hex, 16) % 9000) + 1000;
  return String(num);
}

function unidadeDaTentativa(t: TentativaRow | null): UnidadeDestinoRow | null {
  if (!t?.unidades_destino) return null;
  return Array.isArray(t.unidades_destino) ? (t.unidades_destino[0] ?? null) : t.unidades_destino;
}

/** Faz o parse defensivo de um mapa `{ id: string }` vindo da querystring
 *  (`just`/`nomes`); volta um objeto vazio se o parâmetro faltar ou vier
 *  malformado, em vez de derrubar a página. */
function parseMapaQueryParam(valor: string | string[] | undefined): Record<string, string> {
  if (typeof valor !== 'string' || !valor.trim()) return {};
  try {
    const parsed = JSON.parse(valor);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      );
    }
  } catch {
    // querystring malformada — segue com o mapa vazio.
  }
  return {};
}

interface LinhaRecibo {
  ajuda: AjudaCustoRow;
  beneficiario: string;
  memoriaCalculo: string;
  valorTotal: number;
  justificativa: string;
}

export default async function ReciboAjudaCustoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createServerSupabase();

  // `ids` reúne todas as ajudas de custo escolhidas no drawer; sem o
  // parâmetro (link antigo/direto), cai de volta para o id da rota sozinho.
  const idsParam = typeof sp.ids === 'string' ? sp.ids : undefined;
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : [id];
  const justificativas = parseMapaQueryParam(sp.just);
  const nomesBeneficiarios = parseMapaQueryParam(sp.nomes);

  const { data: ajudasData, error } = await supabase
    .from('ajudas_custo')
    .select('id, solicitacao_id, tipo, data_inicio, data_fim, dias_elegiveis, valor_diaria, valor_total, numero_sei')
    .in('id', ids);

  const todasAjudas = (ajudasData as unknown as AjudaCustoRow[] | null) ?? [];
  if (error || todasAjudas.length === 0) notFound();

  const solicitacaoId = todasAjudas[0].solicitacao_id;

  const { data: solData } = await supabase
    .from('solicitacoes')
    .select(
      'id, numero_processo, paciente_id, snapshot_banco, snapshot_agencia, snapshot_conta, snapshot_nome_titular, snapshot_cpf_titular, numero_protocolo',
    )
    .eq('id', solicitacaoId)
    .maybeSingle();

  if (!solData) notFound();
  const sol = solData as unknown as SolicitacaoRow;

  // `processos_sei` (migration 00081) buscado à parte, best-effort: pedir a
  // coluna no select principal faria a query inteira falhar enquanto a
  // migration não for aplicada (mesmo cuidado do `selectShape.ts` do fluxo-v2).
  const { data: seiData, error: seiError } = await supabase
    .from('solicitacoes')
    .select('processos_sei')
    .eq('id', solicitacaoId)
    .maybeSingle();
  if (seiError) {
    console.warn('[recibo-ajuda-custo] processos_sei indisponível (migration 00081 pendente?):', seiError.message);
  }
  sol.processos_sei = (seiData as { processos_sei?: Array<{ numero?: string }> } | null)?.processos_sei ?? null;

  const [{ data: pacienteData }, { data: solAcompData }, { data: tentativaData }] = await Promise.all([
    supabase
      .from('pacientes')
      .select('nome_completo, cns, data_nascimento, logradouro, numero, bairro, cep, municipio, uf')
      .eq('id', sol.paciente_id)
      .maybeSingle(),
    supabase
      .from('solicitacao_acompanhantes')
      .select('acompanhantes(nome_completo)')
      .eq('solicitacao_id', solicitacaoId),
    supabase
      .from('tentativas_agendamento')
      .select('data_agendamento, unidades_destino:unidade_id (nome, cidade, uf)')
      .eq('solicitacao_id', solicitacaoId)
      .eq('resultado', 'AGENDAMENTO_CONFIRMADO')
      .order('data_agendamento', { ascending: false })
      .limit(1),
  ]);

  const paciente = pacienteData as unknown as PacienteRow | null;
  const nomesAcompanhantes = (
    (solAcompData ?? []) as Array<{ acompanhantes: { nome_completo: string } | { nome_completo: string }[] | null }>
  )
    .map((r) => (Array.isArray(r.acompanhantes) ? r.acompanhantes[0]?.nome_completo : r.acompanhantes?.nome_completo))
    .filter((n): n is string => !!n);
  // A tabela `ajudas_custo` ainda não vincula o período a um acompanhante
  // específico (sem coluna própria). Com um único acompanhante na
  // solicitação, usamos o nome dele como reserva; com mais de um, o nome
  // vem do parâmetro `nomes` (montado no drawer a partir do cadastro).
  // Ver "Pontos de atenção" na entrega para o encaminhamento definitivo.
  const nomeAcompanhanteReserva = nomesAcompanhantes.length === 1 ? nomesAcompanhantes[0] : 'Acompanhante';

  const tentativaConfirmada = ((tentativaData as unknown as TentativaRow[] | null) ?? [])[0] ?? null;
  const unidadeDestino = unidadeDaTentativa(tentativaConfirmada);

  const nomePaciente = paciente?.nome_completo ?? '[Nome do paciente]';
  const dataNascimentoFmt = paciente?.data_nascimento ? fmtDataBR(paciente.data_nascimento) : '—';
  const endereco = paciente
    ? `${paciente.logradouro}, nº ${paciente.numero}, ${paciente.bairro} — ${paciente.municipio}/${paciente.uf}, CEP ${formatCep(paciente.cep)}`
    : '—';
  const localTratamento = unidadeDestino
    ? `${unidadeDestino.nome} — ${unidadeDestino.cidade}/${unidadeDestino.uf}`
    : 'Não informado: sem agendamento confirmado registrado para esta solicitação.';
  const municipioOrigem = paciente ? `${paciente.municipio} — ${paciente.uf}` : '—';

  // Monta as linhas na mesma ordem em que o usuário selecionou as ajudas no
  // drawer (`ids`), não na ordem em que o banco devolveu os registros.
  const ajudasPorId = new Map(todasAjudas.map((a) => [a.id, a]));
  const linhas: LinhaRecibo[] = ids
    .map((ajudaId) => ajudasPorId.get(ajudaId))
    .filter((a): a is AjudaCustoRow => !!a)
    .map((ajuda) => {
      const dias = ajuda.dias_elegiveis;
      const valorDiaria = Number(ajuda.valor_diaria) || 0;
      const valorTotal = ajuda.valor_total != null ? Number(ajuda.valor_total) : dias != null ? dias * valorDiaria : 0;
      const memoriaCalculo = dias != null ? `${dias} diária${dias === 1 ? '' : 's'} × ${fmtBRL(valorDiaria)}` : '—';
      const beneficiario =
        nomesBeneficiarios[ajuda.id] ?? (ajuda.tipo === 'PACIENTE' ? nomePaciente : nomeAcompanhanteReserva);
      return {
        ajuda,
        beneficiario,
        memoriaCalculo,
        valorTotal,
        justificativa: justificativas[ajuda.id] ?? '—',
      };
    });

  // PBI 16404 — o recibo usa o processo SEI de cada ajuda de custo, nunca o
  // processo mais recente da solicitação. Ajudas de processos diferentes
  // aparecem cada uma com o seu na tabela (decisão de negócio pendente).
  const seisDasAjudas = [...new Set(linhas.map((l) => l.ajuda.numero_sei?.trim()).filter((n): n is string => !!n))];
  const processoSeiRecibo = seisDasAjudas.length === 0
    ? null
    : seisDasAjudas.length === 1
      ? seisDasAjudas[0]
      : `${seisDasAjudas.join(' · ')} (um por ajuda de custo, ver tabela)`;

  const valorTotalRecibo = linhas.reduce((acc, l) => acc + l.valorTotal, 0);
  const numeroRecibo = derivarNumeroRecibo(ids[0]);

  const agora = new Date();
  const dataGeracao = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const horaGeracao = agora.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-root">
      <ReciboToolbar />

      <div className="print-page recibo-page">
        <header className="recibo-cabecalho">
          <img
            src="/brand/ses-ma-horizontal.png"
            alt="Governo do Estado do Maranhão, Secretaria de Estado da Saúde"
            className="recibo-brasao"
          />
          <div className="recibo-titulo-bloco">
            <p className="recibo-eyebrow">Documento para o SEI</p>
            <h1 className="recibo-titulo">Recibo de Ajuda de Custo</h1>
            <p className="recibo-subtitulo">
              Solicitação {sol.numero_processo} · Recibo nº {numeroRecibo}
            </p>
          </div>
          <span className="recibo-logo-tfd">TFD</span>
        </header>

        <p className="recibo-section-title">Dados do paciente</p>
        <div className="recibo-grid-card">
          <div className="recibo-grid recibo-grid-3">
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Nome completo</span>
              <span className="recibo-grid-valor">{nomePaciente}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Cartão Nacional de Saúde</span>
              <span className="recibo-grid-valor">{paciente?.cns || '—'}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Data de nascimento</span>
              <span className="recibo-grid-valor">{dataNascimentoFmt}</span>
            </div>
          </div>
          <div className="recibo-grid recibo-grid-2">
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Endereço</span>
              <span className="recibo-grid-valor">{endereco}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Processo SEI</span>
              <span className="recibo-grid-valor">{processoSeiRecibo ?? 'Nenhum processo SEI vinculado às ajudas de custo selecionadas'}</span>
            </div>
          </div>
          <div className="recibo-grid recibo-grid-2">
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Local do tratamento</span>
              <span className="recibo-grid-valor">{localTratamento}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Município de origem</span>
              <span className="recibo-grid-valor">{municipioOrigem}</span>
            </div>
          </div>
        </div>

        <p className="recibo-section-title">Informações das ajudas de custo</p>
        <table className="recibo-table">
          <thead>
            <tr>
              <th>Beneficiário</th>
              <th>Data de início</th>
              <th>Data de fim</th>
              <th>Processo SEI</th>
              <th>Valor do cálculo</th>
              <th>Valor total</th>
              <th>Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length > 0 ? (
              linhas.map((l) => (
                <tr key={l.ajuda.id}>
                  <td>
                    <span className="recibo-beneficiario">{l.beneficiario}</span>
                    <span
                      className={`recibo-badge ${l.ajuda.tipo === 'PACIENTE' ? 'recibo-badge-paciente' : 'recibo-badge-acompanhante'}`}
                    >
                      {l.ajuda.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}
                    </span>
                  </td>
                  <td>{fmtDataBR(l.ajuda.data_inicio)}</td>
                  <td>{fmtDataBR(l.ajuda.data_fim)}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{l.ajuda.numero_sei?.trim() || 'Sem processo'}</td>
                  <td>{l.memoriaCalculo}</td>
                  <td className="recibo-direita recibo-valor-forte">{fmtBRL(l.valorTotal)}</td>
                  <td className="recibo-justificativa">{l.justificativa}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="recibo-vazio">
                  Nenhuma ajuda de custo selecionada para este recibo.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="recibo-resumo">
          <div className="recibo-resumo-caixa">
            <span className="recibo-grid-label">Valor total do recibo</span>
            <p className="recibo-valor-total">{fmtBRL(valorTotalRecibo)}</p>
            <p className="recibo-valor-extenso">{valorPorExtenso(valorTotalRecibo)}.</p>
          </div>
          <div className="recibo-resumo-caixa">
            <span className="recibo-grid-label">Data de geração</span>
            <p className="recibo-data-geracao-legenda">Documento processado em</p>
            <p className="recibo-data-geracao">{dataGeracao}</p>
            <p className="recibo-hora-geracao">às {horaGeracao}</p>
          </div>
        </div>

        <p className="recibo-section-title">Dados bancários do paciente</p>
        <div className="recibo-grid-card">
          <div className="recibo-grid recibo-grid-5">
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Titular</span>
              <span className="recibo-grid-valor">{sol.snapshot_nome_titular ?? '—'}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">CPF</span>
              <span className="recibo-grid-valor">{sol.snapshot_cpf_titular ?? '—'}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Banco</span>
              <span className="recibo-grid-valor">{sol.snapshot_banco ?? '—'}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Agência</span>
              <span className="recibo-grid-valor">{sol.snapshot_agencia ?? '—'}</span>
            </div>
            <div className="recibo-grid-cel">
              <span className="recibo-grid-label">Conta corrente</span>
              <span className="recibo-grid-valor">{sol.snapshot_conta ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="recibo-declaracao">
          <p>
            Declaro, para os devidos fins, o recebimento dos valores de ajuda de custo discriminados
            neste documento, referentes ao Tratamento Fora do Domicílio vinculado à solicitação informada.
          </p>
        </div>

        <footer className="recibo-rodape-pagina">
          <div>
            <p className="recibo-rodape-forte">TFD — Tratamento Fora do Domicílio</p>
            <p>Secretaria de Estado da Saúde do Maranhão</p>
          </div>
          <div className="recibo-rodape-direita">
            <p>Documento gerado eletronicamente</p>
            <p>Página 1 de 1</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
