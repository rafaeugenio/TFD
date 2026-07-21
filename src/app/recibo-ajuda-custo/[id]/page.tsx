import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { calcularValorAjuda } from '@/core/mocks/fluxo-v2-v3-seed';
import { fmtBRL, fmtDataBR, valorPorExtenso } from '@/app/relatorios/_shared/format';
import ReciboToolbar from './ReciboToolbar';
import './print.css';

/**
 * PBI 13279: Recibo de Pagamento a Beneficiário (RPB), o documento que o
 * setor de Ajuda de Custo anexa ao SEI para instruir o pagamento de um ciclo
 * específico. Diferente do despacho (PBI 13195), não é persistido: o `id` da
 * rota é o id da ajuda de custo escolhida no select do card de fechamento, e
 * o documento é remontado a cada acesso com os dados atuais.
 */

interface AjudaCustoRow {
  id: string;
  solicitacao_id: string;
  tipo: 'PACIENTE' | 'ACOMPANHANTE';
  data_inicio: string;
  data_fim: string | null;
  valor_total: number | null;
  valor_pago: number | null;
  valor_reembolso: number | null;
  status: string;
  numero_sei: string | null;
  observacoes: string | null;
  updated_at: string;
}

interface SolicitacaoRow {
  id: string;
  numero_processo: string;
  paciente_id: string;
  created_at: string;
  snapshot_banco: string | null;
  snapshot_agencia: string | null;
  snapshot_conta: string | null;
  snapshot_nome_titular: string | null;
  snapshot_cpf_titular: string | null;
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

/** Rótulos em português para o status bruto vindo do banco (enum com drift:
 *  algumas migrations aditivas ainda não foram regeradas em database.types.ts). */
const STATUS_AJUDA_CUSTO_LABEL: Record<string, string> = {
  EMITIDO: 'Emitido',
  EM_ANALISE: 'Em análise',
  APROVADA: 'Aprovada',
  EM_PAGAMENTO: 'Em pagamento',
  PAGO_PARCIALMENTE: 'Pago parcialmente',
  CONCLUIDO: 'Concluído',
  CONCLUIDA: 'Concluída',
  GLOSADA: 'Glosada',
};

function formatarProcessoCurto(numero: string | null | undefined): string {
  if (!numero) return '____/____';
  // "2026.110222.15889" → "15889/2026"; senão devolve o original.
  const partes = numero.split('.');
  if (partes.length >= 3) return `${partes[partes.length - 1]}/${partes[0]}`;
  return numero;
}

function fmtDataHoraBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
}

/** Número sequencial estável derivado do id, no mesmo padrão do despacho
 *  (não há coluna de numeração própria neste protótipo). */
function derivarNumeroRecibo(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, '').slice(0, 6);
  const num = (parseInt(hex, 16) % 9000) + 1000;
  return String(num);
}

function unidadeDaTentativa(t: TentativaRow | null): UnidadeDestinoRow | null {
  if (!t?.unidades_destino) return null;
  return Array.isArray(t.unidades_destino) ? (t.unidades_destino[0] ?? null) : t.unidades_destino;
}

interface LinhaCalculada {
  ajuda: AjudaCustoRow;
  beneficiario?: string;
  dias: number;
  memoriaCalculo: string;
  valorCalculado: number;
  valorAPagar: number;
  valorConfirmado: number;
}

function calcularLinha(a: AjudaCustoRow, beneficiario?: string): LinhaCalculada {
  const calc = a.data_fim ? calcularValorAjuda(a.data_inicio, a.data_fim) : { dias: 0, valor: 0 };
  const valorCalculado = a.valor_total ?? calc.valor;
  const valorAPagar = Math.max(0, valorCalculado - (a.valor_reembolso ?? 0));
  const valorConfirmado = a.valor_pago ?? valorAPagar;
  const memoriaCalculo = a.data_fim
    ? `Início=${fmtDataBR(a.data_inicio)} Fim=${fmtDataBR(a.data_fim)} ${calc.dias} diária(s)`
    : `Início=${fmtDataBR(a.data_inicio)}`;
  return { ajuda: a, beneficiario, dias: calc.dias, memoriaCalculo, valorCalculado, valorAPagar, valorConfirmado };
}

