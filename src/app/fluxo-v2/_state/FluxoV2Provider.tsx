'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  cloneSolicitacao,
  type SolicitacaoMock,
  type StatusGlobalV2,
  type ParecerMock,
  type CarimboRegulacao,
  type CarimboOutrosInfo,
  type AgendamentoMock,
  type TentativaUnidadeMock,
  type ViagemMock,
  type AjudaCustoMock,
  type AdicionalMock,
  type DespesaFunerariaMock,
  type EncerramentoMock,
  type ObservacaoChat,
  type DevolucaoFinanceiroParaRegulacao,
  type UltimaTramitacao,
  type AnexoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { createClient } from '@/lib/supabase/client';
import { solicitacoesFromSupabase } from '../_adapters/fromSupabase';
import { SOLICITACAO_V2_SELECT } from '../_adapters/selectShape';
import {
  buildEnvioSetor,
  buildParecer,
  buildRotaRegulacao,
  buildTentativa,
  buildViagem,
  buildAjudaCusto,
  buildAdicional,
  buildDespesaFuneraria,
  buildEncerramento,
  buildObservacao,
  buildNewSolicitacao,
  STATUS_AJUDA_TO_DB,
  MARCADOR_REEMBOLSO,
} from '../_adapters/toSupabase';
import { statusGlobalToSetor } from '../_adapters/statusMapping';
import { persistInsert, persistUpdate, persistDelete, currentUserId, limparMarcadorReembolso } from './persist';
import { semearDemandasDemo } from './servicoSocialStore';
import {
  criarCreditoSaldo as criarCreditoSaldoStore,
  aplicarDebitoSaldo as aplicarDebitoSaldoStore,
  saldoDoPaciente as saldoDoPacienteStore,
  extratoDoPaciente as extratoDoPacienteStore,
} from './saldoAjudaCustoStore';

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface FluxoV2ContextValue {
  solicitacoes: SolicitacaoMock[];
  /** True enquanto o fetch inicial do Supabase ainda não terminou. */
  isLoading: boolean;
  getById: (id: string) => SolicitacaoMock | undefined;

  createSolicitacao: (input: NewSolicitacaoInput) => Promise<string>; // returns id real do banco
  updateSolicitacao: (id: string, patch: Partial<SolicitacaoMock>) => void;
  setStatus: (id: string, status: StatusGlobalV2) => void;

  /**
   * Adiciona anexos à solicitação carimbando a origem (parecer, agendamento,
   * tentativa, etc.) para aparecerem categorizados na aba Anexos. Usado pelos
   * drawers de fluxo que têm o componente `AnexosUploadField`.
   */
  addAnexos: (
    id: string,
    anexos: Array<{ nome: string; tipo: string; tipoDocumento?: string; tamanhoKB?: number }>,
    origem: NonNullable<AnexoMock['origem']>,
  ) => void;

  addParecer: (id: string, p: Omit<ParecerMock, 'id' | 'data'>) => void;
  /** T2.AL — Edita um parecer existente. */
  editarParecer: (id: string, parecerId: string, patch: Partial<Omit<ParecerMock, 'id'>>) => void;
  /** T2.AL — Remove um parecer. */
  removerParecer: (id: string, parecerId: string) => void;
  setCarimbo: (
    id: string,
    c: CarimboRegulacao,
    observacao?: string,
    outrosInfo?: CarimboOutrosInfo,
  ) => void;

  /**
   * T2.AM — Adiciona uma tentativa. Aceita `data` opcional (default: agora) e
   * os campos de agendamento (hora/tipoProcedimento/contatoUnidade/observacoesChegada)
   * para o caso de já entrar como `desfecho: 'agendamento_confirmado'`. Uma
   * solicitação pode ter várias tentativas confirmadas simultâneas (um
   * agendamento por procedimento/unidade) — não há mais rebaixamento
   * automático de agendamentos anteriores.
   */
  addTentativa: (id: string, t: Omit<TentativaUnidadeMock, 'id'>) => void;
  /** T2.AL/AM — Edita uma tentativa (unidade, desfecho, dados do agendamento etc.). */
  editarTentativa: (id: string, tentativaId: string, patch: Partial<Omit<TentativaUnidadeMock, 'id'>>) => void;
  /** T2.AL — Remove uma tentativa. */
  removerTentativa: (id: string, tentativaId: string) => void;
  /**
   * Cadastro unificado de agendamento pela Regulação — mesmo formulário da
   * criação da solicitação (unidade de destino + lista de procedimentos).
   * Cada procedimento vira uma tentativa `agendamento_confirmado` própria,
   * todas na mesma unidade, coexistindo com agendamentos já confirmados.
   */
  addAgendamentos: (
    id: string,
    input: {
      unidadeId: string;
      /** Nome de exibição da unidade (já com CNES, quando houver). */
      unidade: string;
      procedimentos: Array<{ tipoProcedimento: TentativaUnidadeMock['tipoProcedimento']; data: string }>;
    },
  ) => void;
  /**
   * @deprecated T2.AM — agendamento agora é uma tentativa com
   * `desfecho: 'agendamento_confirmado'`. Use `addTentativa`/`editarTentativa`
   * (ou `addAgendamentos` para cadastro em lote).
   */
  setAgendamento: (
    id: string,
    a: {
      origem: AgendamentoMock['origem'];
      unidade: string;
      data: string;
      hora: string;
      tipoProcedimento?: TentativaUnidadeMock['tipoProcedimento'];
      contatoUnidade?: string;
      observacoesChegada?: string;
    },
  ) => void;
  registrarSegundoDeferimento: (id: string, medico: string) => void;

  addViagem: (id: string, v: Omit<ViagemMock, 'id'>) => void;
  /**
   * T2.X — Cria duas viagens (ida + volta) a partir de um único pedido de
   * "ida e volta". Diferente de `addViagem` que adiciona uma única viagem,
   * este método sempre persiste DUAS ViagemMock independentes (com `tipo`
   * `'ida'` e `'volta'`), permitindo edições/remarcações separadas. O valor
   * total é dividido 50/50 entre as duas; a viagem de volta tem origem e
   * destino invertidos automaticamente.
   */
  addViagensIdaEVolta: (
    id: string,
    input: {
      origem: string;
      destino: string;
      /** Campos estruturados de origem/destino. */
      origemCidade?: string;
      origemUf?: string;
      destinoCidade?: string;
      destinoUf?: string;
      /** IATA dos aeroportos (modal aéreo). */
      origemAeroporto?: string;
      destinoAeroporto?: string;
      modal: ViagemMock['modal'];
      status: ViagemMock['status'];
      dataIda: string;
      dataVolta: string;
      valorTotal: number;
      /** T2.AF — Mesmo beneficiário aplica-se às duas passagens geradas. */
      beneficiarioTipo: 'paciente' | 'acompanhante';
      beneficiarioId?: string;
      /** Distância e ajuda de custo (calculados, idem para ida e volta). */
      distanciaValor?: number;
      distanciaUnidade?: 'km' | 'milhas' | 'milhas_nauticas';
      valorAjudaCustoPaciente?: number;
      valorAjudaCustoAcompanhante?: number;
      /** Só preenchido quando `modal === 'transfer'` — aplica-se às duas
       *  passagens geradas (ida e volta do mesmo transfer). */
      viagemVinculadaId?: string;
    },
  ) => void;
  updateViagem: (id: string, viagemId: string, patch: Partial<ViagemMock>) => void;

  /** T2.AL — Edita uma viagem. (Renomeação clara do já existente `updateViagem`.) */
  editarViagem: (id: string, viagemId: string, patch: Partial<ViagemMock>) => void;
  /** Inativa uma viagem (substitui o antigo "cancelar"). Mantém histórico,
   *  mas a viagem deixa de entrar nos KPIs e relatórios. */
  cancelarViagem: (id: string, viagemId: string, motivo?: string) => void;
  /** Registra reembolso parcial ou integral. `valor` <= `viagem.valor`. */
  reembolsarViagem: (id: string, viagemId: string, valor: number, data: string) => void;
  /** Remove uma viagem fisicamente (hard delete). Uso restrito — preferir
   *  `cancelarViagem` que mantém histórico. */
  removerViagem: (id: string, viagemId: string) => void;

  addAjudaCusto: (id: string, a: Omit<AjudaCustoMock, 'id'>) => void;
  updateAjudaCusto: (id: string, ajudaId: string, patch: Partial<AjudaCustoMock>) => void;
  /** T2.AL — Alias semântico de `updateAjudaCusto`. */
  editarAjudaCusto: (id: string, ajudaId: string, patch: Partial<AjudaCustoMock>) => void;
  /** Inativa uma ajuda de custo. */
  cancelarAjudaCusto: (id: string, ajudaId: string, motivo?: string) => void;
  /** Registra reembolso parcial ou integral. */
  reembolsarAjudaCusto: (id: string, ajudaId: string, valor: number, data: string) => void;
  /** Hard delete — preferir `cancelarAjudaCusto`. */
  removerAjudaCusto: (id: string, ajudaId: string) => void;

  addAdicional: (id: string, a: Omit<AdicionalMock, 'id'>) => void;
  /** T2.AL — Edita um adicional. */
  editarAdicional: (id: string, adicionalId: string, patch: Partial<AdicionalMock>) => void;
  /** T2.AL — Remove um adicional. */
  removerAdicional: (id: string, adicionalId: string) => void;

  /** Registra uma despesa de funerária (solicitações encerradas por óbito). */
  addDespesaFuneraria: (id: string, d: Omit<DespesaFunerariaMock, 'id'>) => void;
  /** Remove uma despesa de funerária. */
  removerDespesaFuneraria: (id: string, despId: string) => void;

  encerrar: (id: string, e: EncerramentoMock) => void;
  /** @deprecated use reabrirSolicitacao */
  reabrirParaParecer: (id: string) => void;
  /** Reabre uma solicitação encerrada, colocando-a no setor escolhido. */
  reabrirSolicitacao: (
    id: string,
    setor: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento',
    motivo?: string,
  ) => void;

  addObservacao: (id: string, texto: string) => void;

  // T2.AB — Tramitação genérica entre setores (PBI 13237 — 5 setores ativos,
  // mais 'aprovacao' como destino de análise/decisão de setor responsável)
  enviarParaSetor: (
    id: string,
    destino: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento' | 'aprovacao',
    observacao?: string,
    tipo?: 'enviar' | 'devolver',
    /** Pessoa(s) escolhida(s) como responsável(is) pela solicitação no setor
     *  de destino — a partir da primeira tramitação, quem envia escolhe quem
     *  responde por ela lá. Pode ser mais de uma pessoa. */
    responsaveis?: import('@/core/mocks/fluxo-v2-v3-seed').ResponsavelSolicitacao[],
  ) => void;
  /** @deprecated use `enviarParaSetor(id, 'passagens', obs, 'enviar')` */
  encaminharParaFinanceiro: (id: string, observacao?: string) => void;
  /** @deprecated use `enviarParaSetor(id, 'regulacao', motivo, 'devolver')` */
  devolverParaRegulacao: (id: string, motivo: string) => void;
  marcarDevolucaoResolvida: (idSolicitacao: string, idDevolucao: string) => void;

  // T2.R — Edição rápida de solicitação (acompanhantes, laudo, caráter, anexos)
  editarSolicitacao: (id: string, patch: EditarSolicitacaoPatch) => void;

  /**
   * Exclusão de anexo pela aba Anexos — vale para qualquer anexo real
   * (`s.anexos`), não só os enviados avulsos (`addAnexos(..., 'avulso')`).
   * Registra o evento de exclusão na linha do tempo; anexos removidos por
   * outros pontos do fluxo (ex.: edição da solicitação) não passam por aqui.
   */
  removerAnexo: (solicitacaoId: string, anexoId: string) => void;

  /**
   * T2.T — Troca o paciente de uma solicitação. Substitui paciente,
   * acompanhantes e anexos. NÃO altera status, pareceres, agendamento,
   * viagens, ajudas, adicionais ou observações. Como o paciente muda,
   * dados clínicos vinculados ao paciente anterior (acompanhantes e anexos)
   * são RESETADOS — operador precisa escolher novos.
   */
  trocarPaciente: (
    solicitacaoId: string,
    novoPacienteId: string,
    novosAcompanhantesIds: string[],
    novosAnexos: { nome: string; tipo: string; tipoDocumento?: string }[],
    /** Snapshots quando os dados vêm do banco (não estão em pacientesPool / acompanhantesPool). */
    snapshots?: {
      paciente?: import('@/core/mocks/fluxo-v2-v3-seed').PacienteMock;
      acompanhantes?: import('@/core/mocks/fluxo-v2-v3-seed').AcompanhanteMock[];
    },
  ) => void;

  /**
   * Saldo de ajuda de custo entre ciclos (07/08/2026) — quando a volta é
   * emitida antes do período pago, a diferença vira crédito do paciente
   * para o próximo ciclo; nunca é devolvida. Wrappers finos sobre o store
   * `saldoAjudaCustoStore`, que também é consultável fora do Provider (ex.:
   * a tela de detalhe do paciente em `/pacientes/[id]`, que não está dentro
   * de `/fluxo-v2`). Para leitura reativa em componentes, prefira o hook
   * `useSaldoPaciente` do próprio store — estes métodos aqui são para
   * mutação (criar crédito/débito) a partir de dentro do fluxo.
   */
  criarCreditoSaldo: typeof criarCreditoSaldoStore;
  aplicarDebitoSaldo: typeof aplicarDebitoSaldoStore;
  saldoDoPaciente: typeof saldoDoPacienteStore;
  extratoDoPaciente: typeof extratoDoPacienteStore;
}

