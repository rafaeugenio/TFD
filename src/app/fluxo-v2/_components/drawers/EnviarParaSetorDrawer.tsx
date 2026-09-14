'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Send,
  ClipboardList,
  Stethoscope,
  Plane,
  Wallet,
  HeartHandshake,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import SnapshotPaciente, { snapshotFromSolicitacao } from '../SnapshotPaciente';
import ResponsavelMultiSelect from '../ResponsavelMultiSelect';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { useToast } from '@/shared/components/toast/Toast';
import { type SetorAcao } from '../../_utils/lock';
import { abrirDemanda } from '../../_state/servicoSocialStore';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import {
  ETAPAS_IMPACTADAS,
  ETAPA_IMPACTADA_LABEL,
  type EtapaImpactada,
  type SetorOrigemDemanda,
} from '@/core/mocks/servico-social-seed';
import type { ResponsavelSolicitacao } from '@/core/mocks/fluxo-v2-v3-seed';

/**
 * Destinos do drawer. Além dos setores da cadeia, 'servico_social' é um
 * destino paralelo: encaminhar para lá abre uma demanda social e NÃO move a
 * solicitação, que continua no setor atual, sem trava e sem mudar de etapa.
 */
export type DestinoEnvio = SetorAcao | 'servico_social';
export type TipoEnvio = 'enviar' | 'devolver';
export type SetorAtualDrawer = SetorAcao;

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  /** Setor de onde a solicitação está saindo. Define os destinos disponíveis
   *  (o setor seguinte e o anterior na cadeia). */
  setorAtual: SetorAtualDrawer;
  /** Destino já selecionado ao abrir. Usado pelo botão "Encaminhar ao Serviço
   *  Social" da aba, que entra direto no destino paralelo sem tirar do
   *  usuário a possibilidade de trocar. */
  destinoInicial?: DestinoEnvio;
}

const LABEL_DESTINO: Record<DestinoEnvio, string> = {
  dados_basicos: 'Dados Básicos',
  regulacao: 'Regulação',
  passagens: 'Passagens',
  ajuda_custo: 'Ajuda de Custo',
  acompanhamento: 'Acompanhamento',
  aprovacao: 'Aprovação',
  servico_social: 'Serviço Social',
};

/** Cadeia linear do fluxo (PBI 13237), com 'aprovacao' ao final — destino
 *  extra alcançável a partir de qualquer um dos cinco setores operacionais,
 *  sem posição fixa na ordem de tramitação. */
const ORDEM: SetorAcao[] = ['dados_basicos', 'regulacao', 'passagens', 'ajuda_custo', 'acompanhamento', 'aprovacao'];

const ICON_DESTINO: Record<DestinoEnvio, LucideIcon> = {
  dados_basicos: ClipboardList,
  regulacao: Stethoscope,
  passagens: Plane,
  ajuda_custo: Wallet,
  acompanhamento: HeartHandshake,
  aprovacao: ShieldCheck,
  servico_social: HeartHandshake,
};

const DESCRICAO_DESTINO: Record<DestinoEnvio, string> = {
  dados_basicos: 'Cadastro, anexos e ajustes no laudo do paciente.',
  regulacao: 'Parecer médico, carimbo e agendamento de exceção.',
  passagens: 'Emissão e remarcação de passagens.',
  ajuda_custo: 'Cálculo e pagamento de diárias.',
  acompanhamento: 'Acompanhamento da viagem e do tratamento em curso.',
  aprovacao: 'Análise e decisão do setor responsável.',
  servico_social: 'Avaliação social em paralelo. A solicitação não sai do setor atual.',
};

const HINT_DESTINO: Record<DestinoEnvio, string> = {
  dados_basicos: 'Ex.: paciente sem CNS cadastrado, falta anexar laudo atualizado.',
  regulacao: 'Ex.: paciente com urgência cirúrgica, caso já tem laudo do oncologista.',
  passagens: 'Ex.: paciente prefere voo direto pela manhã, sem conexão.',
  ajuda_custo: 'Ex.: confirmar dados bancários antes de liberar as diárias.',
  acompanhamento: 'Ex.: paciente embarcou, acompanhar internação e retorno.',
  aprovacao: 'Ex.: valor excepcional da ajuda de custo precisa de aval da coordenação.',
  servico_social: 'Ex.: paciente relata não ter onde ficar durante o tratamento e não tem familiar na cidade.',
};