export default async function ReciboAjudaCustoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: ajudaData, error } = await supabase
    .from('ajudas_custo')
    .select(
      'id, solicitacao_id, tipo, data_inicio, data_fim, valor_total, valor_pago, valor_reembolso, status, numero_sei, observacoes, updated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !ajudaData) notFound();
  const ajuda = ajudaData as unknown as AjudaCustoRow;

  const { data: solData } = await supabase
    .from('solicitacoes')
    .select(
      'id, numero_processo, paciente_id, created_at, snapshot_banco, snapshot_agencia, snapshot_conta, snapshot_nome_titular, snapshot_cpf_titular',
    )
    .eq('id', ajuda.solicitacao_id)
    .maybeSingle();

  if (!solData) notFound();
  const sol = solData as unknown as SolicitacaoRow;

  const [
    { data: pacienteData },
    { data: todasAjudasData },
    { data: solAcompData },
    { data: tentativaData },
    { data: historicoPacienteData },
    { data: authData },
  ] = await Promise.all([
    supabase
      .from('pacientes')
      .select('nome_completo, cns, data_nascimento, logradouro, numero, bairro, cep, municipio, uf')
      .eq('id', sol.paciente_id)
      .maybeSingle(),
    supabase
      .from('ajudas_custo')
      .select(
        'id, solicitacao_id, tipo, data_inicio, data_fim, valor_total, valor_pago, valor_reembolso, status, numero_sei, observacoes, updated_at',
      )
      .eq('solicitacao_id', ajuda.solicitacao_id)
      .eq('ativa', true)
      .order('data_inicio', { ascending: true }),
    supabase
      .from('solicitacao_acompanhantes')
      .select('acompanhantes(nome_completo)')
      .eq('solicitacao_id', ajuda.solicitacao_id),
    supabase
      .from('tentativas_agendamento')
      .select('data_agendamento, unidades_destino:unidade_id (nome, cidade, uf)')
      .eq('solicitacao_id', ajuda.solicitacao_id)
      .eq('resultado', 'AGENDAMENTO_CONFIRMADO')
      .order('data_agendamento', { ascending: false })
      .limit(1),
    supabase
      .from('solicitacoes')
      .select('id, created_at')
      .eq('paciente_id', sol.paciente_id)
      .order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const paciente = pacienteData as unknown as PacienteRow | null;
  const todasAjudas = (todasAjudasData as unknown as AjudaCustoRow[] | null) ?? [];
  const nomesAcompanhantes = ((solAcompData ?? []) as Array<{ acompanhantes: { nome_completo: string } | { nome_completo: string }[] | null }>)
    .map((r) => (Array.isArray(r.acompanhantes) ? r.acompanhantes[0]?.nome_completo : r.acompanhantes?.nome_completo))
    .filter((n): n is string => !!n);
  // Schema atual não vincula a ajuda de custo a um acompanhante específico
  // (sem coluna acompanhante_id em ajudas_custo). Com um único acompanhante
  // na solicitação, atribuímos o nome dele; com mais de um, mostramos
  // "Acompanhante" genérico. Ver "Pontos de atenção" na entrega.
  const nomeAcompanhanteUnico = nomesAcompanhantes.length === 1 ? nomesAcompanhantes[0] : undefined;

  const tentativaConfirmada = ((tentativaData as unknown as TentativaRow[] | null) ?? [])[0] ?? null;
  const unidadeDestino = unidadeDaTentativa(tentativaConfirmada);

  const historicoPaciente = (historicoPacienteData as unknown as Array<{ id: string; created_at: string }> | null) ?? [];
  const cicloTfd = Math.max(1, historicoPaciente.findIndex((r) => r.id === sol.id) + 1);

  let nomeEmissor = 'Sistema';
  const authUser = authData?.user;
  if (authUser) {
    const { data: usuarioRow } = await supabase
      .from('usuarios')
      .select('nome_completo')
      .eq('id', authUser.id)
      .maybeSingle();
    nomeEmissor = (usuarioRow as { nome_completo?: string } | null)?.nome_completo ?? authUser.email ?? 'Sistema';
  }

  // Ciclo = ajudas de custo desta solicitação que compartilham o mesmo
  // período (início e fim) da ajuda escolhida. O schema atual não tem um
  // identificador de "ciclo" próprio, então agrupamos por período como
  // aproximação fiel ao caso comum (paciente e acompanhantes lançados juntos).
  const gruposPorPeriodo = new Map<string, AjudaCustoRow[]>();
  for (const a of todasAjudas) {
    const chave = `${a.data_inicio}|${a.data_fim ?? ''}`;
    const grupo = gruposPorPeriodo.get(chave) ?? [];
    grupo.push(a);
    gruposPorPeriodo.set(chave, grupo);
  }
  const chavesOrdenadas = Array.from(gruposPorPeriodo.keys()).sort();
  const chaveAtual = `${ajuda.data_inicio}|${ajuda.data_fim ?? ''}`;
  const numeroCiclo = chavesOrdenadas.indexOf(chaveAtual) + 1;
  const grupoAtual = gruposPorPeriodo.get(chaveAtual) ?? [ajuda];

  const linhasPaciente = grupoAtual.filter((a) => a.tipo === 'PACIENTE').map((a) => calcularLinha(a));
  const linhasAcompanhantes = grupoAtual
    .filter((a) => a.tipo === 'ACOMPANHANTE')
    .map((a) => calcularLinha(a, nomeAcompanhanteUnico ?? 'Acompanhante'));

  const totalPaciente = linhasPaciente.reduce((acc, l) => acc + l.valorConfirmado, 0);
  const totalAcompanhantes = linhasAcompanhantes.reduce((acc, l) => acc + l.valorConfirmado, 0);
  const valorLiquido = totalPaciente + totalAcompanhantes;

  const statusCiclo = STATUS_AJUDA_CUSTO_LABEL[ajuda.status] ?? ajuda.status;
  const dataProcessamento = grupoAtual.reduce(
    (max, a) => (a.updated_at > max ? a.updated_at : max),
    grupoAtual[0]?.updated_at ?? ajuda.updated_at,
  );

  const nomePaciente = paciente?.nome_completo?.toUpperCase() ?? '[NOME DO PACIENTE]';
  const dataNascimentoFmt = paciente?.data_nascimento ? fmtDataBR(paciente.data_nascimento) : '—';
  const endereco = paciente
    ? `${paciente.logradouro}, Nº ${paciente.numero}, ${paciente.bairro} ${paciente.cep} ${paciente.municipio}`
    : '—';
  const localTratamento = unidadeDestino
    ? `UF = ${unidadeDestino.uf} Cidade = ${unidadeDestino.cidade} Hospital = ${unidadeDestino.nome}`
    : 'Não informado: sem agendamento confirmado registrado para esta solicitação.';

  const numeroRecibo = derivarNumeroRecibo(ajuda.id);
  const agora = new Date().toISOString();
  const rodapeEmissao = `Emitido por ${nomeEmissor} em ${fmtDataHoraBR(agora)}.`;

  function linhaTabela(l: LinhaCalculada, mostrarBeneficiario: boolean) {
    return (
      <tr key={l.ajuda.id}>
        <td className="recibo-centro">{numeroCiclo}</td>
        <td className="recibo-centro">{statusCiclo}</td>
        <td className="recibo-centro">{cicloTfd}</td>
        {mostrarBeneficiario && <td>{l.beneficiario}</td>}
        <td className="recibo-centro">{formatarProcessoCurto(l.ajuda.numero_sei)}</td>
        <td>{l.memoriaCalculo}</td>
        <td className="recibo-direita">{fmtBRL(l.valorCalculado)}</td>
        <td className="recibo-direita">—</td>
        <td className="recibo-direita">{fmtBRL(l.valorAPagar)}</td>
        <td className="recibo-direita">{fmtBRL(l.valorConfirmado)}</td>
        <td>{l.ajuda.observacoes || '—'}</td>
      </tr>
    );
  }

  return (
    <div className="print-root">
      <ReciboToolbar />

      <div className="print-page recibo-page">
        {/* ── Cabeçalho institucional ─────────────────────── */}
        <header className="recibo-cabecalho">
          <img
            src="/brand/ses-ma-horizontal.png"
            alt="Governo do Estado do Maranhão, Secretaria de Estado da Saúde"
            className="recibo-brasao"
          />
          <h1 className="recibo-titulo">TFD - RECIBO DE PAGAMENTO A BENEFICIÁRIO - #{numeroRecibo}</h1>
          <span className="recibo-logo-tfd">TFD</span>
        </header>

        {/* ── Dados do Paciente ─────────────────────────────── */}
        <p className="recibo-section-title">DADOS DO PACIENTE</p>
        <table className="recibo-table">
          <tbody>
            <tr><td className="recibo-rotulo">Paciente</td><td>{nomePaciente}</td></tr>
            <tr><td className="recibo-rotulo">Cartão SUS</td><td>{paciente?.cns || '—'}</td></tr>
            <tr><td className="recibo-rotulo">Data de Nascimento</td><td>{dataNascimentoFmt}</td></tr>
            <tr><td className="recibo-rotulo">Endereço</td><td>{endereco}</td></tr>
            <tr><td className="recibo-rotulo">Nº Doc Solicitação</td><td>{sol.numero_processo}</td></tr>
            <tr><td className="recibo-rotulo">Local do Tratamento</td><td>{localTratamento}</td></tr>
          </tbody>
        </table>

        {/* ── Valores da ajuda de custos ────────────────────── */}
        <p className="recibo-section-title">VALORES DA AJUDA DE CUSTOS</p>

        <p className="text-[9pt] font-bold mt-3 mb-1">Paciente</p>
        <table className="recibo-table">
          <thead>
            <tr>
              <th>Ciclo</th><th>Status</th><th>Ciclo TFD</th><th>Nº/Ano do processo</th>
              <th>Informações Necessárias para o Cálculo</th><th>Valor Calculado</th>
              <th>Valor Antecipado</th><th>Valor a Pagar</th><th>Valor a Pagar (Confirmado)</th>
              <th>Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {linhasPaciente.length > 0 ? (
              <>
                {linhasPaciente.map((l) => linhaTabela(l, false))}
                <tr className="recibo-total">
                  <td colSpan={8} className="recibo-direita">Total</td>
                  <td className="recibo-direita">{fmtBRL(totalPaciente)}</td>
                  <td></td>
                </tr>
              </>
            ) : (
              <tr><td colSpan={10} className="recibo-vazio">Nenhum período do paciente neste ciclo.</td></tr>
            )}
          </tbody>
        </table>

        <p className="text-[9pt] font-bold mt-3 mb-1">Acompanhantes</p>
        <table className="recibo-table">
          <thead>
            <tr>
              <th>Ciclo</th><th>Status</th><th>Ciclo TFD</th><th>Beneficiário</th><th>Nº/Ano do processo</th>
              <th>Informações Necessárias para o Cálculo</th><th>Valor Calculado</th>
              <th>Valor Antecipado</th><th>Valor a Pagar</th><th>Valor a Pagar (Confirmado)</th>
              <th>Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {linhasAcompanhantes.length > 0 ? (
              <>
                {linhasAcompanhantes.map((l) => linhaTabela(l, true))}
                <tr className="recibo-total">
                  <td colSpan={9} className="recibo-direita">Total</td>
                  <td className="recibo-direita">{fmtBRL(totalAcompanhantes)}</td>
                  <td></td>
                </tr>
              </>
            ) : (
              <tr><td colSpan={11} className="recibo-vazio">Nenhum acompanhante com ajuda de custo neste ciclo.</td></tr>
            )}
          </tbody>
        </table>

        <table className="recibo-table">
          <thead>
            <tr><th>Ciclo</th><th>Status</th><th>Valor Líquido</th><th>Data do Processamento</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="recibo-centro">{numeroCiclo}</td>
              <td className="recibo-centro">{statusCiclo}</td>
              <td>{fmtBRL(valorLiquido)} ({valorPorExtenso(valorLiquido)}).</td>
              <td className="recibo-centro">{fmtDataBR(dataProcessamento)}</td>
            </tr>
          </tbody>
        </table>

        <p className="recibo-rodape">{rodapeEmissao}</p>
        <p className="recibo-pagina">1/2</p>
      </div>

      <div className="print-page recibo-page">
        <header className="recibo-cabecalho">
          <img
            src="/brand/ses-ma-horizontal.png"
            alt="Governo do Estado do Maranhão, Secretaria de Estado da Saúde"
            className="recibo-brasao"
          />
          <h1 className="recibo-titulo">TFD - RECIBO DE PAGAMENTO A BENEFICIÁRIO - #{numeroRecibo}</h1>
          <span className="recibo-logo-tfd">TFD</span>
        </header>

        <p className="recibo-section-title">INFORMAÇÕES DO SACADOR</p>
        <table className="recibo-table">
          <thead>
            <tr><th>Ciclo</th><th>Status</th><th>Nome</th><th>CPF</th><th>Banco</th><th>Agência</th><th>Conta Corrente</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="recibo-centro">{numeroCiclo}</td>
              <td className="recibo-centro">{statusCiclo}</td>
              <td>{sol.snapshot_nome_titular ?? '—'}</td>
              <td>{sol.snapshot_cpf_titular ?? '—'}</td>
              <td>{sol.snapshot_banco ?? '—'}</td>
              <td>{sol.snapshot_agencia ?? '—'}</td>
              <td>{sol.snapshot_conta ?? '—'}</td>
            </tr>
          </tbody>
        </table>

        <div className="recibo-bloco-auditoria">
          <span><strong>Criado Por:</strong> {nomeEmissor}</span>
          <span><strong>Data Inclusão:</strong> {fmtDataHoraBR(agora)}</span>
          <span><strong>Situação:</strong> Gerado para impressão</span>
          <span><strong>Rota:</strong> Não definida</span>
        </div>

        <p className="recibo-rodape">{rodapeEmissao}</p>
        <p className="recibo-pagina">2/2</p>
      </div>
    </div>
  );
}
