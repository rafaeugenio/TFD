'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FileText, Paperclip, Sparkles, Stethoscope, UserCircle2, Users, X, Gavel, BookOpen, MessageSquareWarning } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import Autocomplete, { type AutocompleteOption } from '@/shared/components/autocomplete/Autocomplete';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import {
  templatesParecer,
  aplicarPlaceholders,
  templateExigeVarianteServicoMA,
  VARIANTE_SERVICO_MA_LABEL,
  type VarianteServicoMA,
} from '../../_data/templates-parecer';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import { buscarCid10 } from '@/services/cid10.service';
import { buscarCid11 } from '@/services/cid11.service';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { calcularIdade } from '@/shared/utils/idade';
import type { DecisaoParecer, ParecerMock, TipoParecer } from '@/core/mocks/fluxo-v2-v3-seed';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

/**
 * Wrapper que força o <input> interno do Autocomplete a usar exatamente
 * a mesma fonte, padding, borda e raio dos selects nativos do drawer.
 * Tailwind arbitrary-variants ([&_input]) entra no input filho sem mexer
 * no componente Autocomplete em si.
 */
const cidWrapperClass =
  '[&_input]:w-full ' +
  '[&_input]:px-3 [&_input]:py-2 ' +
  '[&_input]:text-[13px] ' +
  '[&_input]:bg-white ' +
  '[&_input]:rounded-[8px] ' +
  '[&_input]:border [&_input]:border-[var(--tfd-surface-border)] ' +
  '[&_input]:shadow-none';

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  /** Quando informado, drawer mostra um header secundário com infos do paciente. */
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição. */
  editar?: ParecerMock;
}

