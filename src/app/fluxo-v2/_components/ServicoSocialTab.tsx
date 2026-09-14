'use client';

import { useMemo, useState } from 'react';
import {
  HeartHandshake, Plus, FileText, Lock, Eye, Download, AlertTriangle,
  CheckCircle2, XCircle, PlayCircle, RotateCcw, Home, Info,
} from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import StatusDot, { type StatusDotTone } from './StatusDot';
import OrdinalBadge from './OrdinalBadge';
import EnviarParaSetorDrawer from './drawers/EnviarParaSetorDrawer';
import NewInstrumentoDrawer from './drawers/NewInstrumentoDrawer';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { setorAtual, type SetorAcao } from '../_utils/lock';
import {
  useDemandasDaSolicitacao,
  useServicoSocial,
  instrumentosDaSolicitacao,
  contarInstrumentos,
  casaPorId,
  assumirDemanda,
  concluirDemanda,
  cancelarDemanda,
  reabrirDemanda,
} from '../_state/servicoSocialStore';
import {
  ETAPA_IMPACTADA_LABEL,
  SETOR_ORIGEM_LABEL,
  SITUACAO_DEMANDA_LABEL,
  TIPO_INSTRUMENTO_LABEL,
  demandaEstaAberta,
  podeVerConteudoSigiloso,
  type DemandaSocialMock,
  type InstrumentoSocialMock,
  type SituacaoDemandaSocial,
} from '@/core/mocks/servico-social-seed';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

/** O drawer de tramitação só aceita os setores de ação. Uma solicitação
 *  encerrada cai em Acompanhamento como origem, já que o encaminhamento ao
 *  Serviço Social é paralelo e não depende do setor. */
function setorDeOrigem(s: SolicitacaoMock): SetorAcao {
  const atual = setorAtual(s);
  return atual === 'encerramento' ? 'acompanhamento' : atual;
}

const SITUACAO_TONE: Record<SituacaoDemandaSocial, StatusDotTone> = {
  pendente: 'warning',
  em_atendimento: 'info',
  concluida: 'success',
  cancelada: 'muted',
};

