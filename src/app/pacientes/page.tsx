'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
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
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useTableControls } from '@/shared/hooks/useTableControls';
import { useMunicipios } from '@/shared/hooks/useLookup';
import { formatCPF, maskCPF, maskCNS, maskPhone, maskCEP } from '@/shared/pipes/formatters';

import CepAutofill from '@/shared/components/cep-autofill/CepAutofill';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import IdadeBadge from '@/shared/components/idade-badge';

import { listarPacientes, buscarPaciente, criarPaciente, atualizarPaciente } from '@/services/pacientes.service';
import { buscarRegionalPorMunicipio, listarRegionaisSaude } from '@/services/regionais-saude.service';
import {
  buscarPorPaciente as buscarDadosBancariosPorPaciente,
  upsertPorPaciente as upsertDadosBancariosPorPaciente,
  removerDadosBancarios,
} from '@/services/dados-bancarios.service';
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

function validarCns(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 15) return false;
  // CNS starting with 1 or 2: PIS-based algorithm
  if (/^[12]/.test(digits)) {
    const pis = digits.slice(0, 11);
    let sum = 0;
    for (let i = 0; i < 11; i++) sum += Number(pis[i]) * (10 - i);
    let dsr = sum % 11;
    let result: string;
    if (dsr === 0) {
      result = pis + '000' + '1';
    } else {
      const sub = 11 - dsr;
      if (sub === 10) {
        sum += 2;
        dsr = sum % 11;
        result = pis + '001' + String(11 - dsr);
      } else {
        result = pis + '00' + String(sub);
      }
    }
    // Pad to 15
    while (result.length < 15) result = result + '0';
    return result === digits;
  }
  // CNS starting with 7, 8, or 9: sum of digits × position must be divisible by 11
  if (/^[789]/.test(digits)) {
    let sum = 0;
    for (let i = 0; i < 15; i++) sum += Number(digits[i]) * (15 - i);
    return sum % 11 === 0;
  }
  return false;
}

function validarDataNascimento(value: string): string {
  if (!value) return '';
  const d = new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Data invalida.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d > today) return 'A data de nascimento nao pode ser futura.';
  const minDate = new Date('1900-01-01');
  if (d < minDate) return 'Data de nascimento muito antiga.';
  return '';
}

