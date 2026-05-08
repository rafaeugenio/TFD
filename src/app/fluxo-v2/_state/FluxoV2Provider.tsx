'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  cloneSolicitacao,
  seedFluxoV2,
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

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface FluxoV2ContextValue {
  solicitacoes: SolicitacaoMock[];
  getById: (id: string) => SolicitacaoMock | undefined;

  createSolicitacao: (input: NewSolicitacaoInput) => string; // returns id
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
    novosAnexos: { nome: string; tipo: string }[],
  ) => void;
}

export interface EditarSolicitacaoPatch {
  acompanhanteIds?: string[];
  dataLaudo?: string | undefined;
  anexos?: { id?: string; nome: string; tipo: string }[];
  /** T2.AG — Número do processo SEI (formato XXXXX.XXXXXX/AAAA-DD). */
  numeroSEI?: string | undefined;
  /** T2.AG — URL completa do processo no SEI. */
  seiUrl?: string | undefined;
}

export interface NewSolicitacaoInput {
  pacienteId: string;
  acompanhanteIds: string[];
  agendamento?: { unidade: string; data: string; hora: string };
  dataLaudo?: string;
  anexos: { nome: string; tipo: string }[];
}

const FluxoV2Context = createContext<FluxoV2ContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

import { pacientesPool, acompanhantesPool } from '@/core/mocks/fluxo-v2-v3-seed';

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