/** Infere se vai pra "frente" (enviar) ou pra "atrás" (devolver). Só vale
 *  para os setores da cadeia: Serviço Social é paralelo e não tem sentido. */
function inferirTipo(de: SetorAcao, para: DestinoEnvio): TipoEnvio {
  if (para === 'servico_social') return 'enviar';
  return ORDEM.indexOf(para) > ORDEM.indexOf(de) ? 'enviar' : 'devolver';
}

/** Setor de origem registrado na demanda social. */
const SETOR_ORIGEM: Record<SetorAcao, SetorOrigemDemanda> = {
  dados_basicos: 'dados_basicos',
  regulacao: 'regulacao',
  passagens: 'passagens',
  ajuda_custo: 'ajuda_custo',
  acompanhamento: 'acompanhamento',
  aprovacao: 'aprovacao',
};

/**
 * T2.AE — Drawer único de tramitação entre setores. O usuário escolhe o
 * destino entre os setores adjacentes ao setor atual — o próximo (enviar)
 * e o anterior (devolver) na cadeia Dados Básicos → Regulação → Passagens
 * → Ajuda de Custo → Acompanhamento — via radio cards. O CTA assume a cor
 * do destino selecionado; enquanto nenhum estiver selecionado, o CTA fica
 * neutro e desabilitado.
 */