function calcularIdade(dataNasc: string): number | null {
  if (!dataNasc) return null;
  const d = new Date(dataNasc + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
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

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Snapshot dos campos no momento de abrir o drawer em modo edição — usado para gerar o diff. */
  const [editingSnapshot, setEditingSnapshot] = useState<Record<string, string> | null>(null);
  /** Modal de confirmação de cadastro/edição. */
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [savingPaciente, setSavingPaciente] = useState(false);

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
  const [regionalId, setRegionalId] = useState('');

  /* ---- Municípios via IBGE API (filtrados por UF) ---- */
  const [cidadesIbge, setCidadesIbge] = useState<{ id: number; nome: string }[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);

  /* ---- Regionais cadastradas (com região vinculada) ---- */
  const [regionaisOptions, setRegionaisOptions] = useState<{ id: string; codigo: string; nome: string; regiao_nome: string | null }[]>([]);
  const [regionaisLoading, setRegionaisLoading] = useState(true);

  /* ---- Form state: Dados Bancários (opcional) ---- */
  const [bancoNome, setBancoNome] = useState('');
  const [bancoAgencia, setBancoAgencia] = useState('');
  const [bancoConta, setBancoConta] = useState('');
  const [bancoTipoConta, setBancoTipoConta] = useState<'CORRENTE' | 'POUPANCA' | ''>('');
  const [bancoTitular, setBancoTitular] = useState('');
  const [bancoCpfTitular, setBancoCpfTitular] = useState('');
  const [bancoRegistroId, setBancoRegistroId] = useState<string | null>(null);

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
  const [acompDataNascimento, setAcompDataNascimento] = useState('');
  const [acompVinculo, setAcompVinculo] = useState<VinculoAcompanhante | ''>('');
  const [acompTelefone, setAcompTelefone] = useState('');
  const [acompAgeWarning, setAcompAgeWarning] = useState('');

  /* ---- Lookup hooks ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();

  /* ---- Buscar cidades do IBGE quando UF muda ---- */
  useEffect(() => {
    if (!uf) { setCidadesIbge([]); return; }
    let cancelled = false;
    setCidadesLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCidadesIbge(data.map((m: any) => ({ id: m.id, nome: m.nome })));
      })
      .catch(() => { if (!cancelled) setCidadesIbge([]); })
      .finally(() => { if (!cancelled) setCidadesLoading(false); });
    return () => { cancelled = true; };
  }, [uf]);

  /* ---- Carregar todas as regionais do banco (incluindo a região vinculada) ---- */
  useEffect(() => {
    listarRegionaisSaude({ pageSize: 100 }).then(({ data }) => {
      setRegionaisOptions(
        (data ?? []).map((r: any) => ({
          id: r.id,
          codigo: r.codigo,
          nome: r.nome,
          regiao_nome: (r.regiao as { nome?: string } | null)?.nome ?? null,
        })),
      );
      setRegionaisLoading(false);
    });
  }, []);

  /* ---- Auto-selecionar regional quando município muda ---- */
  useEffect(() => {
    if (!municipio) return;
    buscarRegionalPorMunicipio(municipio).then(({ data }) => {
      const row = data as unknown as { regionais_saude?: { id?: string } | null } | null;
      const reg = row?.regionais_saude ?? null;
      if (reg?.id) setRegionalId(reg.id);
    }).catch(() => {});
  }, [municipio]);

  /* ---- Data fetching via Supabase (fetch all, filter client-side) ---- */
  const { data: pacientesRaw, loading, refresh } = useSupabaseData(
    () => listarPacientes({ pageSize: 9999 }),
    [],
  );

  /* ---- Table controls (search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: pacientesRaw as unknown as Record<string, unknown>[],
    searchFields: ['nome_completo', 'cpf', 'cns'],
    dateField: 'created_at',
    pageSize: ITEMS_PER_PAGE,
  });

  /* ---- Summary counters (derived from raw data) ---- */
  const counts = { total: pacientesRaw.length, ativos: pacientesRaw.length };

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && pacientesRaw.length > 0) {
      editarHandled.current = editarParam;
      const pac = pacientesRaw.find((p: Record<string, unknown>) => p.id === editarParam);
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
  }, [editarParam, loading, pacientesRaw]);

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
    setRegionalId('');
    setPendingFiles([]);
    setExistingDocs([]);
    setAcompanhantes([]);
    setPendingAcomps([]);
    resetAcompForm();
    // Dados bancários
    setBancoNome('');
    setBancoAgencia('');
    setBancoConta('');
    setBancoTipoConta('');
    setBancoTitular('');
    setBancoCpfTitular('');
    setBancoRegistroId(null);
  }

  function resetAcompForm() {
    setShowAcompForm(false);
    setEditingAcompId(null);
    setAcompNome('');
    setAcompCpf('');
    setAcompCns('');
    setAcompDataNascimento('');
    setAcompVinculo('');
    setAcompTelefone('');
    setAcompAgeWarning('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  async function handleOpenEdit(pac: Record<string, unknown>) {
    const id = pac.id as string;
    setEditingId(id);
    setEditingSnapshot({
      nome: (pac.nome_completo as string) ?? '',
      cpf: (pac.cpf as string) ?? '',
      cns: (pac.cns as string) ?? '',
      dataNascimento: (pac.data_nascimento as string) ?? '',
      sexo: (pac.sexo as string) ?? '',
      telefoneCelular: (pac.telefone_celular as string) ?? '',
      telefoneFixo: (pac.telefone_fixo as string) ?? '',
      email: (pac.email as string) ?? '',
      cep: (pac.cep as string) ?? '',
      logradouro: (pac.logradouro as string) ?? '',
      numero: (pac.numero as string) ?? '',
      bairro: (pac.bairro as string) ?? '',
      municipio: (pac.municipio as string) ?? '',
      uf: (pac.uf as string) ?? 'MA',
    });
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
    setUf((pac.uf as string) ?? 'MA');
    setMunicipio((pac.municipio as string) ?? '');
    setRegionalId('');
    setPendingFiles([]);

    // Fetch existing documents
    const { data: docs } = await listarDocumentosPaciente(id);
    setExistingDocs((docs ?? []) as Record<string, unknown>[]);

    // Fetch companions
    const { data: acomps } = await listarPorPaciente(id);
    setAcompanhantes((acomps ?? []) as Record<string, unknown>[]);

    // Fetch dados bancários (opcionais)
    const { data: db } = await buscarDadosBancariosPorPaciente(id);
    if (db) {
      setBancoRegistroId(db.id);
      setBancoNome(db.banco ?? '');
      setBancoAgencia(db.agencia ?? '');
      setBancoConta(db.conta ?? '');
      setBancoTipoConta((db.tipo_conta as 'CORRENTE' | 'POUPANCA') ?? '');
      setBancoTitular(db.nome_titular ?? '');
      setBancoCpfTitular(maskCPF(db.cpf_titular ?? ''));
    } else {
      setBancoRegistroId(null);
      setBancoNome('');
      setBancoAgencia('');
      setBancoConta('');
      setBancoTipoConta('');
      setBancoTitular('');
      setBancoCpfTitular('');
    }

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
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------------------------------------------------- */
  /*  Submit patient                                    */
  /* -------------------------------------------------- */

  /** Valida campos e abre o modal de confirmação. */
  function handleRequestSubmit() {
    // Validações essenciais (mesmas do handleSubmitPaciente).
    if (!nome.trim()) { toast.error('Campo obrigatório', 'Informe o nome completo do paciente.'); return; }
    if (!cpf.trim()) { toast.error('Campo obrigatório', 'Informe o CPF do paciente.'); return; }
    if (!validarCpfModulo11(cpf)) { toast.error('CPF inválido', 'O CPF informado não é válido.'); return; }
    if (!dataNascimento) { toast.error('Campo obrigatório', 'Informe a data de nascimento.'); return; }
    const dateErr = validarDataNascimento(dataNascimento);
    if (dateErr) { toast.error('Data inválida', dateErr); return; }
    if (!sexo) { toast.error('Campo obrigatório', 'Selecione o sexo do paciente.'); return; }
    if (!telefoneCelular.trim() && !telefoneFixo.trim()) {
      toast.error('Campo obrigatório', 'Informe ao menos um telefone de contato.'); return;
    }
    if (!logradouro.trim()) { toast.error('Campo obrigatório', 'Informe o logradouro do endereço.'); return; }
    if (!numero.trim()) { toast.error('Campo obrigatório', 'Informe o número do endereço.'); return; }
    if (!bairro.trim()) { toast.error('Campo obrigatório', 'Informe o bairro do endereço.'); return; }
    if (!municipio) { toast.error('Campo obrigatório', 'Selecione o município de residência.'); return; }
    if (cns.replace(/\D/g, '') && !validarCns(cns)) {
      toast.error('CNS inválido', 'O Cartão SUS informado não é válido.'); return;
    }

    if (editingId && editingSnapshot) {
      const before = {
        nome: editingSnapshot.nome,
        cpf: editingSnapshot.cpf ? maskCPF(editingSnapshot.cpf) : '',
        cns: editingSnapshot.cns ? maskCNS(editingSnapshot.cns) : '',
        sexo: editingSnapshot.sexo,
        nascimento: editingSnapshot.dataNascimento,
        telefoneCelular: editingSnapshot.telefoneCelular ? maskPhone(editingSnapshot.telefoneCelular) : '',
        telefoneFixo: editingSnapshot.telefoneFixo ? maskPhone(editingSnapshot.telefoneFixo) : '',
        email: editingSnapshot.email,
        endereco: [editingSnapshot.logradouro, editingSnapshot.numero, editingSnapshot.bairro].filter(Boolean).join(', '),
        municipio: editingSnapshot.municipio ? `${editingSnapshot.municipio}/${editingSnapshot.uf}` : '',
        cep: editingSnapshot.cep,
      };
      const after = {
        nome: nome.trim(),
        cpf: cpf,
        cns: cns,
        sexo: sexo,
        nascimento: dataNascimento,
        telefoneCelular: telefoneCelular,
        telefoneFixo: telefoneFixo,
        email: email.trim(),
        endereco: [logradouro.trim(), numero.trim(), bairro.trim()].filter(Boolean).join(', '),
        municipio: municipio ? `${municipio}/${uf}` : '',
        cep: cep,
      };
      const diff = buildDiff(before, after, [
        { key: 'nome', label: 'Nome' },
        { key: 'cpf', label: 'CPF' },
        { key: 'cns', label: 'CNS' },
        { key: 'sexo', label: 'Sexo' },
        { key: 'nascimento', label: 'Nascimento' },
        { key: 'telefoneCelular', label: 'Celular' },
        { key: 'telefoneFixo', label: 'Telefone fixo' },
        { key: 'email', label: 'E-mail' },
        { key: 'endereco', label: 'Endereço' },
        { key: 'municipio', label: 'Município' },
        { key: 'cep', label: 'CEP' },
      ]);
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Nome', after: nome.trim() },
          { label: 'CPF', after: cpf },
          { label: 'Nascimento', after: dataNascimento },
          { label: 'Sexo', after: sexo },
          { label: 'Telefone', after: telefoneCelular || telefoneFixo },
          { label: 'E-mail', after: email.trim() },
          { label: 'Município', after: municipio ? `${municipio}/${uf}` : '' },
        ],
      });
    }
  }

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
      const dateErr = validarDataNascimento(dataNascimento);
      if (dateErr) {
        toast.error('Data invalida', dateErr);
        return;
      }
      if (!sexo) {
        toast.error('Campo obrigatorio', 'Selecione o sexo do paciente.');
        return;
      }
      if (!telefoneCelular.trim() && !telefoneFixo.trim()) {
        toast.error('Campo obrigatorio', 'Informe ao menos um telefone de contato.');
        return;
      }
      if (!logradouro.trim()) {
        toast.error('Campo obrigatorio', 'Informe o logradouro do endereco.');
        return;
      }
      if (!numero.trim()) {
        toast.error('Campo obrigatorio', 'Informe o numero do endereco.');
        return;
      }
      if (!bairro.trim()) {
        toast.error('Campo obrigatorio', 'Informe o bairro do endereco.');
        return;
      }
      if (!municipio) {
        toast.error('Campo obrigatorio', 'Selecione o municipio de residencia.');
        return;
      }
      const cleanCns = cns.replace(/\D/g, '');
      if (cleanCns && !validarCns(cns)) {
        toast.error('CNS invalido', 'O Cartao SUS informado nao e valido.');
        return;
      }

      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanPhoneCel = telefoneCelular.replace(/\D/g, '');
      const cleanPhoneFix = telefoneFixo.replace(/\D/g, '');
      const cleanCep = cep.replace(/\D/g, '');
      // Tenta achar o município na tabela local para manter o FK
      const munLocal = municipios.find(
        (m) => m.label.toLowerCase() === municipio.toLowerCase(),
      );

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
        municipio: municipio,
        uf: uf || 'MA',
        municipio_residencia_id: munLocal?.value ?? null,
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

      // Dados bancários (opcionais) — só persiste quando há ALGUM campo
      // preenchido. Se o operador apagou todos os campos durante a edição e
      // existia um registro, removemos.
      const algumCampoBanco =
        bancoNome.trim() ||
        bancoAgencia.trim() ||
        bancoConta.trim() ||
        bancoTipoConta ||
        bancoTitular.trim() ||
        bancoCpfTitular.trim();

      if (algumCampoBanco) {
        // Validação leve: se preencheu alguma coisa, exige o conjunto mínimo
        if (
          !bancoNome.trim() ||
          !bancoAgencia.trim() ||
          !bancoConta.trim() ||
          !bancoTipoConta ||
          !bancoTitular.trim() ||
          !bancoCpfTitular.trim()
        ) {
          toast.error(
            'Dados bancários incompletos',
            'Preencha banco, agência, conta, tipo, titular e CPF do titular — ou deixe todos em branco.',
          );
          return;
        }
        const cpfTitularLimpo = bancoCpfTitular.replace(/\D/g, '');
        if (!validarCpfModulo11(bancoCpfTitular)) {
          toast.error('CPF do titular inválido', 'Verifique o CPF informado.');
          return;
        }
        const { error: dbErr } = await upsertDadosBancariosPorPaciente(pacienteId, {
          banco: bancoNome.trim(),
          agencia: bancoAgencia.trim(),
          conta: bancoConta.trim(),
          tipo_conta: bancoTipoConta,
          nome_titular: bancoTitular.trim(),
          cpf_titular: cpfTitularLimpo,
        });
        if (dbErr) {
          toast.warning(
            'Paciente salvo, dados bancários falharam',
            (dbErr as { message?: string }).message ?? 'Erro desconhecido',
          );
        }
      } else if (bancoRegistroId) {
        // Tinha registro e o operador limpou tudo → remove
        await removerDadosBancarios(bancoRegistroId);
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
    setAcompDataNascimento((acomp.data_nascimento as string) ?? '');
    setAcompVinculo((acomp.vinculo as VinculoAcompanhante) ?? '');
    setAcompTelefone(maskPhone((acomp.telefone as string) ?? ''));
    const age = calcularIdade((acomp.data_nascimento as string) ?? '');
    if (age !== null && (age < 20 || age > 65)) {
      setAcompAgeWarning(`Acompanhante com ${age} anos — fora da faixa padrao (20–65). Exige autorizacao da coordenacao.`);
    } else {
      setAcompAgeWarning('');
    }
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
    if (!acompDataNascimento) {
      toast.error('Campo obrigatorio', 'Informe a data de nascimento do acompanhante.');
      return;
    }
    const dateErr = validarDataNascimento(acompDataNascimento);
    if (dateErr) {
      toast.error('Data invalida', dateErr);
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
      data_nascimento: acompDataNascimento,
      vinculo: acompVinculo,
      telefone: cleanAcompPhone,
      necessidade_especial: false,
      descricao_necessidade: null,
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
          <Can action="pacientes.criar">
            <button className="tfd-btn tfd-btn-primary" onClick={() => { setEditingId(null); resetForm(); setDrawerOpen(true); }}>
              <Plus size={16} />
              Novo Paciente
            </button>
          </Can>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Pacientes', value: counts.total },
          { label: 'Pacientes Ativos', value: counts.ativos },
          { label: 'Com Processo Ativo', value: '\u2014' },
        ]}
      />

      {/* ========== Toolbar (estilo v2) ========== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36, minWidth: 280,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou CNS..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

      </div>

      {/* ========== Table (estilo v2) ========== */}
      <div className="tfd-table-wrap">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Nome"
                  sortDirection={table.getSortDirection('nome_completo')}
                  onSort={() => table.toggleSort('nome_completo')}
                />
                <SortableHeader
                  label="CPF"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('cpf')}
                  onSort={() => table.toggleSort('cpf')}
                />
                <SortableHeader
                  label="CNS"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('cns')}
                  onSort={() => table.toggleSort('cns')}
                />
                <SortableHeader
                  label="Municipio"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('municipio')}
                  onSort={() => table.toggleSort('municipio')}
                  filterOptions={table.getFilterOptions('municipio')}
                  activeFilters={table.getActiveFilters('municipio')}
                  onFilterChange={(values) => table.setColumnFilter('municipio', values)}
                />
                <SortableHeader
                  label="Telefone"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('telefone_celular')}
                  onSort={() => table.toggleSort('telefone_celular')}
                />
                <SortableHeader
                  label="Data Cadastro"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('created_at')}
                  onSort={() => table.toggleSort('created_at')}
                />
                <th className="w-[100px]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 7 }).map((__, c) => (
                      <td key={c} className="px-4 py-3.5">
                        <Skeleton className={`h-4 ${c === 0 ? 'w-48' : c === 6 ? 'w-16 ml-auto' : 'w-28'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (table.paginated as unknown as Record<string, unknown>[]).length === 0 ? (
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
                (table.paginated as unknown as Record<string, unknown>[]).map((pac: Record<string, unknown>) => (
                  <tr key={pac.id as string} className="cursor-pointer" onClick={() => router.push(`/pacientes/${pac.id}`)}>
                    <td className="max-w-[260px] font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{pac.nome_completo as string}</span>
                        <IdadeBadge dataNascimento={pac.data_nascimento as string} />
                      </div>
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
                        <Can action="pacientes.editar">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Editar"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(pac); }}
                          >
                            <Pencil size={15} />
                          </button>
                        </Can>
                        <Can action="pacientes.excluir">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Excluir"
                            style={{ color: '#DC2626' }}
                            onClick={(e) => { e.stopPropagation(); handleOpenDelete(pac); }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {table.filtered.length > 0 && (
          <Pagination
            total={table.filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="pacientes"
          />
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        tone="delete"
        title="Excluir paciente?"
        subject={deleteConfirmName}
        description="Esta ação não pode ser desfeita."
        onClose={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
        onConfirm={handleConfirmDelete}
      />

      {/* ========== Save Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editingId ? 'Confirmar alterações no paciente?' : 'Confirmar cadastro de paciente?'}
        subject={nome.trim() || undefined}
        diff={saveConfirm?.diff}
        busy={savingPaciente}
        onClose={() => setSaveConfirm(null)}
        onConfirm={async () => {
          setSavingPaciente(true);
          try {
            await handleSubmitPaciente();
            setSaveConfirm(null);
          } finally {
            setSavingPaciente(false);
          }
        }}
      />

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
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSubmit} disabled={savingPaciente}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </button>
          </>
        }
      >
        {/* ── Section: Dados Pessoais ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados Pessoais
        </h3>

        <FormField label="CPF" required hint="campo principal de identificação">
          <input
            type="text"
            className="tfd-input"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(maskCPF(e.target.value))}
            style={{ fontWeight: 600, fontSize: 15 }}
            autoFocus
          />
        </FormField>

        <FormField label="Nome completo" required>
          <input
            type="text"
            className="tfd-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </FormField>

        <FormField label="Cartao SUS (CNS)" hint="opcional">
          <input
            type="text"
            className="tfd-input"
            placeholder="000 0000 0000 0000"
            value={cns}
            onChange={(e) => setCns(maskCNS(e.target.value))}
          />
        </FormField>

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
          <FormField label="Telefone celular" hint="ao menos um obrigatorio">
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
          <CepAutofill
            initialCep={cep}
            onAddressFound={(address) => {
              setCep(maskCEP(address.cep));
              setLogradouro(address.logradouro);
              setBairro(address.bairro);
              setUf(address.uf);
              if (address.cidade) setMunicipio(address.cidade);
            }}
          />

          <div className="col-span-2">
            <FormField label="Logradouro" required>
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
          <FormField label="Numero" required>
            <input
              type="text"
              className="tfd-input"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </FormField>

          <FormField label="Bairro" required>
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
              onChange={(e) => { setUf(e.target.value); setMunicipio(''); setRegionalId(''); }}
            >
              {UF_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Município de Residência" required>
          <select
            className="tfd-input"
            value={municipio}
            onChange={(e) => { setMunicipio(e.target.value); setRegionalId(''); }}
            disabled={cidadesLoading}
          >
            <option value="">
              {cidadesLoading ? 'Carregando municípios...' : uf ? 'Selecione o município...' : 'Selecione a UF primeiro'}
            </option>
            {cidadesIbge.map((c) => (
              <option key={c.id} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </FormField>

        {(() => {
          const regSelecionada = regionaisOptions.find((r) => r.id === regionalId);
          const regiaoNome = regSelecionada?.regiao_nome ?? null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Regional" hint="derivada do município">
                <input
                  type="text"
                  className="tfd-input"
                  readOnly
                  value={
                    regionaisLoading
                      ? 'Carregando...'
                      : regSelecionada
                        ? `${regSelecionada.codigo} — ${regSelecionada.nome}`
                        : regionalId
                          ? regionalId
                          : municipio
                            ? 'Regional não encontrada para este município'
                            : 'Selecione o município para preencher automaticamente'
                  }
                  style={{ backgroundColor: 'var(--tfd-surface-50)', color: 'var(--tfd-text-muted)', cursor: 'default' }}
                />
              </FormField>

              <FormField label="Região" hint="derivada da regional">
                <input
                  type="text"
                  className="tfd-input"
                  readOnly
                  value={
                    regionaisLoading
                      ? 'Carregando...'
                      : regiaoNome
                        ? regiaoNome
                        : regSelecionada
                          ? 'Regional sem região definida'
                          : municipio
                            ? '—'
                            : 'Selecione o município para preencher automaticamente'
                  }
                  style={{ backgroundColor: 'var(--tfd-surface-50)', color: 'var(--tfd-text-muted)', cursor: 'default' }}
                />
              </FormField>
            </div>
          );
        })()}

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

        {/* ── Section: Dados Bancários (opcional) ── */}
        <hr className="tfd-divider" />
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Dados Bancários
          </h3>
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--tfd-surface-50, #F8FAFC)',
              color: 'var(--tfd-text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            Opcional
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Usado para repasse de ajuda de custo e ressarcimentos. Preencha apenas se o
          paciente tiver conta para recebimento.
        </p>

        <FormField label="Banco">
          <input
            type="text"
            className="tfd-input"
            placeholder="Ex.: Banco do Brasil — 001"
            value={bancoNome}
            onChange={(e) => setBancoNome(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Agência">
            <input
              type="text"
              className="tfd-input"
              placeholder="0000"
              value={bancoAgencia}
              onChange={(e) => setBancoAgencia(e.target.value)}
              style={{ fontFamily: 'var(--tfd-font-mono)' }}
            />
          </FormField>
          <FormField label="Conta (com dígito)">
            <input
              type="text"
              className="tfd-input"
              placeholder="00000-0"
              value={bancoConta}
              onChange={(e) => setBancoConta(e.target.value)}
              style={{ fontFamily: 'var(--tfd-font-mono)' }}
            />
          </FormField>
          <FormField label="Tipo de conta">
            <select
              className="tfd-input"
              value={bancoTipoConta}
              onChange={(e) => setBancoTipoConta(e.target.value as 'CORRENTE' | 'POUPANCA' | '')}
            >
              <option value="">Selecione...</option>
              <option value="CORRENTE">Conta corrente</option>
              <option value="POUPANCA">Poupança</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Nome do titular">
            <input
              type="text"
              className="tfd-input"
              placeholder="Nome do titular da conta"
              value={bancoTitular}
              onChange={(e) => setBancoTitular(e.target.value)}
            />
          </FormField>
          <FormField label="CPF do titular">
            <input
              type="text"
              className="tfd-input"
              placeholder="000.000.000-00"
              value={bancoCpfTitular}
              onChange={(e) => setBancoCpfTitular(maskCPF(e.target.value))}
              style={{ fontFamily: 'var(--tfd-font-mono)' }}
            />
          </FormField>
        </div>

        {bancoTitular.trim() &&
          bancoCpfTitular.replace(/\D/g, '') !== cpf.replace(/\D/g, '') &&
          bancoCpfTitular.replace(/\D/g, '').length === 11 && (
            <p
              className="text-xs mb-3 px-3 py-2 rounded"
              style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                color: '#92400E',
              }}
            >
              CPF do titular difere do CPF do paciente — confira se a conta é de terceiro
              autorizado.
            </p>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {acomp.nome_completo as string}
                          </p>
                          <IdadeBadge dataNascimento={acomp.data_nascimento as string} />
                        </div>
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

              <FormField label="Data de Nascimento" required>
                <input
                  type="date"
                  className="tfd-input"
                  value={acompDataNascimento}
                  onChange={(e) => {
                    setAcompDataNascimento(e.target.value);
                    const age = calcularIdade(e.target.value);
                    if (age !== null && (age < 20 || age > 65)) {
                      setAcompAgeWarning(`Acompanhante com ${age} anos — fora da faixa padrao (20–65). Exige autorizacao da coordenacao.`);
                    } else {
                      setAcompAgeWarning('');
                    }
                  }}
                />
              </FormField>
            </div>

            {acompAgeWarning && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3"
                style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}
              >
                <span className="text-xs font-medium" style={{ color: '#92400E' }}>
                  {acompAgeWarning}
                </span>
              </div>
            )}

            <FormField label="CNS" hint="opcional">
              <input
                type="text"
                className="tfd-input"
                placeholder="000 0000 0000 0000"
                value={acompCns}
                onChange={(e) => setAcompCns(maskCNS(e.target.value))}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <LookupSelect
                categoria="vinculo_acompanhante"
                label="Vinculo"
                value={acompVinculo}
                onChange={(v) => setAcompVinculo(v as VinculoAcompanhante | '')}
                required
              />

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
