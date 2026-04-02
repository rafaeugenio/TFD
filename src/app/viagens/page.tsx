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
  Trash2,
  SendHorizonal,
  Upload,
  Paperclip,
  X,
  Loader2,
  FileText,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useToast } from '@/shared/components/toast/Toast';
import { listarViagens, criarViagem, atualizarViagem, excluirViagem, listarSolicitacoesAguardandoEmissao } from '@/services/viagens.service';
import { uploadDocumento } from '@/services/documentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import type { SituacaoViagem, TipoDocumento } from '@/lib/supabase/database.types';
import { formatCurrency, maskCurrency, parseCurrency } from '@/shared/pipes/formatters';
import { useLookup, useCompanhias } from '@/shared/hooks/useLookup';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODAS' | 'DISPONIVEL' | 'AGUARDANDO_EMISSAO' | 'EMITIDA' | 'UTILIZADA' | 'NO_SHOW' | 'REMARCADA' | 'CANCELADA';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'DISPONIVEL', label: 'Disponíveis' },
  { key: 'AGUARDANDO_EMISSAO', label: 'Pendentes' },
  { key: 'EMITIDA', label: 'Emitidas' },
  { key: 'UTILIZADA', label: 'Utilizadas' },
  { key: 'NO_SHOW', label: 'NO-SHOW' },
  { key: 'REMARCADA', label: 'Remarcadas' },
  { key: 'CANCELADA', label: 'Canceladas' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface SituacaoStyle {
  bg: string;
  text: string;
  label: string;
}

const situacaoMap: Record<SituacaoViagem, SituacaoStyle> = {
  AGUARDANDO_EMISSAO: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  EMITIDA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Emitida' },
  REMARCADA: { bg: '#E0E7FF', text: '#4338CA', label: 'Remarcada' },
  CANCELADA: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Cancelada' },
  NO_SHOW: { bg: '#FEE2E2', text: '#B91C1C', label: 'NO-SHOW' },
  UTILIZADA: { bg: '#DCFCE7', text: '#15803D', label: 'Utilizada' },
};

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
/*  Drawer tab type                                    */
/* -------------------------------------------------- */

type DrawerTab = 'ida' | 'volta' | 'documentos';

/* -------------------------------------------------- */
/*  Pending file type                                  */
/* -------------------------------------------------- */

interface PendingFile {
  file: File;
  tipo: TipoDocumento;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function ViagensPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('TODAS');
  const [search, setSearch] = useState('');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('ida');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [devolverItem, setDevolverItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('PASSAGENS');

  /* ---- Disponíveis (solicitações aguardando emissão sem viagem) ---- */
  const [solDisp, setSolDisp] = useState<any[]>([]);
  const [solDispLoading, setSolDispLoading] = useState(false);

  async function refreshDisp() {
    setSolDispLoading(true);
    const { data } = await listarSolicitacoesAguardandoEmissao();
    setSolDisp(data ?? []);
    setSolDispLoading(false);
  }

  useEffect(() => { refreshDisp(); }, []);

  /* ---- Form state: Paciente ---- */
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');

  /* ---- Form state: IDA ---- */
  const [idaOrigemUf, setIdaOrigemUf] = useState('MA');
  const [idaOrigem, setIdaOrigem] = useState('');
  const [idaDestinoUf, setIdaDestinoUf] = useState('');
  const [idaDestino, setIdaDestino] = useState('');
  const [idaDataEmbarque, setIdaDataEmbarque] = useState('');
  const [idaModalTransporte, setIdaModalTransporte] = useState('');
  const [idaCompanhia, setIdaCompanhia] = useState('');
  const [idaLocalizador, setIdaLocalizador] = useState('');
  const [idaValor, setIdaValor] = useState('');
  const [idaMedif, setIdaMedif] = useState(false);
  const [idaObservacoes, setIdaObservacoes] = useState('');

  /* ---- Form state: VOLTA ---- */
  const [voltaOrigemUf, setVoltaOrigemUf] = useState('');
  const [voltaOrigem, setVoltaOrigem] = useState('');
  const [voltaDestinoUf, setVoltaDestinoUf] = useState('MA');
  const [voltaDestino, setVoltaDestino] = useState('');
  const [voltaDataEmbarque, setVoltaDataEmbarque] = useState('');
  const [voltaModalTransporte, setVoltaModalTransporte] = useState('');
  const [voltaCompanhia, setVoltaCompanhia] = useState('');
  const [voltaLocalizador, setVoltaLocalizador] = useState('');
  const [voltaValor, setVoltaValor] = useState('');
  const [voltaMedif, setVoltaMedif] = useState(false);
  const [voltaObservacoes, setVoltaObservacoes] = useState('');

  /* ---- Form state: Documentos ---- */
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ---- Lookup hooks ---- */
  const { options: modais, loading: loadingModais } = useLookup('modal_transporte');
  const { options: companhias, loading: loadingComp } = useCompanhias();

  /* ---- Data fetch ---- */
  const { data: viagens, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarViagens({ situacao: (activeTab === 'TODAS' || activeTab === 'DISPONIVEL') ? undefined : activeTab, search }),
    [activeTab, search]
  );

  /** Group viagens by solicitacao_id into unified rows */
  const allRows = useMemo(() => {
    const dispRows = solDisp.map((sol: any) => ({
      _type: 'DISPONIVEL' as const,
      id: sol.id,
      solicitacao_id: sol.id,
      numero_processo: sol.numero_processo,
      paciente_nome: sol.pacientes?.nome_completo ?? '—',
      created_at: sol.created_at,
      ida: null as any,
      volta: null as any,
      raw: sol,
    }));

    // Group viagens by solicitacao_id
    const grouped = new Map<string, { ida: any; volta: any; first: any }>();
    for (const v of viagens as any[]) {
      const key = v.solicitacao_id;
      if (!grouped.has(key)) grouped.set(key, { ida: null, volta: null, first: v });
      const g = grouped.get(key)!;
      if (v.tipo === 'IDA') g.ida = v;
      else g.volta = v;
    }

    const viagemRows = Array.from(grouped.entries()).map(([solId, g]) => {
      const ref = g.ida ?? g.volta ?? g.first;
      return {
        _type: 'VIAGEM' as const,
        id: ref.id,
        solicitacao_id: solId,
        numero_processo: ref.solicitacoes?.numero_processo ?? '—',
        paciente_nome: ref.solicitacoes?.pacientes?.nome_completo ?? '—',
        created_at: ref.created_at,
        ida: g.ida,
        volta: g.volta,
        raw: ref,
      };
    });

    if (activeTab === 'DISPONIVEL') return dispRows;
    if (activeTab === 'TODAS') return [...dispRows, ...viagemRows];
    return viagemRows;
  }, [solDisp, viagens, activeTab]);

  function refreshAll() {
    refresh();
    refreshDisp();
  }

  /** Opens drawer for a new viagem from a "disponível" row */
  function handleOpenNew(sol: any) {
    resetForm();
    setSolicitacaoId(sol.id);
    setNumProcesso(sol.numero_processo ?? '');
    setPacienteNome(sol.pacientes?.nome_completo ?? '');
    setDrawerOpen(true);
  }

  function resetForm() {
    setSolicitacaoId(''); setNumProcesso(''); setPacienteNome('');
    setIdaOrigem(''); setIdaDestino(''); setIdaDataEmbarque(''); setIdaModalTransporte('');
    setIdaCompanhia(''); setIdaLocalizador(''); setIdaValor(''); setIdaMedif(false); setIdaObservacoes('');
    setVoltaOrigem(''); setVoltaDestino(''); setVoltaDataEmbarque(''); setVoltaModalTransporte('');
    setVoltaCompanhia(''); setVoltaLocalizador(''); setVoltaValor(''); setVoltaMedif(false); setVoltaObservacoes('');
    setPendingFiles([]);
    setEditingId(null);
    setDrawerTab('ida');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetForm();
  }

  function handleOpenEdit(v: any) {
    setEditingId(v.id);
    setSolicitacaoId(v.solicitacao_id ?? '');
    setNumProcesso(v.solicitacoes?.numero_processo ?? '');
    setPacienteNome(v.solicitacoes?.pacientes?.nome_completo ?? '');
    // Pre-fill based on viagem type
    const isIda = v.tipo === 'IDA';
    const setOrUf = isIda ? setIdaOrigemUf : setVoltaOrigemUf;
    const setOr = isIda ? setIdaOrigem : setVoltaOrigem;
    const setDeUf = isIda ? setIdaDestinoUf : setVoltaDestinoUf;
    const setDe = isIda ? setIdaDestino : setVoltaDestino;
    const setDt = isIda ? setIdaDataEmbarque : setVoltaDataEmbarque;
    const setMo = isIda ? setIdaModalTransporte : setVoltaModalTransporte;
    const setCo = isIda ? setIdaCompanhia : setVoltaCompanhia;
    const setLo = isIda ? setIdaLocalizador : setVoltaLocalizador;
    const setVa = isIda ? setIdaValor : setVoltaValor;
    const setMe = isIda ? setIdaMedif : setVoltaMedif;
    const setOb = isIda ? setIdaObservacoes : setVoltaObservacoes;
    setOrUf(v.origem_uf ?? '');
    setOr(v.origem_cidade ?? '');
    setDeUf(v.destino_uf ?? '');
    setDe(v.destino_cidade ?? '');
    setDt(v.data_embarque_prevista ? (v.data_embarque_prevista.includes('T') ? v.data_embarque_prevista.split('T')[0] : v.data_embarque_prevista) : '');
    setMo(v.modal ?? '');
    setCo(v.companhia ?? '');
    setLo(v.numero_bilhete ?? '');
    setVa(v.valor != null ? String(v.valor) : '');
    setMe(v.medif_necessario ?? false);
    setOb(v.observacoes ?? '');
    setDrawerTab(isIda ? 'ida' : 'volta');
    setDrawerOpen(true);
  }

  function handleOpenDelete(v: any) {
    setDeleteConfirmId(v.id);
    const paciente = v.solicitacoes?.pacientes?.nome_completo;
    const rota = `${v.origem_cidade ?? ''} → ${v.destino_cidade ?? ''}`;
    setDeleteConfirmName(paciente ? `${paciente} (${rota})` : rota);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    try {
      const result = await excluirViagem(deleteConfirmId);
      if (result.error) {
        toast.error('Erro ao excluir', (result.error as any).message);
        return;
      }
      toast.success('Passagem excluída', 'O registro foi removido.');
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* ---- Submit: cadastro ida+volta ---- */
  async function handleSubmitIdaVolta() {
    if (!solicitacaoId) {
      toast.error('Paciente não selecionado', 'Selecione um paciente para vincular.');
      return;
    }

    // Validar ida
    if (!idaOrigem || !idaDestino || !idaDataEmbarque) {
      toast.warning('Dados incompletos', 'Preencha origem, destino e data da IDA.');
      setDrawerTab('ida');
      return;
    }

    // Validar volta
    if (!voltaOrigem || !voltaDestino || !voltaDataEmbarque) {
      toast.warning('Dados incompletos', 'Preencha origem, destino e data da VOLTA.');
      setDrawerTab('volta');
      return;
    }

    setSubmitting(true);

    try {
      // Editing a single viagem
      if (editingId) {
        const currentTab = drawerTab;
        const payload = currentTab === 'ida' ? {
          solicitacao_id: solicitacaoId,
          tipo: 'IDA' as const,
          modal: (idaModalTransporte as any) || 'AEREO',
          origem_cidade: idaOrigem, origem_uf: idaOrigemUf,
          destino_cidade: idaDestino, destino_uf: idaDestinoUf,
          com_pernoite: false,
          data_embarque_prevista: idaDataEmbarque,
          medif_necessario: idaMedif,
          valor: idaValor ? parseCurrency(idaValor) : undefined,
          companhia: (companhias.find((c) => c.id === idaCompanhia)?.nome ?? idaCompanhia) || undefined,
          numero_bilhete: idaLocalizador || undefined,
          observacoes: idaObservacoes || undefined,
        } : {
          solicitacao_id: solicitacaoId,
          tipo: 'RETORNO' as const,
          modal: (voltaModalTransporte as any) || 'AEREO',
          origem_cidade: voltaOrigem, origem_uf: voltaOrigemUf,
          destino_cidade: voltaDestino, destino_uf: voltaDestinoUf,
          com_pernoite: false,
          data_embarque_prevista: voltaDataEmbarque,
          medif_necessario: voltaMedif,
          valor: voltaValor ? parseCurrency(voltaValor) : undefined,
          companhia: (companhias.find((c) => c.id === voltaCompanhia)?.nome ?? voltaCompanhia) || undefined,
          numero_bilhete: voltaLocalizador || undefined,
          observacoes: voltaObservacoes || undefined,
        };

        const result = await atualizarViagem(editingId, payload);
        if (result.error) {
          toast.error('Erro ao atualizar', (result.error as any).message);
          setSubmitting(false);
          return;
        }
        toast.success('Passagem atualizada!', 'Os dados foram atualizados.');
        handleCloseDrawer();
        refreshAll();
        setSubmitting(false);
        return;
      }

      // Criar ida
      const idaPayload = {
        solicitacao_id: solicitacaoId,
        tipo: 'IDA' as const,
        modal: (idaModalTransporte as any) || 'AEREO',
        origem_cidade: idaOrigem, origem_uf: idaOrigemUf,
        destino_cidade: idaDestino, destino_uf: idaDestinoUf,
        com_pernoite: false,
        data_embarque_prevista: idaDataEmbarque,
        medif_necessario: idaMedif,
        valor: idaValor ? parseCurrency(idaValor) : undefined,
        companhia: (companhias.find((c) => c.id === idaCompanhia)?.nome ?? idaCompanhia) || undefined,
        numero_bilhete: idaLocalizador || undefined,
        observacoes: idaObservacoes || undefined,
      };

      const idaResult = await criarViagem(idaPayload as any);
      if (idaResult.error) {
        toast.error('Erro ao emitir passagem de ida', (idaResult.error as any).message);
        setSubmitting(false);
        return;
      }

      // Criar volta
      const voltaPayload = {
        solicitacao_id: solicitacaoId,
        tipo: 'RETORNO' as const,
        modal: (voltaModalTransporte as any) || 'AEREO',
        origem_cidade: voltaOrigem, origem_uf: voltaOrigemUf,
        destino_cidade: voltaDestino, destino_uf: voltaDestinoUf,
        com_pernoite: false,
        data_embarque_prevista: voltaDataEmbarque,
        medif_necessario: voltaMedif,
        valor: voltaValor ? parseCurrency(voltaValor) : undefined,
        companhia: (companhias.find((c) => c.id === voltaCompanhia)?.nome ?? voltaCompanhia) || undefined,
        numero_bilhete: voltaLocalizador || undefined,
        observacoes: voltaObservacoes || undefined,
      };

      const voltaResult = await criarViagem(voltaPayload as any);
      if (voltaResult.error) {
        toast.error('Erro ao emitir passagem de volta', (voltaResult.error as any).message);
        setSubmitting(false);
        return;
      }

      // Upload de documentos
      if (pendingFiles.length > 0) {
        setUploading(true);
        let uploadErrors = 0;
        for (const pf of pendingFiles) {
          try {
            const uploadResult = await uploadDocumento(solicitacaoId, pf.file, pf.tipo);
            if (uploadResult.error) uploadErrors++;
          } catch { uploadErrors++; }
        }
        setUploading(false);
        if (uploadErrors > 0) {
          toast.warning('Upload parcial', `${uploadErrors} documento(s) falharam no upload.`);
        }
      }

      toast.success('Passagens emitidas!', 'Ida e volta registradas. Processo encaminhado para Ajuda de Custo.');
      handleCloseDrawer();
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
    setSubmitting(false);
  }

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    return {
      disponiveis: solDisp.length,
      pendentes: viagens.filter((v: any) => v.situacao === 'AGUARDANDO_EMISSAO').length,
      emitidas: viagens.filter((v: any) => v.situacao === 'EMITIDA').length,
      confirmadas: viagens.filter((v: any) => v.situacao === 'UTILIZADA').length,
      noshow: viagens.filter((v: any) => v.situacao === 'NO_SHOW').length,
      valorTotal: viagens.filter((v: any) => v.valor != null).reduce((sum: number, v: any) => sum + (v.valor ?? 0), 0),
    };
  }, [viagens, solDisp]);

  /* ---- Auto-fill volta from ida ---- */
  function autoFillVolta() {
    if (!voltaOrigem && idaDestino) setVoltaOrigem(idaDestino);
    if (!voltaDestino && idaOrigem) setVoltaDestino(idaOrigem);
    if (!voltaModalTransporte && idaModalTransporte) setVoltaModalTransporte(idaModalTransporte);
  }

  /* ---- Render travel form fields ---- */
  function renderTravelFields(
    prefix: 'ida' | 'volta',
    origemUf: string, setOrigemUf: (v: string) => void,
    origem: string, setOrigem: (v: string) => void,
    destinoUf: string, setDestinoUf: (v: string) => void,
    destino: string, setDestino: (v: string) => void,
    dataEmbarque: string, setDataEmbarque: (v: string) => void,
    modal: string, setModal: (v: string) => void,
    comp: string, setComp: (v: string) => void,
    loc: string, setLoc: (v: string) => void,
    valor: string, setValor: (v: string) => void,
    medif: boolean, setMedif: (v: boolean) => void,
    obs: string, setObs: (v: string) => void,
  ) {
    return (
      <>
        <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Origem</h4>
        <UfCidadeSelect
          ufLabel="UF Origem"
          cidadeLabel="Cidade Origem"
          uf={origemUf}
          cidade={origem}
          onUfChange={setOrigemUf}
          onCidadeChange={setOrigem}
          required
        />

        <h4 className="text-xs font-semibold mb-1 mt-2" style={{ color: 'var(--tfd-text-muted)' }}>Destino</h4>
        <UfCidadeSelect
          ufLabel="UF Destino"
          cidadeLabel="Cidade Destino"
          uf={destinoUf}
          cidade={destino}
          onUfChange={setDestinoUf}
          onCidadeChange={setDestino}
          required
        />

        <FormField label="Data de embarque" required>
          <input type="date" className="tfd-input" value={dataEmbarque} onChange={(e) => setDataEmbarque(e.target.value)} />
        </FormField>

        <FormField label="Modal de transporte">
          <select className="tfd-input" value={modal} onChange={(e) => setModal(e.target.value)} disabled={loadingModais}>
            <option value="">{loadingModais ? 'Carregando...' : 'Selecione...'}</option>
            {modais.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </FormField>

        <FormField label="Companhia">
          <select className="tfd-input" value={comp} onChange={(e) => setComp(e.target.value)} disabled={loadingComp}>
            <option value="">{loadingComp ? 'Carregando...' : 'Selecione...'}</option>
            {companhias.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </FormField>

        <FormField label="Localizador / Bilhete">
          <input type="text" className="tfd-input" placeholder="Código do bilhete" value={loc} onChange={(e) => setLoc(e.target.value)} />
        </FormField>

        <FormField label="Valor da passagem">
          <input type="text" className="tfd-input" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(maskCurrency(e.target.value))} />
        </FormField>

        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" id={`${prefix}Medif`} checked={medif} onChange={(e) => setMedif(e.target.checked)} style={{ accentColor: 'var(--tfd-primary-500)' }} />
          <label htmlFor={`${prefix}Medif`} className="tfd-label" style={{ marginBottom: 0 }}>MEDIF necessário</label>
        </div>

        <FormField label="Observações">
          <textarea className="tfd-input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </FormField>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Viagens e Passagens"
        subtitle="Emissão, controle de embarque e rastreio de passagens"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}>
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Disponíveis</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.disponiveis}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pend. Emissão</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.pendentes}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}>
            <Plane size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Emitidas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.emitidas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Confirmadas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.confirmadas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>NO-SHOW</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-danger)' }}>{counts.noshow}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3 col-span-2 xl:col-span-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Valor Total</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(counts.valorTotal)}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODAS'
              ? viagens.length + solDisp.length
              : tab.key === 'DISPONIVEL'
                ? solDisp.length
                : viagens.filter((v: any) => v.situacao === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); }}
                className="tfd-btn tfd-btn--sm"
                style={{
                  backgroundColor: isActive ? 'var(--tfd-primary-50)' : 'transparent',
                  color: isActive ? 'var(--tfd-primary-700)' : 'var(--tfd-text-secondary)',
                  borderColor: isActive ? 'var(--tfd-primary-200)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
                <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full" style={{
                  backgroundColor: isActive ? 'var(--tfd-primary-100)' : 'var(--tfd-surface-100)',
                  color: isActive ? 'var(--tfd-primary-700)' : 'var(--tfd-text-muted)',
                  fontSize: '0.6875rem', fontWeight: 600,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search size={16} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
          <input type="text" className="tfd-input tfd-input--sm tfd-input--with-leading-icon" placeholder="Buscar paciente, localizador..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Solicitação</th>
                <th>Paciente</th>
                <th>Rota (Ida)</th>
                <th className="hidden md:table-cell">Rota (Volta)</th>
                <th className="hidden lg:table-cell">Datas</th>
                <th>Situação</th>
                <th className="w-[60px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || solDispLoading) ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                  </td>
                </tr>
              ) : allRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma viagem encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allRows.map((row) => {
                  const ida = row.ida;
                  const volta = row.volta;
                  const isViagem = row._type === 'VIAGEM';
                  // Use ida situation for the grouped row (or volta if no ida)
                  const sitRef = ida ?? volta;
                  const style = sitRef ? (situacaoMap[sitRef.situacao as SituacaoViagem] ?? situacaoMap.AGUARDANDO_EMISSAO) : null;
                  const aguardandoRetorno = labelDestino(row.solicitacao_id);
                  return (
                    <tr
                      key={`${row._type}-${row.id}`}
                      className={aguardandoRetorno ? '' : 'cursor-pointer'}
                      style={{ opacity: aguardandoRetorno ? 0.5 : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }}
                      onClick={aguardandoRetorno ? undefined : () => row._type === 'DISPONIVEL' ? handleOpenNew(row.raw) : handleOpenEdit(row.raw)}
                    >
                      {/* Solicitação */}
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <Link href={`/solicitacoes/${row.solicitacao_id}`} className="font-medium text-sm hover:underline" style={{ color: 'var(--tfd-primary-500)' }} onClick={(e) => e.stopPropagation()}>
                            {row.numero_processo}
                          </Link>
                          {aguardandoRetorno && (
                            <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.625rem' }}>
                              Ag. retorno — {aguardandoRetorno}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Paciente */}
                      <td className="max-w-[160px] truncate font-medium">{row.paciente_nome}</td>
                      {/* Rota Ida */}
                      <td>
                        {ida ? (
                          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                            <span style={{ color: 'var(--tfd-text-secondary)' }}>{ida.origem_cidade}</span>
                            <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                            <span style={{ color: 'var(--tfd-text-primary)' }} className="font-medium">{ida.destino_cidade}</span>
                          </div>
                        ) : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}
                      </td>
                      {/* Rota Volta */}
                      <td className="hidden md:table-cell">
                        {volta ? (
                          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                            <span style={{ color: 'var(--tfd-text-secondary)' }}>{volta.origem_cidade}</span>
                            <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                            <span style={{ color: 'var(--tfd-text-primary)' }} className="font-medium">{volta.destino_cidade}</span>
                          </div>
                        ) : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}
                      </td>
                      {/* Datas */}
                      <td className="hidden lg:table-cell">
                        {isViagem ? (
                          <div className="flex flex-col text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                            {ida && <span>Ida: {formatDate(ida.data_embarque_prevista)}</span>}
                            {volta && <span>Volta: {formatDate(volta.data_embarque_prevista)}</span>}
                          </div>
                        ) : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}
                      </td>
                      {/* Situação */}
                      <td>
                        {row._type === 'DISPONIVEL' ? (
                          <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>Disponível</span>
                        ) : style ? (
                          <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: style.bg, color: style.text }}>{style.label}</span>
                        ) : null}
                      </td>
                      {/* Ações */}
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/solicitacoes/${row.solicitacao_id}`} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Ver processo" onClick={(e) => e.stopPropagation()}><Eye size={15} /></Link>
                          {isViagem && (
                            <>
                              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Devolver" onClick={(e) => { e.stopPropagation(); setDevolverItem(sitRef); }}><SendHorizonal size={15} /></button>
                              <button type="button" className="tfd-btn tfd-btn-danger tfd-btn--icon-only" title="Excluir" onClick={(e) => { e.stopPropagation(); handleOpenDelete(sitRef); }}><Trash2 size={15} /></button>
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
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      {deleteConfirmId && (
        <>
          <div className="tfd-overlay-backdrop" onClick={() => setDeleteConfirmId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="tfd-dialog w-full max-w-sm">
              <div className="tfd-dialog-header">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FEF2F2]">
                    <Trash2 size={16} className="text-[#EF4444]" />
                  </div>
                  <span>Excluir passagem</span>
                </div>
              </div>
              <div className="tfd-dialog-content">
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Tem certeza que deseja excluir a passagem de <strong>{deleteConfirmName}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="tfd-dialog-footer">
                <button className="tfd-btn tfd-btn-secondary" onClick={() => setDeleteConfirmId(null)}>Cancelar</button>
                <button className="tfd-btn" style={{ background: '#EF4444', color: 'white' }} onClick={handleConfirmDelete}>
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="PASSAGENS"
        solicitacaoId={devolverItem?.solicitacao_id ?? ''}
        statusAtual={(devolverItem?.solicitacoes as any)?.status ?? 'AGUARDANDO_EMISSAO'}
        label={`${(devolverItem?.solicitacoes as any)?.numero_processo ?? ''} — ${(devolverItem?.solicitacoes as any)?.pacientes?.nome_completo ?? 'Paciente'}`}
        onSuccess={() => { refreshAll(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />

      {/* ========== Drawer: Emitir Ida + Volta ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Passagem' : 'Emitir Passagens — Ida + Volta'}
        subtitle={editingId ? 'Altere os dados da passagem' : 'Preencha ida e volta obrigatoriamente'}
        width="580px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitIdaVolta} disabled={submitting}>
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Emitindo...</> : editingId ? 'Salvar Alterações' : <><Ticket size={14} /> Emitir Ida + Volta</>}
            </button>
          </>
        }
      >
        {/* Processo (read-only — comes from the clicked row) */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{pacienteNome || '—'}</p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo: <strong style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</strong></p>
          </div>
        </div>

        {/* Tabs: Ida / Volta / Documentos */}
        <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
          {([
            { key: 'ida' as DrawerTab, label: 'Ida', icon: <Plane size={14} style={{ transform: 'rotate(0deg)' }} /> },
            { key: 'volta' as DrawerTab, label: 'Volta', icon: <Plane size={14} style={{ transform: 'rotate(180deg)' }} /> },
            ...(!editingId ? [{ key: 'documentos' as DrawerTab, label: 'Documentos', icon: <FileText size={14} /> }] : []),
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
              {/* Indicator dots for filled data */}
              {tab.key === 'ida' && idaOrigem && idaDestino && idaDataEmbarque && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tfd-status-success)' }} />
              )}
              {tab.key === 'volta' && voltaOrigem && voltaDestino && voltaDataEmbarque && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tfd-status-success)' }} />
              )}
              {tab.key === 'documentos' && pendingFiles.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-100)', color: 'var(--tfd-primary-700)' }}>
                  {pendingFiles.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Ida */}
        {drawerTab === 'ida' && renderTravelFields(
          'ida', idaOrigemUf, setIdaOrigemUf, idaOrigem, setIdaOrigem, idaDestinoUf, setIdaDestinoUf, idaDestino, setIdaDestino, idaDataEmbarque, setIdaDataEmbarque,
          idaModalTransporte, setIdaModalTransporte, idaCompanhia, setIdaCompanhia, idaLocalizador, setIdaLocalizador,
          idaValor, setIdaValor, idaMedif, setIdaMedif, idaObservacoes, setIdaObservacoes,
        )}

        {/* Tab: Volta */}
        {drawerTab === 'volta' && renderTravelFields(
          'volta', voltaOrigemUf, setVoltaOrigemUf, voltaOrigem, setVoltaOrigem, voltaDestinoUf, setVoltaDestinoUf, voltaDestino, setVoltaDestino, voltaDataEmbarque, setVoltaDataEmbarque,
          voltaModalTransporte, setVoltaModalTransporte, voltaCompanhia, setVoltaCompanhia, voltaLocalizador, setVoltaLocalizador,
          voltaValor, setVoltaValor, voltaMedif, setVoltaMedif, voltaObservacoes, setVoltaObservacoes,
        )}

        {/* Tab: Documentos */}
        {drawerTab === 'documentos' && (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
              Anexe bilhetes, comprovantes de passagens aéreas e demais documentos relacionados à viagem.
            </p>

            {/* File picker */}
            <div className="mb-3">
              <label
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)]"
                style={{ borderColor: 'var(--tfd-surface-border)' }}
              >
                <Upload size={18} style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>
                  Clique para selecionar arquivos
                </span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const newFiles: PendingFile[] = files.map((f) => ({ file: f, tipo: 'PASSAGEM_EMITIDA' as TipoDocumento }));
                    setPendingFiles((prev) => [...prev, ...newFiles]);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                PDF, PNG, JPG, WEBP, DOC — até 50 MB por arquivo
              </p>
            </div>

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {pendingFiles.map((pf, idx) => (
                  <div
                    key={`${pf.file.name}-${idx}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                      style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                      <Paperclip size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>{pf.file.name}</p>
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{(pf.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <select
                      className="tfd-input text-xs py-1 px-2 w-auto min-w-[150px]"
                      value={pf.tipo}
                      onChange={(e) => {
                        setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, tipo: e.target.value as TipoDocumento } : f)));
                      }}
                    >
                      <option value="PASSAGEM_EMITIDA">Passagem / Bilhete</option>
                      <option value="COTACAO_PASSAGEM">Cotação</option>
                      <option value="COMPROVANTE_EMBARQUE">Comprovante Embarque</option>
                      <option value="MEDIF">MEDIF</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0"
                      title="Remover arquivo"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EFF6FF]">
                  <Paperclip size={12} style={{ color: '#1E40AF' }} />
                  <span className="text-xs font-medium" style={{ color: '#1E40AF' }}>
                    {pendingFiles.length} arquivo(s) selecionado(s) — serão enviados ao emitir
                  </span>
                </div>
              </div>
            )}

            {uploading && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF3C7] mb-3">
                <Loader2 size={14} className="animate-spin" style={{ color: '#92400E' }} />
                <span className="text-xs font-medium" style={{ color: '#92400E' }}>Enviando documentos...</span>
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