export interface EditarSolicitacaoPatch {
  acompanhanteIds?: string[];
  dataLaudo?: string | undefined;
  origemLaudoUnidadeId?: string | undefined;
  /** Preserva `origem`/`data` dos itens existentes — só os novos (sem `id`)
   *  ganham `origem: 'edicao'`. Ver `editarSolicitacao` no provider. */
  anexos?: { id?: string; nome: string; tipo: string; tipoDocumento?: string }[];
  /** Pedido do Rafael (26/08/2026) — histórico completo de processos SEI da
   *  solicitação; o último item é o vigente. Substitui o par legado
   *  `numeroSEI`/`seiUrl`, que o provider continua sincronizando por baixo
   *  dos panos para compatibilidade com o restante do sistema. */
  processosSei?: import('@/core/mocks/fluxo-v2-v3-seed').ProcessoSeiMock[];
  /** Snapshot dos acompanhantes quando vêm do banco (não estão em acompanhantesPool). */
  acompanhantesSnapshot?: import('@/core/mocks/fluxo-v2-v3-seed').AcompanhanteMock[];
}

export interface NewSolicitacaoInput {
  pacienteId: string;
  acompanhanteIds: string[];
  /** Agendamento na criação — uma única unidade pode hospedar múltiplos
   *  procedimentos (consulta, exame, cirurgia, tratamento contínuo). Cada
   *  procedimento vira uma tentativa confirmada no AgendamentoMock. */
  agendamento?: {
    unidade: string;
    /** Id da unidade de saúde de destino (FK) — usado para persistir o
     *  vínculo real no banco, além do nome em texto livre. */
    unidadeId?: string;
    procedimentos: Array<{
      tipoProcedimento: import('@/core/mocks/fluxo-v2-v3-seed').TipoProcedimento;
      data: string;
    }>;
  };
  dataLaudo?: string;
  /** Origem do laudo: id de uma unidade de saúde cadastrada (unidades_destino).
   *  Usado para relatórios regionais. */
  origemLaudoUnidadeId?: string;
  anexos: { nome: string; tipo: string }[];
  /** PBI 13218 — pelo menos um processo SEI é obrigatório na criação da
   *  solicitação. Pedido do Rafael (26/08/2026) — pode vir com mais de um já
   *  na criação; o último da lista é o vigente. */
  processosSei: { numero: string; url: string }[];
  /** Snapshot do paciente quando vem do banco (não está no pacientesPool mock). */
  pacienteSnapshot?: import('@/core/mocks/fluxo-v2-v3-seed').PacienteMock;
  /** Snapshot dos acompanhantes quando vêm do banco. */
  acompanhantesSnapshot?: import('@/core/mocks/fluxo-v2-v3-seed').AcompanhanteMock[];
}

const FluxoV2Context = createContext<FluxoV2ContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

import { pacientesPool, acompanhantesPool } from '@/core/mocks/fluxo-v2-v3-seed';

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

/** Persona (autor + perfil) mockada de quem está tramitando, derivada do
 *  setor onde a solicitação está ANTES do movimento — a mesma pessoa/time
 *  "envia" pra frente ou "devolve" pra trás. */
const PERSONA_POR_STATUS: Record<StatusGlobalV2, { autor: string; perfilAutor: string }> = {
  em_dados_basicos:  { autor: 'Maria Silva',         perfilAutor: 'Coordenação Estadual' },
  em_regulacao:      { autor: 'Ana Carolina Mendes',  perfilAutor: 'Regulação' },
  em_passagens:      { autor: 'João Pereira',         perfilAutor: 'Passagens' },
  em_ajuda_custo:    { autor: 'Carla Nogueira',       perfilAutor: 'Ajuda de Custo' },
  em_acompanhamento: { autor: 'Patrícia Gomes',       perfilAutor: 'Acompanhamento' },
  em_aprovacao:      { autor: 'Comitê de Aprovação',  perfilAutor: 'Aprovação' },
  em_encerramento:   { autor: 'Sistema',              perfilAutor: 'Sistema' },
};

const STATUS_POR_DESTINO: Record<
  'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento' | 'aprovacao',
  StatusGlobalV2
> = {
  dados_basicos:  'em_dados_basicos',
  regulacao:      'em_regulacao',
  passagens:      'em_passagens',
  ajuda_custo:    'em_ajuda_custo',
  acompanhamento: 'em_acompanhamento',
  aprovacao:      'em_aprovacao',
};