export function FluxoV2Provider({ children }: { children: ReactNode }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoMock[]>(() =>
    seedFluxoV2.map(cloneSolicitacao),
  );

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
    (id: string, status: StatusGlobalV2) => mutate(id, (s) => ({ ...s, status })),
    [mutate],
  );

  const createSolicitacao = useCallback((input: NewSolicitacaoInput): string => {
    const paciente = pacientesPool.find((p) => p.id === input.pacienteId);
    if (!paciente) throw new Error('Paciente não encontrado');
    const acompanhantes = acompanhantesPool.filter((a) => input.acompanhanteIds.includes(a.id));

    const id = uid('s');
    const proximoNumero = `2025/${String(130 + solicitacoes.length).padStart(6, '0')}`;

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
    mutate(id, (s) => {
      const parecer: ParecerMock = { ...p, id: uid('pa'), data: nowIso() };
      s.pareceres = [...s.pareceres, parecer];
      // T2.AB: nenhuma transição automática de status — só o botão de
      // tramitação na tabela move a solicitação entre setores.
      return s;
    });
  }, [mutate]);

  const editarParecer = useCallback<FluxoV2ContextValue['editarParecer']>(
    (id, parecerId, patch) => {
      mutate(id, (s) => {
        s.pareceres = s.pareceres.map((p) => (p.id === parecerId ? { ...p, ...patch } : p));
        return s;
      });
    },
    [mutate],
  );

  const removerParecer = useCallback<FluxoV2ContextValue['removerParecer']>(
    (id, parecerId) => {
      mutate(id, (s) => {
        s.pareceres = s.pareceres.filter((p) => p.id !== parecerId);
        return s;
      });
    },
    [mutate],
  );

  const setCarimbo = useCallback<FluxoV2ContextValue['setCarimbo']>((id, c, observacao, outrosInfo) => {
    mutate(id, (s) => {
      s.carimboRegulacao = c;
      s.carimboObservacao = observacao?.trim() ? observacao.trim() : undefined;
      // T2.AP — outrosInfo só faz sentido quando carimbo === 'OUTROS'.
      s.carimboOutrosInfo = c === 'OUTROS' ? outrosInfo : undefined;
      // T2.AB: sem transição automática — quem move é o botão de tramitação.
      return s;
    });
  }, [mutate]);

  const addTentativa = useCallback<FluxoV2ContextValue['addTentativa']>((id, t) => {
    mutate(id, (s) => {
      const tentativa: TentativaUnidadeMock = {
        id: uid('t'),
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
  }, [mutate]);

  const editarTentativa = useCallback<FluxoV2ContextValue['editarTentativa']>(
    (id, tentativaId, patch) => {
      mutate(id, (s) => {
        if (!s.agendamento) return s;
        const promovendo = patch.desfecho === 'agendamento_confirmado';
        s.agendamento.tentativas = s.agendamento.tentativas.map((t) => {
          if (t.id === tentativaId) return { ...t, ...patch };
          // Se estamos promovendo essa pra confirmada, rebaixa as outras.
          if (promovendo && t.desfecho === 'agendamento_confirmado') {
            return { ...t, desfecho: 'aceitou' as const };
          }
          return t;
        });
        return s;
      });
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
    mutate(id, (s) => {
      s.viagens = [...s.viagens, { ...v, id: uid('v') }];
      return s;
    });
  }, [mutate]);

  const addViagensIdaEVolta = useCallback<FluxoV2ContextValue['addViagensIdaEVolta']>((id, input) => {
    mutate(id, (s) => {
      // Valor 50/50, arredondado a 2 casas. Resíduo de centavo (caso o total
      // seja ímpar em centavos) fica na ida — irrelevante pra demo, mas a
      // soma das duas continua igual ao total informado.
      const metade = Math.round((input.valorTotal / 2) * 100) / 100;
      const restoIda = Math.round((input.valorTotal - metade) * 100) / 100;
      const ida: ViagemMock = {
        id: uid('v'),
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
        id: uid('v'),
        origem: input.destino, // invertido
        destino: input.origem, // invertido
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
  }, [mutate]);

  const updateViagem = useCallback<FluxoV2ContextValue['updateViagem']>((id, viagemId, patch) => {
    mutate(id, (s) => {
      s.viagens = s.viagens.map((v) => (v.id === viagemId ? { ...v, ...patch } : v));
      return s;
    });
  }, [mutate]);

  const editarViagem = updateViagem;

  const removerViagem = useCallback<FluxoV2ContextValue['removerViagem']>(
    (id, viagemId) => {
      mutate(id, (s) => {
        s.viagens = s.viagens.filter((v) => v.id !== viagemId);
        return s;
      });
    },
    [mutate],
  );

  const addAjudaCusto = useCallback<FluxoV2ContextValue['addAjudaCusto']>((id, a) => {
    mutate(id, (s) => {
      s.ajudasCusto = [...s.ajudasCusto, { ...a, id: uid('ac') }];
      return s;
    });
  }, [mutate]);

  const updateAjudaCusto = useCallback<FluxoV2ContextValue['updateAjudaCusto']>((id, ajudaId, patch) => {
    mutate(id, (s) => {
      s.ajudasCusto = s.ajudasCusto.map((a) => (a.id === ajudaId ? { ...a, ...patch } : a));
      return s;
    });
  }, [mutate]);

  const editarAjudaCusto = updateAjudaCusto;

  const removerAjudaCusto = useCallback<FluxoV2ContextValue['removerAjudaCusto']>(
    (id, ajudaId) => {
      mutate(id, (s) => {
        s.ajudasCusto = s.ajudasCusto.filter((a) => a.id !== ajudaId);
        return s;
      });
    },
    [mutate],
  );

  const addAdicional = useCallback<FluxoV2ContextValue['addAdicional']>((id, a) => {
    mutate(id, (s) => {
      s.adicionais = [...s.adicionais, { ...a, id: uid('ad') }];
      return s;
    });
  }, [mutate]);

  const editarAdicional = useCallback<FluxoV2ContextValue['editarAdicional']>(
    (id, adicionalId, patch) => {
      mutate(id, (s) => {
        s.adicionais = s.adicionais.map((a) => (a.id === adicionalId ? { ...a, ...patch } : a));
        return s;
      });
    },
    [mutate],
  );

  const removerAdicional = useCallback<FluxoV2ContextValue['removerAdicional']>(
    (id, adicionalId) => {
      mutate(id, (s) => {
        s.adicionais = s.adicionais.filter((a) => a.id !== adicionalId);
        return s;
      });
    },
    [mutate],
  );

  const encerrar = useCallback<FluxoV2ContextValue['encerrar']>((id, e) => {
    mutate(id, (s) => {
      s.encerramento = e;
      s.status = 'encerrada';
      return s;
    });
  }, [mutate]);

  const reabrirParaParecer = useCallback<FluxoV2ContextValue['reabrirParaParecer']>((id) => {
    mutate(id, (s) => {
      s.status = 'em_regulacao';
      return s;
    });
  }, [mutate]);

  const addObservacao = useCallback<FluxoV2ContextValue['addObservacao']>((id, texto) => {
    mutate(id, (s) => {
      // TODO: substituir autor mockado pelo usuário logado quando houver autenticação real.
      const nova: ObservacaoChat = {
        id: `obs-${Date.now()}`,
        autor: 'Maria Silva',
        perfilAutor: 'Coordenação Estadual',
        texto: texto.trim(),
        data: nowIso(),
      };
      s.observacoes = [...(s.observacoes ?? []), nova];
      return s;
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
        s.acompanhantes = acompanhantesPool.filter((a) => patch.acompanhanteIds!.includes(a.id));
      }
      if (patch.dataLaudo !== undefined) {
        s.dataLaudo = patch.dataLaudo || undefined;
      }
      if (patch.anexos !== undefined) {
        s.anexos = patch.anexos.map((a) => ({
          id: a.id ?? uid('an'),
          nome: a.nome,
          tipo: a.tipo,
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
  }, [mutate]);

  const trocarPaciente = useCallback<FluxoV2ContextValue['trocarPaciente']>(
    (solicitacaoId, novoPacienteId, novosAcompanhantesIds, novosAnexos) => {
      mutate(solicitacaoId, (s) => {
        const novoPaciente = pacientesPool.find((p) => p.id === novoPacienteId);
        if (!novoPaciente) return s;
        // Reset deliberado: paciente novo => acompanhantes e anexos do paciente
        // anterior não fazem mais sentido, então o operador precisa reescolher.
        // Pareceres, status, agendamento, viagens, ajudas e adicionais são
        // preservados — quem decide o que fazer com isso é o fluxo posterior.
        s.paciente = novoPaciente;
        s.acompanhantes = acompanhantesPool.filter((a) =>
          novosAcompanhantesIds.includes(a.id),
        );
        s.anexos = novosAnexos.map((a) => ({
          id: uid('an'),
          nome: a.nome,
          tipo: a.tipo,
        }));
        return s;
      });
    },
    [mutate],
  );

  const value = useMemo<FluxoV2ContextValue>(() => ({
    solicitacoes,
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
    solicitacoes, getById, createSolicitacao, updateSolicitacao, setStatus,
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