export default function NewParecerDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addParecer, editarParecer, getById, addAnexos } = useFluxoV2State();
  const toast = useToast();
  const solicitacao = getById(solicitacaoId);
  const isEdicao = !!editar;
  const { user: currentUser, loading: loadingUser } = useCurrentUser();
  const { isAdmin } = usePermissions();

  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const [decisao, setDecisao] = useState<DecisaoParecer>('deferido');
  // `tipo` ainda é gravado no ParecerMock pra retrocompat — fixado em
  // 'tfd_completo' já que a UI de seleção foi removida (só temos 2 templates).
  const tipo: TipoParecer = 'tfd_completo';
  const [cidPrincipal, setCidPrincipal] = useState('');
  const [cidPrincipalNome, setCidPrincipalNome] = useState('');
  const [cidSecundario, setCidSecundario] = useState('');
  const [cidSecundarioNome, setCidSecundarioNome] = useState('');
  const [versaoCID, setVersaoCID] = useState<'10' | '11'>('10');
  const [obs, setObs] = useState('');
  /** Variante "serviço no MA" — só usada em templates deferidos que oferecem
   *  as duas opções (TFD completo, Ajuda de custo). Default sem_servico_ma. */
  const [varianteServicoMA, setVarianteServicoMA] = useState<VarianteServicoMA>('sem_servico_ma');
  /** Quando o parecer editado tem um ajuste pendente da enfermeira, o médico
   *  escolhe se a correção que está fazendo agora resolve o ajuste (remove
   *  a observação) ou se ainda precisa de mais uma rodada. Marcado por
   *  padrão — a expectativa normal é resolver ao salvar. */
  const [resolverAjuste, setResolverAjuste] = useState(true);

  // Dados do médico — em modo CRIAÇÃO vêm do usuário logado (snapshot do perfil).
  // Em modo EDIÇÃO mantemos o que foi gravado no parecer original (não sobrescreve).
  const medicoNome = isEdicao && editar ? editar.medico : (currentUser?.nome ?? '');
  const medicoCrm = isEdicao && editar ? (editar.medicoCrm ?? '') : (currentUser?.crm ?? '');
  const medicoCrmUf = isEdicao && editar ? (editar.medicoCrmUf ?? '') : (currentUser?.crmUf ?? '');
  const medicoEspecialidade =
    isEdicao && editar
      ? (editar.medicoEspecialidade ?? '')
      : (currentUser?.especialidadeMedica ?? '');

  // Admin master pode emitir parecer mesmo sem CRM (atua como suporte/coordenação).
  // Demais perfis com permissão de parecer continuam obrigados a ter CRM/UF no perfil.
  const perfilSnapshotIncompleto =
    !isEdicao && !loadingUser && !isAdmin && (!medicoCrm.trim() || !medicoCrmUf.trim());

  useEffect(() => {
    if (open) {
      if (editar) {
        setDecisao(editar.decisao);
        setCidPrincipal(editar.cidPrincipal ?? '');
        setCidPrincipalNome(editar.cidPrincipalNome ?? '');
        setCidSecundario(editar.cidSecundario ?? '');
        setCidSecundarioNome(editar.cidSecundarioNome ?? '');
        setVersaoCID(editar.versaoCID ?? '10');
        setObs(editar.observacao ?? '');
        setResolverAjuste(true);
      } else {
        setDecisao('deferido');
        setCidPrincipal('');
        setCidPrincipalNome('');
        setCidSecundario('');
        setCidSecundarioNome('');
        setVersaoCID('10');
        setObs('');
      }
    }
  }, [open, editar]);

  /**
   * Template é único para cada combinação de tipo + decisão.
   * Pegamos o primeiro disponível — se houver mais de um, vence o primeiro
   * registrado no array. Se não houver, o botão fica desabilitado.
   */
  // Apenas 2 templates totais: um deferido + um indeferido. Casa por decisao.
  const templateAtual = templatesParecer.find((t) => t.decisao === decisao);

  const exigeVariante = templateExigeVarianteServicoMA(tipo, decisao);

  function aplicarModelo() {
    if (!templateAtual) return;
    const medicoCtx = {
      nome: medicoNome,
      crm: medicoCrm,
      crmUf: medicoCrmUf,
      especialidade: medicoEspecialidade,
    };
    const variante = exigeVariante ? varianteServicoMA : undefined;
    const textoFinal = aplicarPlaceholders(
      templateAtual.texto,
      solicitacao,
      templateAtual.tipo,
      medicoCtx,
      variante,
    );
    setObs(textoFinal);
  }

  /* Search handlers para autocomplete dos CIDs — depende da versão selecionada */
  const cidSearch = useCallback(
    async (q: string): Promise<AutocompleteOption[]> => {
      if (!q.trim()) return [];
      const fn = versaoCID === '11' ? buscarCid11 : buscarCid10;
      const { data } = await fn(q);
      const rows = (data ?? []) as { codigo: string; descricao: string }[];
      return rows.map((r) => ({
        value: r.codigo,
        label: r.codigo,
        descricao: r.descricao,
      }));
    },
    [versaoCID],
  );

  const renderCidOption = (item: AutocompleteOption) => (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[12px] font-semibold" style={{ color: '#146BFA' }}>
        {item.value}
      </span>
      <span className="text-[12px]" style={{ color: '#475569' }}>
        {item.descricao as string}
      </span>
    </div>
  );

  const temAjustePendente = isEdicao && !!editar?.observacaoAjuste;

  function handleSalvar() {
    const payload = {
      decisao,
      tipo,
      cidPrincipal: cidPrincipal || undefined,
      cidPrincipalNome: cidPrincipalNome || undefined,
      cidSecundario: cidSecundario || undefined,
      cidSecundarioNome: cidSecundarioNome || undefined,
      versaoCID,
      observacao: obs || undefined,
      medico: medicoNome,
      medicoCrm: medicoCrm || undefined,
      medicoCrmUf: medicoCrmUf || undefined,
      medicoEspecialidade: medicoEspecialidade || undefined,
      // Ajuste pendente some quando o médico marca "resolver ao salvar" —
      // do contrário, a observação da enfermeira permanece no parecer.
      observacaoAjuste: temAjustePendente && !resolverAjuste ? editar!.observacaoAjuste : undefined,
    };
    if (isEdicao && editar) {
      editarParecer(solicitacaoId, editar.id, payload);
      toast.success(
        temAjustePendente && resolverAjuste ? 'Ajuste resolvido' : 'Parecer atualizado',
        `Decisão: ${decisao}.`,
      );
    } else {
      addParecer(solicitacaoId, payload);
      toast.success('Parecer registrado', `Decisão: ${decisao}.`);
    }
    if (anexos.length > 0) {
      addAnexos(solicitacaoId, anexos, 'parecer');
    }
    setAnexos([]);
    onClose();
  }

  // T2.AH — Cores específicas por decisão para destaque visual.
  const DEC_VISUAL: Record<DecisaoParecer, { borda: string; bg: string; fg: string; label: string }> = {
    deferido: { borda: '#15803D', bg: '#DCFCE7', fg: '#15803D', label: 'Deferido' },
    indeferido: { borda: '#B91C1C', bg: '#FEE2E2', fg: '#B91C1C', label: 'Indeferido' },
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar parecer médico' : 'Novo parecer médico'}
      subtitle="Decisão, CIDs e observações do médico regulador."
      width="560px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!medicoNome.trim() || perfilSnapshotIncompleto}
            title={
              perfilSnapshotIncompleto
                ? 'Informe seu CRM em Meu Perfil antes de emitir parecer.'
                : undefined
            }
          >
            {isEdicao ? 'Salvar alterações' : 'Salvar parecer'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      {/* Resumo da solicitação — paciente + acompanhantes + anexos.
          Dá ao médico tudo que precisa para emitir o parecer sem sair do drawer. */}
      {solicitacao && <ResumoSolicitacaoCard sol={solicitacao} />}

      {/* Ajuste pedido pela enfermeira da Regulação — destacado para o médico
          ler antes de mais nada. Some do parecer quando o médico marca a
          correção como resolvida ao salvar. */}
      {temAjustePendente && (
        <div
          className="flex items-start gap-2.5 mb-4 px-3 py-2.5"
          style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, color: '#78350F' }}
          role="alert"
        >
          <MessageSquareWarning size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1 text-[12.5px] leading-relaxed">
            <strong style={{ color: '#92400E' }}>Ajuste pedido pela Regulação:</strong>{' '}
            {editar?.observacaoAjuste}
            <label className="flex items-center gap-2 mt-2 text-[12px] font-medium" style={{ color: '#92400E' }}>
              <input
                type="checkbox"
                checked={resolverAjuste}
                onChange={(e) => setResolverAjuste(e.target.checked)}
                style={{ accentColor: '#B45309' }}
              />
              Resolver ajuste ao salvar
            </label>
          </div>
        </div>
      )}

      {/* T2.AH — Decisão (segmented control com 2 opções) */}
      <FormSection title="Decisão" icon={<Gavel size={12} />} tone="primary">
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Decisão
      </label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['deferido', 'indeferido'] as DecisaoParecer[]).map((d) => {
          const v = DEC_VISUAL[d];
          const ativo = decisao === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDecisao(d)}
              className="px-3 py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                border: '1px solid ' + (ativo ? v.borda : 'var(--tfd-surface-border)'),
                background: ativo ? v.bg : 'white',
                color: ativo ? v.fg : '#475569',
                borderRadius: 8,
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Variante "serviço no MA" — só aparece em Deferido.
          A escolha aqui muda o parágrafo inserido pelo "Inserir template". */}
      {exigeVariante && (
        <>
          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            Situação do serviço no Maranhão
          </label>
          <select
            value={varianteServicoMA}
            onChange={(e) => setVarianteServicoMA(e.target.value as VarianteServicoMA)}
            className="w-full px-3 py-2 text-[13px] mb-1"
            style={inputStyle}
          >
            {(Object.keys(VARIANTE_SERVICO_MA_LABEL) as VarianteServicoMA[]).map((v) => (
              <option key={v} value={v}>{VARIANTE_SERVICO_MA_LABEL[v]}</option>
            ))}
          </select>
          <p className="text-[11px] mb-4" style={{ color: '#9CA3AF' }}>
            Define qual parágrafo entra no template ao clicar em <strong>Inserir template</strong>.
          </p>
        </>
      )}

      {/* Template — único botão de ação direta */}
      <div className="mb-4">
        <button
          type="button"
          onClick={aplicarModelo}
          disabled={!templateAtual}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: templateAtual ? '#475569' : '#CBD5E1',
            cursor: templateAtual ? 'pointer' : 'not-allowed',
          }}
          title={
            templateAtual
              ? 'Preencher a observação com o modelo padrão para esta combinação.'
              : 'Nenhum modelo padrão para esta combinação de tipo e decisão.'
          }
        >
          <Sparkles size={13} style={{ color: templateAtual ? 'var(--tfd-blue)' : '#CBD5E1' }} />
          Inserir template
        </button>
      </div>

      </FormSection>

      {/* T2.AI — Versão CID + CIDs (autocomplete) */}
      <FormSection title="Diagnóstico (CIDs)" icon={<BookOpen size={12} />} tone="info">
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Versão CID
      </label>
      <div
        className="inline-flex items-center gap-0 mb-4 p-0.5"
        style={{
          background: '#F1F5F9',
          borderRadius: 999,
        }}
      >
        {(['10', '11'] as const).map((v) => {
          const ativo = versaoCID === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVersaoCID(v)}
              className="px-3 py-1 text-[12px] font-semibold transition-colors"
              style={{
                background: ativo ? 'white' : 'transparent',
                color: ativo ? '#1A1D2B' : '#64748B',
                borderRadius: 999,
                boxShadow: ativo ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                minWidth: 64,
              }}
            >
              CID-{v}
            </button>
          );
        })}
      </div>

      {/* CIDs — autocomplete puxando da tabela CID-10 ou CID-11.
          Empilhados; após seleção exibimos código + descrição juntos.
          O texto do parecer NÃO é preenchido automaticamente — o médico digita
          o diagnóstico manualmente quando precisar variar.
          Wrapper [&_input] padroniza o input do autocomplete pra casar com os
          selects do drawer (mesma fonte 13px, padding 8/12, raio 8, borda). */}
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        CID principal
      </label>
      <div className={cidWrapperClass + ' mb-1'}>
        <Autocomplete
          placeholder={`Buscar código ou descrição (CID-${versaoCID})`}
          value={cidPrincipal}
          onChange={(v) => {
            setCidPrincipal(v);
            // Se o usuário apaga, limpa o nome também — evita estado inconsistente.
            if (!v) setCidPrincipalNome('');
          }}
          onSearch={cidSearch}
          onSelect={(item) => {
            setCidPrincipal(item.value);
            setCidPrincipalNome((item.descricao as string) ?? '');
          }}
          renderOption={renderCidOption}
          size="sm"
        />
      </div>
      <CidSelecionadoChip
        codigo={cidPrincipal}
        nome={cidPrincipalNome}
        onClear={() => { setCidPrincipal(''); setCidPrincipalNome(''); }}
        className="mb-5"
      />

      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        CID secundário <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
      </label>
      <div className={cidWrapperClass + ' mb-1'}>
        <Autocomplete
          placeholder={`Buscar código ou descrição (CID-${versaoCID})`}
          value={cidSecundario}
          onChange={(v) => {
            setCidSecundario(v);
            if (!v) setCidSecundarioNome('');
          }}
          onSearch={cidSearch}
          onSelect={(item) => {
            setCidSecundario(item.value);
            setCidSecundarioNome((item.descricao as string) ?? '');
          }}
          renderOption={renderCidOption}
          size="sm"
        />
      </div>
      <CidSelecionadoChip
        codigo={cidSecundario}
        nome={cidSecundarioNome}
        onClear={() => { setCidSecundario(''); setCidSecundarioNome(''); }}
        className="mb-6"
      />

      </FormSection>

      {/* Parecer + Médico */}
      <FormSection title="Parecer" icon={<FileText size={12} />} tone="success">
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Observação
      </label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={16}
        placeholder="Observações do parecer..."
        className="w-full px-3 py-2 text-[13px] mb-4 leading-relaxed"
        style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 320 }}
      />

      {/* Médico — preenchido automaticamente a partir do usuário logado */}
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Médico responsável
      </label>
      <div
        className="flex items-start gap-3 p-3 mb-2"
        style={{
          background: '#F8FAFC',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8,
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--tfd-primary-50, #EBF0FF)',
            color: 'var(--tfd-primary-500)',
          }}
        >
          <UserCircle2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: '#1A1D2B' }}>
            {medicoNome || (loadingUser ? 'Carregando...' : '—')}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px]" style={{ color: '#64748B' }}>
            {medicoCrm && medicoCrmUf && (
              <span className="inline-flex items-center gap-1">
                <Stethoscope size={11} style={{ color: '#94A3B8' }} />
                <span className="font-mono">CRM {medicoCrm}/{medicoCrmUf}</span>
              </span>
            )}
            {medicoEspecialidade && <span>{medicoEspecialidade}</span>}
            {!isEdicao && currentUser?.email && (
              <span style={{ color: '#94A3B8' }}>{currentUser.email}</span>
            )}
          </div>
        </div>
        {!isEdicao && (
          <Link
            href="/meu-perfil"
            className="text-[11px] font-medium hover:underline shrink-0"
            style={{ color: 'var(--tfd-primary-500)' }}
          >
            Editar perfil
          </Link>
        )}
      </div>
      {perfilSnapshotIncompleto && (
        <div
          className="flex items-start gap-2 p-2.5 text-[12px]"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: 8,
            color: '#92400E',
          }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-px" />
          <span>
            Você precisa informar seu <strong>CRM</strong> e <strong>UF</strong> em{' '}
            <Link href="/meu-perfil" className="underline font-semibold">Meu Perfil</Link>{' '}
            antes de emitir um parecer. Esses dados aparecem no template e no PDF do parecer.
          </span>
        </div>
      )}
      </FormSection>

      <AnexosUploadField value={anexos} onChange={setAnexos} />
    </Drawer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponentes                                                            */
