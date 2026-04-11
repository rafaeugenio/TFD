'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Plane,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ArrowRight,
  Ticket,
  Eye,
  SendHorizonal,
  Upload,
  Paperclip,
  X,
  Loader2,
  FileText,
  RefreshCcw,
  Ban,
  UserX,
  List,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import RotaSelect from '@/shared/components/rota-select/RotaSelect';
import CompanhiaSelect from '@/shared/components/companhia-select/CompanhiaSelect';
import type { RotaDeslocamento } from '@/core/models/rota-deslocamento.model';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarViagens,
  criarViagem,
  atualizarViagem,
  atualizarViagemComAuditoria,
  listarHistoricoViagem,
  listarSolicitacoesAguardandoEmissao,
  confirmarEmbarque,
  registrarNoShow,
  cancelarViagem,
  remarcarViagem,
} from '@/services/viagens.service';
import { uploadDocumento, listarDocumentosPorViagem } from '@/services/documentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import type { SituacaoViagem, TipoDocumento } from '@/lib/supabase/database.types';
import { formatCurrency, maskCurrency, parseCurrency } from '@/shared/pipes/formatters';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import { slaBadge } from '@/shared/utils/sla';
import { useDevolucoeRecebidas } from '@/shared/hooks/useDevolucoeRecebidas';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';


/* -------------------------------------------------- */
/*  Page-level tabs                                    */
/* -------------------------------------------------- */

type PageTab = 'disponiveis' | 'passagens';


/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface SituacaoStyle { bg: string; text: string; label: string }

const situacaoMap: Record<SituacaoViagem, SituacaoStyle> = {
  AGUARDANDO_EMISSAO: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  EMITIDA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Emitida' },
  REMARCADA: { bg: '#E0E7FF', text: '#4338CA', label: 'Remarcada' },
  CANCELADA: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Cancelada' },
  NO_SHOW: { bg: '#FEE2E2', text: '#B91C1C', label: 'Não Compareceu' },
  UTILIZADA: { bg: '#DCFCE7', text: '#15803D', label: 'Utilizada' },
};

const SITUACOES_TERMINAIS: SituacaoViagem[] = ['CANCELADA', 'NO_SHOW', 'REMARCADA'];

/* -------------------------------------------------- */
/*  Helper                                             */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

/* -------------------------------------------------- */
/*  Drawer modes                                       */
/* -------------------------------------------------- */

type DrawerTab = 'ida' | 'volta';
type DrawerMode = 'create' | 'view';

/* -------------------------------------------------- */
/*  Inline confirmation state within drawer            */
/* -------------------------------------------------- */