export function FluxoV2Provider({ children }: { children: ReactNode }) {
  // Inicia vazio. As telas consumidoras devem checar `isLoading` e renderizar
  // skeleton enquanto o fetch do Supabase não conclui.
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [{ data, error }, { data: vinculosRows }, despesasFunerariasResult] = await Promise.all([
          supabase
            .from('solicitacoes')
            .select(SOLICITACAO_V2_SELECT)
            .order('created_at', { ascending: false }),
          // Mapeamento município→regional vem do vínculo cadastrado em
          // regionais_saude_municipios (texto), unido a regionais_saude
          // (código + sede + nome). Fonte mais confiável que municipios.regional,
          // que está esparso.
          supabase
            .from('regionais_saude_municipios')
            .select('municipio_nome, regionais_saude:regional_saude_id(nome, codigo, municipio_sede)'),
          // Best-effort: `despesas_funerarias` (migration 00062) pode ainda não
          // existir no ambiente. Buscada à parte para não derrubar a query
          // principal (ver comentário em selectShape.ts).
          supabase
            .from('despesas_funerarias')
            .select('*')
            .then(
              (res) => res,
              (err) => ({ data: null, error: err }),
            ),
        ]);
        if (cancelled) return;
        if (error || !data) {
          if (error) console.warn('[FluxoV2] erro ao carregar Supabase:', error.message);
          return;
        }
        if (despesasFunerariasResult.error) {
          console.warn(
            '[FluxoV2] despesas_funerarias indisponível (migration pendente?):',
            despesasFunerariasResult.error.message,
          );
        }
        const despesasFunerariasPorSolicitacao = new Map<string, Record<string, unknown>[]>();
        for (const d of (despesasFunerariasResult.data ?? []) as Array<Record<string, unknown>>) {
          const solicitacaoId = String(d.solicitacao_id ?? '');
          if (!solicitacaoId) continue;
          const lista = despesasFunerariasPorSolicitacao.get(solicitacaoId) ?? [];
          lista.push(d);
          despesasFunerariasPorSolicitacao.set(solicitacaoId, lista);
        }
        // Mapa nome do município (lowercase) → { regional, código, sede }.
        const regionalPorMunicipio = new Map<string, { nome: string; codigo: string; sede: string }>();
        ((vinculosRows ?? []) as unknown as Array<Record<string, unknown>>).forEach((v) => {
          const muniNome = String(v.municipio_nome ?? '').trim().toLowerCase();
          const rs = v.regionais_saude as Record<string, unknown> | null;
          if (!muniNome || !rs) return;
          regionalPorMunicipio.set(muniNome, {
            nome: String(rs.nome ?? '').trim(),
            codigo: String(rs.codigo ?? '').trim(),
            sede: String(rs.municipio_sede ?? '').trim(),
          });
        });

        const real = solicitacoesFromSupabase(
          data as unknown as Record<string, unknown>[],
          despesasFunerariasPorSolicitacao,
        );
        for (const s of real) {
          if (s.paciente.municipio) {
            const [nome] = s.paciente.municipio.split(' - ');
            const info = regionalPorMunicipio.get(nome.trim().toLowerCase());
            if (info) {
              s.paciente.regional = info.nome;
              s.paciente.regionalCodigo = info.codigo;
              s.paciente.regionalSede = info.sede;
            }
          }
        }
        setSolicitacoes(real);
        // Demandas de demonstração do Serviço Social são semeadas a partir das
        // solicitações reais (os ids são UUIDs do banco). Fica aqui, e não na
        // fila do módulo, para a flag aparecer na listagem de solicitações sem
        // depender de abrir a tela de Serviço Social antes. Roda uma vez só.
        semearDemandasDemo(real);
      } catch (err) {
        console.warn('[FluxoV2] erro ao carregar Supabase:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getById = useCallback(
    (id: string) => solicitacoes.find((s) => s.id === id),
    [solicitacoes],
  );

  const mutate = useCallback(
    (id: string, fn: (s: SolicitacaoMock) => SolicitacaoMock) => {
      setSolicitacoes((prev) => prev.map((s) => (s.id === id ? fn(cloneSolicitacao(s)) : s)));
    },
    [],
  );

  const updateSolicitacao = useCallback(
    (id: string, patch: Partial<SolicitacaoMock>) => mutate(id, (s) => ({ ...s, ...patch })),
    [mutate],
  );

  const setStatus = useCallback(
    (id: string, status: StatusGlobalV2) => {
      // Otimista: atualiza local primeiro
      mutate(id, (s) => ({ ...s, status }));
      // Persiste no Supabase (best-effort, não bloqueia UI)
      const setor = statusGlobalToSetor(status);
      const supabase = createClient();
      const update = setor === 'encerramento'
        ? { setor_atual: 'encerramento', status: 'CONCLUIDO' }
        : buildEnvioSetor(setor);
      supabase
        .from('solicitacoes')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(update as any)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[FluxoV2] setStatus persistência falhou:', error.message);
        });
    },
    [mutate],
  );

  const createSolicitacao = useCallback(async (input: NewSolicitacaoInput): Promise<string> => {
    // Prefere snapshot vindo do banco; fallback para o pool mock.
    const paciente =
      input.pacienteSnapshot ?? pacientesPool.find((p) => p.id === input.pacienteId);
    if (!paciente) throw new Error('Paciente não encontrado');
    const acompanhantes = input.acompanhantesSnapshot
      ? input.acompanhantesSnapshot.filter((a) => input.acompanhanteIds.includes(a.id))
      : acompanhantesPool.filter((a) => input.acompanhanteIds.includes(a.id));

    // Formato: TFD-{ano}/{seq6}
    // PBI 13218 — o número deixou de carregar o código de tipo (N/AC), já
    // que a distinção de tipo de solicitação foi removida.
    const ano = new Date().getFullYear();
    const proximoNumero = `TFD-${ano}/${String(130 + solicitacoes.length).padStart(6, '0')}`;

    // 1) Persiste no Supabase para receber o id real ANTES de inserir no estado.
    //    Filhos (parecer, viagem, etc.) precisam de FK válida.
    const processosSeiValidos = input.processosSei
      .filter((p) => p.numero.trim().length > 0)
      .map((p) => ({ numero: p.numero.trim(), url: p.url.trim() || undefined }));

    const novaSolicitacaoPayload = buildNewSolicitacao({
      pacienteId: paciente.id,
      numeroProcesso: proximoNumero,
      processosSei: processosSeiValidos,
      dataLaudo: input.dataLaudo,
      origemLaudoUnidadeId: input.origemLaudoUnidadeId,
    });
    const realId = await persistInsert('solicitacoes', novaSolicitacaoPayload);
    const id = realId ?? uid('s');

    // Persiste vínculos com acompanhantes selecionados. Inclui o flag doador
    // (por solicitação) que veio do snapshot.
    if (realId && acompanhantes.length > 0) {
      const supabase = createClient();
      const vinculos = acompanhantes.map((a) => ({
        solicitacao_id: realId,
        acompanhante_id: a.id,
        doador: Boolean(a.doador),
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: vincErr } = await (supabase.from('solicitacao_acompanhantes') as any).insert(vinculos);
      if (vincErr) {
        console.warn('[FluxoV2] erro ao vincular acompanhantes:', vincErr.message);
      }
    }

    // T2.AM — A criação pode informar N procedimentos na mesma unidade.
    // Cada procedimento vira uma tentativa `agendamento_confirmado` dentro do
    // mesmo container AgendamentoMock.
    const ag: AgendamentoMock | undefined =
      input.agendamento && input.agendamento.procedimentos.length > 0
        ? {
            id: uid('ag'),
            origem: 'criacao',
            tentativas: input.agendamento.procedimentos.map((p) => ({
              id: uid('t'),
              unidade: input.agendamento!.unidade,
              unidadeId: input.agendamento!.unidadeId,
              data: p.data,
              dataAgendamento: p.data,
              desfecho: 'agendamento_confirmado',
              tipoProcedimento: p.tipoProcedimento,
            })),
          }
        : undefined;

    const novo: SolicitacaoMock = {
      id,
      numero: proximoNumero,
      status: 'em_dados_basicos',
      tipoSolicitacao: 'normal',
      dataCriacao: nowIso(),
      dataLaudo: input.dataLaudo,
      processosSei: processosSeiValidos.map((p) => ({ id: uid('sei'), numero: p.numero, url: p.url, data: nowIso() })),
      numeroSEI: processosSeiValidos[processosSeiValidos.length - 1]?.numero,
      seiUrl: processosSeiValidos[processosSeiValidos.length - 1]?.url,
      paciente,
      acompanhantes,
      anexos: input.anexos.map((a) => ({ id: uid('an'), ...a })),
      pareceres: [],
      agendamento: ag,
      viagens: [],
      ajudasCusto: [],
      adicionais: [],
      despesasFunerarias: [],
      observacoes: [],
    };

    setSolicitacoes((prev) => [novo, ...prev]);

    // Persiste as tentativas confirmadas do agendamento de criação. Sem isso
    // o agendamento some ao recarregar a página (só existia no estado local).
    if (realId && ag) {
      void currentUserId().then(async (userId) => {
        for (const t of ag.tentativas) {
          const tentativaRealId = await persistInsert(
            'tentativas_agendamento',
            buildTentativa(realId, t, t.unidadeId ?? null, userId),
          );
          if (!tentativaRealId) continue;
          mutate(id, (s) => {
            if (!s.agendamento) return s;
            s.agendamento.tentativas = s.agendamento.tentativas.map((tt) =>
              tt.id === t.id ? { ...tt, id: tentativaRealId } : tt,
            );
            return s;
          });
        }
      });
    }

    return id;
  }, [solicitacoes.length, mutate]);

  /**
   * Anexa arquivos à solicitação carimbando origem + data atual. Usado pelos
   * drawers de fluxo (parecer, passagem, agendamento, tentativa, etc.) para
   * que os documentos apareçam categorizados na aba Anexos.
   */
  const addAnexos = useCallback<FluxoV2ContextValue['addAnexos']>((id, anexos, origem) => {
    if (!anexos.length) return;
    const agora = nowIso();
    mutate(id, (s) => {
      const novos: AnexoMock[] = anexos.map((a) => ({
        id: uid('an'),
        nome: a.nome,
        tipo: a.tipo,
        tipoDocumento: a.tipoDocumento,
        tamanhoKB: a.tamanhoKB,
        origem,
        data: agora,
      }));
      s.anexos = [...(s.anexos ?? []), ...novos];
      return s;
    });
  }, [mutate]);

  /**
   * Pedido do Rafael (26/08/2026) — exclusão de anexo pela aba Anexos.
   * O anexo em si sai de `s.anexos`; um registro mínimo fica em
   * `s.anexosExcluidos` só para a linha do tempo poder mostrar o evento.
   */
  const removerAnexo = useCallback<FluxoV2ContextValue['removerAnexo']>((id, anexoId) => {
    mutate(id, (s) => {
      const alvo = s.anexos.find((a) => a.id === anexoId);
      if (!alvo) return s;
      s.anexos = s.anexos.filter((a) => a.id !== anexoId);
      s.anexosExcluidos = [
        ...(s.anexosExcluidos ?? []),
        { id: alvo.id, nome: alvo.nome, tipoDocumento: alvo.tipoDocumento, data: nowIso() },
      ];
      return s;
    });
  }, [mutate]);

  const addParecer = useCallback<FluxoV2ContextValue['addParecer']>((id, p) => {
    const tempId = uid('pa');
    mutate(id, (s) => {
      const parecer: ParecerMock = { ...p, id: tempId, data: nowIso() };
      s.pareceres = [...s.pareceres, parecer];
      return s;
    });
    // Pega o usuário autenticado para gravar a FK medico_auditor_id.
    void (async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const { data: { user: authUser } } = await createClient().auth.getUser();
      const realId = await persistInsert('pareceres', buildParecer(id, p, authUser?.id ?? null));
      if (!realId) return;
      mutate(id, (s) => {
        s.pareceres = s.pareceres.map((pa) => (pa.id === tempId ? { ...pa, id: realId } : pa));
        return s;
      });
    })();
  }, [mutate]);

  const editarParecer = useCallback<FluxoV2ContextValue['editarParecer']>(
    (id, parecerId, patch) => {
      mutate(id, (s) => {
        s.pareceres = s.pareceres.map((p) => (p.id === parecerId ? { ...p, ...patch } : p));
        return s;
      });
      const dbPatch: Record<string, unknown> = {};
      if (patch.decisao) dbPatch.decisao = patch.decisao === 'indeferido' ? 'INDEFERIDO' : 'DEFERIDO';
      if (patch.tipo !== undefined) dbPatch.tipo = patch.tipo;
      if (patch.cidPrincipal !== undefined) dbPatch.cid_principal = patch.cidPrincipal;
      if (patch.cidPrincipalNome !== undefined) dbPatch.cid_principal_nome = patch.cidPrincipalNome || null;
      if (patch.cidSecundario !== undefined) dbPatch.cid_secundario = patch.cidSecundario || null;
      if (patch.cidSecundarioNome !== undefined) dbPatch.cid_secundario_nome = patch.cidSecundarioNome || null;
      if (patch.versaoCID !== undefined) dbPatch.versao_cid = patch.versaoCID;
      if (patch.observacao !== undefined) dbPatch.justificativa = patch.observacao;
      // 'observacaoAjuste' in patch (em vez de !== undefined) — precisa
      // distinguir "não mexeu no campo" de "mandou limpar" quando o médico
      // resolve o ajuste (o payload manda a chave presente com undefined).
      if ('observacaoAjuste' in patch) dbPatch.observacao_ajuste = patch.observacaoAjuste || null;
      if (Object.keys(dbPatch).length) persistUpdate('pareceres', parecerId, dbPatch);
    },
    [mutate],
  );

  const removerParecer = useCallback<FluxoV2ContextValue['removerParecer']>(
    (id, parecerId) => {
      mutate(id, (s) => {
        s.pareceres = s.pareceres.filter((p) => p.id !== parecerId);
        return s;
      });
      persistDelete('pareceres', parecerId);
    },
    [mutate],
  );

  const setCarimbo = useCallback<FluxoV2ContextValue['setCarimbo']>((id, c, observacao, outrosInfo) => {
    mutate(id, (s) => {
      s.carimboRegulacao = c;
      s.carimboObservacao = observacao?.trim() ? observacao.trim() : undefined;
      s.carimboOutrosInfo = c === 'AGENDAMENTO' ? outrosInfo : undefined;
      return s;
    });
    void currentUserId().then((userId) => {
      void persistInsert(
        'rotas_regulacao',
        buildRotaRegulacao(id, c, userId, observacao, c === 'AGENDAMENTO' ? outrosInfo : undefined),
      );
    });
  }, [mutate]);

  const addTentativa = useCallback<FluxoV2ContextValue['addTentativa']>((id, t) => {
    const tempId = uid('t');
    mutate(id, (s) => {
      const tentativa: TentativaUnidadeMock = {
        id: tempId,
        unidade: t.unidade,
        unidadeId: t.unidadeId,
        data: t.data || nowIso(),
        desfecho: t.desfecho,
        observacao: t.observacao,
        hora: t.hora,
        tipoProcedimento: t.tipoProcedimento,
        contatoUnidade: t.contatoUnidade,
        observacoesChegada: t.observacoesChegada,
      };
      // T2.AM — uma solicitação pode ter várias tentativas confirmadas
      // simultâneas (um agendamento por procedimento/unidade); não há mais
      // rebaixamento automático de agendamentos anteriores.
      const tentativas: TentativaUnidadeMock[] = s.agendamento?.tentativas ?? [];
      if (!s.agendamento) {
        s.agendamento = {
          id: uid('ag'),
          origem: s.carimboRegulacao === 'CNRAC' ? 'excecao_cnrac' : s.carimboRegulacao === 'CET' ? 'excecao_cet' : 'criacao',
          tentativas: [...tentativas, tentativa],
        };
      } else {
        s.agendamento = { ...s.agendamento, tentativas: [...tentativas, tentativa] };
      }
      return s;
    });
    void currentUserId().then(async (userId) => {
      const realId = await persistInsert(
        'tentativas_agendamento',
        buildTentativa(id, { ...t, data: t.data || nowIso() }, t.unidadeId ?? null, userId),
      );
      if (!realId) return;
      mutate(id, (s) => {
        if (!s.agendamento) return s;
        s.agendamento.tentativas = s.agendamento.tentativas.map((tt) =>
          tt.id === tempId ? { ...tt, id: realId } : tt,
        );
        return s;
      });
    });
  }, [mutate]);

  const editarTentativa = useCallback<FluxoV2ContextValue['editarTentativa']>(
    (id, tentativaId, patch) => {
      mutate(id, (s) => {
        if (!s.agendamento) return s;
        s.agendamento.tentativas = s.agendamento.tentativas.map((t) =>
          t.id === tentativaId ? { ...t, ...patch } : t,
        );
        return s;
      });
      const dbPatch: Record<string, unknown> = {};
      if (patch.unidade !== undefined) dbPatch.unidade_nome = patch.unidade;
      if (patch.unidadeId !== undefined) dbPatch.unidade_id = patch.unidadeId;
      if (patch.data !== undefined) dbPatch.data_contato = patch.data;
      if (patch.desfecho !== undefined) {
        const m: Record<string, string> = {
          negou: 'NEGOU', aceitou: 'ACEITOU', pediu_documento: 'PEDIU_DOCUMENTACAO',
          sem_resposta: 'AGUARDANDO', pendente: 'AGUARDANDO', agendamento_confirmado: 'AGENDAMENTO_CONFIRMADO',
        };
        dbPatch.resultado = m[patch.desfecho] ?? 'AGUARDANDO';
      }
      if (patch.observacao !== undefined) dbPatch.observacao = patch.observacao;
      if (patch.dataAgendamento !== undefined) dbPatch.data_agendamento = patch.dataAgendamento;
      if (patch.hora !== undefined) dbPatch.hora_agendamento = patch.hora;
      if (patch.tipoProcedimento !== undefined) dbPatch.tipo_procedimento = patch.tipoProcedimento;
      if (patch.contatoUnidade !== undefined) dbPatch.contato_unidade = patch.contatoUnidade;
      if (patch.observacoesChegada !== undefined) dbPatch.observacoes_chegada = patch.observacoesChegada;
      if (Object.keys(dbPatch).length) persistUpdate('tentativas_agendamento', tentativaId, dbPatch);
    },
    [mutate],
  );

  /**
   * Cadastro unificado de agendamento pela Regulação — mesmo formulário da
   * criação (unidade de destino + N procedimentos). Cada procedimento vira
   * uma tentativa `agendamento_confirmado` própria, todas na mesma unidade,
   * coexistindo com agendamentos já confirmados anteriormente.
   */
  const addAgendamentos = useCallback<FluxoV2ContextValue['addAgendamentos']>((id, input) => {
    if (input.procedimentos.length === 0) return;
    const novas: TentativaUnidadeMock[] = input.procedimentos.map((p) => ({
      id: uid('t'),
      unidade: input.unidade,
      unidadeId: input.unidadeId || undefined,
      data: p.data,
      dataAgendamento: p.data,
      desfecho: 'agendamento_confirmado',
      tipoProcedimento: p.tipoProcedimento,
    }));
    mutate(id, (s) => {
      const tentativasAtuais = s.agendamento?.tentativas ?? [];
      if (!s.agendamento) {
        s.agendamento = {
          id: uid('ag'),
          origem: s.carimboRegulacao === 'CNRAC' ? 'excecao_cnrac' : s.carimboRegulacao === 'CET' ? 'excecao_cet' : 'criacao',
          tentativas: [...tentativasAtuais, ...novas],
        };
      } else {
        s.agendamento = { ...s.agendamento, tentativas: [...tentativasAtuais, ...novas] };
      }
      return s;
    });
    void currentUserId().then(async (userId) => {
      for (const t of novas) {
        const realId = await persistInsert(
          'tentativas_agendamento',
          buildTentativa(id, t, input.unidadeId || null, userId),
        );
        if (!realId) continue;
        mutate(id, (s) => {
          if (!s.agendamento) return s;
          s.agendamento.tentativas = s.agendamento.tentativas.map((tt) =>
            tt.id === t.id ? { ...tt, id: realId } : tt,
          );
          return s;
        });
      }
    });
  }, [mutate]);

  const removerTentativa = useCallback<FluxoV2ContextValue['removerTentativa']>(
    (id, tentativaId) => {
      mutate(id, (s) => {
        if (!s.agendamento) return s;
        s.agendamento.tentativas = s.agendamento.tentativas.filter((t) => t.id !== tentativaId);
        return s;
      });
      persistDelete('tentativas_agendamento', tentativaId);
    },
    [mutate],
  );

  // @deprecated — wrapper que cria/edita uma tentativa confirmada.
  const setAgendamento = useCallback<FluxoV2ContextValue['setAgendamento']>((id, a) => {
    mutate(id, (s) => {
      const obs = a.observacoesChegada?.trim() ? a.observacoesChegada.trim() : undefined;
      const contato = a.contatoUnidade?.trim() ? a.contatoUnidade.trim() : undefined;
      const tentativas: TentativaUnidadeMock[] = (s.agendamento?.tentativas ?? []).map((t) =>
        t.desfecho === 'agendamento_confirmado'
          ? {
              ...t,
              unidade: a.unidade,
              dataAgendamento: a.data,
              hora: a.hora,
              tipoProcedimento: a.tipoProcedimento,
              contatoUnidade: contato,
              observacoesChegada: obs,
            }
          : t,
      );
      // Se ainda não havia uma confirmada, cria uma nova. Nesse caso usamos a
      // mesma data para "data" (sem outra referência) e "dataAgendamento".
      if (!tentativas.some((t) => t.desfecho === 'agendamento_confirmado')) {
        tentativas.push({
          id: uid('t'),
          unidade: a.unidade,
          data: a.data,
          dataAgendamento: a.data,
          desfecho: 'agendamento_confirmado',
          hora: a.hora,
          tipoProcedimento: a.tipoProcedimento,
          contatoUnidade: contato,
          observacoesChegada: obs,
        });
      }
      s.agendamento = {
        id: s.agendamento?.id ?? uid('ag'),
        origem: a.origem,
        tentativas,
        segundoDeferimento: s.agendamento?.segundoDeferimento,
      };
      return s;
    });
  }, [mutate]);

  const registrarSegundoDeferimento = useCallback<FluxoV2ContextValue['registrarSegundoDeferimento']>((id, medico) => {
    mutate(id, (s) => {
      if (!s.agendamento) return s;
      s.agendamento.segundoDeferimento = { data: nowIso(), medico };
      // T2.AB: sem transição automática.
      return s;
    });
  }, [mutate]);

  const addViagem = useCallback<FluxoV2ContextValue['addViagem']>((id, v) => {
    const tempId = uid('v');
    mutate(id, (s) => {
      s.viagens = [...s.viagens, { ...v, id: tempId, dataCriacao: v.dataCriacao ?? nowIso() }];
      return s;
    });
    void persistInsert('viagens', buildViagem(id, v)).then((realId) => {
      if (!realId) return;
      mutate(id, (s) => {
        s.viagens = s.viagens.map((vv) => (vv.id === tempId ? { ...vv, id: realId } : vv));
        return s;
      });
    });
  }, [mutate]);

  const addViagensIdaEVolta = useCallback<FluxoV2ContextValue['addViagensIdaEVolta']>((id, input) => {
    const tempIdIda = uid('v');
    const tempIdVolta = uid('v');
    mutate(id, (s) => {
      // Valor 50/50, arredondado a 2 casas. Resíduo de centavo (caso o total
      // seja ímpar em centavos) fica na ida — irrelevante pra demo, mas a
      // soma das duas continua igual ao total informado.
      const metade = Math.round((input.valorTotal / 2) * 100) / 100;
      const restoIda = Math.round((input.valorTotal - metade) * 100) / 100;
      const camposDistancia = {
        distanciaValor: input.distanciaValor,
        distanciaUnidade: input.distanciaUnidade,
        valorAjudaCustoPaciente: input.valorAjudaCustoPaciente,
        valorAjudaCustoAcompanhante: input.valorAjudaCustoAcompanhante,
        viagemVinculadaId: input.viagemVinculadaId,
      };
      const ida: ViagemMock = {
        id: tempIdIda,
        origem: input.origem,
        destino: input.destino,
        origemCidade: input.origemCidade,
        origemUf: input.origemUf,
        destinoCidade: input.destinoCidade,
        destinoUf: input.destinoUf,
        origemAeroporto: input.origemAeroporto,
        destinoAeroporto: input.destinoAeroporto,
        data: input.dataIda,
        modal: input.modal,
        tipo: 'ida',
        status: input.status,
        valor: restoIda,
        beneficiarioTipo: input.beneficiarioTipo,
        beneficiarioId: input.beneficiarioId,
        ...camposDistancia,
      };
      const volta: ViagemMock = {
        id: tempIdVolta,
        origem: input.destino,
        destino: input.origem,
        origemCidade: input.destinoCidade,
        origemUf: input.destinoUf,
        destinoCidade: input.origemCidade,
        destinoUf: input.origemUf,
        origemAeroporto: input.destinoAeroporto,
        destinoAeroporto: input.origemAeroporto,
        data: input.dataVolta,
        modal: input.modal,
        tipo: 'volta',
        status: input.status,
        valor: metade,
        beneficiarioTipo: input.beneficiarioTipo,
        beneficiarioId: input.beneficiarioId,
        ...camposDistancia,
      };
      s.viagens = [...s.viagens, ida, volta];
      return s;
    });
    void (async () => {
      const camposDistancia = {
        distanciaValor: input.distanciaValor,
        distanciaUnidade: input.distanciaUnidade,
        valorAjudaCustoPaciente: input.valorAjudaCustoPaciente,
        valorAjudaCustoAcompanhante: input.valorAjudaCustoAcompanhante,
        viagemVinculadaId: input.viagemVinculadaId,
      };
      const idaPayload = buildViagem(id, {
        origem: input.origem, destino: input.destino,
        origemCidade: input.origemCidade, origemUf: input.origemUf,
        destinoCidade: input.destinoCidade, destinoUf: input.destinoUf,
        data: input.dataIda,
        modal: input.modal, tipo: 'ida', status: input.status,
        valor: Math.round((input.valorTotal / 2) * 100) / 100,
        beneficiarioTipo: input.beneficiarioTipo, beneficiarioId: input.beneficiarioId,
        ...camposDistancia,
      });
      const voltaPayload = buildViagem(id, {
        origem: input.destino, destino: input.origem,
        origemCidade: input.destinoCidade, origemUf: input.destinoUf,
        destinoCidade: input.origemCidade, destinoUf: input.origemUf,
        data: input.dataVolta,
        modal: input.modal, tipo: 'volta', status: input.status,
        valor: Math.round((input.valorTotal / 2) * 100) / 100,
        beneficiarioTipo: input.beneficiarioTipo, beneficiarioId: input.beneficiarioId,
        ...camposDistancia,
      });
      const [idaReal, voltaReal] = await Promise.all([
        persistInsert('viagens', idaPayload),
        persistInsert('viagens', voltaPayload),
      ]);
      if (!idaReal && !voltaReal) return;
      mutate(id, (s) => {
        s.viagens = s.viagens.map((vv) => {
          if (vv.id === tempIdIda && idaReal) return { ...vv, id: idaReal };
          if (vv.id === tempIdVolta && voltaReal) return { ...vv, id: voltaReal };
          return vv;
        });
        return s;
      });
    })();
  }, [mutate]);

  const updateViagem = useCallback<FluxoV2ContextValue['updateViagem']>((id, viagemId, patch) => {
    mutate(id, (s) => {
      s.viagens = s.viagens.map((v) => (v.id === viagemId ? { ...v, ...patch } : v));
      return s;
    });
    const dbPatch: Record<string, unknown> = {};
    if (patch.status !== undefined) {
      const m: Record<string, string> = {
        agendada: 'EMITIDA', confirmada: 'UTILIZADA', remarcada: 'REMARCADA',
        nao_compareceu: 'NO_SHOW', cancelada: 'CANCELADA', reembolso: 'CANCELADA',
      };
      dbPatch.situacao = m[patch.status] ?? 'EMITIDA';
      dbPatch.embarcou = patch.status === 'confirmada';
      // Protótipo: o CHECK de situacao não tem REEMBOLSO; grava CANCELADA +
      // marcador e a leitura devolve 'reembolso'. No sistema real o status
      // REEMBOLSO entra no banco.
      if (patch.status === 'reembolso') dbPatch.motivo_cancelamento_texto = MARCADOR_REEMBOLSO;
      else limparMarcadorReembolso(viagemId, MARCADOR_REEMBOLSO);
    }
    if (patch.data !== undefined) dbPatch.data_embarque_prevista = patch.data;
    if (patch.valor !== undefined) dbPatch.valor = patch.valor;
    if (patch.bilheteUrl !== undefined) dbPatch.numero_bilhete = patch.bilheteUrl;
    if (patch.companhia !== undefined) dbPatch.companhia = patch.companhia;
    // Coluna nova (migration 00080, ainda não aplicada) — só entra no
    // patch quando o transfer tem vínculo definido.
    if (patch.viagemVinculadaId !== undefined) dbPatch.viagem_vinculada_id = patch.viagemVinculadaId;
    if (Object.keys(dbPatch).length) persistUpdate('viagens', viagemId, dbPatch);
  }, [mutate]);

  const editarViagem = updateViagem;

  const removerViagem = useCallback<FluxoV2ContextValue['removerViagem']>(
    (id, viagemId) => {
      mutate(id, (s) => {
        s.viagens = s.viagens.filter((v) => v.id !== viagemId);
        return s;
      });
      persistDelete('viagens', viagemId);
    },
    [mutate],
  );

  const cancelarViagem = useCallback<FluxoV2ContextValue['cancelarViagem']>(
    (id, viagemId, motivo) => {
      const hoje = new Date().toISOString().slice(0, 10);
      mutate(id, (s) => {
        s.viagens = s.viagens.map((v) =>
          v.id === viagemId
            ? { ...v, ativa: false, dataCancelamento: hoje, motivoCancelamentoTexto: motivo }
            : v,
        );
        return s;
      });
      persistUpdate('viagens', viagemId, {
        ativa: false,
        data_cancelamento: hoje,
        motivo_cancelamento_texto: motivo ?? null,
      });
    },
    [mutate],
  );

  const reembolsarViagem = useCallback<FluxoV2ContextValue['reembolsarViagem']>(
    (id, viagemId, valor, data) => {
      mutate(id, (s) => {
        s.viagens = s.viagens.map((v) =>
          v.id === viagemId ? { ...v, valorReembolso: valor, dataReembolso: data } : v,
        );
        return s;
      });
      persistUpdate('viagens', viagemId, {
        valor_reembolso: valor,
        data_reembolso: data,
      });
    },
    [mutate],
  );

  const addAjudaCusto = useCallback<FluxoV2ContextValue['addAjudaCusto']>((id, a) => {
    const tempId = uid('ac');
    mutate(id, (s) => {
      s.ajudasCusto = [...s.ajudasCusto, { ...a, id: tempId }];
      return s;
    });
    void persistInsert('ajudas_custo', buildAjudaCusto(id, a)).then((realId) => {
      if (!realId) return;
      mutate(id, (s) => {
        s.ajudasCusto = s.ajudasCusto.map((aa) => (aa.id === tempId ? { ...aa, id: realId } : aa));
        return s;
      });
    });
  }, [mutate]);

  const updateAjudaCusto = useCallback<FluxoV2ContextValue['updateAjudaCusto']>((id, ajudaId, patch) => {
    mutate(id, (s) => {
      s.ajudasCusto = s.ajudasCusto.map((a) => (a.id === ajudaId ? { ...a, ...patch } : a));
      return s;
    });
    const dbPatch: Record<string, unknown> = {};
    if (patch.dataInicio !== undefined) dbPatch.data_inicio = patch.dataInicio;
    if (patch.dataFim !== undefined) dbPatch.data_fim = patch.dataFim;
    // Alinhado ao mesmo mapa usado no insert (buildAjudaCusto) — o mapa
    // antigo aqui usava os 5 status legados (pre-migration 00061) e nunca
    // batia com o StatusAjuda atual de 3 valores, gravando sempre EM_ANALISE.
    if (patch.status !== undefined) dbPatch.status = STATUS_AJUDA_TO_DB[patch.status] ?? 'EMITIDO';
    if (patch.observacao !== undefined) dbPatch.observacoes = patch.observacao;
    if (patch.beneficiarioTipo !== undefined) {
      dbPatch.tipo = patch.beneficiarioTipo === 'acompanhante' ? 'ACOMPANHANTE' : 'PACIENTE';
    }
    if (patch.numeroSEI !== undefined) dbPatch.numero_sei = patch.numeroSEI?.trim() || null;
    if (patch.linkProcesso !== undefined) dbPatch.link_processo = patch.linkProcesso?.trim() || null;
    // Discovery Ajuda de Custo (migration 00076).
    if (patch.tipoCalculo !== undefined) {
      const m: Record<string, string> = { padrao: 'PADRAO', integral: 'INTEGRAL', aditiva: 'ADITIVA', subtrativa: 'SUBTRATIVA' };
      dbPatch.tipo_calculo = m[patch.tipoCalculo] ?? 'PADRAO';
    }
    if (patch.ajudaReferenciaId !== undefined) dbPatch.ajuda_referencia_id = patch.ajudaReferenciaId || null;
    if (patch.valorDiariaFinal !== undefined) dbPatch.valor_diaria_final = patch.valorDiariaFinal ?? null;
    if (Object.keys(dbPatch).length) persistUpdate('ajudas_custo', ajudaId, dbPatch);
  }, [mutate]);

  const editarAjudaCusto = updateAjudaCusto;

  const removerAjudaCusto = useCallback<FluxoV2ContextValue['removerAjudaCusto']>(
    (id, ajudaId) => {
      mutate(id, (s) => {
        s.ajudasCusto = s.ajudasCusto.filter((a) => a.id !== ajudaId);
        return s;
      });
      persistDelete('ajudas_custo', ajudaId);
    },
    [mutate],
  );

  const cancelarAjudaCusto = useCallback<FluxoV2ContextValue['cancelarAjudaCusto']>(
    (id, ajudaId, motivo) => {
      const hoje = new Date().toISOString().slice(0, 10);
      mutate(id, (s) => {
        s.ajudasCusto = s.ajudasCusto.map((a) =>
          a.id === ajudaId
            ? { ...a, ativa: false, dataCancelamento: hoje, motivoCancelamentoTexto: motivo }
            : a,
        );
        return s;
      });
      persistUpdate('ajudas_custo', ajudaId, {
        ativa: false,
        data_cancelamento: hoje,
        motivo_cancelamento_texto: motivo ?? null,
      });
    },
    [mutate],
  );

  const reembolsarAjudaCusto = useCallback<FluxoV2ContextValue['reembolsarAjudaCusto']>(
    (id, ajudaId, valor, data) => {
      mutate(id, (s) => {
        s.ajudasCusto = s.ajudasCusto.map((a) =>
          a.id === ajudaId ? { ...a, valorReembolso: valor, dataReembolso: data } : a,
        );
        return s;
      });
      persistUpdate('ajudas_custo', ajudaId, {
        valor_reembolso: valor,
        data_reembolso: data,
      });
    },
    [mutate],
  );

  const addAdicional = useCallback<FluxoV2ContextValue['addAdicional']>((id, a) => {
    const tempId = uid('ad');
    mutate(id, (s) => {
      s.adicionais = [...s.adicionais, { ...a, id: tempId }];
      return s;
    });
    void persistInsert('adicionais', buildAdicional(id, a)).then((realId) => {
      if (!realId) return;
      mutate(id, (s) => {
        s.adicionais = s.adicionais.map((aa) => (aa.id === tempId ? { ...aa, id: realId } : aa));
        return s;
      });
    });
  }, [mutate]);

  const editarAdicional = useCallback<FluxoV2ContextValue['editarAdicional']>(
    (id, adicionalId, patch) => {
      mutate(id, (s) => {
        s.adicionais = s.adicionais.map((a) => (a.id === adicionalId ? { ...a, ...patch } : a));
        return s;
      });
      const dbPatch: Record<string, unknown> = {};
      if (patch.categoria !== undefined) {
        const m: Record<string, string> = {
          passagem_extra: 'PASSAGEM_EXTRA', ajuda_extra: 'AJUDA_EXTRA',
          bagagem: 'BAGAGEM', transfer: 'TRANSFER', outro: 'OUTRO',
        };
        dbPatch.categoria = m[patch.categoria] ?? 'OUTRO';
      }
      if (patch.descricao !== undefined) dbPatch.descricao = patch.descricao;
      if (patch.data !== undefined) dbPatch.data_ocorrencia = patch.data;
      if (patch.valor !== undefined) dbPatch.valor = patch.valor;
      if (patch.status !== undefined) {
        const m: Record<string, string> = {
          pendente_aprovacao: 'PENDENTE_APROVACAO', aprovado: 'APROVADO',
          indeferido: 'INDEFERIDO', pago: 'PAGO',
        };
        dbPatch.status = m[patch.status] ?? 'PENDENTE_APROVACAO';
      }
      if (patch.beneficiarioTipo !== undefined) {
        dbPatch.beneficiario_tipo = patch.beneficiarioTipo === 'acompanhante' ? 'ACOMPANHANTE' : 'PACIENTE';
        dbPatch.beneficiario_id = patch.beneficiarioTipo === 'acompanhante' ? (patch.beneficiarioId ?? null) : null;
      } else if (patch.beneficiarioId !== undefined) {
        dbPatch.beneficiario_id = patch.beneficiarioId ?? null;
      }
      if (patch.viagemId !== undefined) {
        dbPatch.viagem_id = patch.viagemId ?? null;
      }
      if (Object.keys(dbPatch).length) persistUpdate('adicionais', adicionalId, dbPatch);
    },
    [mutate],
  );

  const removerAdicional = useCallback<FluxoV2ContextValue['removerAdicional']>(
    (id, adicionalId) => {
      mutate(id, (s) => {
        s.adicionais = s.adicionais.filter((a) => a.id !== adicionalId);
        return s;
      });
      persistDelete('adicionais', adicionalId);
    },
    [mutate],
  );

  const addDespesaFuneraria = useCallback<FluxoV2ContextValue['addDespesaFuneraria']>((id, d) => {
    const tempId = uid('df');
    mutate(id, (s) => {
      s.despesasFunerarias = [...s.despesasFunerarias, { ...d, id: tempId }];
      return s;
    });
    void persistInsert('despesas_funerarias', buildDespesaFuneraria(id, d)).then((realId) => {
      if (!realId) return;
      mutate(id, (s) => {
        s.despesasFunerarias = s.despesasFunerarias.map((dd) =>
          dd.id === tempId ? { ...dd, id: realId } : dd,
        );
        return s;
      });
    });
  }, [mutate]);

  const removerDespesaFuneraria = useCallback<FluxoV2ContextValue['removerDespesaFuneraria']>(
    (id, despId) => {
      mutate(id, (s) => {
        s.despesasFunerarias = s.despesasFunerarias.filter((d) => d.id !== despId);
        return s;
      });
      persistDelete('despesas_funerarias', despId);
    },
    [mutate],
  );

  const encerrar = useCallback<FluxoV2ContextValue['encerrar']>((id, e) => {
    mutate(id, (s) => {
      s.encerramento = e;
      s.status = 'em_encerramento';
      return s;
    });
    void currentUserId().then((userId) => {
      void persistInsert('encerramentos', buildEncerramento(id, e, userId));
    });
    persistUpdate('solicitacoes', id, {
      setor_atual: 'encerramento',
      status: 'CONCLUIDO',
      data_encerramento: e.data,
      motivo_encerramento: e.motivo,
    });
  }, [mutate]);

  const reabrirParaParecer = useCallback<FluxoV2ContextValue['reabrirParaParecer']>((id) => {
    mutate(id, (s) => {
      s.status = 'em_regulacao';
      return s;
    });
  }, [mutate]);

  const reabrirSolicitacao = useCallback<FluxoV2ContextValue['reabrirSolicitacao']>(
    (id, setor) => {
      const statusByDestino: Record<typeof setor, SolicitacaoMock['status']> = {
        dados_basicos: 'em_dados_basicos',
        regulacao: 'em_regulacao',
        passagens: 'em_passagens',
        ajuda_custo: 'em_ajuda_custo',
        acompanhamento: 'em_acompanhamento',
      };
      mutate(id, (s) => {
        s.status = statusByDestino[setor];
        s.encerramento = undefined;
        return s;
      });
      persistUpdate('solicitacoes', id, {
        setor_atual: setor,
        status: 'EM_ANALISE',
        data_encerramento: null,
        motivo_encerramento: null,
      });
    },
    [mutate],
  );

  const addObservacao = useCallback<FluxoV2ContextValue['addObservacao']>((id, texto) => {
    const tempId = `obs-${Date.now()}`;
    mutate(id, (s) => {
      const nova: ObservacaoChat = {
        id: tempId,
        autor: 'Você',
        perfilAutor: 'Coordenação Estadual',
        texto: texto.trim(),
        data: nowIso(),
      };
      s.observacoes = [...(s.observacoes ?? []), nova];
      return s;
    });
    void currentUserId().then(async (userId) => {
      if (!userId) return;
      const realId = await persistInsert(
        'observacoes_processo',
        buildObservacao(id, texto.trim(), userId, 'COORDENACAO_ESTADUAL'),
      );
      if (!realId) return;
      mutate(id, (s) => {
        s.observacoes = (s.observacoes ?? []).map((o) =>
          o.id === tempId ? { ...o, id: realId } : o,
        );
        return s;
      });
    });
  }, [mutate]);

  /**
   * T2.AB — Tramitação genérica entre setores (PBI 13237 — 5 setores ativos:
   * Dados Básicos → Regulação → Passagens → Ajuda de Custo → Acompanhamento,
   * com devolução ao setor anterior). Substitui `encaminharParaFinanceiro`
   * e `devolverParaRegulacao`. Atualiza o status para `em_${destino}`, registra
   * a `ultimaTramitacao` e — quando é uma devolução — adiciona um item em
   * `devolucoes[]` para alimentar o banner âmbar nas abas.
   *
   * Quando o setor de origem reencaminha pra frente, marca a última
   * devolução pendente como resolvida — fechando o ciclo.
   */
  const enviarParaSetor = useCallback<FluxoV2ContextValue['enviarParaSetor']>(
    (id, destino, observacao, tipo = 'enviar', responsaveis) => {
      // Setor de onde a solicitação está saindo, capturado ANTES da mutação —
      // é o que a fila de Aprovações exibe como "setor de origem" quando o
      // destino é 'aprovacao'.
      const solicitacaoAtual = getById(id);
      const setorOrigem = solicitacaoAtual ? statusGlobalToSetor(solicitacaoAtual.status) : undefined;

      mutate(id, (s) => {
        const obs = observacao?.trim() || undefined;
        const { autor, perfilAutor } = PERSONA_POR_STATUS[s.status];

        // Quando o setor de origem reencaminha pra frente, fecha a última devolução.
        if (tipo === 'enviar' && s.devolucoes?.length) {
          s.devolucoes = s.devolucoes.map((d, idx, arr) =>
            idx === arr.length - 1 && !d.resolvida ? { ...d, resolvida: true } : d,
          );
        }

        // Devoluções: registra item na lista pra alimentar banner amber.
        if (tipo === 'devolver') {
          const dev: DevolucaoFinanceiroParaRegulacao = {
            id: uid('dev'),
            motivo: obs ?? '(sem motivo informado)',
            data: nowIso(),
            autor,
            perfilAutor,
            resolvida: false,
          };
          s.devolucoes = [...(s.devolucoes ?? []), dev];
        }

        s.ultimaTramitacao = {
          tipo: tipo === 'devolver' ? 'devolucao' : 'envio',
          destino,
          data: nowIso(),
          autor,
          perfilAutor,
          observacao: obs,
        };

        // Fila de Aprovações precisa do setor de origem e da observação (motivo
        // do pedido) mesmo depois de um reload — por isso ficam gravados na
        // própria solicitação, e não só em `ultimaTramitacao`. Ao sair da
        // Aprovação para qualquer outro setor, os dois são limpos.
        if (destino === 'aprovacao') {
          s.setorOrigemAprovacao = setorOrigem !== 'aprovacao' && setorOrigem !== 'encerramento'
            ? setorOrigem
            : undefined;
          s.observacaoAprovacao = obs;
        } else {
          s.setorOrigemAprovacao = undefined;
          s.observacaoAprovacao = undefined;
        }

        s.status = STATUS_POR_DESTINO[destino];

        if (responsaveis && responsaveis.length > 0) {
          s.responsaveisAtuais = responsaveis;
        }

        return s;
      });

      // Persiste a troca de setor no Supabase (best-effort)
      const supabase = createClient();
      const payload = buildEnvioSetor(
        destino,
        destino === 'aprovacao' && setorOrigem && setorOrigem !== 'aprovacao' && setorOrigem !== 'encerramento'
          ? { setorOrigem, observacao }
          : undefined,
      );
      supabase
        .from('solicitacoes')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[FluxoV2] enviarParaSetor persistência falhou:', error.message);
        });

      // Responsáveis vivem numa tabela de junção (N:N) — substitui o conjunto
      // atual pelo escolhido nesta tramitação. Best-effort, igual ao restante
      // da persistência: falha aqui não bloqueia a UI otimista.
      if (responsaveis && responsaveis.length > 0) {
        supabase
          .from('solicitacao_responsaveis')
          .delete()
          .eq('solicitacao_id', id)
          .then(({ error }) => {
            if (error) {
              console.warn('[FluxoV2] limpar solicitacao_responsaveis falhou:', error.message);
              return;
            }
            supabase
              .from('solicitacao_responsaveis')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .insert(responsaveis.map((r) => ({ solicitacao_id: id, usuario_id: r.id })) as any)
              .then(({ error: insertError }) => {
                if (insertError) {
                  console.warn('[FluxoV2] gravar solicitacao_responsaveis falhou:', insertError.message);
                }
              });
          });
      }
    },
    [mutate, getById],
  );

  const encaminharParaFinanceiro = useCallback<FluxoV2ContextValue['encaminharParaFinanceiro']>(
    (id, observacao) => enviarParaSetor(id, 'passagens', observacao, 'enviar'),
    [enviarParaSetor],
  );

  const devolverParaRegulacao = useCallback<FluxoV2ContextValue['devolverParaRegulacao']>(
    (id, motivo) => enviarParaSetor(id, 'regulacao', motivo, 'devolver'),
    [enviarParaSetor],
  );

  const marcarDevolucaoResolvida = useCallback<FluxoV2ContextValue['marcarDevolucaoResolvida']>((idSolicitacao, idDevolucao) => {
    mutate(idSolicitacao, (s) => {
      s.devolucoes = (s.devolucoes ?? []).map((d) =>
        d.id === idDevolucao ? { ...d, resolvida: true } : d,
      );
      return s;
    });
  }, [mutate]);

  const editarSolicitacao = useCallback<FluxoV2ContextValue['editarSolicitacao']>((id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    mutate(id, (s) => {
      if (patch.acompanhanteIds !== undefined) {
        const fonte = patch.acompanhantesSnapshot ?? acompanhantesPool;
        s.acompanhantes = fonte.filter((a) => patch.acompanhanteIds!.includes(a.id));
      }
      if (patch.dataLaudo !== undefined) {
        s.dataLaudo = patch.dataLaudo || undefined;
      }
      if (patch.anexos !== undefined) {
        // Preserva origem/data dos itens já existentes (por id) — só os
        // novos (sem id, recém adicionados no formulário de edição) ganham
        // origem 'edicao'. Sem isso, salvar a edição apagava a origem de
        // TODOS os anexos, inclusive os avulsos da aba Anexos.
        const existentesPorId = new Map(s.anexos.map((a) => [a.id, a]));
        s.anexos = patch.anexos.map((a) => {
          const existente = a.id ? existentesPorId.get(a.id) : undefined;
          return {
            id: a.id ?? uid('an'),
            nome: a.nome,
            tipo: a.tipo,
            tipoDocumento: a.tipoDocumento,
            origem: existente?.origem ?? 'edicao',
            data: existente?.data ?? nowIso(),
          };
        });
      }
      if (patch.processosSei !== undefined) {
        s.processosSei = patch.processosSei;
        const vigente = patch.processosSei[patch.processosSei.length - 1];
        s.numeroSEI = vigente?.numero;
        s.seiUrl = vigente?.url;
        // Coluna legada — sempre espelha o vigente, pra quem ainda lê direto
        // do banco sem passar pelos helpers de `_utils/processoSei.ts`.
        dbPatch.numero_protocolo = vigente?.numero ?? null;
        dbPatch.url_sei = vigente?.url ?? null;
        // `processos_sei` (migration 00081, ainda não aplicada) só entra no
        // patch quando o histórico tem mais de um processo — com só um, o
        // par legado acima já basta e o update não depende da migration.
        if (patch.processosSei.length > 1) {
          dbPatch.processos_sei = patch.processosSei.map((p) => ({
            id: p.id,
            numero: p.numero,
            url: p.url ?? null,
            data: p.data,
          }));
        }
      }
      return s;
    });
    if (patch.dataLaudo !== undefined) dbPatch.data_laudo = patch.dataLaudo || null;
    if (Object.keys(dbPatch).length) persistUpdate('solicitacoes', id, dbPatch);
  }, [mutate]);

  const trocarPaciente = useCallback<FluxoV2ContextValue['trocarPaciente']>(
    (solicitacaoId, novoPacienteId, novosAcompanhantesIds, novosAnexos, snapshots) => {
      mutate(solicitacaoId, (s) => {
        const novoPaciente =
          snapshots?.paciente ?? pacientesPool.find((p) => p.id === novoPacienteId);
        if (!novoPaciente) return s;
        // Reset deliberado: paciente novo => acompanhantes e anexos do paciente
        // anterior não fazem mais sentido, então o operador precisa reescolher.
        // Pareceres, status, agendamento, viagens, ajudas e adicionais são
        // preservados — quem decide o que fazer com isso é o fluxo posterior.
        s.paciente = novoPaciente;
        const fonteAcomp = snapshots?.acompanhantes ?? acompanhantesPool;
        s.acompanhantes = fonteAcomp.filter((a) =>
          novosAcompanhantesIds.includes(a.id),
        );
        s.anexos = novosAnexos.map((a) => ({
          id: uid('an'),
          nome: a.nome,
          tipo: a.tipo,
          tipoDocumento: a.tipoDocumento,
        }));
        return s;
      });
      persistUpdate('solicitacoes', solicitacaoId, { paciente_id: novoPacienteId });
    },
    [mutate],
  );

  const value = useMemo<FluxoV2ContextValue>(() => ({
    solicitacoes,
    isLoading,
    getById,
    createSolicitacao,
    updateSolicitacao,
    setStatus,
    addAnexos,
    addParecer,
    editarParecer,
    removerParecer,
    setCarimbo,
    addTentativa,
    editarTentativa,
    removerTentativa,
    addAgendamentos,
    setAgendamento,
    registrarSegundoDeferimento,
    addViagem,
    addViagensIdaEVolta,
    updateViagem,
    editarViagem,
    cancelarViagem,
    reembolsarViagem,
    removerViagem,
    addAjudaCusto,
    updateAjudaCusto,
    editarAjudaCusto,
    cancelarAjudaCusto,
    reembolsarAjudaCusto,
    removerAjudaCusto,
    addAdicional,
    editarAdicional,
    removerAdicional,
    addDespesaFuneraria,
    removerDespesaFuneraria,
    encerrar,
    reabrirParaParecer,
    reabrirSolicitacao,
    addObservacao,
    enviarParaSetor,
    encaminharParaFinanceiro,
    devolverParaRegulacao,
    marcarDevolucaoResolvida,
    editarSolicitacao,
    removerAnexo,
    trocarPaciente,
    criarCreditoSaldo: criarCreditoSaldoStore,
    aplicarDebitoSaldo: aplicarDebitoSaldoStore,
    saldoDoPaciente: saldoDoPacienteStore,
    extratoDoPaciente: extratoDoPacienteStore,
  }), [
    solicitacoes, isLoading, getById, createSolicitacao, updateSolicitacao, setStatus,
    addAnexos,
    addParecer, editarParecer, removerParecer,
    setCarimbo,
    addTentativa, editarTentativa, removerTentativa, addAgendamentos, setAgendamento, registrarSegundoDeferimento,
    addViagem, addViagensIdaEVolta, updateViagem, editarViagem, cancelarViagem, reembolsarViagem, removerViagem,
    addAjudaCusto, updateAjudaCusto, editarAjudaCusto, cancelarAjudaCusto, reembolsarAjudaCusto, removerAjudaCusto,
    addAdicional, editarAdicional, removerAdicional,
    addDespesaFuneraria, removerDespesaFuneraria,
    encerrar, reabrirParaParecer, reabrirSolicitacao,
    addObservacao,
    enviarParaSetor, encaminharParaFinanceiro, devolverParaRegulacao, marcarDevolucaoResolvida, editarSolicitacao,
    removerAnexo,
    trocarPaciente,
  ]);

  return <FluxoV2Context.Provider value={value}>{children}</FluxoV2Context.Provider>;
}

export function useFluxoV2State(): FluxoV2ContextValue {
  const ctx = useContext(FluxoV2Context);
  if (!ctx) throw new Error('useFluxoV2State must be used within FluxoV2Provider');
  return ctx;
}
