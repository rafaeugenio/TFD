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
  type EncerramentoMock,
  type ObservacaoChat,
  type DevolucaoFinanceiroParaRegulacao,
  type UltimaTramitacao,
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
  buildEncerramento,
  buildObservacao,
  buildNewSolicitacao,
} from '../_adapters/toSupabase';
import { statusGlobalToSetor } from '../_adapters/statusMapping';
import { persistInsert, persistUpdate, persistDelete, currentUserId } from './persist';

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
   * para o caso de já entrar como `desfecho: 'agendamento_confirmado'`. Quando
   * outra tentativa já estava confirmada, ela é rebaixada para `'aceitou'`.
   */
  addTentativa: (id: string, t: Omit<TentativaUnidadeMock, 'id'>) => void;
  /**
   * T2.AL/AM — Edita uma tentativa. Quando o patch promove a tentativa para
   * `desfecho: 'agendamento_confirmado'`, qualquer outra tentativa que estava
   * confirmada na mesma solicitação é rebaixada para `'aceitou'`.
   */
  editarTentativa: (id: string, tentativaId: string, patch: Partial<Omit<TentativaUnidadeMock, 'id'>>) => void;
  /** T2.AL — Remove uma tentativa. */
  removerTentativa: (id: string, tentativaId: string) => void;
  /**
   * @deprecated T2.AM — agendamento agora é uma tentativa com
   * `desfecho: 'agendamento_confirmado'`. Use `addTentativa`/`editarTentativa`.
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
      modal: ViagemMock['modal'];
      status: ViagemMock['status'];
      dataIda: string;
      dataVolta: string;
      valorTotal: number;
      /** T2.AF — Mesmo beneficiário aplica-se às duas passagens geradas. */
      beneficiarioTipo: 'paciente' | 'acompanhante';
      beneficiarioId?: string;
    },
  ) => void;
  updateViagem: (id: string, viagemId: string, patch: Partial<ViagemMock>) => void;

  /** T2.AL — Edita uma viagem. (Renomeação clara do já existente `updateViagem`.) */
  editarViagem: (id: string, viagemId: string, patch: Partial<ViagemMock>) => void;
  /** T2.AL — Remove uma viagem. */
  removerViagem: (id: string, viagemId: string) => void;

  addAjudaCusto: (id: string, a: Omit<AjudaCustoMock, 'id'>) => void;
  updateAjudaCusto: (id: string, ajudaId: string, patch: Partial<AjudaCustoMock>) => void;
  /** T2.AL — Alias semântico de `updateAjudaCusto`. */
  editarAjudaCusto: (id: string, ajudaId: string, patch: Partial<AjudaCustoMock>) => void;
  /** T2.AL — Remove uma ajuda de custo. */
  removerAjudaCusto: (id: string, ajudaId: string) => void;

  addAdicional: (id: string, a: Omit<AdicionalMock, 'id'>) => void;
  /** T2.AL — Edita um adicional. */
  editarAdicional: (id: string, adicionalId: string, patch: Partial<AdicionalMock>) => void;
  /** T2.AL — Remove um adicional. */
  removerAdicional: (id: string, adicionalId: string) => void;

  encerrar: (id: string, e: EncerramentoMock) => void;
  reabrirParaParecer: (id: string) => void;

  addObservacao: (id: string, texto: string) => void;

  // T2.AB — Tramitação genérica entre setores (3 setores + dados básicos)
  enviarParaSetor: (
    id: string,
    destino: 'regulacao' | 'financeiro' | 'dados_basicos',
    observacao?: string,
    tipo?: 'enviar' | 'devolver',
  ) => void;
  /** @deprecated use `enviarParaSetor(id, 'financeiro', obs, 'enviar')` */
  encaminharParaFinanceiro: (id: string, observacao?: string) => void;
  /** @deprecated use `enviarParaSetor(id, 'regulacao', motivo, 'devolver')` */
  devolverParaRegulacao: (id: string, motivo: string) => void;
  marcarDevolucaoResolvida: (idSolicitacao: string, idDevolucao: string) => void;

  // T2.R — Edição rápida de solicitação (acompanhantes, laudo, caráter, anexos)
  editarSolicitacao: (id: string, patch: EditarSolicitacaoPatch) => void;

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
}