/* -------------------------------------------------------------------------- */

/** Chip que aparece logo abaixo do autocomplete de CID com o código + descrição
 *  selecionados — dá ao médico a confirmação visual do que ele escolheu. */
function CidSelecionadoChip({
  codigo,
  nome,
  onClear,
  className = '',
}: {
  codigo: string;
  nome: string;
  onClear: () => void;
  className?: string;
}) {
  if (!codigo || !nome) return null;
  return (
    <div
      className={`inline-flex items-start gap-2 px-2.5 py-1.5 text-[12px] ${className}`}
      style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 6,
        color: '#1E40AF',
        maxWidth: '100%',
      }}
    >
      <span className="font-mono font-semibold shrink-0">{codigo}</span>
      <span style={{ color: '#1E3A8A' }} className="flex-1">{nome}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Limpar CID"
        style={{ color: '#64748B' }}
        className="shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** Card de resumo da solicitação exibido no topo do drawer.
 *  Mostra paciente, acompanhantes e anexos (com destaque para o laudo) para que
 *  o médico possa avaliar tudo o que precisa sem fechar o drawer. */
function ResumoSolicitacaoCard({
  sol,
}: {
  sol: import('@/core/mocks/fluxo-v2-v3-seed').SolicitacaoMock;
}) {
  const p = sol.paciente;
  const ehLaudo = (nome: string) => /laudo/i.test(nome);
  const laudos = sol.anexos.filter((a) => ehLaudo(a.nome));
  const outros = sol.anexos.filter((a) => !ehLaudo(a.nome));

  const fmtDataBR = (iso?: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };

  return (
    <section
      className="mb-4 p-3"
      style={{
        background: '#F8FAFC',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 10,
      }}
    >
      <header className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
          Resumo da solicitação
        </h3>
        <Link
          href={`/fluxo-v2/solicitacoes/${sol.id}`}
          target="_blank"
          rel="noopener"
          className="text-[11px] hover:underline"
          style={{ color: 'var(--tfd-blue)' }}
        >
          Abrir solicitação ↗
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]" style={{ color: '#334155' }}>
        <Linha label="Paciente" valor={p.nome} />
        <Linha label="Sexo / Idade" valor={`${p.sexo === 'F' ? 'Feminino' : 'Masculino'} · ${calcularIdade(p.dataNascimento)} anos`} />
        <Linha label="CPF" valor={p.cpf} mono />
        <Linha label="Nascimento" valor={fmtDataBR(p.dataNascimento)} />
        <Linha label="Município" valor={p.municipio} />
        <Linha label="Data do laudo" valor={fmtDataBR(sol.dataLaudo)} />
      </div>

      {sol.acompanhantes.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #CBD5E1' }}>
          <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
            <Users size={11} /> Acompanhantes ({sol.acompanhantes.length})
          </div>
          <ul className="flex flex-col gap-0.5 text-[12px]" style={{ color: '#334155' }}>
            {sol.acompanhantes.map((a) => (
              <li key={a.id} className="flex items-center gap-1.5">
                <span style={{ fontWeight: 500 }}>{a.nome}</span>
                {a.doador && (
                  <span
                    title="Doador (órgão/tecido) — conta como paciente no BPA"
                    className="inline-flex items-center text-[10px] font-semibold"
                    style={{ background: '#FFE4E6', color: '#9F1239', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}
                  >
                    Doador
                  </span>
                )}
                <span style={{ color: '#64748B' }}>· {a.vinculo} · {calcularIdade(a.dataNascimento)} anos</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #CBD5E1' }}>
        <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
          <Paperclip size={11} /> Documentos ({sol.anexos.length})
        </div>
        {sol.anexos.length === 0 ? (
          <p className="text-[12px]" style={{ color: '#94A3B8' }}>
            Nenhum documento anexado. <strong style={{ color: '#B45309' }}>Atenção:</strong> laudo costuma ser obrigatório.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {[...laudos, ...outros].map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-[12px]">
                <FileText size={12} style={{ color: ehLaudo(a.nome) ? '#1D4ED8' : '#94A3B8' }} />
                <Link
                  href={`/fluxo-v2/solicitacoes/${sol.id}?tab=anexos`}
                  target="_blank"
                  rel="noopener"
                  className="hover:underline"
                  style={{ color: ehLaudo(a.nome) ? '#1D4ED8' : '#334155', fontWeight: ehLaudo(a.nome) ? 600 : 400 }}
                >
                  {a.nome}
                </Link>
                {ehLaudo(a.nome) && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 4 }}
                  >
                    Laudo
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Linha({ label, valor, mono }: { label: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10.5px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>{label}</span>
      <span className={mono ? 'font-mono' : ''} style={{ color: '#1E293B' }}>{valor || '—'}</span>
    </div>
  );
}
