import {
  STATUS_AJUDA_LABEL,
  STATUS_VIAGEM_LABEL,
  STATUS_ADICIONAL_LABEL,
  CATEGORIA_ADICIONAL_LABEL,
  MOTIVO_ENCERRAMENTO_LABEL,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

export type TipoEvento =
  | 'criacao'
  | 'laudo'
  | 'parecer_deferido'
  | 'parecer_indeferido'
  | 'carimbo'
  | 'tentativa'
  | 'agendamento'
  | 'segundo_deferimento'
  | 'passagem'
  | 'ajuda'
  | 'adicional'
  | 'encaminhamento_financeiro'
  | 'envio_regulacao'
  | 'envio_financeiro'
  | 'devolucao_regulacao'
  | 'devolucao_dados_basicos'
  | 'encerramento';

export interface EventoTimeline {
  id: string;
  tipo: TipoEvento;
  data: string;        // ISO datetime
  titulo: string;
  descricao?: string;
  autor?: string;
  observacao?: string;
  badge?: string;      // small badge text (status / categoria)
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const isoFromDate = (d: string, h = 0, m = 0): string => {
  // se já é datetime, retorna como veio
  if (d.includes('T')) return d;
  return `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

const fmtBR = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
};

const addOneYear = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/* -------------------------------------------------------------------------- */
/*  Derivação                                                                  */
/* -------------------------------------------------------------------------- */

export function derivarEventos(s: SolicitacaoMock): EventoTimeline[] {
  const eventos: EventoTimeline[] = [];

  // 1. Criação
  eventos.push({
    id: `${s.id}-criacao`,
    tipo: 'criacao',
    data: s.dataCriacao,
    titulo: 'Solicitação criada',
    descricao: `Protocolo ${s.numero}`,
    autor: 'Sistema',
  });

  // 2. Laudo
  if (s.dataLaudo) {
    const laudoIso = isoFromDate(s.dataLaudo);
    eventos.push({
      id: `${s.id}-laudo`,
      tipo: 'laudo',
      data: laudoIso,
      titulo: 'Laudo médico emitido',
      descricao: `Válido até ${fmtBR(addOneYear(s.dataLaudo))}`,
    });
  }

  // 3. Pareceres
  s.pareceres.forEach((p) => {
    const tipo: TipoEvento =
      p.decisao === 'deferido' ? 'parecer_deferido' : 'parecer_indeferido';
    const decLabel = p.decisao === 'deferido' ? 'deferido' : 'indeferido';
    eventos.push({
      id: `${s.id}-${p.id}`,
      tipo,
      data: p.data,
      titulo: `Parecer médico — ${decLabel}`,
      descricao: p.medico,
      observacao: p.observacao,
      badge: p.cidPrincipal,
    });
  });

  // 4. Carimbo (ancorado ao último parecer, se houver)
  if (s.carimboRegulacao) {
    const ancora = s.pareceres.length
      ? s.pareceres[s.pareceres.length - 1].data
      : s.dataCriacao;
    const carimboLabel =
      s.carimboRegulacao === 'OUTROS' && s.carimboOutrosInfo
        ? `OUTROS — ${s.carimboOutrosInfo.unidadeOrgao}`
        : s.carimboRegulacao;
    const carimboDescricao =
      s.carimboRegulacao === 'APROVADO_DIRETO'
        ? 'Aprovação direta — sem necessidade de exceção'
        : s.carimboRegulacao === 'OUTROS' && s.carimboOutrosInfo
          ? `Contato manual — ${s.carimboOutrosInfo.unidadeOrgao}`
          : 'Encaminhado para fila de exceção';
    eventos.push({
      id: `${s.id}-carimbo`,
      tipo: 'carimbo',
      data: ancora,
      titulo: `Carimbo de regulação — ${carimboLabel}`,
      descricao: carimboDescricao,
    });
  }

  // 5/6. Tentativas — agora incluem o agendamento confirmado (T2.AM).
  s.agendamento?.tentativas.forEach((t) => {
    if (t.desfecho === 'agendamento_confirmado') {
      eventos.push({
        id: `${s.id}-${t.id}`,
        tipo: 'agendamento',
        data: isoFromDate(t.data),
        titulo: `Agendamento confirmado em ${t.unidade}`,
        descricao: t.hora ? `${fmtBR(t.data)} às ${t.hora}` : fmtBR(t.data),
        observacao: t.observacao,
      });
    } else {
      const desfechoLabel = t.desfecho.replace(/_/g, ' ');
      eventos.push({
        id: `${s.id}-${t.id}`,
        tipo: 'tentativa',
        data: t.data,
        titulo: `Tentativa em ${t.unidade}`,
        descricao: `Desfecho: ${desfechoLabel}`,
        observacao: t.observacao,
        badge: desfechoLabel,
      });
    }
  });

  // 7. Segundo deferimento
  if (s.agendamento?.segundoDeferimento) {
    const sd = s.agendamento.segundoDeferimento;
    eventos.push({
      id: `${s.id}-segundo-def`,
      tipo: 'segundo_deferimento',
      data: sd.data,
      titulo: 'Segundo deferimento médico registrado',
      descricao: sd.medico,
    });
  }

  // 8. Passagens
  s.viagens.forEach((v) => {
    eventos.push({
      id: `${s.id}-${v.id}`,
      tipo: 'passagem',
      data: isoFromDate(v.data),
      titulo: `Passagem ${v.tipo} — ${v.origem} → ${v.destino}`,
      descricao: `${v.modal} · R$ ${v.valor.toFixed(2)}`,
      badge: STATUS_VIAGEM_LABEL[v.status],
    });
  });

  // 9. Ajudas de custo
  s.ajudasCusto.forEach((a) => {
    const ini = new Date(a.dataInicio);
    const fim = new Date(a.dataFim);
    const dias = Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1);
    eventos.push({
      id: `${s.id}-${a.id}`,
      tipo: 'ajuda',
      data: isoFromDate(a.dataInicio),
      titulo: `Ajuda de custo — ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
      descricao: `${fmtBR(a.dataInicio)} a ${fmtBR(a.dataFim)}`,
      observacao: a.observacao,
      badge: STATUS_AJUDA_LABEL[a.status],
    });
  });

  // 10. Adicionais
  s.adicionais.forEach((ad) => {
    eventos.push({
      id: `${s.id}-${ad.id}`,
      tipo: 'adicional',
      data: isoFromDate(ad.data),
      titulo: `${CATEGORIA_ADICIONAL_LABEL[ad.categoria]} — ${ad.descricao}`,
      descricao: `R$ ${ad.valor.toFixed(2)}`,
      badge: STATUS_ADICIONAL_LABEL[ad.status],
    });
  });

  // 10.5. Devoluções e encaminhamentos (tramitação Regulação ↔ Financeiro)
  s.devolucoes?.forEach((d) => {
    eventos.push({
      id: `${s.id}-${d.id}`,
      tipo: 'devolucao_regulacao',
      data: d.data,
      titulo: 'Devolvida do Financeiro para Regulação',
      descricao: `${d.autor} — ${d.perfilAutor}`,
      observacao: d.motivo,
      badge: d.resolvida ? 'Resolvida' : 'Pendente',
    });
    if (d.resolvida) {
      eventos.push({
        id: `${s.id}-${d.id}-resolvida`,
        tipo: 'encaminhamento_financeiro',
        data: d.data, // aproximação — sem timestamp dedicado
        titulo: 'Reencaminhada ao Financeiro',
        descricao: 'Devolução resolvida pela Regulação',
      });
    }
  });

  // 11. Encerramento
  if (s.encerramento) {
    eventos.push({
      id: `${s.id}-encerramento`,
      tipo: 'encerramento',
      data: isoFromDate(s.encerramento.data),
      titulo: `Solicitação encerrada — ${MOTIVO_ENCERRAMENTO_LABEL[s.encerramento.motivo]}`,
      observacao: s.encerramento.observacao,
    });
  }

  // Ordena por data descendente (mais recente no topo)
  eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return eventos;
}

/* -------------------------------------------------------------------------- */
/*  Tempo relativo (PT-BR, simplificado)                                      */
/* -------------------------------------------------------------------------- */

export function tempoRelativo(iso: string, ref: Date = new Date()): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = ref.getTime() - d.getTime();
  const futuro = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const hora = Math.round(abs / 3600000);
  const dia = Math.round(abs / 86400000);
  const mes = Math.round(dia / 30);
  const ano = Math.round(dia / 365);

  const fmt = (qty: number, sing: string, plur: string): string => {
    const unit = qty === 1 ? sing : plur;
    return futuro ? `em ${qty} ${unit}` : `há ${qty} ${unit}`;
  };

  if (min < 1) return 'agora há pouco';
  if (min < 60) return fmt(min, 'minuto', 'minutos');
  if (hora < 24) return fmt(hora, 'hora', 'horas');
  if (dia < 30) return fmt(dia, 'dia', 'dias');
  if (mes < 12) return fmt(mes, 'mês', 'meses');
  return fmt(ano, 'ano', 'anos');
}

export function fmtDataHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} ${hora}`;
}