export interface EditarSolicitacaoPatch {
  acompanhanteIds?: string[];
  dataLaudo?: string | undefined;
  anexos?: { id?: string; nome: string; tipo: string; tipoDocumento?: string }[];
  /** T2.AG — Número do processo SEI (formato XXXXX.XXXXXX/AAAA-DD). */
  numeroSEI?: string | undefined;
  /** T2.AG — URL completa do processo no SEI. */
  seiUrl?: string | undefined;
  /** Snapshot dos acompanhantes quando vêm do banco (não estão em acompanhantesPool). */
  acompanhantesSnapshot?: import('@/core/mocks/fluxo-v2-v3-seed').AcompanhanteMock[];
}

export interface NewSolicitacaoInput {
  pacienteId: string;
  acompanhanteIds: string[];
  agendamento?: { unidade: string; data: string; hora: string };
  dataLaudo?: string;
  anexos: { nome: string; tipo: string }[];
  numeroSEI?: string;
  seiUrl?: string;
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
        const { data, error } = await supabase
          .from('solicitacoes')
          .select(SOLICITACAO_V2_SELECT)
          .order('created_at', { ascending: false });
        if (cancelled) return;
        if (error || !data) {
          if (error) console.warn('[FluxoV2] erro ao carregar Supabase:', error.message);
          return;
        }
        const real = solicitacoesFromSupabase(data as unknown as Record<string, unknown>[]);
        setSolicitacoes(real);
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
      const payload = buildEnvioSetor(
        setor === 'encerrada' ? 'dados_basicos' : setor,
      );
      const supabase = createClient();
      const update = setor === 'encerrada'
        ? { setor_atual: 'encerrada', status: 'CONCLUIDO' }
        : payload;
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

    const proximoNumero = `2025/${String(130 + solicitacoes.length).padStart(6, '0')}`;

    // 1) Persiste no Supabase para receber o id real ANTES de inserir no estado.
    //    Filhos (parecer, viagem, etc.) precisam de FK válida.
    const novaSolicitacaoPayload = buildNewSolicitacao({
      pacienteId: paciente.id,
      numeroProcesso: proximoNumero,
      numeroSEI: input.numeroSEI?.trim() || undefined,
      seiUrl: input.seiUrl?.trim() || undefined,
      dataLaudo: input.dataLaudo,
    });
    const realId = await persistInsert('solicitacoes', novaSolicitacaoPayload);
    const id = realId ?? uid('s');

    // T2.AM — Quando criação informa um agendamento, ele entra como tentativa
    // confirmada (única) dentro do AgendamentoMock-container.
    const ag: AgendamentoMock | undefined = input.agendamento
      ? {
          id: uid('ag'),
          origem: 'criacao',
          tentativas: [
            {
              id: uid('t'),
              unidade: input.agendamento.unidade,
              data: input.agendamento.data,
              desfecho: 'agendamento_confirmado',
              hora: input.agendamento.hora,
            },
          ],
        }
      : undefined;

    const novo: SolicitacaoMock = {
      id,
      numero: proximoNumero,
      status: 'em_dados_basicos',
      dataCriacao: nowIso(),
      dataLaudo: input.dataLaudo,
      numeroSEI: input.numeroSEI?.trim() || undefined,
      seiUrl: input.seiUrl?.trim() || undefined,
      paciente,
      acompanhantes,
      anexos: input.anexos.map((a) => ({ id: uid('an'), ...a })),
      pareceres: [],
      agendamento: ag,
      viagens: [],
      ajudasCusto: [],
      adicionais: [],
      observacoes: [],
    };