export default function EnviarParaSetorDrawer({
  open,
  onClose,
  solicitacaoId,
  setorAtual,
  destinoInicial,
}: Props) {
  const { getById, enviarParaSetor } = useFluxoV2State();
  const toast = useToast();
  const s = getById(solicitacaoId);

  const [destino, setDestino] = useState<DestinoEnvio | null>(destinoInicial ?? null);
  const [observacao, setObservacao] = useState('');
  const [responsaveis, setResponsaveis] = useState<ResponsavelSolicitacao[]>([]);
  const [etapas, setEtapas] = useState<EtapaImpactada[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const { user } = usePermissions();

  /** Destino paralelo: abre demanda social sem tramitar a solicitação. */
  const ehServicoSocial = destino === 'servico_social';

  // Tramitação em qualquer direção entre os cinco setores gerais do fluxo
  // (Dados Básicos, Regulação, Passagens, Ajuda de Custo, Acompanhamento):
  // todos os outros quatro aparecem como destino, sem restrição de sentido.
  const destinos = useMemo<DestinoEnvio[]>(() => {
    return [...ORDEM.filter((s) => s !== setorAtual), 'servico_social' as const];
  }, [setorAtual]);

  useEffect(() => {
    if (open) {
      setDestino(destinoInicial ?? null);
      setObservacao('');
      setResponsaveis([]);
      setEtapas([]);
      setTimeout(() => ref.current?.focus(), 100);
    }
  }, [open, destinoInicial]);

  const tipo: TipoEnvio | null = destino ? inferirTipo(setorAtual, destino) : null;

  const conteudo = useMemo(() => {
    if (!destino || !tipo) {
      return {
        titulo: 'Enviar para outro setor',
        subtitulo:
          'Escolha o setor de destino. A solicitação entrará na fila desse setor.',
        cta: 'Confirmar envio',
        hint: 'Observação opcional para o setor de destino.',
      };
    }
    const labelDest = LABEL_DESTINO[destino];
    if (destino === 'servico_social') {
      return {
        titulo: 'Encaminhar ao Serviço Social',
        subtitulo:
          'A demanda corre em paralelo. A solicitação continua no setor atual, sem trava e sem mudar de etapa.',
        cta: 'Encaminhar ao Serviço Social',
        hint: HINT_DESTINO.servico_social,
      };
    }
    const verbo = tipo === 'devolver' ? 'Devolver' : 'Enviar';
    return {
      titulo: `${verbo} para ${labelDest}`,
      subtitulo:
        tipo === 'devolver'
          ? `A solicitação volta para a fila de ${labelDest}. ${
              destino === 'dados_basicos'
                ? 'Use quando faltar informação cadastral, anexo ou ajuste no laudo.'
                : 'Eles verão o motivo e providenciarão o ajuste antes de reencaminhar.'
            }`
          : `A solicitação entra na fila de ${labelDest} — ${DESCRICAO_DESTINO[destino].toLowerCase()}`,
      cta: `${verbo} para ${labelDest}`,
      hint: HINT_DESTINO[destino],
    };
  }, [destino, tipo]);

  // Observação vira obrigatória quando o destino é Aprovação — é o motivo do
  // pedido, exibido na coluna "Observação para aprovação" daquela fila.
  // Em Serviço Social a observação é o motivo do encaminhamento, obrigatório
  // pela regra do módulo; e não há responsável de destino, porque a
  // solicitação não muda de setor.
  const observacaoObrigatoria = destino === 'aprovacao' || ehServicoSocial;

  function handleConfirmar() {
    if (!destino || !tipo) return;
    if (observacaoObrigatoria && !observacao.trim()) {
      toast.error(
        'Campo obrigatório',
        ehServicoSocial
          ? 'Informe o motivo do encaminhamento ao Serviço Social.'
          : 'Informe o motivo do pedido de aprovação.',
      );
      return;
    }
    // Destino paralelo: abre a demanda social e encerra aqui. Nada de
    // `enviarParaSetor` — a solicitação não sai do setor em que está.
    if (ehServicoSocial) {
      abrirDemanda({
        solicitacaoId,
        solicitacaoNumero: s?.numero ?? '',
        pacienteNome: s?.paciente.nome ?? '',
        pacienteCpf: s?.paciente.cpf ?? '',
        motivo: observacao.trim(),
        etapasImpactadas: etapas,
        setorOrigem: SETOR_ORIGEM[setorAtual] ?? 'dados_basicos',
        encaminhadoPor: user?.nome_completo ?? 'Você',
      });
      toast.success(
        'Encaminhado ao Serviço Social',
        'A solicitação continua no setor atual. A demanda corre em paralelo.',
      );
      onClose();
      return;
    }
    if (responsaveis.length === 0) {
      toast.error('Campo obrigatório', 'Escolha ao menos uma pessoa responsável no setor de destino.');
      return;
    }
    enviarParaSetor(
      solicitacaoId,
      destino,
      observacao.trim() || undefined,
      tipo,
      responsaveis,
    );
    toast.success(tipo === 'devolver' ? 'Solicitação devolvida' : 'Solicitação enviada', `Destino: ${LABEL_DESTINO[destino]}.`);
    onClose();
  }

  if (!s) return null;

  // Versão neutra/corporativa: a cor por destino sumiu — o CTA é sempre
  // azul Citiesoft sólido. Cards selecionados ganham borda azul + bg muito sutil.
  const PRIMARY = '#146BFA';
  const Icon = ehServicoSocial
    ? HeartHandshake
    : !destino || !tipo
      ? Send
      : tipo === 'devolver' ? ArrowRight : Send;
  const disabled =
    !destino ||
    (!ehServicoSocial && responsaveis.length === 0) ||
    (observacaoObrigatoria && !observacao.trim());

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={conteudo.titulo}
      subtitle={conteudo.subtitulo}
      width="480px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn"
            onClick={handleConfirmar}
            disabled={disabled}
            style={{
              background: disabled ? '#F1F5F9' : PRIMARY,
              borderColor: disabled ? '#E2E8F0' : PRIMARY,
              color: disabled ? '#94A3B8' : 'white',
              fontWeight: 600,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 140ms ease',
            }}
          >
            <Icon size={14} /> {conteudo.cta}
          </button>
        </>
      }
    >
      <SnapshotPaciente data={snapshotFromSolicitacao(s)} />

      <label
        className="block text-[12px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: '#6B7280' }}
      >
        Para qual setor?
      </label>
      <div
        className="grid gap-2 mb-5"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        {destinos.map((d) => {
          const ativo = destino === d;
          const DIcon = ICON_DESTINO[d];
          const t = inferirTipo(setorAtual, d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDestino(d)}
              className="text-left transition-all"
              style={{
                padding: '14px 14px 12px',
                background: ativo ? '#F8FAFC' : 'white',
                border: `${ativo ? 2 : 1}px solid ${ativo ? PRIMARY : '#E2E8F0'}`,
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: ativo
                  ? '0 1px 0 rgba(15,23,42,0.04)'
                  : '0 1px 0 rgba(15, 23, 42, 0.02)',
                // Compensa o offset visual quando a borda muda de 1 para 2px
                margin: ativo ? -1 : 0,
              }}
              onMouseEnter={(e) => {
                if (!ativo) {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#FBFCFE';
                }
              }}
              onMouseLeave={(e) => {
                if (!ativo) {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: '#F8FAFC',
                    color: ativo ? PRIMARY : '#475569',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <DIcon size={14} strokeWidth={2} />
                </span>
                <div className="flex flex-col leading-tight">
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: '#0F172A' }}
                  >
                    {LABEL_DESTINO[d]}
                  </span>
                  <span
                    className="text-[11px] uppercase font-semibold"
                    style={{ color: '#94A3B8', letterSpacing: '0.06em' }}
                  >
                    {d === 'servico_social' ? 'Paralelo' : t === 'devolver' ? 'Devolver' : 'Enviar'}
                  </span>
                </div>
              </div>
              <p
                className="text-[12.5px] leading-snug"
                style={{ color: '#64748B' }}
              >
                {DESCRICAO_DESTINO[d]}
              </p>
            </button>
          );
        })}
      </div>

      {ehServicoSocial ? (
        <>
          <label
            className="block text-[12px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#6B7280' }}
          >
            Etapas potencialmente impactadas{' '}
            <span
              style={{ color: '#9CA3AF', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}
            >
              (opcional)
            </span>
          </label>
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {ETAPAS_IMPACTADAS.map((e) => {
              const marcada = etapas.includes(e);
              return (
                <label
                  key={e}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-[13px] transition-colors"
                  style={{
                    background: marcada ? '#FFF7ED' : 'white',
                    border: `1px solid ${marcada ? '#FDBA74' : '#E2E8F0'}`,
                    borderRadius: 8,
                    color: '#1A1D2B',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      setEtapas((prev) =>
                        prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
                      )
                    }
                    className="shrink-0"
                  />
                  <span>{ETAPA_IMPACTADA_LABEL[e]}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] mt-1 mb-5" style={{ color: '#9CA3AF' }}>
            Marcar uma etapa só exibe um alerta para o setor responsável. Nada é
            bloqueado: o setor decide se aguarda a análise social.
          </p>
        </>
      ) : (
        <>
          <label
            className="block text-[12px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#6B7280' }}
          >
            Responsável(is) no setor de destino <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
          </label>
          <ResponsavelMultiSelect value={responsaveis} onChange={setResponsaveis} />
          <p className="text-[11px] mt-1 mb-5" style={{ color: '#9CA3AF' }}>
            Quem responde pela solicitação enquanto ela estiver em {destino ? LABEL_DESTINO[destino] : 'destino'}. Pode escolher mais de uma pessoa.
          </p>
        </>
      )}

      <label
        className="block text-[12px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: '#6B7280' }}
      >
        {ehServicoSocial ? 'Motivo do encaminhamento' : 'Observação para o setor de destino'}{' '}
        {observacaoObrigatoria ? (
          <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
        ) : (
          <span
            style={{
              color: '#9CA3AF',
              fontWeight: 500,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            (opcional)
          </span>
        )}
      </label>
      <textarea
        ref={ref}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        rows={5}
        placeholder={conteudo.hint}
        required={observacaoObrigatoria}
        aria-required={observacaoObrigatoria}
        className="w-full px-3 py-2 text-[13px]"
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8,
        }}
      />
      <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
        {ehServicoSocial
          ? 'Obrigatório. Descreve o que a equipe social precisa avaliar. Quem encaminhou e a data e hora são registrados automaticamente.'
          : observacaoObrigatoria
            ? 'Obrigatória para Aprovação, explica o motivo do pedido para quem for decidir.'
            : 'A observação aparece destacada na fila do destino nas próximas 24 horas.'}
      </p>
    </Drawer>
  );
}
