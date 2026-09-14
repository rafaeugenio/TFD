'use client';

import { useMemo, useState } from 'react';
import {
  HeartHandshake, Plus, FileText, Lock, Eye, Download, AlertTriangle,
  CheckCircle2, XCircle, PlayCircle, RotateCcw, Home,
} from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import StatusDot, { type StatusDotTone } from './StatusDot';
import EncaminharServicoSocialDrawer from './drawers/EncaminharServicoSocialDrawer';
import NewInstrumentoDrawer from './drawers/NewInstrumentoDrawer';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import {
  useDemandasDaSolicitacao,
  useServicoSocial,
  instrumentosDaDemanda,
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
 * Aba Serviço Social do detalhe da solicitação. Concentra as demandas sociais
 * e os instrumentos daquela solicitação, em ordem decrescente de data de
 * encaminhamento. Nada aqui altera o setor ou a etapa do fluxo principal.
 */
export default function ServicoSocialTab({ s }: { s: SolicitacaoMock }) {
  const { user } = usePermissions();
  useServicoSocial(); // assina o store para reagir a qualquer escrita
  const demandas = useDemandasDaSolicitacao(s.id);

  const [encaminharOpen, setEncaminharOpen] = useState(false);
  const [instrumentoPara, setInstrumentoPara] = useState<DemandaSocialMock | null>(null);
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

  const abertas = useMemo(() => demandas.filter(demandaEstaAberta), [demandas]);

  return (
    <div className="min-w-0">
      {/* ── Cabeçalho da aba ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>
            Serviço Social
          </h3>
          <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>
            {demandas.length === 0
              ? 'Nenhuma demanda social nesta solicitação.'
              : `${demandas.length} demanda${demandas.length > 1 ? 's' : ''} no total, ${abertas.length} em aberto.`}
          </p>
        </div>
        <button
          type="button"
          className="tfd-btn tfd-btn-primary"
          onClick={() => setEncaminharOpen(true)}
        >
          <HeartHandshake size={14} /> Encaminhar ao Serviço Social
        </button>
      </div>

      {/* ── Seletor de visão (protótipo) ───────────────────── */}
      {!acessoReal && (
        <div
          className="flex items-center gap-2.5 px-3 py-2 mb-4 text-[12px]"
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

      {/* ── Lista de demandas ──────────────────────────────── */}
      {demandas.length === 0 ? (
        <div
          className="text-center py-12"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)' }}
        >
          <HeartHandshake size={22} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
          <p className="text-[13px]" style={{ color: '#64748B' }}>
            Esta solicitação ainda não foi encaminhada ao Serviço Social.
          </p>
          <p className="text-[12px] mt-1" style={{ color: '#94A3B8' }}>
            O encaminhamento corre em paralelo e não muda o setor da solicitação.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {demandas.map((d) => (
            <DemandaCard
              key={d.id}
              d={d}
              podeAbrirSigiloso={podeAbrirSigiloso}
              usuario={user?.nome_completo ?? 'Você'}
              onCriarInstrumento={() => setInstrumentoPara(d)}
              onVisualizar={setVisualizando}
            />
          ))}
        </div>
      )}

      <EncaminharServicoSocialDrawer
        open={encaminharOpen}
        onClose={() => setEncaminharOpen(false)}
        s={s}
      />

      {instrumentoPara && (
        <NewInstrumentoDrawer
          open={!!instrumentoPara}
          onClose={() => setInstrumentoPara(null)}
          s={s}
          demanda={instrumentoPara}
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
  podeAbrirSigiloso,
  usuario,
  onCriarInstrumento,
  onVisualizar,
}: {
  d: DemandaSocialMock;
  podeAbrirSigiloso: boolean;
  usuario: string;
  onCriarInstrumento: () => void;
  onVisualizar: (i: InstrumentoSocialMock) => void;
}) {
  const instrumentos = instrumentosDaDemanda(d.id);
  const [acao, setAcao] = useState<'concluir' | 'cancelar' | null>(null);
  const [texto, setTexto] = useState('');

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
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 'var(--tfd-radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Cabeçalho */}
      <div className="px-4 py-3 flex items-start justify-between gap-3 flex-wrap" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusDot tone={SITUACAO_TONE[d.situacao]} strong>
              {SITUACAO_DEMANDA_LABEL[d.situacao]}
            </StatusDot>
            <span className="text-[12px]" style={{ color: '#94A3B8' }}>
              {dataHoraBR(d.dataEncaminhamento)}
            </span>
          </div>
          <p className="text-[12.5px] mt-1" style={{ color: '#64748B' }}>
            Encaminhada por <span style={{ color: '#1E293B', fontWeight: 500 }}>{d.encaminhadoPor}</span>
            {' · '}
            {SETOR_ORIGEM_LABEL[d.setorOrigem]}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {d.situacao === 'pendente' && (
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              onClick={() => assumirDemanda(d.id, usuario)}
            >
              <PlayCircle size={13} /> Assumir
            </button>
          )}
          {demandaEstaAberta(d) && (
            <>
              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => { setAcao('concluir'); setTexto(''); }}>
                <CheckCircle2 size={13} /> Concluir
              </button>
              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => { setAcao('cancelar'); setTexto(''); }}>
                <XCircle size={13} /> Cancelar
              </button>
            </>
          )}
          {!demandaEstaAberta(d) && (
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => reabrirDemanda(d.id, usuario)}>
              <RotateCcw size={13} /> Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Corpo */}
      <div className="px-4 py-3 flex flex-col gap-3">
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
                    background: demandaEstaAberta(d) ? '#FFF7ED' : '#F8FAFC',
                    border: `1px solid ${demandaEstaAberta(d) ? '#FDBA74' : '#E2E8F0'}`,
                    borderRadius: 999,
                    color: demandaEstaAberta(d) ? '#9A3412' : '#94A3B8',
                  }}
                >
                  <AlertTriangle size={11} /> {ETAPA_IMPACTADA_LABEL[e]}
                </span>
              ))}
            </div>
            {demandaEstaAberta(d) && (
              <p className="text-[12px] mt-1.5" style={{ color: '#92400E' }}>
                Alerta apenas. O setor responsável decide se aguarda a análise social.
              </p>
            )}
          </div>
        )}

        {d.profissionalResponsavel && (
          <Campo rotulo="Profissional responsável">{d.profissionalResponsavel}</Campo>
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

        {/* Ação inline de concluir/cancelar */}
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

        {/* Instrumentos */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#94A3B8' }}>
              Instrumentos ({instrumentos.length})
            </p>
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={onCriarInstrumento}>
              <Plus size={13} /> Criar instrumento
            </button>
          </div>

          {instrumentos.length === 0 ? (
            <p className="text-[12.5px] py-2" style={{ color: '#CBD5E1' }}>
              Nenhum instrumento criado nesta demanda.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {instrumentos.map((i) => (
                <InstrumentoRow
                  key={i.id}
                  i={i}
                  podeAbrirSigiloso={podeAbrirSigiloso}
                  onVisualizar={() => onVisualizar(i)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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

/* -------------------------------------------------------------------------- */
/*  Linha de instrumento, com a regra de sigilo                               */
/* -------------------------------------------------------------------------- */

function InstrumentoRow({
  i,
  podeAbrirSigiloso,
  onVisualizar,
}: {
  i: InstrumentoSocialMock;
  podeAbrirSigiloso: boolean;
  onVisualizar: () => void;
}) {
  const bloqueado = i.sigiloso && !podeAbrirSigiloso;
  const casa = casaPorId(i.casaApoioId);

  return (
    <li
      className="flex items-center gap-2.5 px-3 py-2"
      style={{
        background: i.sigiloso ? '#FEF2F2' : '#F8FAFC',
        border: `1px solid ${i.sigiloso ? '#FECACA' : '#E2E8F0'}`,
        borderRadius: 6,
      }}
    >
      <FileText size={14} className="shrink-0" style={{ color: i.sigiloso ? '#B91C1C' : '#64748B' }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-medium truncate" style={{ color: '#1A1D2B' }}>
            {TIPO_INSTRUMENTO_LABEL[i.tipo]}
          </span>
          {i.sigiloso && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.05em]"
              style={{ background: '#B91C1C', color: 'white', borderRadius: 4 }}
            >
              <Lock size={9} /> Sigiloso
            </span>
          )}
        </div>
        <p className="text-[12px]" style={{ color: '#64748B' }}>
          {i.autora} · {dataHoraBR(i.dataCriacao)}
          {casa && (
            <>
              {' · '}
              <span className="inline-flex items-center gap-1">
                <Home size={10} /> {casa.nome}
              </span>
            </>
          )}
        </p>
      </div>

      {bloqueado ? (
        <span
          className="text-[11.5px] shrink-0 text-right leading-tight"
          style={{ color: '#B91C1C', maxWidth: 240 }}
          title="Conteúdo restrito às profissionais do Serviço Social. Administradores e a direção do TFD veem que o instrumento existe, mas não abrem nem baixam."
        >
          Conteúdo restrito ao Serviço Social
        </span>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={onVisualizar}>
            <Eye size={13} /> Ver
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            title="No protótipo o download não gera arquivo."
            onClick={onVisualizar}
          >
            <Download size={13} />
          </button>
        </div>
      )}
    </li>
  );
}