    setSolicitacoes((prev) => [novo, ...prev]);
    return id;
  }, [solicitacoes.length]);

  const addParecer = useCallback<FluxoV2ContextValue['addParecer']>((id, p) => {
    const tempId = uid('pa');
    mutate(id, (s) => {
      const parecer: ParecerMock = { ...p, id: tempId, data: nowIso() };
      s.pareceres = [...s.pareceres, parecer];
      return s;
    });
    void persistInsert('pareceres', buildParecer(id, p, null)).then((realId) => {
      if (!realId) return;
      mutate(id, (s) => {
        s.pareceres = s.pareceres.map((pa) => (pa.id === tempId ? { ...pa, id: realId } : pa));
        return s;
      });
    });
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
      if (patch.cidSecundario !== undefined) dbPatch.cid_secundario = patch.cidSecundario || null;
      if (patch.versaoCID !== undefined) dbPatch.versao_cid = patch.versaoCID;
      if (patch.observacao !== undefined) dbPatch.justificativa = patch.observacao;
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
      s.carimboOutrosInfo = c === 'OUTROS' ? outrosInfo : undefined;
      return s;
    });
    void currentUserId().then((userId) => {
      void persistInsert(
        'rotas_regulacao',
        buildRotaRegulacao(id, c, userId, observacao, c === 'OUTROS' ? outrosInfo : undefined),
      );
    });
  }, [mutate]);

  const addTentativa = useCallback<FluxoV2ContextValue['addTentativa']>((id, t) => {
    const tempId = uid('t');
    mutate(id, (s) => {
      const tentativa: TentativaUnidadeMock = {
        id: tempId,
        unidade: t.unidade,
        data: t.data || nowIso(),
        desfecho: t.desfecho,
        observacao: t.observacao,
        hora: t.hora,
        tipoProcedimento: t.tipoProcedimento,
        contatoUnidade: t.contatoUnidade,
        observacoesChegada: t.observacoesChegada,
      };
      let tentativas: TentativaUnidadeMock[] = s.agendamento?.tentativas ?? [];
      // T2.AM — só pode haver 1 tentativa com desfecho 'agendamento_confirmado'.
      // Se a nova é confirmada, rebaixa a anterior pra 'aceitou'.
      if (tentativa.desfecho === 'agendamento_confirmado') {
        tentativas = tentativas.map((x) =>
          x.desfecho === 'agendamento_confirmado' ? { ...x, desfecho: 'aceitou' as const } : x,
        );
      }
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
        buildTentativa(id, { ...t, data: t.data || nowIso() }, null, userId),
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
        const promovendo = patch.desfecho === 'agendamento_confirmado';
        s.agendamento.tentativas = s.agendamento.tentativas.map((t) => {
          if (t.id === tentativaId) return { ...t, ...patch };
          if (promovendo && t.desfecho === 'agendamento_confirmado') {
            return { ...t, desfecho: 'aceitou' as const };
          }
          return t;
        });
        return s;
      });
      const dbPatch: Record<string, unknown> = {};
      if (patch.unidade !== undefined) dbPatch.unidade_nome = patch.unidade;
      if (patch.data !== undefined) dbPatch.data_contato = patch.data;
      if (patch.desfecho !== undefined) {
        const m: Record<string, string> = {
          negou: 'NEGOU', aceitou: 'ACEITOU', pediu_documento: 'PEDIU_DOCUMENTACAO',
          sem_resposta: 'AGUARDANDO', pendente: 'AGUARDANDO', agendamento_confirmado: 'AGENDAMENTO_CONFIRMADO',
        };
        dbPatch.resultado = m[patch.desfecho] ?? 'AGUARDANDO';
      }
      if (patch.observacao !== undefined) dbPatch.observacao = patch.observacao;
      if (patch.hora !== undefined) dbPatch.hora_agendamento = patch.hora;
      if (patch.contatoUnidade !== undefined) dbPatch.contato_unidade = patch.contatoUnidade;
      if (patch.observacoesChegada !== undefined) dbPatch.observacoes_chegada = patch.observacoesChegada;
      if (Object.keys(dbPatch).length) persistUpdate('tentativas_agendamento', tentativaId, dbPatch);
    },
    [mutate],
  );

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
              data: a.data,
              hora: a.hora,
              tipoProcedimento: a.tipoProcedimento,
              contatoUnidade: contato,
              observacoesChegada: obs,
            }
          : t,
      );
      // Se ainda não havia uma confirmada, cria uma nova.
      if (!tentativas.some((t) => t.desfecho === 'agendamento_confirmado')) {
        tentativas.push({
          id: uid('t'),
          unidade: a.unidade,
          data: a.data,
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
      s.viagens = [...s.viagens, { ...v, id: tempId }];
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
      const ida: ViagemMock = {
        id: tempIdIda,
        origem: input.origem,
        destino: input.destino,
        data: input.dataIda,
        modal: input.modal,
        tipo: 'ida',
        status: input.status,
        valor: restoIda,
        beneficiarioTipo: input.beneficiarioTipo,
        beneficiarioId: input.beneficiarioId,
      };
      const volta: ViagemMock = {
        id: tempIdVolta,
        origem: input.destino,
        destino: input.origem,
        data: input.dataVolta,
        modal: input.modal,
        tipo: 'volta',
        status: input.status,
        valor: metade,
        beneficiarioTipo: input.beneficiarioTipo,
        beneficiarioId: input.beneficiarioId,
      };
      s.viagens = [...s.viagens, ida, volta];
      return s;
    });
    void (async () => {
      const idaPayload = buildViagem(id, {
        origem: input.origem, destino: input.destino, data: input.dataIda,
        modal: input.modal, tipo: 'ida', status: input.status,
        valor: Math.round((input.valorTotal / 2) * 100) / 100,
        beneficiarioTipo: input.beneficiarioTipo, beneficiarioId: input.beneficiarioId,
      });
      const voltaPayload = buildViagem(id, {
        origem: input.destino, destino: input.origem, data: input.dataVolta,
        modal: input.modal, tipo: 'volta', status: input.status,
        valor: Math.round((input.valorTotal / 2) * 100) / 100,
        beneficiarioTipo: input.beneficiarioTipo, beneficiarioId: input.beneficiarioId,
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
    }
    if (patch.data !== undefined) dbPatch.data_embarque_prevista = patch.data;
    if (patch.valor !== undefined) dbPatch.valor = patch.valor;
    if (patch.bilheteUrl !== undefined) dbPatch.numero_bilhete = patch.bilheteUrl;
    if (patch.companhia !== undefined) dbPatch.companhia = patch.companhia;
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
    if (patch.status !== undefined) {
      const m: Record<string, string> = {
        em_analise: 'EM_ANALISE', aprovada: 'APROVADA', em_pagamento: 'EM_PAGAMENTO',
        concluida: 'CONCLUIDA', glosada: 'GLOSADA',
      };
      dbPatch.status = m[patch.status] ?? 'EM_ANALISE';
    }
    if (patch.observacao !== undefined) dbPatch.observacoes = patch.observacao;
    if (patch.beneficiarioTipo !== undefined) {
      dbPatch.tipo = patch.beneficiarioTipo === 'acompanhante' ? 'ACOMPANHANTE' : 'PACIENTE';
    }
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

  const encerrar = useCallback<FluxoV2ContextValue['encerrar']>((id, e) => {
    mutate(id, (s) => {
      s.encerramento = e;
      s.status = 'encerrada';
      return s;
    });
    void currentUserId().then((userId) => {
      void persistInsert('encerramentos', buildEncerramento(id, e, userId));
    });
    persistUpdate('solicitacoes', id, {
      setor_atual: 'encerrada',
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
   * T2.AB — Tramitação genérica entre setores. Substitui `encaminharParaFinanceiro`
   * e `devolverParaRegulacao`. Atualiza o status para `em_${destino}`, registra
   * a `ultimaTramitacao` com tipo derivado de `destino` + `tipo`, e — quando é
   * uma devolução para Regulação ou Dados Básicos — adiciona um item em
   * `devolucoes[]` para alimentar o banner âmbar nas abas.
   *
   * Quando a Regulação reencaminha pro Financeiro (envio_financeiro), marca
   * a última devolução como resolvida — fechando o ciclo.
   */
  const enviarParaSetor = useCallback<FluxoV2ContextValue['enviarParaSetor']>(
    (id, destino, observacao, tipo = 'enviar') => {
      mutate(id, (s) => {
        const obs = observacao?.trim() || undefined;
        // Autor mockado por contexto — Regulação devolve, Financeiro devolve, etc.
        const isFinDevolvendo = tipo === 'devolver' && destino === 'regulacao';
        const isFinDevolvendoDB = tipo === 'devolver' && destino === 'dados_basicos';
        const autor = isFinDevolvendo
          ? 'João Pereira'
          : isFinDevolvendoDB
            ? 'Ana Carolina Mendes'
            : destino === 'regulacao'
              ? 'Maria Silva'
              : destino === 'financeiro'
                ? 'Ana Carolina Mendes'
                : 'João Pereira';
        const perfilAutor = isFinDevolvendo
          ? 'Financeiro'
          : isFinDevolvendoDB
            ? 'Regulação'
            : destino === 'regulacao'
              ? 'Coordenação Estadual'
              : destino === 'financeiro'
                ? 'Regulação'
                : 'Financeiro';

        // Quando Regulação reencaminha pro Financeiro, fecha a última devolução.
        if (tipo === 'enviar' && destino === 'financeiro' && s.devolucoes?.length) {
          s.devolucoes = s.devolucoes.map((d, idx, arr) =>
            idx === arr.length - 1 && !d.resolvida ? { ...d, resolvida: true } : d,
          );
        }

        // Devoluções: registra item na lista pra alimentar banner amber.
        if (tipo === 'devolver' && (destino === 'regulacao' || destino === 'dados_basicos')) {
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

        const tipoTram: UltimaTramitacao['tipo'] =
          tipo === 'devolver'
            ? destino === 'dados_basicos'
              ? 'devolucao_dados_basicos'
              : 'devolucao_regulacao'
            : destino === 'financeiro'
              ? 'envio_financeiro'
              : 'envio_regulacao';

        s.ultimaTramitacao = {
          tipo: tipoTram,
          destino,
          data: nowIso(),
          autor,
          perfilAutor,
          observacao: obs,
        };

        s.status =
          destino === 'regulacao' ? 'em_regulacao' :
          destino === 'financeiro' ? 'em_financeiro' :
          'em_dados_basicos';

        return s;
      });

      // Persiste a troca de setor no Supabase (best-effort)
      const supabase = createClient();
      const payload = buildEnvioSetor(destino);
      supabase
        .from('solicitacoes')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(payload as any)
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.warn('[FluxoV2] enviarParaSetor persistência falhou:', error.message);
        });
    },
    [mutate],
  );

  const encaminharParaFinanceiro = useCallback<FluxoV2ContextValue['encaminharParaFinanceiro']>(
    (id, observacao) => enviarParaSetor(id, 'financeiro', observacao, 'enviar'),
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
    mutate(id, (s) => {
      if (patch.acompanhanteIds !== undefined) {
        const fonte = patch.acompanhantesSnapshot ?? acompanhantesPool;
        s.acompanhantes = fonte.filter((a) => patch.acompanhanteIds!.includes(a.id));
      }
      if (patch.dataLaudo !== undefined) {
        s.dataLaudo = patch.dataLaudo || undefined;
      }
      if (patch.anexos !== undefined) {
        s.anexos = patch.anexos.map((a) => ({
          id: a.id ?? uid('an'),
          nome: a.nome,
          tipo: a.tipo,
          tipoDocumento: a.tipoDocumento,
        }));
      }
      if (patch.numeroSEI !== undefined) {
        s.numeroSEI = patch.numeroSEI?.trim() || undefined;
      }
      if (patch.seiUrl !== undefined) {
        s.seiUrl = patch.seiUrl?.trim() || undefined;
      }
      return s;
    });
    const dbPatch: Record<string, unknown> = {};
    if (patch.dataLaudo !== undefined) dbPatch.data_laudo = patch.dataLaudo || null;
    if (patch.numeroSEI !== undefined) dbPatch.numero_protocolo = patch.numeroSEI?.trim() || null;
    if (patch.seiUrl !== undefined) dbPatch.url_sei = patch.seiUrl?.trim() || null;
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
    addParecer,
    editarParecer,
    removerParecer,
    setCarimbo,
    addTentativa,
    editarTentativa,
    removerTentativa,
    setAgendamento,
    registrarSegundoDeferimento,
    addViagem,
    addViagensIdaEVolta,
    updateViagem,
    editarViagem,
    removerViagem,
    addAjudaCusto,
    updateAjudaCusto,
    editarAjudaCusto,
    removerAjudaCusto,
    addAdicional,
    editarAdicional,
    removerAdicional,
    encerrar,
    reabrirParaParecer,
    addObservacao,
    enviarParaSetor,
    encaminharParaFinanceiro,
    devolverParaRegulacao,
    marcarDevolucaoResolvida,
    editarSolicitacao,
    trocarPaciente,
  }), [
    solicitacoes, isLoading, getById, createSolicitacao, updateSolicitacao, setStatus,
    addParecer, editarParecer, removerParecer,
    setCarimbo,
    addTentativa, editarTentativa, removerTentativa, setAgendamento, registrarSegundoDeferimento,
    addViagem, addViagensIdaEVolta, updateViagem, editarViagem, removerViagem,
    addAjudaCusto, updateAjudaCusto, editarAjudaCusto, removerAjudaCusto,
    addAdicional, editarAdicional, removerAdicional,
    encerrar, reabrirParaParecer,
    addObservacao,
    enviarParaSetor, encaminharParaFinanceiro, devolverParaRegulacao, marcarDevolucaoResolvida, editarSolicitacao,
    trocarPaciente,
  ]);

  return <FluxoV2Context.Provider value={value}>{children}</FluxoV2Context.Provider>;
}

export function useFluxoV2State(): FluxoV2ContextValue {
  const ctx = useContext(FluxoV2Context);
  if (!ctx) throw new Error('useFluxoV2State must be used within FluxoV2Provider');
  return ctx;
}