type InlineConfirmType = 'embarque' | 'nao_compareceu' | 'cancelar' | null;

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function ViagensPage() {
  const toast = useToast();
  const { user: currentUser } = useCurrentUser();
  const [pageTab, setPageTab] = useState<PageTab>('disponiveis');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('ida');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewViagem, setViewViagem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---- Inline confirmation (inside drawer, no modal) ---- */
  const [inlineConfirm, setInlineConfirm] = useState<InlineConfirmType>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');

  /* ---- Remarcar sub-form ---- */
  const [remarcarOpen, setRemarcarOpen] = useState(false);
  const [remarcarNovaData, setRemarcarNovaData] = useState('');
  const [remarcarMotivo, setRemarcarMotivo] = useState('');

  /* ---- Devolver ---- */
  const [devolverItem, setDevolverItem] = useState<any>(null);

  /* ---- P6 — Edição inline de passagem já emitida + histórico de auditoria ---- */
  const [editingViagem, setEditingViagem] = useState<any>(null);
  const [editCompanhia, setEditCompanhia] = useState('');
  const [editBilhete, setEditBilhete] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editDataEmbarque, setEditDataEmbarque] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [historicoViagem, setHistoricoViagem] = useState<any[]>([]);

  /* ---- Anexo ida/volta drawer ---- */
  const [anexoViagem, setAnexoViagem] = useState<{ viagemId: string; tipo: 'ida' | 'volta'; paciente: string } | null>(null);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [anexoUploading, setAnexoUploading] = useState(false);
  const [anexoDocs, setAnexoDocs] = useState<any[]>([]);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('PASSAGENS');
  const { mapa: devolucoesRecebidas, labelOrigem } = useDevolucoeRecebidas('PASSAGENS');

  /* ---- Disponíveis (solicitações aguardando emissão sem viagem ativa) ---- */
  const [solDisp, setSolDisp] = useState<any[]>([]);
  const [solDispLoading, setSolDispLoading] = useState(false);
  const devolvedIds = useMemo(() => Array.from(devolucoesEnviadas.keys()), [devolucoesEnviadas]);

  async function refreshDisp() {
    setSolDispLoading(true);
    const { data } = await listarSolicitacoesAguardandoEmissao({ includeIds: devolvedIds });
    setSolDisp(data ?? []);
    setSolDispLoading(false);
  }

  useEffect(() => { refreshDisp(); }, [devolvedIds]);

  /* ---- Form state: Paciente ---- */
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');

  /* ---- Form state: IDA ---- */
  const [idaRota, setIdaRota] = useState<RotaDeslocamento | null>(null);
  const [idaDataEmbarque, setIdaDataEmbarque] = useState('');
  const [idaModalTransporte, setIdaModalTransporte] = useState('');
  const [idaCompanhia, setIdaCompanhia] = useState('');
  const [idaLocalizador, setIdaLocalizador] = useState('');
  const [idaValor, setIdaValor] = useState('');
  const [idaMedif, setIdaMedif] = useState(false);
  const [idaObservacoes, setIdaObservacoes] = useState('');

  /* ---- Form state: VOLTA ---- */
  const [voltaRota, setVoltaRota] = useState<RotaDeslocamento | null>(null);
  const [voltaDataEmbarque, setVoltaDataEmbarque] = useState('');
  const [voltaModalTransporte, setVoltaModalTransporte] = useState('');
  const [voltaCompanhia, setVoltaCompanhia] = useState('');
  const [voltaLocalizador, setVoltaLocalizador] = useState('');
  const [voltaValor, setVoltaValor] = useState('');
  const [voltaMedif, setVoltaMedif] = useState(false);
  const [voltaObservacoes, setVoltaObservacoes] = useState('');

  /* ---- Form state: Documentos por trecho ---- */
  const [idaPendingFile, setIdaPendingFile] = useState<File | null>(null);
  const [voltaPendingFile, setVoltaPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  /* ---- Data fetch ---- */
  const { data: viagens, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarViagens({}),
    []
  );

  function refreshAll() {
    refresh();
    refreshDisp();
  }

  /* ---- Table controls: Disponíveis tab ---- */
  const tableDisp = useTableControls({
    data: solDisp as unknown as Record<string, unknown>[],
    searchFields: ['numero_processo', 'pacientes'],
    dateField: 'created_at',
  });

  /* ---- Table controls: Passagens tab ---- */
  const tablePass = useTableControls({
    data: viagens as unknown as Record<string, unknown>[],
    searchFields: ['solicitacoes', 'origem_cidade', 'destino_cidade', 'numero_bilhete', 'companhia'],
    dateField: 'data_embarque_prevista',
  });

  /* Typed paginated helpers */
  const paginatedDisp = tableDisp.paginated as unknown as any[];
  const filteredDisp = tableDisp.filtered as unknown as any[];
  const paginatedPass = tablePass.paginated as unknown as any[];
  const filteredPass = tablePass.filtered as unknown as any[];

  /* ---- Filter options for Passagens columns ---- */
  const situacaoFilterOptions = tablePass.getFilterOptions('situacao').map((v) => ({
    value: v,
    label: (situacaoMap[v as SituacaoViagem] ?? { label: v }).label,
  }));
  const tipoFilterOptions = tablePass.getFilterOptions('tipo').map((v) => ({
    value: v,
    label: v === 'IDA' ? 'Ida' : 'Volta',
  }));
  const modalFilterOptions = tablePass.getFilterOptions('modal');

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    return {
      disponiveis: solDisp.length,
      pendentes: viagens.filter((v: any) => v.situacao === 'AGUARDANDO_EMISSAO').length,
      emitidas: viagens.filter((v: any) => v.situacao === 'EMITIDA').length,
      confirmadas: viagens.filter((v: any) => v.situacao === 'UTILIZADA').length,
      naoCompareceu: viagens.filter((v: any) => v.situacao === 'NO_SHOW').length,
      valorTotal: viagens.filter((v: any) => v.valor != null).reduce((sum: number, v: any) => sum + (v.valor ?? 0), 0),
    };
  }, [viagens, solDisp]);

  /* ---- Drawer: open new (criar ida+volta) ---- */
  function handleOpenNew(sol: any) {
    // P5 — bloqueio visual quando o processo está em outra área (devolução pendente)
    const destino = labelDestino(sol.id);
    if (destino) {
      alert(`Processo bloqueado — enviado para ${destino}. Emissão de passagens indisponível até o retorno.`);
      return;
    }
    resetForm();
    setDrawerMode('create');
    setSolicitacaoId(sol.id);
    setNumProcesso(sol.numero_processo ?? '');
    setPacienteNome(sol.pacientes?.nome_completo ?? '');
    setDrawerOpen(true);
  }

  /* ---- Drawer: open view (visualizar viagem + ações) ---- */
  function handleOpenView(v: any) {
    setDrawerMode('view');
    setViewViagem(v);
    setSolicitacaoId(v.solicitacao_id ?? '');
    setNumProcesso(v.solicitacoes?.numero_processo ?? '');
    setPacienteNome(v.solicitacoes?.pacientes?.nome_completo ?? '');
    setInlineConfirm(null);
    setCancelMotivo('');
    setRemarcarOpen(false);
    setRemarcarNovaData('');
    setRemarcarMotivo('');
    setEditingViagem(null);
    setHistoricoViagem([]);
    // P6 — carrega histórico de auditoria em background
    listarHistoricoViagem(v.id).then(({ data }) => {
      setHistoricoViagem((data as any[]) ?? []);
    });
    setDrawerOpen(true);
  }

  function resetForm() {
    setSolicitacaoId(''); setNumProcesso(''); setPacienteNome('');
    setIdaRota(null); setIdaDataEmbarque(''); setIdaModalTransporte('');
    setIdaCompanhia(''); setIdaLocalizador(''); setIdaValor(''); setIdaMedif(false); setIdaObservacoes('');
    setVoltaRota(null); setVoltaDataEmbarque(''); setVoltaModalTransporte('');
    setVoltaCompanhia(''); setVoltaLocalizador(''); setVoltaValor(''); setVoltaMedif(false); setVoltaObservacoes('');
    setIdaPendingFile(null);
    setVoltaPendingFile(null);
    setEditingId(null);
    setViewViagem(null);
    setDrawerTab('ida');
    setInlineConfirm(null);
    setCancelMotivo('');
    setRemarcarOpen(false);
    setEditingViagem(null);
    setHistoricoViagem([]);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetForm();
  }

  // TODO P1 — Múltiplas idas/voltas (trechos adicionais)
  // Schema já suporta: viagens.viagem_anterior_id + viagens.numero_sequencial (migration 00015).
  // Falta UI: botão "Adicionar trecho" no drawer que replica um bloco ida/volta
  // vinculando o novo registro ao viagem_anterior_id do último trecho salvo.
  // Service layer: criarViagem já aceita os campos; ajustar handleSubmitIdaVolta
  // para iterar uma lista `trechos: Trecho[]` em vez dos pares idaX/voltaX fixos.
  // Cuidado: atualizar também /solicitacoes/[id]/page.tsx que tem o mesmo form duplicado.
  // Prioridade: aguardar validação do cliente sobre quantos trechos máx. e se ida/volta
  // sempre vêm em pares ou se pode ter N idas seguidas + 1 volta final.

  // TODO P2 — Bilhete consolidado (múltiplos bilhetes/segmentos no mesmo registro)
  // Duas interpretações possíveis, aguardar validação do cliente:
  //   (a) Um mesmo PNR/localizador cobrindo vários segmentos (atual: 1 bilhete = 1 registro).
  //       Solução: permitir que numero_bilhete seja compartilhado entre várias rows de viagens
  //       e expor visualização agrupada pela UI.
  //   (b) Campo numero_bilhete aceitar múltiplos valores (ex: "ABC123, ABC124").
  //       Solução: alterar type para TEXT[] ou manter TEXT e tratar como CSV.
  // Impacto: afeta P6 (edição com auditoria) — campo numero_bilhete precisa diff por item.
  // Decisão bloqueada aguardando cliente confirmar o caso de uso real.

  /* ---- Submit: cadastro ida+volta ---- */
  async function handleSubmitIdaVolta() {
    if (!solicitacaoId) {
      toast.error('Paciente não selecionado', 'Selecione um paciente para vincular.');
      return;
    }

    if (!idaRota || !idaDataEmbarque) {
      toast.warning('Dados incompletos', 'Selecione a rota e a data de embarque da IDA.');
      setDrawerTab('ida');
      return;
    }

    if (!voltaRota || !voltaDataEmbarque) {
      toast.warning('Dados incompletos', 'Selecione a rota e a data de embarque da VOLTA.');
      setDrawerTab('volta');
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        const currentTab = drawerTab;
        const payload = currentTab === 'ida' ? {
          solicitacao_id: solicitacaoId,
          tipo: 'IDA' as const,
          modal: (idaModalTransporte as any) || 'AEREO',
          origem_cidade: idaRota!.cidade_origem, origem_uf: idaRota!.uf_origem,
          destino_cidade: idaRota!.cidade_destino, destino_uf: idaRota!.uf_destino,
          com_pernoite: false,
          data_embarque_prevista: idaDataEmbarque,
          medif_necessario: idaMedif,
          valor: idaValor ? parseCurrency(idaValor) : undefined,
          companhia: idaCompanhia || undefined,
          numero_bilhete: idaLocalizador || undefined,
          observacoes: idaObservacoes || undefined,
        } : {
          solicitacao_id: solicitacaoId,
          tipo: 'RETORNO' as const,
          modal: (voltaModalTransporte as any) || 'AEREO',
          origem_cidade: voltaRota!.cidade_origem, origem_uf: voltaRota!.uf_origem,
          destino_cidade: voltaRota!.cidade_destino, destino_uf: voltaRota!.uf_destino,
          com_pernoite: false,
          data_embarque_prevista: voltaDataEmbarque,
          medif_necessario: voltaMedif,
          valor: voltaValor ? parseCurrency(voltaValor) : undefined,
          companhia: voltaCompanhia || undefined,
          numero_bilhete: voltaLocalizador || undefined,
          observacoes: voltaObservacoes || undefined,
        };

        const result = await atualizarViagem(editingId, payload);
        if (result.error) {
          toast.error('Erro ao atualizar', (result.error as any).message);
          setSubmitting(false);
          return;
        }
        const editFile = currentTab === 'ida' ? idaPendingFile : voltaPendingFile;
        if (editFile) {
          const tipoDoc: TipoDocumento = currentTab === 'ida' ? 'PASSAGEM_IDA' : 'PASSAGEM_VOLTA';
          await uploadDocumento(null, editFile, tipoDoc, undefined, editingId);
        }
        toast.success('Passagem atualizada!', 'Os dados foram atualizados.');
        handleCloseDrawer();
        refreshAll();
        setSubmitting(false);
        return;
      }

      const idaPayload = {
        solicitacao_id: solicitacaoId,
        tipo: 'IDA' as const,
        situacao: 'EMITIDA' as const,
        emitido_em: new Date().toISOString(),
        modal: (idaModalTransporte as any) || 'AEREO',
        origem_cidade: idaRota!.cidade_origem, origem_uf: idaRota!.uf_origem,
        destino_cidade: idaRota!.cidade_destino, destino_uf: idaRota!.uf_destino,
        com_pernoite: false,
        data_embarque_prevista: idaDataEmbarque,
        medif_necessario: idaMedif,
        valor: idaValor ? parseCurrency(idaValor) : undefined,
        companhia: idaCompanhia || undefined,
        numero_bilhete: idaLocalizador || undefined,
        observacoes: idaObservacoes || undefined,
      };

      const idaResult = await criarViagem(idaPayload as any);
      if (idaResult.error) {
        toast.error('Erro ao emitir passagem de ida', (idaResult.error as any).message);
        setSubmitting(false);
        return;
      }

      const voltaPayload = {
        solicitacao_id: solicitacaoId,
        tipo: 'RETORNO' as const,
        situacao: 'EMITIDA' as const,
        emitido_em: new Date().toISOString(),
        modal: (voltaModalTransporte as any) || 'AEREO',
        origem_cidade: voltaRota!.cidade_origem, origem_uf: voltaRota!.uf_origem,
        destino_cidade: voltaRota!.cidade_destino, destino_uf: voltaRota!.uf_destino,
        com_pernoite: false,
        data_embarque_prevista: voltaDataEmbarque,
        medif_necessario: voltaMedif,
        valor: voltaValor ? parseCurrency(voltaValor) : undefined,
        companhia: voltaCompanhia || undefined,
        numero_bilhete: voltaLocalizador || undefined,
        observacoes: voltaObservacoes || undefined,
      };

      const voltaResult = await criarViagem(voltaPayload as any);
      if (voltaResult.error) {
        toast.error('Erro ao emitir passagem de volta', (voltaResult.error as any).message);
        setSubmitting(false);
        return;
      }

      if (idaPendingFile || voltaPendingFile) {
        setUploading(true);
        if (idaPendingFile && idaResult.data) {
          try {
            await uploadDocumento(null, idaPendingFile, 'PASSAGEM_IDA' as TipoDocumento, undefined, (idaResult.data as any).id);
          } catch { /* handled below */ }
        }
        if (voltaPendingFile && voltaResult.data) {
          try {
            await uploadDocumento(null, voltaPendingFile, 'PASSAGEM_VOLTA' as TipoDocumento, undefined, (voltaResult.data as any).id);
          } catch { /* handled below */ }
        }
        setUploading(false);
      }

      toast.success('Passagens emitidas!', 'Ida e volta registradas. Processo encaminhado para Ajuda de Custo.');
      handleCloseDrawer();
      setPageTab('passagens');
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
    setSubmitting(false);
  }

  /* ---- Action handlers (inline in drawer, no modal) ---- */
  async function handleInlineConfirm() {
    if (!viewViagem || !inlineConfirm) return;
    setSubmitting(true);
    try {
      if (inlineConfirm === 'embarque') {
        const { error } = await confirmarEmbarque(viewViagem.id, currentUser?.id);
        if (error) { toast.error('Erro', (error as any).message); }
        else { toast.success('Embarque confirmado!', 'Paciente embarcou. Solicitação avançada para Em Viagem.'); }
      } else if (inlineConfirm === 'nao_compareceu') {
        const { error } = await registrarNoShow(viewViagem.id, currentUser?.id);
        if (error) { toast.error('Erro', (error as any).message); }
        else { toast.success('Não compareceu', 'Paciente não compareceu ao embarque.'); }
      } else if (inlineConfirm === 'cancelar') {
        const { error } = await cancelarViagem(viewViagem.id, cancelMotivo || undefined);
        if (error) { toast.error('Erro', (error as any).message); }
        else { toast.success('Passagem cancelada', 'A viagem foi marcada como cancelada.'); }
      }
      setInlineConfirm(null);
      setCancelMotivo('');
      handleCloseDrawer();
      refreshAll();
    } catch {
      toast.error('Erro', 'Não foi possível executar a ação.');
    }
    setSubmitting(false);
  }

  async function handleRemarcar() {
    if (!viewViagem || !remarcarNovaData || !remarcarMotivo) {
      toast.warning('Dados incompletos', 'Preencha a nova data e o motivo da remarcação.');
      return;
    }
    setSubmitting(true);
    const novaViagem = {
      modal: viewViagem.modal,
      origem_cidade: viewViagem.origem_cidade,
      origem_uf: viewViagem.origem_uf,
      destino_cidade: viewViagem.destino_cidade,
      destino_uf: viewViagem.destino_uf,
      com_pernoite: viewViagem.com_pernoite ?? false,
      data_embarque_prevista: remarcarNovaData,
      medif_necessario: viewViagem.medif_necessario ?? false,
    } as any;
    const result = await remarcarViagem(viewViagem.id, novaViagem, remarcarMotivo);
    if (result.error) {
      toast.error('Erro ao remarcar', (result.error as any).message ?? 'Tente novamente.');
    } else {
      toast.success('Viagem remarcada!', 'Viagem anterior marcada como remarcada e nova viagem criada.');
      handleCloseDrawer();
      refreshAll();
    }
    setSubmitting(false);
  }

  /* ---- P6 — Editar passagem já emitida (snapshot → update → audit) ---- */
  function handleAbrirEdicao() {
    if (!viewViagem) return;
    setEditingViagem(viewViagem);
    setEditCompanhia(viewViagem.companhia ?? '');
    setEditBilhete(viewViagem.numero_bilhete ?? '');
    setEditValor(viewViagem.valor != null ? String(viewViagem.valor) : '');
    setEditDataEmbarque(viewViagem.data_embarque_prevista ?? '');
    setEditObservacoes(viewViagem.observacoes ?? '');
  }

  function handleCancelarEdicao() {
    setEditingViagem(null);
    setEditCompanhia(''); setEditBilhete(''); setEditValor('');
    setEditDataEmbarque(''); setEditObservacoes('');
  }

  async function handleSalvarEdicao() {
    if (!editingViagem || !currentUser) return;
    setEditSaving(true);
    try {
      const novos = {
        companhia: editCompanhia || null,
        numero_bilhete: editBilhete || null,
        valor: editValor ? parseFloat(editValor) : null,
        data_embarque_prevista: editDataEmbarque,
        observacoes: editObservacoes || null,
      };
      const { error } = await atualizarViagemComAuditoria(
        editingViagem.id,
        editingViagem as Record<string, unknown>,
        novos as any,
        currentUser.id,
        currentUser.perfil,
        editingViagem.solicitacao_id,
      );
      if (error) {
        toast.error('Erro ao salvar edição', (error as any).message ?? 'Tente novamente.');
      } else {
        toast.success('Passagem atualizada!', 'Alterações registradas no histórico de auditoria.');
        handleCancelarEdicao();
        handleCloseDrawer();
        refreshAll();
      }
    } catch (e: any) {
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
    setEditSaving(false);
  }


  /* ---- Anexo viagem handlers ---- */
  async function handleOpenAnexo(viagemId: string, tipo: 'ida' | 'volta', paciente: string) {
    setAnexoViagem({ viagemId, tipo, paciente });
    setAnexoFile(null);
    const { data } = await listarDocumentosPorViagem(viagemId);
    setAnexoDocs(data ?? []);
  }

  async function handleUploadAnexo() {
    if (!anexoViagem || !anexoFile) return;
    setAnexoUploading(true);
    try {
      const tipoDoc: TipoDocumento = anexoViagem.tipo === 'ida' ? 'PASSAGEM_IDA' : 'PASSAGEM_VOLTA';
      await uploadDocumento(null, anexoFile, tipoDoc, undefined, anexoViagem.viagemId);
      toast.success('Anexo enviado', `Documento da ${anexoViagem.tipo} anexado com sucesso.`);
      setAnexoFile(null);
      const { data } = await listarDocumentosPorViagem(anexoViagem.viagemId);
      setAnexoDocs(data ?? []);
    } catch {
      toast.error('Erro', 'Não foi possível enviar o anexo.');
    }
    setAnexoUploading(false);
  }

  /* ---- Auto-fill volta from ida ---- */
  function autoFillVolta() {
    if (!voltaModalTransporte && idaModalTransporte) setVoltaModalTransporte(idaModalTransporte);
  }

  /* ---- Render travel form fields ---- */
  function renderTravelFields(
    prefix: 'ida' | 'volta',
    rota: RotaDeslocamento | null,
    setRota: (r: RotaDeslocamento | null) => void,
    dataEmbarque: string, setDataEmbarque: (v: string) => void,
    modal: string, setModal: (v: string) => void,
    comp: string, setComp: (v: string) => void,
    loc: string, setLoc: (v: string) => void,
    valor: string, setValor: (v: string) => void,
    medif: boolean, setMedif: (v: boolean) => void,
    obs: string, setObs: (v: string) => void,
    pendingFile: File | null, setPendingFile: (f: File | null) => void,
  ) {
    return (
      <>
        <RotaSelect
          value={rota?.id ?? null}
          onChange={setRota}
          label="Rota de deslocamento"
          required
        />

        <FormField label="Data de embarque" required>
          <input type="date" className="tfd-input" value={dataEmbarque} onChange={(e) => setDataEmbarque(e.target.value)} />
        </FormField>

        <CompanhiaSelect
          value={comp}
          onChange={(nome, tipoModal) => {
            setComp(nome);
            if (tipoModal) setModal(tipoModal);
          }}
        />

        <FormField label="Localizador / Bilhete">
          <input type="text" className="tfd-input" placeholder="Codigo do bilhete" value={loc} onChange={(e) => setLoc(e.target.value)} />
        </FormField>

        <FormField label="Valor da passagem">
          <input type="text" className="tfd-input" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(maskCurrency(e.target.value))} />
        </FormField>

        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" id={`${prefix}Medif`} checked={medif} onChange={(e) => setMedif(e.target.checked)} style={{ accentColor: 'var(--tfd-primary-500)' }} />
          <label htmlFor={`${prefix}Medif`} className="tfd-label" style={{ marginBottom: 0 }}>MEDIF necessario</label>
        </div>

        <FormField label="Observacoes">
          <textarea className="tfd-input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </FormField>

        <hr className="tfd-divider" />

        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
          <Paperclip size={12} className="inline mr-1" />
          Documento da {prefix === 'ida' ? 'Ida' : 'Volta'}
        </h4>
        {pendingFile ? (
          <div className="flex items-center gap-3 p-2.5 rounded-lg mb-2" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
              <Paperclip size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>{pendingFile.name}</p>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{(pendingFile.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0" title="Remover arquivo" onClick={() => setPendingFile(null)}>
              <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)] mb-2" style={{ borderColor: 'var(--tfd-surface-border)' }}>
            <Upload size={16} style={{ color: 'var(--tfd-primary-500)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>Anexar bilhete / passagem</span>
            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => { setPendingFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
        )}
        <p className="text-xs mb-1" style={{ color: 'var(--tfd-text-muted)' }}>
          PDF, PNG, JPG — este documento ficara vinculado a passagem de {prefix === 'ida' ? 'ida' : 'volta'}.
        </p>
      </>
    );
  }

  /* ---- Render view drawer content ---- */
  function renderViewContent() {
    if (!viewViagem) return null;
    const v = viewViagem;
    const style = situacaoMap[v.situacao as SituacaoViagem] ?? situacaoMap.AGUARDANDO_EMISSAO;
    const isTerminal = SITUACOES_TERMINAIS.includes(v.situacao);
    const tipoLabel = v.tipo === 'IDA' ? 'IDA' : 'VOLTA';
    const seq = v.numero_sequencial ?? 1;
    // P5 — bloqueio visual: processo devolvido para outra área
    const bloqueioDestino = labelDestino(v.solicitacao_id);
    const bloqueioInfo = devolucoesEnviadas.get(v.solicitacao_id);

    return (
      <div className="space-y-4">
        {/* P5 — Banner de bloqueio quando processo está em outra área */}
        {bloqueioDestino && (
          <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#F0F2F5', border: '1px solid #D1D5DB' }}>
            <Lock size={16} style={{ color: '#6B7280', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                Processo bloqueado — enviado para {bloqueioDestino}
              </p>
              <p className="text-xs" style={{ color: '#6B7280' }}>
                Apenas consulta. Ações ficam indisponíveis até o retorno da devolução.
                {bloqueioInfo?.urgencia === 'URGENTE' && (
                  <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>URGENTE</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Plane size={16} style={{ color: v.tipo === 'IDA' ? '#3B82F6' : '#7C3AED', transform: v.tipo === 'IDA' ? undefined : 'rotate(180deg)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{tipoLabel} #{seq}</span>
            </div>
            <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: style.bg, color: style.text }}>{style.label}</span>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{pacienteNome}</p>
          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo: <strong style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</strong></p>
        </div>

        {/* Trip details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>{v.origem_cidade}/{v.origem_uf}</span>
            <ArrowRight size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.destino_cidade}/{v.destino_uf}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data Embarque</p>
              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)', textDecoration: isTerminal ? 'line-through' : undefined }}>
                {formatDate(v.data_embarque_prevista)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Modal</p>
              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.modal ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Companhia</p>
              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.companhia ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Bilhete</p>
              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.numero_bilhete ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor</p>
              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.valor != null ? formatCurrency(v.valor) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Motivo cancelamento/remarcação */}
        {v.motivo_cancelamento && (
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A' }}>
            <p className="text-xs font-semibold" style={{ color: '#92400E' }}>Motivo</p>
            <p className="text-sm" style={{ color: '#78350F' }}>{v.motivo_cancelamento}</p>
          </div>
        )}

        {/* Observações */}
        {v.observacoes && (
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Observações</p>
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{v.observacoes}</p>
          </div>
        )}

        {/* ---- INLINE CONFIRMATION (replaces modal) ---- */}
        {inlineConfirm === 'embarque' && (
          <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <p className="text-sm font-semibold" style={{ color: '#15803D' }}>Confirmar Embarque</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Deseja confirmar que o paciente embarcou? Essa ação irá registrar o embarque e mover o processo para &quot;Em Viagem&quot;.
            </p>
            <div className="flex gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => setInlineConfirm(null)}>Voltar</button>
              <button className="tfd-btn" style={{ background: '#16A34A', color: 'white' }} onClick={handleInlineConfirm} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Confirmar</>}
              </button>
            </div>
          </div>
        )}

        {inlineConfirm === 'nao_compareceu' && (
          <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <div className="flex items-center gap-2">
              <UserX size={16} className="text-red-600" />
              <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>Não Compareceu</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Deseja registrar que o paciente não compareceu ao embarque?
            </p>
            <div className="flex gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => setInlineConfirm(null)}>Voltar</button>
              <button className="tfd-btn" style={{ background: '#B91C1C', color: 'white' }} onClick={handleInlineConfirm} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <><UserX size={14} /> Confirmar</>}
              </button>
            </div>
          </div>
        )}

        {inlineConfirm === 'cancelar' && (
          <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
            <div className="flex items-center gap-2">
              <Ban size={16} className="text-red-600" />
              <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>Cancelar Passagem</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Deseja cancelar esta passagem? Informe o motivo abaixo.
            </p>
            <textarea className="tfd-input" rows={2} placeholder="Motivo do cancelamento..." value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} />
            <div className="flex gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => { setInlineConfirm(null); setCancelMotivo(''); }}>Voltar</button>
              <button className="tfd-btn" style={{ background: '#EF4444', color: 'white' }} onClick={handleInlineConfirm} disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <><Ban size={14} /> Cancelar Passagem</>}
              </button>
            </div>
          </div>
        )}

        {/* Remarcar sub-form (inline) */}
        {remarcarOpen && (
          <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <p className="text-sm font-semibold" style={{ color: '#4338CA' }}>Remarcar Viagem</p>
            <FormField label="Nova data de embarque" required>
              <input type="date" className="tfd-input" value={remarcarNovaData} onChange={(e) => setRemarcarNovaData(e.target.value)} />
            </FormField>
            <FormField label="Motivo da remarcação" required>
              <textarea className="tfd-input" rows={2} placeholder="Descreva o motivo..." value={remarcarMotivo} onChange={(e) => setRemarcarMotivo(e.target.value)} />
            </FormField>
            <div className="flex gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => setRemarcarOpen(false)}>Cancelar</button>
              <button className="tfd-btn" style={{ background: '#4338CA', color: 'white' }} onClick={handleRemarcar} disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Remarcando...</> : <><RefreshCcw size={14} /> Confirmar Remarcação</>}
              </button>
            </div>
          </div>
        )}

        {/* P6 — Formulário inline de edição de passagem emitida */}
        {editingViagem && (
          <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>Editar Passagem</p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
              Alterações ficam registradas no histórico de auditoria (autor, data, campo, valor anterior e novo).
            </p>
            <FormField label="Companhia">
              <input type="text" className="tfd-input" value={editCompanhia} onChange={(e) => setEditCompanhia(e.target.value)} />
            </FormField>
            <FormField label="Número do bilhete">
              <input type="text" className="tfd-input" value={editBilhete} onChange={(e) => setEditBilhete(e.target.value)} />
            </FormField>
            <FormField label="Valor (R$)">
              <input type="number" step="0.01" className="tfd-input" value={editValor} onChange={(e) => setEditValor(e.target.value)} />
            </FormField>
            <FormField label="Data de embarque">
              <input type="date" className="tfd-input" value={editDataEmbarque} onChange={(e) => setEditDataEmbarque(e.target.value)} />
            </FormField>
            <FormField label="Observações">
              <textarea className="tfd-input" rows={2} value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} />
            </FormField>
            <div className="flex gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={handleCancelarEdicao}>Cancelar</button>
              <button className="tfd-btn tfd-btn-primary" onClick={handleSalvarEdicao} disabled={editSaving}>
                {editSaving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        )}

        {/* P6 — Histórico de auditoria da viagem */}
        {!editingViagem && historicoViagem.length > 0 && (
          <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: 'var(--tfd-text-secondary)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Histórico de Alterações ({historicoViagem.length})
              </p>
            </div>
            <div className="space-y-1.5">
              {historicoViagem.slice(0, 10).map((log: any) => (
                <div key={log.id} className="text-[11px] p-1.5 rounded" style={{ backgroundColor: 'white', border: '1px solid var(--tfd-surface-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {log.campo_alterado ?? log.acao}
                    </span>
                    <span style={{ color: 'var(--tfd-text-muted)' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '—'}
                    </span>
                  </div>
                  {log.campo_alterado && (
                    <div style={{ color: 'var(--tfd-text-secondary)' }}>
                      <span className="line-through" style={{ color: '#DC2626' }}>{log.valor_anterior || '—'}</span>
                      <span className="mx-1" style={{ color: 'var(--tfd-text-muted)' }}>→</span>
                      <span style={{ color: '#16A34A' }}>{log.valor_novo || '—'}</span>
                    </div>
                  )}
                  <div style={{ color: 'var(--tfd-text-muted)' }}>
                    por {log.usuarios?.nome_completo ?? 'usuário desconhecido'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- Render view drawer footer (action buttons) ---- */
  function renderViewFooter() {
    if (!viewViagem || inlineConfirm || remarcarOpen || editingViagem) return null;
    const sit = viewViagem.situacao as SituacaoViagem;
    // P5 — quando o processo está em outra área, ocultar ações (somente Fechar)
    const bloqueado = Boolean(labelDestino(viewViagem.solicitacao_id));
    if (bloqueado) {
      return <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Fechar</button>;
    }

    if (sit === 'EMITIDA' || sit === 'AGUARDANDO_EMISSAO') {
      return (
        <>
          <button className="tfd-btn" style={{ background: '#16A34A', color: 'white' }} onClick={() => setInlineConfirm('embarque')}>
            <CheckCircle2 size={14} /> Confirmar Embarque
          </button>
          <button className="tfd-btn" style={{ background: '#B91C1C', color: 'white' }} onClick={() => setInlineConfirm('nao_compareceu')}>
            <UserX size={14} /> Não Compareceu
          </button>
          <button className="tfd-btn" style={{ background: '#4338CA', color: 'white' }} onClick={() => setRemarcarOpen(true)}>
            <RefreshCcw size={14} /> Remarcar
          </button>
          {/* P6 — Editar passagem emitida */}
          <button className="tfd-btn" style={{ background: '#0EA5E9', color: 'white' }} onClick={handleAbrirEdicao}>
            <FileText size={14} /> Editar
          </button>
          <button className="tfd-btn" style={{ background: '#EF4444', color: 'white' }} onClick={() => setInlineConfirm('cancelar')}>
            <Ban size={14} /> Cancelar
          </button>
        </>
      );
    }

    return (
      <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Fechar</button>
    );
  }

  return (
    <>
      <PageHeader
        title="Viagens e Passagens"
        subtitle="Emissão, controle de embarque e rastreio de passagens"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}>
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Disponíveis</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.disponiveis}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Com agendamento confirmado, prontos para emissão</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}>
            <Plane size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Emitidas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.emitidas}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Bilhetes emitidos aguardando embarque</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Confirmadas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.confirmadas}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Embarque confirmado — paciente viajou</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
            <UserX size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Não Compareceu</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-danger)' }}>{counts.naoCompareceu}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>NO-SHOW: data passou sem confirmação</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3 col-span-2 xl:col-span-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Valor Total</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(counts.valorTotal)}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Soma de todas as passagens emitidas</p>
          </div>
        </div>
      </div>

      {/* ========== Page Tabs: Disponíveis / Passagens ========== */}
      <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '2px solid var(--tfd-surface-border)' }}>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            color: pageTab === 'disponiveis' ? 'var(--tfd-primary-600)' : 'var(--tfd-text-muted)',
            borderBottom: pageTab === 'disponiveis' ? '2px solid var(--tfd-primary-500)' : '2px solid transparent',
            marginBottom: '-2px',
          }}
          onClick={() => setPageTab('disponiveis')}
        >
          <Ticket size={15} />
          Disponíveis
          {counts.disponiveis > 0 && (
            <span className="tfd-badge tfd-badge--primary" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{counts.disponiveis}</span>
          )}
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            color: pageTab === 'passagens' ? 'var(--tfd-primary-600)' : 'var(--tfd-text-muted)',
            borderBottom: pageTab === 'passagens' ? '2px solid var(--tfd-primary-500)' : '2px solid transparent',
            marginBottom: '-2px',
          }}
          onClick={() => setPageTab('passagens')}
        >
          <List size={15} />
          Passagens
        </button>
      </div>

      {/* ========== Tab: Disponíveis ========== */}
      {pageTab === 'disponiveis' && (
        <>
          {/* Toolbar */}
          <div className="tfd-toolbar mb-4 flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={16} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
              <input type="text" className="tfd-input tfd-input--sm tfd-input--with-leading-icon" placeholder="Buscar solicitação, paciente..."
                value={tableDisp.search} onChange={(e) => tableDisp.setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
              <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
                value={tableDisp.dateStart} onChange={(e) => tableDisp.setDateStart(e.target.value)} title="Data início" />
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
              <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
                value={tableDisp.dateEnd} onChange={(e) => tableDisp.setDateEnd(e.target.value)} title="Data fim" />
            </div>
          </div>

          <div className="tfd-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tfd-table">
                <thead>
                  <tr>
                    <SortableHeader
                      label="Solicitação"
                      sortDirection={tableDisp.getSortDirection('numero_processo')}
                      onSort={() => tableDisp.toggleSort('numero_processo')}
                    />
                    <SortableHeader
                      label="Paciente"
                      sortDirection={tableDisp.getSortDirection('pacientes')}
                      onSort={() => tableDisp.toggleSort('pacientes')}
                    />
                    <SortableHeader
                      label="Data Solicitação"
                      className="hidden lg:table-cell"
                      sortDirection={tableDisp.getSortDirection('created_at')}
                      onSort={() => tableDisp.toggleSort('created_at')}
                    />
                    <th>Tempo</th>
                    <th className="w-[100px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {solDispLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                      </td>
                    </tr>
                  ) : paginatedDisp.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma solicitação aguardando emissão</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDisp.map((sol: any) => {
                      const bloqueioDestino = labelDestino(sol.id);
                      const bloqueioInfo = devolucoesEnviadas.get(sol.id);
                      const bloqueado = Boolean(bloqueioDestino);
                      return (
                        <tr
                          key={sol.id}
                          className={bloqueado ? '' : 'cursor-pointer'}
                          style={{
                            opacity: bloqueado ? 0.6 : undefined,
                            backgroundColor: bloqueado ? '#F8F9FA' : undefined,
                          }}
                          onClick={bloqueado ? undefined : () => handleOpenNew(sol)}
                        >
                          <td>
                            <div className="flex flex-col gap-0.5">
                              <Link href={`/solicitacoes/${sol.id}?from=viagens`} className="font-medium text-sm hover:underline" style={{ color: bloqueado ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)' }} onClick={(e) => e.stopPropagation()}>
                                {sol.numero_processo}
                              </Link>
                              {bloqueado && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Lock size={10} style={{ color: '#6B7280' }} />
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F0F2F5', color: '#6B7280' }}>
                                    Enviado p/ {bloqueioDestino}
                                  </span>
                                  {bloqueioInfo?.urgencia === 'URGENTE' && (
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>URGENTE</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate font-medium">{sol.pacientes?.nome_completo ?? '—'}</td>
                          <td className="hidden lg:table-cell">
                            <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{formatDate(sol.created_at)}</span>
                          </td>
                          <td>
                            {(() => { const b = slaBadge(sol.created_at); return (
                              <span className="tfd-tag tfd-tag--rounded text-xs font-semibold" style={b.style}>{b.label}</span>
                            ); })()}
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="tfd-btn tfd-btn-primary tfd-btn--sm"
                                disabled={bloqueado}
                                title={bloqueado ? `Bloqueado — processo em ${bloqueioDestino}` : undefined}
                                onClick={(e) => { e.stopPropagation(); if (!bloqueado) handleOpenNew(sol); }}
                              >
                                <Ticket size={13} /> Emitir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!solDispLoading && filteredDisp.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Exibindo{' '}
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{(tableDisp.page - 1) * 20 + 1}</span>
                  {' '}&ndash;{' '}
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{Math.min(tableDisp.page * 20, filteredDisp.length)}</span>
                  {' '}de{' '}
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{filteredDisp.length}</span>
                  {' '}registros
                </p>
                <div className="flex items-center gap-1">
                  <button className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only" onClick={() => tableDisp.setPage(Math.max(1, tableDisp.page - 1))} disabled={tableDisp.page === 1} aria-label="Página anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm px-3 font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{tableDisp.page} / {tableDisp.totalPages}</span>
                  <button className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only" onClick={() => tableDisp.setPage(Math.min(tableDisp.totalPages, tableDisp.page + 1))} disabled={tableDisp.page === tableDisp.totalPages} aria-label="Próxima página">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========== Tab: Passagens ========== */}
      {pageTab === 'passagens' && (
        <>
          {/* Search + Date Range */}
          <div className="tfd-toolbar mb-4 flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={16} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
              <input type="text" className="tfd-input tfd-input--sm tfd-input--with-leading-icon" placeholder="Buscar paciente, localizador, trecho..."
                value={tablePass.search} onChange={(e) => tablePass.setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
              <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
                value={tablePass.dateStart} onChange={(e) => tablePass.setDateStart(e.target.value)} title="Data início" />
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
              <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
                value={tablePass.dateEnd} onChange={(e) => tablePass.setDateEnd(e.target.value)} title="Data fim" />
            </div>
          </div>

          {/* Table */}
          <div className="tfd-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tfd-table">
                <thead>
                  <tr>
                    <SortableHeader
                      label="Solicitação"
                      sortDirection={tablePass.getSortDirection('solicitacoes')}
                      onSort={() => tablePass.toggleSort('solicitacoes')}
                    />
                    <SortableHeader
                      label="Paciente"
                      sortDirection={tablePass.getSortDirection('solicitacoes')}
                      onSort={() => tablePass.toggleSort('solicitacoes')}
                    />
                    <SortableHeader
                      label="Tipo"
                      sortDirection={tablePass.getSortDirection('tipo')}
                      onSort={() => tablePass.toggleSort('tipo')}
                      filterOptions={tipoFilterOptions}
                      activeFilters={tablePass.getActiveFilters('tipo')}
                      onFilterChange={(v) => tablePass.setColumnFilter('tipo', v)}
                    />
                    <SortableHeader
                      label="Trecho"
                      sortDirection={tablePass.getSortDirection('origem_cidade')}
                      onSort={() => tablePass.toggleSort('origem_cidade')}
                    />
                    <SortableHeader
                      label="Data Embarque"
                      className="hidden lg:table-cell"
                      sortDirection={tablePass.getSortDirection('data_embarque_prevista')}
                      onSort={() => tablePass.toggleSort('data_embarque_prevista')}
                    />
                    <SortableHeader
                      label="Situação"
                      sortDirection={tablePass.getSortDirection('situacao')}
                      onSort={() => tablePass.toggleSort('situacao')}
                      filterOptions={situacaoFilterOptions}
                      activeFilters={tablePass.getActiveFilters('situacao')}
                      onFilterChange={(v) => tablePass.setColumnFilter('situacao', v)}
                    />
                    <th>Tempo</th>
                    <th className="w-[100px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                      </td>
                    </tr>
                  ) : paginatedPass.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma passagem encontrada</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPass.map((v: any) => {
                      const isTerminal = SITUACOES_TERMINAIS.includes(v.situacao);
                      const style = situacaoMap[v.situacao as SituacaoViagem] ?? situacaoMap.AGUARDANDO_EMISSAO;
                      const aguardandoRetorno = labelDestino(v.solicitacao_id);
                      const devolucaoInfo = devolucoesEnviadas.get(v.solicitacao_id);
                      const retornoRecebido = labelOrigem(v.solicitacao_id);
                      const retornoInfo = devolucoesRecebidas.get(v.solicitacao_id);
                      const tipoLabel = v.tipo === 'IDA' ? 'IDA' : 'VOLTA';
                      const seq = v.numero_sequencial ?? 1;

                      return (
                        <tr
                          key={v.id}
                          className={aguardandoRetorno ? '' : 'cursor-pointer'}
                          style={{
                            opacity: aguardandoRetorno ? 0.55 : isTerminal ? 0.5 : undefined,
                            backgroundColor: aguardandoRetorno ? '#F8F9FA' : retornoRecebido ? '#FFFBEB' : undefined,
                            borderLeft: retornoRecebido ? '4px solid #F59E0B' : undefined,
                            pointerEvents: aguardandoRetorno ? 'none' : undefined,
                          }}
                          onClick={aguardandoRetorno ? undefined : () => handleOpenView(v)}
                        >
                          <td>
                            <div className="flex flex-col gap-0.5">
                              <Link href={`/solicitacoes/${v.solicitacao_id}?from=viagens`} className="font-medium text-sm hover:underline" style={{ color: aguardandoRetorno ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)' }} onClick={(e) => e.stopPropagation()}>
                                {v.solicitacoes?.numero_processo ?? '—'}
                              </Link>
                              {aguardandoRetorno && devolucaoInfo && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F0F2F5', color: '#6B7280' }}>
                                    Enviado p/ {aguardandoRetorno}
                                  </span>
                                  {devolucaoInfo.urgencia === 'URGENTE' && (
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>URGENTE</span>
                                  )}
                                </div>
                              )}
                              {retornoRecebido && retornoInfo && !aguardandoRetorno && (
                                <div className="flex items-center gap-1.5 mt-1" title={`Retorno recebido de ${retornoRecebido} em ${new Date(retornoInfo.created_at).toLocaleDateString('pt-BR')} — ${retornoInfo.motivo}`}>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                                ↩ Retorno de {retornoRecebido}
                                  </span>
                                  {retornoInfo.urgencia === 'URGENTE' && (
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>URGENTE</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="max-w-[160px] truncate font-medium">{v.solicitacoes?.pacientes?.nome_completo ?? '—'}</td>
                          <td>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded" style={{
                              backgroundColor: v.tipo === 'IDA' ? '#DBEAFE' : '#F5F3FF',
                              color: v.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED',
                            }}>
                              <Plane size={11} style={{ transform: v.tipo === 'IDA' ? undefined : 'rotate(180deg)' }} />
                              {tipoLabel} #{seq}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                              <span style={{ color: 'var(--tfd-text-secondary)' }}>{v.origem_cidade}</span>
                              <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.destino_cidade}</span>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell">
                            <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)', textDecoration: isTerminal ? 'line-through' : undefined }}>
                              {formatDate(v.data_embarque_prevista)}
                            </span>
                          </td>
                          <td>
                            <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: style.bg, color: style.text }}>{style.label}</span>
                          </td>
                          <td>
                            {(() => { const b = slaBadge(v.created_at); return (
                              <span className="tfd-tag tfd-tag--rounded text-xs font-semibold" style={b.style}>{b.label}</span>
                            ); })()}
                          </td>
                          <td>
                            <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
                              <Link href={`/solicitacoes/${v.solicitacao_id}?from=viagens`} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Ver processo" onClick={(e) => e.stopPropagation()}><Eye size={15} /></Link>
                              {!aguardandoRetorno && (
                                <>
                                  <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Anexo" onClick={(e) => { e.stopPropagation(); handleOpenAnexo(v.id, v.tipo === 'IDA' ? 'ida' : 'volta', v.solicitacoes?.pacientes?.nome_completo ?? ''); }}>
                                    <Paperclip size={15} />
                                  </button>
                                  <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Devolver" onClick={(e) => { e.stopPropagation(); setDevolverItem(v); }}>
                                    <SendHorizonal size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredPass.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Exibindo{' '}
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{(tablePass.page - 1) * 20 + 1}</span>
                  {' '}&ndash;{' '}
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{Math.min(tablePass.page * 20, filteredPass.length)}</span>
                  {' '}de{' '}
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{filteredPass.length}</span>
                  {' '}registros
                </p>
                <div className="flex items-center gap-1">
                  <button className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only" onClick={() => tablePass.setPage(Math.max(1, tablePass.page - 1))} disabled={tablePass.page === 1} aria-label="Página anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm px-3 font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{tablePass.page} / {tablePass.totalPages}</span>
                  <button className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only" onClick={() => tablePass.setPage(Math.min(tablePass.totalPages, tablePass.page + 1))} disabled={tablePass.page === tablePass.totalPages} aria-label="Próxima página">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========== DevolverModal ========== */}
      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="PASSAGENS"
        solicitacaoId={devolverItem?.solicitacao_id ?? ''}
        statusAtual={(devolverItem?.solicitacoes as any)?.status ?? 'AGUARDANDO_EMISSAO'}
        label={`${(devolverItem?.solicitacoes as any)?.numero_processo ?? ''} — ${(devolverItem?.solicitacoes as any)?.pacientes?.nome_completo ?? 'Paciente'}`}
        onSuccess={() => { refreshAll(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />

      {/* ========== Modal: Anexo de viagem ========== */}
      {anexoViagem && (
        <>
          <div className="tfd-overlay-backdrop" onClick={() => setAnexoViagem(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="tfd-dialog w-full max-w-md">
              <div className="tfd-dialog-header">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
                    <Paperclip size={16} style={{ color: 'var(--tfd-primary-500)' }} />
                  </div>
                  <div>
                    <span className="font-medium">Anexos — Passagem de {anexoViagem.tipo}</span>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{anexoViagem.paciente}</p>
                  </div>
                </div>
                <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" onClick={() => setAnexoViagem(null)}><X size={16} /></button>
              </div>
              <div className="tfd-dialog-content">
                {anexoDocs.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {anexoDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
                        <FileText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                        <a href={doc.url_arquivo} target="_blank" rel="noopener noreferrer" className="text-sm flex-1 truncate hover:underline" style={{ color: 'var(--tfd-primary-600)' }}>
                          {doc.nome_arquivo}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm mb-4" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum documento anexado.</p>
                )}

                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)]" style={{ borderColor: 'var(--tfd-surface-border)' }}>
                  <Upload size={18} style={{ color: 'var(--tfd-primary-500)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>
                    {anexoFile ? anexoFile.name : 'Selecionar arquivo'}
                  </span>
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => { setAnexoFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                </label>
              </div>
              <div className="tfd-dialog-footer">
                <button className="tfd-btn tfd-btn-secondary" onClick={() => setAnexoViagem(null)}>Fechar</button>
                <button className="tfd-btn tfd-btn-primary" onClick={handleUploadAnexo} disabled={!anexoFile || anexoUploading}>
                  {anexoUploading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Upload size={14} /> Enviar</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== Drawer: Create (Emitir Ida + Volta) / View (Visualizar + Ações inline) ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'view'
            ? `${viewViagem?.tipo === 'IDA' ? 'IDA' : 'VOLTA'} #${viewViagem?.numero_sequencial ?? 1} — Detalhes`
            : editingId ? 'Editar Passagem' : 'Emitir Passagens — Ida + Volta'
        }
        subtitle={
          drawerMode === 'view'
            ? 'Visualize os dados e execute ações'
            : editingId ? 'Altere os dados da passagem' : 'Preencha ida e volta obrigatoriamente'
        }
        width="580px"
        footer={
          drawerMode === 'view' ? (
            <div className="flex flex-wrap gap-2">
              {renderViewFooter()}
            </div>
          ) : (
            <>
              <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Cancelar</button>
              <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitIdaVolta} disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Emitindo...</> : editingId ? 'Salvar Alterações' : <><Ticket size={14} /> Emitir Ida + Volta</>}
              </button>
            </>
          )
        }
      >
        {drawerMode === 'view' ? (
          renderViewContent()
        ) : (
          <>
            {/* Processo info */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{pacienteNome || '—'}</p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo: <strong style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</strong></p>
              </div>
            </div>

            {/* Tabs: Ida / Volta */}
            <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              {([
                { key: 'ida' as DrawerTab, label: 'Ida', icon: <Plane size={14} style={{ transform: 'rotate(0deg)' }} /> },
                { key: 'volta' as DrawerTab, label: 'Volta', icon: <Plane size={14} style={{ transform: 'rotate(180deg)' }} /> },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    color: drawerTab === tab.key ? 'var(--tfd-primary-600)' : 'var(--tfd-text-muted)',
                    borderBottom: drawerTab === tab.key ? '2px solid var(--tfd-primary-500)' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                  onClick={() => {
                    if (tab.key === 'volta') autoFillVolta();
                    setDrawerTab(tab.key);
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.key === 'ida' && idaRota && idaDataEmbarque && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tfd-status-success)' }} />
                  )}
                  {tab.key === 'volta' && voltaRota && voltaDataEmbarque && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tfd-status-success)' }} />
                  )}
                  {tab.key === 'ida' && idaPendingFile && <Paperclip size={11} style={{ color: 'var(--tfd-primary-500)' }} />}
                  {tab.key === 'volta' && voltaPendingFile && <Paperclip size={11} style={{ color: 'var(--tfd-primary-500)' }} />}
                </button>
              ))}
            </div>

            {drawerTab === 'ida' && renderTravelFields(
              'ida',
              idaRota, setIdaRota,
              idaDataEmbarque, setIdaDataEmbarque,
              idaModalTransporte, setIdaModalTransporte,
              idaCompanhia, setIdaCompanhia,
              idaLocalizador, setIdaLocalizador,
              idaValor, setIdaValor,
              idaMedif, setIdaMedif,
              idaObservacoes, setIdaObservacoes,
              idaPendingFile, setIdaPendingFile,
            )}

            {drawerTab === 'volta' && renderTravelFields(
              'volta',
              voltaRota, setVoltaRota,
              voltaDataEmbarque, setVoltaDataEmbarque,
              voltaModalTransporte, setVoltaModalTransporte,
              voltaCompanhia, setVoltaCompanhia,
              voltaLocalizador, setVoltaLocalizador,
              voltaValor, setVoltaValor,
              voltaMedif, setVoltaMedif,
              voltaObservacoes, setVoltaObservacoes,
              voltaPendingFile, setVoltaPendingFile,
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