function dataHoraBR(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Aba Serviço Social do detalhe da solicitação. Mesma estrutura das abas
 * Regulação e Financeiro: linha de stats no topo e blocos `Section` com
 * cabeçalho, subtítulo e ação à direita. A diferença de comportamento é que
 * esta aba nunca fica travada: a demanda social é paralela e não depende do
 * setor em que a solicitação está.
 */
export default function ServicoSocialTab({ s }: { s: SolicitacaoMock }) {
  const { user } = usePermissions();
  useServicoSocial(); // assina o store para reagir a qualquer escrita
  const demandas = useDemandasDaSolicitacao(s.id);
  const instrumentos = instrumentosDaSolicitacao(s.id);

  const [encaminharOpen, setEncaminharOpen] = useState(false);
  const [instrumentoOpen, setInstrumentoOpen] = useState(false);
  const [visualizando, setVisualizando] = useState<InstrumentoSocialMock | null>(null);

  /**
   * Controle só do protótipo: o sigilo é restrito às profissionais do Serviço
   * Social e nem administrador abre o conteúdo, então sem este seletor não
   * haveria como demonstrar os dois lados na validação presencial com a
   * equipe. No sistema real quem decide é o papel do usuário logado.
   */
  const acessoReal = podeVerConteudoSigiloso(user);
  const [verComoSocial, setVerComoSocial] = useState(acessoReal);
  const podeAbrirSigiloso = acessoReal || verComoSocial;

  const counts = useMemo(() => ({
    total: demandas.length,
    abertas: demandas.filter(demandaEstaAberta).length,
    instrumentos: instrumentos.length,
  }), [demandas, instrumentos]);

  const demandaAlvo = useMemo(
    () => demandas.find(demandaEstaAberta) ?? demandas[0],
    [demandas],
  );

  const usuario = user?.nome_completo ?? 'Você';

  return (
    <div className="min-w-0">
      {/* Nota de paralelismo — ocupa o lugar do banner de trava das outras abas */}
      <div
        className="flex items-start gap-2.5 mb-6 px-3 py-2.5"
        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}
        role="status"
      >
        <Info size={15} style={{ color: '#64748B', flexShrink: 0, marginTop: 1 }} />
        <div className="text-[12.5px] leading-relaxed" style={{ color: '#475569' }}>
          A demanda social corre em paralelo ao fluxo. Encaminhar ao Serviço Social não
          muda o setor nem a etapa da solicitação, e esta aba continua liberada
          independentemente de onde a solicitação estiver.
        </div>
      </div>

      {/* Linha de stats neutra — 1 card, 3 sub-stats com divisor vertical */}
      <div
        className="flex items-stretch mb-6"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        <Stat label="Total de demandas" value={counts.total} />
        <StatDivider />
        <Stat label="Em aberto" value={counts.abertas} dotTone={counts.abertas > 0 ? 'warning' : undefined} />
        <StatDivider />
        <Stat label="Instrumentos" value={counts.instrumentos} />
      </div>

      {/* Seletor de visão (protótipo) */}
      {!acessoReal && (
        <div
          className="flex items-center gap-2.5 px-3 py-2 mb-6 text-[12px]"
          style={{ background: '#F1F5F9', border: '1px dashed #CBD5E1', borderRadius: 8, color: '#475569' }}
        >
          <Eye size={13} className="shrink-0" />
          <span className="flex-1">
            Controle apenas do protótipo, para demonstrar os dois lados do sigilo.
            No sistema o acesso vem do papel do usuário.
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={verComoSocial}
              onChange={(e) => setVerComoSocial(e.target.checked)}
            />
            <span>Ver como assistente social</span>
          </label>
        </div>
      )}

      {/* ── Bloco Demandas ─────────────────────────────────── */}
      <Section
        icon={HeartHandshake}
        title="Demandas sociais"
        subtitle={
          demandas.length === 0
            ? 'Nenhuma demanda registrada nesta solicitação.'
            : `${demandas.length} demanda(s) registrada(s) · ${counts.abertas} em aberto.`
        }
        action={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={() => setEncaminharOpen(true)}
          >
            <Plus size={14} /> Encaminhar ao Serviço Social
          </button>
        }
      >
        {demandas.length === 0 ? (
          <p className="text-[13px] py-2" style={{ color: '#94A3B8' }}>
            Esta solicitação ainda não foi encaminhada ao Serviço Social.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {demandas.map((d, idx) => (
              <DemandaCard
                key={d.id}
                d={d}
                ordinal={demandas.length - idx}
                usuario={usuario}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── Bloco Instrumentos ─────────────────────────────── */}
      <Section
        icon={FileText}
        title="Instrumentos"
        subtitle={`${instrumentos.length} documento(s) produzido(s) pelo Serviço Social nesta solicitação.`}
        action={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={() => setInstrumentoOpen(true)}
            disabled={!demandaAlvo}
            title={demandaAlvo ? undefined : 'Abra uma demanda social antes de criar um instrumento.'}
          >
            <Plus size={14} /> Criar instrumento
          </button>
        }
      >
        {instrumentos.length > 0 ? (
          <div className="overflow-hidden" style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <ThMini style={{ width: 56 }}>#</ThMini>
                  <ThMini>Tipo</ThMini>
                  <ThMini>Demanda</ThMini>
                  <ThMini>Autora</ThMini>
                  <ThMini>Criado em</ThMini>
                  <ThMini>Sigilo</ThMini>
                  <ThMini align="right" style={{ width: 180 }}>Ações</ThMini>
                </tr>
              </thead>
              <tbody>
                {instrumentos.map((i, idx) => {
                  const bloqueado = i.sigiloso && !podeAbrirSigiloso;
                  const casa = casaPorId(i.casaApoioId);
                  const dem = demandas.find((x) => x.id === i.demandaId);
                  return (
                    <tr key={i.id} style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                      <td className="px-3 py-2"><OrdinalBadge n={instrumentos.length - idx} /></td>
                      <td className="px-3 py-2" style={{ color: '#1A1D2B' }}>
                        <div className="leading-tight">
                          <div style={{ fontWeight: 500 }}>{TIPO_INSTRUMENTO_LABEL[i.tipo]}</div>
                          {casa && (
                            <div className="inline-flex items-center gap-1" style={{ color: '#94A3B8' }}>
                              <Home size={10} /> {casa.nome}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2" style={{ color: '#64748B' }}>
                        {dem
                          ? `${SETOR_ORIGEM_LABEL[dem.setorOrigem]} · ${dataHoraBR(dem.dataEncaminhamento).slice(0, 10)}`
                          : 'Demanda removida'}
                      </td>
                      <td className="px-3 py-2" style={{ color: '#1A1D2B' }}>{i.autora}</td>
                      <td className="px-3 py-2" style={{ color: '#64748B' }}>{dataHoraBR(i.dataCriacao)}</td>
                      <td className="px-3 py-2">
                        {i.sigiloso ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase"
                            style={{ background: '#B91C1C', color: 'white', borderRadius: 4, letterSpacing: '0.05em' }}
                          >
                            <Lock size={9} /> Sigiloso
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Aberto</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {bloqueado ? (
                          <span
                            className="text-[11.5px]"
                            style={{ color: '#B91C1C' }}
                            title="Conteúdo restrito às profissionais do Serviço Social. Administradores e a direção do TFD veem que o instrumento existe, mas não abrem nem baixam."
                          >
                            Conteúdo restrito ao Serviço Social
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5">
                            <IconButton icon={Eye} label="Visualizar" onClick={() => setVisualizando(i)} color="var(--tfd-blue-700, #1D4ED8)" hoverBg="#EBF0FF" />
                            <IconButton icon={Download} label="Baixar (no protótipo não gera arquivo)" onClick={() => setVisualizando(i)} color="#0E7490" hoverBg="#ECFEFF" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] py-2" style={{ color: '#94A3B8' }}>
            {demandaAlvo
              ? 'Nenhum instrumento criado nesta solicitação.'
              : 'Abra uma demanda social para poder criar instrumentos.'}
          </p>
        )}
      </Section>

      {/* ── Drawers ────────────────────────────────────────── */}
      <EnviarParaSetorDrawer
        open={encaminharOpen}
        onClose={() => setEncaminharOpen(false)}
        solicitacaoId={s.id}
        setorAtual={setorDeOrigem(s)}
        destinoInicial="servico_social"
      />

      {demandaAlvo && (
        <NewInstrumentoDrawer
          open={instrumentoOpen}
          onClose={() => setInstrumentoOpen(false)}
          s={s}
          demandas={demandas}
          demandaInicialId={demandaAlvo.id}
        />
      )}

      {visualizando && (
        <Drawer
          open={!!visualizando}
          onClose={() => setVisualizando(null)}
          title={TIPO_INSTRUMENTO_LABEL[visualizando.tipo]}
          subtitle={`${visualizando.autora} · ${dataHoraBR(visualizando.dataCriacao)}`}
          width="min(760px, 96vw)"
          footer={
            <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => setVisualizando(null)}>
              Fechar
            </button>
          }
        >
          <pre
            className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono px-3 py-3"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, color: '#1A1D2B' }}
          >
            {visualizando.conteudo}
          </pre>
        </Drawer>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card de uma demanda                                                       */
/* -------------------------------------------------------------------------- */

function DemandaCard({
  d,
  ordinal,
  usuario,
}: {
  d: DemandaSocialMock;
  ordinal: number;
  usuario: string;
}) {
  const [acao, setAcao] = useState<'concluir' | 'cancelar' | null>(null);
  const [texto, setTexto] = useState('');
  const qtdInstrumentos = contarInstrumentos(d.id);
  const aberta = demandaEstaAberta(d);

  function fecharAcao() {
    setAcao(null);
    setTexto('');
  }

  function confirmar() {
    if (acao === 'concluir') concluirDemanda(d.id, texto, usuario);
    if (acao === 'cancelar') cancelarDemanda(d.id, texto, usuario);
    fecharAcao();
  }

  return (
    <div
      style={{
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: aberta ? 'inset 3px 0 0 0 #FDBA74' : undefined,
      }}
    >
      <div
        className="px-3 py-2.5 flex items-start justify-between gap-3 flex-wrap"
        style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}
      >
        <div className="min-w-0 flex items-start gap-2.5">
          <OrdinalBadge n={ordinal} />
          <div className="leading-tight">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusDot tone={SITUACAO_TONE[d.situacao]} strong>
                {SITUACAO_DEMANDA_LABEL[d.situacao]}
              </StatusDot>
              <span className="text-[12px]" style={{ color: '#94A3B8' }}>
                {dataHoraBR(d.dataEncaminhamento)}
              </span>
              {qtdInstrumentos > 0 && (
                <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: '#64748B' }}>
                  <FileText size={11} /> {qtdInstrumentos}
                </span>
              )}
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
              Encaminhada por <span style={{ color: '#1E293B', fontWeight: 500 }}>{d.encaminhadoPor}</span>
              {' · '}
              {SETOR_ORIGEM_LABEL[d.setorOrigem]}
              {d.profissionalResponsavel ? ` · Atendida por ${d.profissionalResponsavel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {d.situacao === 'pendente' && (
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => assumirDemanda(d.id, usuario)}>
              <PlayCircle size={13} /> Assumir
            </button>
          )}
          {aberta ? (
            <>
              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => { setAcao('concluir'); setTexto(''); }}>
                <CheckCircle2 size={13} /> Concluir
              </button>
              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => { setAcao('cancelar'); setTexto(''); }}>
                <XCircle size={13} /> Cancelar
              </button>
            </>
          ) : (
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => reabrirDemanda(d.id, usuario)}>
              <RotateCcw size={13} /> Reabrir
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        <Campo rotulo="Motivo do encaminhamento">{d.motivo}</Campo>

        {d.etapasImpactadas.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: '#94A3B8' }}>
              Etapas potencialmente impactadas
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {d.etapasImpactadas.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px]"
                  style={{
                    background: aberta ? '#FFF7ED' : '#F8FAFC',
                    border: `1px solid ${aberta ? '#FDBA74' : '#E2E8F0'}`,
                    borderRadius: 999,
                    color: aberta ? '#9A3412' : '#94A3B8',
                  }}
                >
                  <AlertTriangle size={11} /> {ETAPA_IMPACTADA_LABEL[e]}
                </span>
              ))}
            </div>
            {aberta && (
              <p className="text-[12px] mt-1.5" style={{ color: '#92400E' }}>
                Alerta apenas. O setor responsável decide se aguarda a análise social.
              </p>
            )}
          </div>
        )}

        {d.situacao === 'concluida' && (
          <Campo rotulo={`Orientação final · ${dataHoraBR(d.dataConclusao)} · ${d.concluidaPor ?? ''}`}>
            {d.orientacaoFinal ?? 'Sem orientação registrada.'}
          </Campo>
        )}

        {d.situacao === 'cancelada' && (
          <Campo rotulo={`Motivo do cancelamento · ${dataHoraBR(d.dataConclusao)} · ${d.concluidaPor ?? ''}`}>
            {d.motivoCancelamento ?? 'Sem motivo registrado.'}
          </Campo>
        )}

        {acao && (
          <div className="px-3 py-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <p className="text-[12px] font-semibold mb-1.5" style={{ color: '#1E293B' }}>
              {acao === 'concluir' ? 'Orientação final' : 'Motivo do cancelamento'}
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder={
                acao === 'concluir'
                  ? 'Registre a orientação final da equipe social para esta demanda.'
                  : 'Registre por que a demanda está sendo cancelada.'
              }
              className="w-full text-[13px] px-3 py-2 outline-none resize-y"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 6, color: '#1A1D2B' }}
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={fecharAcao}>
                Cancelar
              </button>
              <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={confirmar}>
                {acao === 'concluir' ? 'Concluir demanda' : 'Cancelar demanda'}
              </button>
            </div>
            <p className="text-[11.5px] mt-2" style={{ color: '#94A3B8' }}>
              A data e hora e a pessoa são registradas automaticamente. Os instrumentos
              já criados continuam disponíveis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Primitivos visuais, iguais aos das abas Regulação e Financeiro            */
/* -------------------------------------------------------------------------- */

function Section({ icon: Icon, title, subtitle, action, children }: {
  icon: typeof HeartHandshake; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="mb-6 p-6" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}>
      <div className="flex items-start gap-3 mb-5">
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
          <Icon size={16} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold" style={{ color: '#0F172A' }}>{title}</h3>
          {subtitle && <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, dotTone }: { label: string; value: number; dotTone?: StatusDotTone }) {
  return (
    <div className="flex-1 px-6 py-4">
      <div className="flex items-center gap-2 mb-1">
        {dotTone && (
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: dotTone === 'warning' ? '#D97706' : dotTone === 'success' ? '#16A34A' : '#94A3B8' }} />
        )}
        <span className="text-[12px] font-semibold uppercase" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function StatDivider() {
  return <div style={{ width: 1, background: '#E2E8F0' }} />;
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: '#94A3B8' }}>
        {rotulo}
      </p>
      <p className="text-[13px] leading-relaxed" style={{ color: '#1E293B' }}>
        {children}
      </p>
    </div>
  );
}

function ThMini({
  children,
  align = 'left',
  style,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} px-3 py-2 font-medium`}
      style={{ color: '#475569', ...style }}
    >
      {children}
    </th>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  color,
  hoverBg,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  color: string;
  hoverBg: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center transition-colors"
      style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color, cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}
