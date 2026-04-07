'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  UserCheck,
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Loader2,
  Paperclip,
  UserPlus,
  XCircle,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useMunicipios } from '@/shared/hooks/useLookup';
import { formatCPF, maskCPF, maskCNS, maskPhone, maskCEP } from '@/shared/pipes/formatters';

import { listarPacientes, buscarPaciente, criarPaciente, atualizarPaciente } from '@/services/pacientes.service';
import { listarPorPaciente, criarAcompanhante, atualizarAcompanhante, excluirAcompanhante } from '@/services/acompanhantes.service';
import { uploadDocumento, listarDocumentosPaciente, excluirDocumento } from '@/services/documentos.service';
import type { TipoDocumento, VinculoAcompanhante } from '@/lib/supabase/database.types';

/* -------------------------------------------------- */
/*  Constants & helpers                                */
/* -------------------------------------------------- */

const ITEMS_PER_PAGE = 10;

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const VINCULO_LABELS: Record<string, string> = {
  CONJUGE: 'Conjuge',
  FILHO: 'Filho(a)',
  PAI_MAE: 'Pai/Mae',
  RESPONSAVEL_LEGAL: 'Responsavel Legal',
  OUTRO: 'Outro',
};

function formatDateBR(iso: string): string {
  if (!iso) return '\u2014';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

function validarCpfModulo11(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  for (let t = 9; t <= 10; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(digits[i]) * (t + 1 - i);
    const rest = (sum * 10) % 11;
    if ((rest === 10 ? 0 : rest) !== Number(digits[t])) return false;
  }
  return true;
}

interface PendingFile {
  file: File;
  tipo: TipoDocumento;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PacientesPageWrapper() {
  return (
    <Suspense>
      <PacientesPage />
    </Suspense>
  );
}

function PacientesPage() {
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Delete confirmation state ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  /* ---- Form state: Dados Pessoais ---- */
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefoneCelular, setTelefoneCelular] = useState('');
  const [telefoneFixo, setTelefoneFixo] = useState('');
  const [email, setEmail] = useState('');
  const [outrosContatos, setOutrosContatos] = useState('');

  /* ---- Form state: Endereco ---- */
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('MA');

  /* ---- Form state: Documentos (pending uploads) ---- */
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [existingDocs, setExistingDocs] = useState<Record<string, unknown>[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ---- Form state: Acompanhantes ---- */
  const [acompanhantes, setAcompanhantes] = useState<Record<string, unknown>[]>([]);
  const [pendingAcomps, setPendingAcomps] = useState<Record<string, unknown>[]>([]);
  const [showAcompForm, setShowAcompForm] = useState(false);
  const [editingAcompId, setEditingAcompId] = useState<string | null>(null);
  const [acompNome, setAcompNome] = useState('');
  const [acompCpf, setAcompCpf] = useState('');
  const [acompCns, setAcompCns] = useState('');
  const [acompVinculo, setAcompVinculo] = useState<VinculoAcompanhante | ''>('');
  const [acompTelefone, setAcompTelefone] = useState('');
  const [acompNecessidadeEspecial, setAcompNecessidadeEspecial] = useState(false);
  const [acompDescricaoNecessidade, setAcompDescricaoNecessidade] = useState('');

  /* ---- Lookup hooks ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();

  /* ---- Data fetching via Supabase ---- */
  const { data: pacientes, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarPacientes({ search, page: currentPage, pageSize: ITEMS_PER_PAGE }),
    [search, currentPage],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativos: 0 });

  const refreshCounts = useCallback(() => {
    listarPacientes({ pageSize: 1 }).then(({ count }) => {
      const total = count ?? 0;
      setCounts({ total, ativos: total });
    });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && pacientes.length > 0) {
      editarHandled.current = editarParam;
      const pac = pacientes.find((p: Record<string, unknown>) => p.id === editarParam);
      if (pac) {
        handleOpenEdit(pac as Record<string, unknown>);
      } else {
        // Busca direto no banco se não está na página atual
        buscarPaciente(editarParam).then(({ data }) => {
          if (data) handleOpenEdit(data as Record<string, unknown>);
        });
      }
      // Limpa o query param da URL sem recarregar
      router.replace('/pacientes', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, pacientes]);

  /* -------------------------------------------------- */
  /*  Form reset & drawer handlers                      */
  /* -------------------------------------------------- */

  function resetForm() {
    setNome('');
    setCpf('');
    setCns('');
    setDataNascimento('');
    setSexo('');
    setTelefoneCelular('');
    setTelefoneFixo('');
    setEmail('');
    setOutrosContatos('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setMunicipio('');
    setUf('MA');
    setPendingFiles([]);
    setExistingDocs([]);
    setAcompanhantes([]);
    setPendingAcomps([]);
    resetAcompForm();
  }

  function resetAcompForm() {
    setShowAcompForm(false);
    setEditingAcompId(null);
    setAcompNome('');
    setAcompCpf('');
    setAcompCns('');
    setAcompVinculo('');
    setAcompTelefone('');
    setAcompNecessidadeEspecial(false);
    setAcompDescricaoNecessidade('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  async function handleOpenEdit(pac: Record<string, unknown>) {
    const id = pac.id as string;
    setEditingId(id);
    setNome((pac.nome_completo as string) ?? '');
    setCpf(maskCPF((pac.cpf as string) ?? ''));
    setCns(maskCNS((pac.cns as string) ?? ''));
    setDataNascimento((pac.data_nascimento as string) ?? '');
    setSexo((pac.sexo as string) ?? '');
    setTelefoneCelular(maskPhone((pac.telefone_celular as string) ?? ''));
    setTelefoneFixo(maskPhone((pac.telefone_fixo as string) ?? ''));
    setEmail((pac.email as string) ?? '');
    setOutrosContatos('');
    setCep(maskCEP((pac.cep as string) ?? ''));
    setLogradouro((pac.logradouro as string) ?? '');
    setNumero((pac.numero as string) ?? '');
    setBairro((pac.bairro as string) ?? '');
    setMunicipio((pac.municipio_residencia_id as string) ?? '');
    setUf((pac.uf as string) ?? 'MA');
    setPendingFiles([]);

    // Fetch existing documents
    const { data: docs } = await listarDocumentosPaciente(id);
    setExistingDocs((docs ?? []) as Record<string, unknown>[]);

    // Fetch companions
    const { data: acomps } = await listarPorPaciente(id);
    setAcompanhantes((acomps ?? []) as Record<string, unknown>[]);

    resetAcompForm();
    setDrawerOpen(true);
  }

  function handleOpenDelete(pac: Record<string, unknown>) {
    setDeleteConfirmId(pac.id as string);
    setDeleteConfirmName((pac.nome_completo as string) ?? 'Paciente');
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    try {
      const result = await atualizarPaciente(deleteConfirmId, { ativo: false } as any);
      if (result.error) {
        toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Paciente excluido', 'O registro foi desativado do sistema.');
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------------------------------------------------- */
  /*  Submit patient                                    */
  /* -------------------------------------------------- */

  async function handleSubmitPaciente() {
    try {
      // Validate required fields
      if (!nome.trim()) {
        toast.error('Campo obrigatorio', 'Informe o nome completo do paciente.');
        return;
      }
      if (!cpf.trim()) {
        toast.error('Campo obrigatorio', 'Informe o CPF do paciente.');
        return;
      }
      if (!validarCpfModulo11(cpf)) {
        toast.error('CPF invalido', 'O CPF informado nao e valido.');
        return;
      }
      if (!dataNascimento) {
        toast.error('Campo obrigatorio', 'Informe a data de nascimento.');
        return;
      }
      if (!sexo) {
        toast.error('Campo obrigatorio', 'Selecione o sexo do paciente.');
        return;
      }
      if (!municipio) {
        toast.error('Campo obrigatorio', 'Selecione o municipio de residencia.');
        return;
      }

      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanCns = cns.replace(/\D/g, '');
      const cleanPhoneCel = telefoneCelular.replace(/\D/g, '');
      const cleanPhoneFix = telefoneFixo.replace(/\D/g, '');
      const cleanCep = cep.replace(/\D/g, '');
      const munSelecionado = municipios.find((m) => m.value === municipio);

      const pacData: Record<string, unknown> = {
        nome_completo: nome.trim(),
        cpf: cleanCpf,
        cns: cleanCns || '',
        sexo: sexo || 'OUTRO',
        data_nascimento: dataNascimento,
        telefone_celular: cleanPhoneCel || '',
        telefone_fixo: cleanPhoneFix || '',
        email: email.trim() || '',
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cep: cleanCep,
        municipio: munSelecionado?.label ?? '',
        uf: uf || 'MA',
        municipio_residencia_id: municipio,
      };

      let pacienteId: string;

      if (editingId) {
        const result = await atualizarPaciente(editingId, pacData as any);
        if (result.error) {
          toast.error('Erro ao atualizar paciente', (result.error as { message?: string }).message ?? 'Erro desconhecido');
          return;
        }
        pacienteId = editingId;
      } else {
        const result = await criarPaciente(pacData as any);
        if (result.error || !result.data) {
          toast.error('Erro ao criar paciente', (result.error as { message?: string })?.message ?? 'Erro desconhecido');
          return;
        }
        pacienteId = (result.data as { id: string }).id;

        // Save pending companions
        if (pendingAcomps.length > 0) {
          for (const pending of pendingAcomps) {
            const { _tempId, ...acompFields } = pending as Record<string, unknown> & { _tempId: string };
            await criarAcompanhante({ ...acompFields, paciente_id: pacienteId } as any);
          }
        }
      }

      // Upload pending files
      if (pendingFiles.length > 0) {
        setUploading(true);
        let uploadErrors = 0;
        let lastErrorMsg = '';
        for (const pf of pendingFiles) {
          try {
            const uploadResult = await uploadDocumento(null, pf.file, pf.tipo, pacienteId);
            if (uploadResult.error) {
              uploadErrors++;
              lastErrorMsg = (uploadResult.error as any)?.message ?? '';
            }
          } catch {
            uploadErrors++;
          }
        }
        setUploading(false);
        if (uploadErrors > 0) {
          toast.warning(
            'Upload parcial',
            `${uploadErrors} de ${pendingFiles.length} documento(s) falharam.${lastErrorMsg ? ` Erro: ${lastErrorMsg}` : ''}`,
          );
        }
      }

      toast.success(
        editingId ? 'Paciente atualizado!' : 'Paciente cadastrado!',
        editingId
          ? 'Os dados foram atualizados com sucesso.'
          : 'O paciente foi cadastrado com sucesso.',
      );
      handleCloseDrawer();
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------------------------------------------------- */
  /*  Companion handlers                                */
  /* -------------------------------------------------- */

  function handleEditAcomp(acomp: Record<string, unknown>) {
    const id = (acomp.id as string) || (acomp._tempId as string);
    setEditingAcompId(id);
    setAcompNome((acomp.nome_completo as string) ?? '');
    setAcompCpf(maskCPF((acomp.cpf as string) ?? ''));
    setAcompCns(maskCNS((acomp.cns as string) ?? ''));
    setAcompVinculo((acomp.vinculo as VinculoAcompanhante) ?? '');
    setAcompTelefone(maskPhone((acomp.telefone as string) ?? ''));
    setAcompNecessidadeEspecial((acomp.necessidade_especial as boolean) ?? false);
    setAcompDescricaoNecessidade((acomp.descricao_necessidade as string) ?? '');
    setShowAcompForm(true);
  }

  async function handleDeleteAcomp(acompId: string) {
    // Check if it's a pending (unsaved) companion
    if (acompId.startsWith('temp-')) {
      setPendingAcomps((prev) => prev.filter((a) => (a._tempId as string) !== acompId));
      toast.success('Acompanhante removido', 'O registro foi removido.');
      return;
    }
    try {
      const result = await excluirAcompanhante(acompId);
      if (result.error) {
        toast.error('Erro ao excluir acompanhante', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Acompanhante excluido', 'O registro foi removido.');
      setAcompanhantes((prev) => prev.filter((a) => (a.id as string) !== acompId));
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  async function handleSaveAcomp() {
    if (!acompNome.trim()) {
      toast.error('Campo obrigatorio', 'Informe o nome do acompanhante.');
      return;
    }
    if (!acompCpf.trim() || !validarCpfModulo11(acompCpf)) {
      toast.error('CPF invalido', 'Informe um CPF valido para o acompanhante.');
      return;
    }
    if (!acompVinculo) {
      toast.error('Campo obrigatorio', 'Selecione o vinculo do acompanhante.');
      return;
    }
    if (!acompTelefone.trim()) {
      toast.error('Campo obrigatorio', 'Informe o telefone do acompanhante.');
      return;
    }

    const cleanAcompCpf = acompCpf.replace(/\D/g, '');
    const cleanAcompCns = acompCns.replace(/\D/g, '');
    const cleanAcompPhone = acompTelefone.replace(/\D/g, '');

    const acompData: Record<string, unknown> = {
      nome_completo: acompNome.trim(),
      cpf: cleanAcompCpf,
      cns: cleanAcompCns || null,
      vinculo: acompVinculo,
      telefone: cleanAcompPhone,
      necessidade_especial: acompNecessidadeEspecial,
      descricao_necessidade: acompNecessidadeEspecial ? acompDescricaoNecessidade.trim() || null : null,
    };

    if (editingId) {
      // Patient already exists — save companion to DB
      try {
        const fullData = { ...acompData, paciente_id: editingId };
        if (editingAcompId) {
          const result = await atualizarAcompanhante(editingAcompId, fullData as any);
          if (result.error) {
            toast.error('Erro ao atualizar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
            return;
          }
          toast.success('Acompanhante atualizado', 'Os dados foram salvos.');
        } else {
          const result = await criarAcompanhante(fullData as any);
          if (result.error) {
            toast.error('Erro ao criar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
            return;
          }
          toast.success('Acompanhante adicionado', 'O acompanhante foi cadastrado.');
        }
        // Refresh companion list from DB
        const { data: acomps } = await listarPorPaciente(editingId);
        setAcompanhantes((acomps ?? []) as Record<string, unknown>[]);
      } catch (err: unknown) {
        const e = err as { message?: string };
        toast.error('Erro inesperado', e.message ?? 'Tente novamente');
      }
    } else {
      // Patient not yet created — store companion in memory
      if (editingAcompId) {
        // Editing a pending companion
        setPendingAcomps((prev) =>
          prev.map((a) => (a._tempId as string) === editingAcompId ? { ...acompData, _tempId: editingAcompId } : a)
        );
        toast.success('Acompanhante atualizado', 'Os dados foram atualizados.');
      } else {
        // Adding a new pending companion
        const tempId = `temp-${Date.now()}`;
        setPendingAcomps((prev) => [...prev, { ...acompData, _tempId: tempId }]);
        toast.success('Acompanhante adicionado', 'Sera salvo junto com o paciente.');
      }
    }
    resetAcompForm();
  }

  async function handleDeleteExistingDoc(docId: string, urlArquivo: string) {
    try {
      const result = await excluirDocumento(docId, urlArquivo);
      if (result.error) {
        toast.error('Erro ao excluir documento', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      setExistingDocs((prev) => prev.filter((d) => (d.id as string) !== docId));
      toast.success('Documento excluido', 'O arquivo foi removido.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------------------------------------------------- */
  /*  Render                                            */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle="Gerenciamento de pacientes TFD"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => { setEditingId(null); resetForm(); setDrawerOpen(true); }}>
            <Plus size={16} />
            Novo Paciente
          </button>
        }
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Pacientes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.total}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}
          >
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pacientes Ativos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.ativos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}
          >
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Com Processo Ativo</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{'\u2014'}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por nome, CPF ou CNS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
          {totalCount} resultado{totalCount !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="hidden md:table-cell">CPF</th>
                <th className="hidden lg:table-cell">CNS</th>
                <th className="hidden lg:table-cell">Municipio</th>
                <th className="hidden md:table-cell">Telefone</th>
                <th className="hidden md:table-cell">Data Cadastro</th>
                <th className="w-[100px]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : pacientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum paciente encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pacientes.map((pac: Record<string, unknown>) => (
                  <tr key={pac.id as string} className="cursor-pointer" onClick={() => router.push(`/pacientes/${pac.id}`)}>
                    <td className="max-w-[200px] truncate font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {pac.nome_completo as string}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatCPF((pac.cpf as string) ?? '')}
                    </td>
                    <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(pac.cns as string) || '\u2014'}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(pac.municipio as string) || '\u2014'}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(pac.telefone_celular as string) ? maskPhone(pac.telefone_celular as string) : '\u2014'}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatDateBR(pac.created_at as string)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(pac); }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                          title="Excluir"
                          onClick={(e) => { e.stopPropagation(); handleOpenDelete(pac); }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="tfd-card p-6 max-w-md w-full mx-4"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--tfd-status-error-bg)', color: 'var(--tfd-status-error)' }}
              >
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Confirmar exclusao
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--tfd-text-secondary)' }}>
              Tem certeza que deseja excluir o paciente{' '}
              <strong style={{ color: 'var(--tfd-text-primary)' }}>{deleteConfirmName}</strong>?
              Esta acao nao pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="tfd-btn tfd-btn-secondary"
                onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
              >
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-danger" onClick={handleConfirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Patient Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Paciente' : 'Novo Paciente'}
        subtitle={editingId ? 'Atualize os dados do paciente' : 'Preencha os dados para cadastrar um novo paciente'}
        width="640px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitPaciente}>
              {editingId ? 'Salvar Alteracoes' : 'Cadastrar Paciente'}
            </button>
          </>
        }
      >
        {/* ── Section: Dados Pessoais ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados Pessoais
        </h3>

        <FormField label="Nome completo" required>
          <input
            type="text"
            className="tfd-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="CPF" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
            />
          </FormField>

          <FormField label="Cartao SUS (CNS)">
            <input
              type="text"
              className="tfd-input"
              placeholder="000 0000 0000 0000"
              value={cns}
              onChange={(e) => setCns(maskCNS(e.target.value))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data de Nascimento" required>
            <input
              type="date"
              className="tfd-input"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </FormField>

          <FormField label="Sexo" required>
            <select
              className="tfd-input"
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
            >
              <option value="">Selecione...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Telefone celular">
            <input
              type="tel"
              className="tfd-input"
              placeholder="(99) 99999-0000"
              value={telefoneCelular}
              onChange={(e) => setTelefoneCelular(maskPhone(e.target.value))}
            />
          </FormField>

          <FormField label="Telefone fixo">
            <input
              type="tel"
              className="tfd-input"
              placeholder="(99) 9999-0000"
              value={telefoneFixo}
              onChange={(e) => setTelefoneFixo(maskPhone(e.target.value))}
            />
          </FormField>
        </div>

        <FormField label="E-mail">
          <input
            type="email"
            className="tfd-input"
            placeholder="paciente@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField label="Outros contatos">
          <textarea
            className="tfd-input"
            rows={2}
            placeholder="Informacoes adicionais de contato..."
            value={outrosContatos}
            onChange={(e) => setOutrosContatos(e.target.value)}
          />
        </FormField>

        {/* ── Section: Endereco ── */}
        <hr className="tfd-divider" />
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Endereco
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="CEP">
            <input
              type="text"
              className="tfd-input"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(maskCEP(e.target.value))}
            />
          </FormField>

          <div className="col-span-2">
            <FormField label="Logradouro">
              <input
                type="text"
                className="tfd-input"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Numero">
            <input
              type="text"
              className="tfd-input"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </FormField>

          <FormField label="Bairro">
            <input
              type="text"
              className="tfd-input"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
            />
          </FormField>

          <FormField label="UF">
            <select
              className="tfd-input"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
            >
              {UF_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Municipio de Residencia" required>
          <select
            className="tfd-input"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            disabled={loadingMun}
          >
            <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
            {municipios.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FormField>

        {/* ── Section: Documentos Pessoais ── */}
        <hr className="tfd-divider" />
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Documentos Pessoais
        </h3>

        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Anexe os documentos pessoais do paciente (RG, CPF, comprovante de residencia, Cartao SUS).
        </p>

        {/* Existing documents (edit mode) */}
        {existingDocs.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>
              Documentos ja enviados
            </p>
            {existingDocs.map((doc) => (
              <div
                key={doc.id as string}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--tfd-status-success-bg)', border: '1px solid var(--tfd-surface-border)' }}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  <Paperclip size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                    {doc.nome_arquivo as string}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                    {doc.tipo as string}
                  </p>
                </div>
                <button
                  type="button"
                  className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0"
                  title="Remover documento"
                  onClick={() => handleDeleteExistingDoc(doc.id as string, doc.url_arquivo as string)}
                >
                  <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

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
                const newFiles: PendingFile[] = files.map((f) => ({
                  file: f,
                  tipo: 'OUTROS' as TipoDocumento,
                }));
                setPendingFiles((prev) => [...prev, ...newFiles]);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            PDF, PNG, JPG, WEBP, DOC — ate 50 MB por arquivo
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
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  <Paperclip size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                    {pf.file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                    {(pf.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <select
                  className="tfd-input text-xs py-1 px-2 w-auto min-w-[130px]"
                  value={pf.tipo}
                  onChange={(e) => {
                    setPendingFiles((prev) =>
                      prev.map((f, i) => (i === idx ? { ...f, tipo: e.target.value as TipoDocumento } : f)),
                    );
                  }}
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNS">Cartao SUS</option>
                  <option value="COMPROVANTE_RESIDENCIA">Comp. Residencia</option>
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
                {pendingFiles.length} arquivo(s) selecionado(s) — serao enviados ao salvar
              </span>
            </div>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF3C7] mb-3">
            <Loader2 size={14} className="animate-spin" style={{ color: '#92400E' }} />
            <span className="text-xs font-medium" style={{ color: '#92400E' }}>
              Enviando documentos...
            </span>
          </div>
        )}

        {/* ── Section: Acompanhantes ── */}
        <hr className="tfd-divider" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Acompanhantes
          </h3>
          {!showAcompForm && (
            <button
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
              onClick={() => { resetAcompForm(); setShowAcompForm(true); }}
            >
              <UserPlus size={14} />
              Adicionar Acompanhante
            </button>
          )}
        </div>

        {/* Companion list */}
        {(() => {
          const displayedAcomps = editingId ? acompanhantes : pendingAcomps;
          return displayedAcomps.length > 0 ? (
            <div className="space-y-2 mb-4">
              {displayedAcomps.map((acomp) => {
                const acompKey = (acomp.id as string) || (acomp._tempId as string);
                return (
                  <div
                    key={acompKey}
                    className="p-3 rounded-lg"
                    style={{ border: '1px solid var(--tfd-surface-border)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                          {acomp.nome_completo as string}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                            CPF: {formatCPF((acomp.cpf as string) ?? '')}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                            Vinculo: {VINCULO_LABELS[(acomp.vinculo as string)] ?? (acomp.vinculo as string)}
                          </span>
                          {(acomp.telefone as string) && (
                            <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                              Tel: {maskPhone(acomp.telefone as string)}
                            </span>
                          )}
                        </div>
                        {(acomp.necessidade_especial as boolean) && (
                          <span
                            className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: 'var(--tfd-status-warning-bg)', color: 'var(--tfd-status-warning)' }}
                          >
                            Necessidade especial
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only tfd-btn--sm"
                          title="Editar acompanhante"
                          onClick={() => handleEditAcomp(acomp)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="tfd-btn tfd-btn-danger tfd-btn--icon-only tfd-btn--sm"
                          title="Excluir acompanhante"
                          onClick={() => handleDeleteAcomp(acompKey)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null;
        })()}

        {/* Companion add/edit form */}
        {showAcompForm && (
          <div
            className="p-4 rounded-lg mb-4"
            style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-primary-50)' }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              {editingAcompId ? 'Editar Acompanhante' : 'Novo Acompanhante'}
            </p>

            <FormField label="Nome completo" required>
              <input
                type="text"
                className="tfd-input"
                value={acompNome}
                onChange={(e) => setAcompNome(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="CPF" required>
                <input
                  type="text"
                  className="tfd-input"
                  placeholder="000.000.000-00"
                  value={acompCpf}
                  onChange={(e) => setAcompCpf(maskCPF(e.target.value))}
                />
              </FormField>

              <FormField label="CNS">
                <input
                  type="text"
                  className="tfd-input"
                  placeholder="000 0000 0000 0000"
                  value={acompCns}
                  onChange={(e) => setAcompCns(maskCNS(e.target.value))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Vinculo" required>
                <select
                  className="tfd-input"
                  value={acompVinculo}
                  onChange={(e) => setAcompVinculo(e.target.value as VinculoAcompanhante | '')}
                >
                  <option value="">Selecione...</option>
                  <option value="CONJUGE">Conjuge</option>
                  <option value="FILHO">Filho(a)</option>
                  <option value="PAI_MAE">Pai/Mae</option>
                  <option value="RESPONSAVEL_LEGAL">Responsavel Legal</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </FormField>

              <FormField label="Telefone" required>
                <input
                  type="tel"
                  className="tfd-input"
                  placeholder="(99) 99999-0000"
                  value={acompTelefone}
                  onChange={(e) => setAcompTelefone(maskPhone(e.target.value))}
                />
              </FormField>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="acompNecessidadeEspecial"
                checked={acompNecessidadeEspecial}
                onChange={(e) => setAcompNecessidadeEspecial(e.target.checked)}
                style={{ accentColor: 'var(--tfd-primary-500)' }}
              />
              <label htmlFor="acompNecessidadeEspecial" className="tfd-label" style={{ marginBottom: 0 }}>
                Necessidade especial
              </label>
            </div>

            {acompNecessidadeEspecial && (
              <FormField label="Descricao da Necessidade">
                <textarea
                  className="tfd-input"
                  rows={2}
                  placeholder="Descreva a necessidade especial..."
                  value={acompDescricaoNecessidade}
                  onChange={(e) => setAcompDescricaoNecessidade(e.target.value)}
                />
              </FormField>
            )}

            <div className="flex items-center gap-2">
              <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleSaveAcomp}>
                Salvar Acompanhante
              </button>
              <button className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={resetAcompForm}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
