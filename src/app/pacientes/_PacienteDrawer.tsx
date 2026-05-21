'use client';

import { useEffect, useState } from 'react';
import {
  Pencil,
  Trash2,
  Upload,
  X,
  Loader2,
  Paperclip,
  UserPlus,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import { useToast } from '@/shared/components/toast/Toast';
import { useMunicipios } from '@/shared/hooks/useLookup';
import { formatCPF, maskCPF, maskCNS, maskPhone, maskCEP } from '@/shared/pipes/formatters';

import CepAutofill from '@/shared/components/cep-autofill/CepAutofill';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import IdadeBadge from '@/shared/components/idade-badge';

import { buscarPaciente, criarPaciente, atualizarPaciente } from '@/services/pacientes.service';
import { buscarRegionalPorMunicipio, listarRegionaisSaude } from '@/services/regionais-saude.service';
import {
  buscarPorPaciente as buscarDadosBancariosPorPaciente,
} from '@/services/dados-bancarios.service';
import { listarPorPaciente, criarAcompanhante, atualizarAcompanhante, excluirAcompanhante } from '@/services/acompanhantes.service';
import { uploadDocumento, listarDocumentosPaciente, excluirDocumento } from '@/services/documentos.service';
import type { TipoDocumento, VinculoAcompanhante } from '@/lib/supabase/database.types';

/* -------------------------------------------------- */
/*  Constants & helpers                                */
/* -------------------------------------------------- */

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const VINCULO_LABELS: Record<string, string> = {
  CONJUGE: 'Cônjuge',
  FILHO: 'Filho(a)',
  PAI_MAE: 'Pai/Mãe',
  RESPONSAVEL_LEGAL: 'Responsável Legal',
  OUTRO: 'Outro',
};

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
    while (result.length < 15) result = result + '0';
    return result === digits;
  }
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
  if (isNaN(d.getTime())) return 'Data inválida.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d > today) return 'A data de nascimento não pode ser futura.';
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

export interface PacienteDrawerProps {
  open: boolean;
  editandoId?: string | null;
  editandoData?: Record<string, unknown> | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

/* -------------------------------------------------- */
/*  Component                                         */
/* -------------------------------------------------- */

export default function PacienteDrawer({ open, editandoId, editandoData, onClose, onSaved }: PacienteDrawerProps) {
  const toast = useToast();

  /* ---- Confirmação ---- */
  const [editingSnapshot, setEditingSnapshot] = useState<Record<string, string> | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Form: Dados Pessoais ---- */
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefoneCelular, setTelefoneCelular] = useState('');
  const [telefoneFixo, setTelefoneFixo] = useState('');
  const [email, setEmail] = useState('');
  const [outrosContatos, setOutrosContatos] = useState('');

  /* ---- Form: Endereço ---- */
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('MA');
  const [regionalId, setRegionalId] = useState('');

  /* ---- Municípios via IBGE ---- */
  const [cidadesIbge, setCidadesIbge] = useState<{ id: number; nome: string }[]>([]);
  const [cidadesLoading, setCidadesLoading] = useState(false);

  /* ---- Regionais ---- */
  const [regionaisOptions, setRegionaisOptions] = useState<{ id: string; codigo: string; nome: string; regiao_nome: string | null }[]>([]);
  const [regionaisLoading, setRegionaisLoading] = useState(true);

  /* ---- Form: Dados Bancários ---- */
  const [bancoNome, setBancoNome] = useState('');
  const [bancoAgencia, setBancoAgencia] = useState('');
  const [bancoConta, setBancoConta] = useState('');
  const [bancoTipoConta, setBancoTipoConta] = useState<'CORRENTE' | 'POUPANCA' | ''>('');
  const [bancoTitular, setBancoTitular] = useState('');
  const [bancoCpfTitular, setBancoCpfTitular] = useState('');
  const [bancoPixTipo, setBancoPixTipo] = useState<'' | 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA'>('');
  const [bancoPixChave, setBancoPixChave] = useState('');
  const [bancoRegistroId, setBancoRegistroId] = useState<string | null>(null);

  /* ---- Documentos ---- */
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [existingDocs, setExistingDocs] = useState<Record<string, unknown>[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ---- Acompanhantes ---- */
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
  const [acompSexo, setAcompSexo] = useState('');
  const [acompEmail, setAcompEmail] = useState('');
  const [acompAgeWarning, setAcompAgeWarning] = useState('');

  /* ---- Lookup hooks ---- */
  const { options: municipios } = useMunicipios();

  /* ---- Buscar cidades do IBGE quando UF muda ---- */
  useEffect(() => {
    if (!uf) { setCidadesIbge([]); return; }
    let cancelled = false;
    setCidadesLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!cancelled) setCidadesIbge(data.map((m: any) => ({ id: m.id, nome: m.nome })));
      })
      .catch(() => { if (!cancelled) setCidadesIbge([]); })
      .finally(() => { if (!cancelled) setCidadesLoading(false); });
    return () => { cancelled = true; };
  }, [uf]);

  /* ---- Carregar regionais (uma vez) ---- */
  useEffect(() => {
    listarRegionaisSaude({ pageSize: 100 }).then(({ data }) => {
      setRegionaisOptions(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /* ---- Hydrate/reset on open ---- */
  useEffect(() => {
    if (!open) return;
    if (!editandoId) {
      resetForm();
      setEditingSnapshot(null);
      return;
    }
    (async () => {
      let pac = editandoData;
      if (!pac) {
        const { data } = await buscarPaciente(editandoId);
        pac = (data as Record<string, unknown> | null) ?? null;
      }
      if (!pac) return;
      hydrateFromRow(pac, editandoId);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editandoId, editandoData]);

  function resetForm() {
    setNome(''); setCpf(''); setCns(''); setDataNascimento(''); setSexo('');
    setTelefoneCelular(''); setTelefoneFixo(''); setEmail(''); setOutrosContatos('');
    setCep(''); setLogradouro(''); setNumero(''); setBairro(''); setMunicipio('');
    setUf('MA'); setRegionalId('');
    setPendingFiles([]); setExistingDocs([]);
    setAcompanhantes([]); setPendingAcomps([]);
    resetAcompForm();
    setBancoNome(''); setBancoAgencia(''); setBancoConta(''); setBancoTipoConta('');
    setBancoTitular(''); setBancoCpfTitular(''); setBancoPixTipo(''); setBancoPixChave('');
    setBancoRegistroId(null);
  }

  function resetAcompForm() {
    setShowAcompForm(false);
    setEditingAcompId(null);
    setAcompNome(''); setAcompCpf(''); setAcompCns(''); setAcompDataNascimento('');
    setAcompVinculo(''); setAcompTelefone(''); setAcompSexo(''); setAcompEmail(''); setAcompAgeWarning('');
  }

  async function hydrateFromRow(pac: Record<string, unknown>, id: string) {
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

    const { data: docs } = await listarDocumentosPaciente(id);
    setExistingDocs((docs ?? []) as Record<string, unknown>[]);

    const { data: acomps } = await listarPorPaciente(id);
    setAcompanhantes((acomps ?? []) as Record<string, unknown>[]);

    const { data: db } = await buscarDadosBancariosPorPaciente(id);
    if (db) {
      setBancoRegistroId(db.id);
      setBancoNome(db.banco ?? '');
      setBancoAgencia(db.agencia ?? '');
      setBancoConta(db.conta ?? '');
      setBancoTipoConta((db.tipo_conta as 'CORRENTE' | 'POUPANCA') ?? '');
      setBancoTitular(db.nome_titular ?? '');
      setBancoCpfTitular(maskCPF(db.cpf_titular ?? ''));
      setBancoPixTipo(((db as Record<string, unknown>).pix_tipo as 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null) ?? '');
      setBancoPixChave(((db as Record<string, unknown>).pix_chave as string) ?? '');
    } else {
      setBancoRegistroId(null);
      setBancoNome(''); setBancoAgencia(''); setBancoConta(''); setBancoTipoConta('');
      setBancoTitular(''); setBancoCpfTitular(''); setBancoPixTipo(''); setBancoPixChave('');
    }

    resetAcompForm();
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      resetForm();
      setEditingSnapshot(null);
    }, 250);
  }

  /* -------------------------------------------------- */
  /*  Submit                                            */
  /* -------------------------------------------------- */

  function handleRequestSubmit() {
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

    if (editandoId && editingSnapshot) {
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
        nome: nome.trim(), cpf, cns, sexo, nascimento: dataNascimento,
        telefoneCelular, telefoneFixo, email: email.trim(),
        endereco: [logradouro.trim(), numero.trim(), bairro.trim()].filter(Boolean).join(', '),
        municipio: municipio ? `${municipio}/${uf}` : '',
        cep,
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

  async function handleSubmit() {
    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanCns = cns.replace(/\D/g, '');
      const cleanPhoneCel = telefoneCelular.replace(/\D/g, '');
      const cleanPhoneFix = telefoneFixo.replace(/\D/g, '');
      const cleanCep = cep.replace(/\D/g, '');
      const munLocal = municipios.find((m) => m.label.toLowerCase() === municipio.toLowerCase());

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
        municipio,
        uf: uf || 'MA',
        municipio_residencia_id: munLocal?.value ?? null,
      };

      let pacienteId: string;

      if (editandoId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await atualizarPaciente(editandoId, pacData as any);
        if (result.error) {
          toast.error('Erro ao atualizar paciente', (result.error as { message?: string }).message ?? 'Erro desconhecido');
          return;
        }
        pacienteId = editandoId;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await criarPaciente(pacData as any);
        if (result.error || !result.data) {
          toast.error('Erro ao criar paciente', (result.error as { message?: string })?.message ?? 'Erro desconhecido');
          return;
        }
        pacienteId = (result.data as { id: string }).id;

        if (pendingAcomps.length > 0) {
          for (const pending of pendingAcomps) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _tempId, ...acompFields } = pending as Record<string, unknown> & { _tempId: string };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await criarAcompanhante({ ...acompFields, paciente_id: pacienteId } as any);
          }
        }
      }

      // Dados bancários NÃO são mais salvos pelo cadastro do paciente. A
      // partir da migration 00053 eles passam a viver na solicitação (cada
      // ciclo tem sua própria conta de recebimento). O cadastro/edição é
      // feito pelo setor de Ajuda de Custo na aba Financeiro da solicitação.
      // Campos do drawer permanecem visíveis como referência histórica, mas
      // não disparam upsert.

      if (pendingFiles.length > 0) {
        setUploading(true);
        let uploadErrors = 0;
        let lastErrorMsg = '';
        for (const pf of pendingFiles) {
          try {
            const uploadResult = await uploadDocumento(null, pf.file, pf.tipo, pacienteId);
            if (uploadResult.error) {
              uploadErrors++;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        editandoId ? 'Paciente atualizado!' : 'Paciente cadastrado!',
        editandoId ? 'Os dados foram atualizados com sucesso.' : 'O paciente foi cadastrado com sucesso.',
      );
      if (onSaved) onSaved(pacienteId);
      handleClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------- Acompanhantes -------- */
  function handleEditAcomp(acomp: Record<string, unknown>) {
    const id = (acomp.id as string) || (acomp._tempId as string);
    setEditingAcompId(id);
    setAcompNome((acomp.nome_completo as string) ?? '');
    setAcompCpf(maskCPF((acomp.cpf as string) ?? ''));
    setAcompCns(maskCNS((acomp.cns as string) ?? ''));
    setAcompDataNascimento((acomp.data_nascimento as string) ?? '');
    setAcompVinculo((acomp.vinculo as VinculoAcompanhante) ?? '');
    setAcompTelefone(maskPhone((acomp.telefone as string) ?? ''));
    setAcompSexo((acomp.sexo as string) ?? '');
    setAcompEmail((acomp.email as string) ?? '');
    const age = calcularIdade((acomp.data_nascimento as string) ?? '');
    if (age !== null && (age < 20 || age > 65)) {
      setAcompAgeWarning(`Acompanhante com ${age} anos — fora da faixa padrão (20–65). Exige autorização da coordenação.`);
    } else {
      setAcompAgeWarning('');
    }
    setShowAcompForm(true);
  }

  async function handleDeleteAcomp(acompId: string) {
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
      toast.success('Acompanhante excluído', 'O registro foi removido.');
      setAcompanhantes((prev) => prev.filter((a) => (a.id as string) !== acompId));
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  async function handleSaveAcomp() {
    if (!acompNome.trim()) { toast.error('Campo obrigatório', 'Informe o nome do acompanhante.'); return; }
    if (!acompCpf.trim() || !validarCpfModulo11(acompCpf)) { toast.error('CPF inválido', 'Informe um CPF válido para o acompanhante.'); return; }
    if (!acompDataNascimento) { toast.error('Campo obrigatório', 'Informe a data de nascimento do acompanhante.'); return; }
    const dateErr = validarDataNascimento(acompDataNascimento);
    if (dateErr) { toast.error('Data inválida', dateErr); return; }
    if (!acompVinculo) { toast.error('Campo obrigatório', 'Selecione o vínculo do acompanhante.'); return; }
    if (!acompTelefone.trim()) { toast.error('Campo obrigatório', 'Informe o telefone do acompanhante.'); return; }
    if (!acompSexo) { toast.error('Campo obrigatório', 'Selecione o sexo do acompanhante.'); return; }
    if (acompEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acompEmail.trim())) {
      toast.error('E-mail inválido', 'Informe um e-mail válido ou deixe em branco.'); return;
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
      sexo: acompSexo,
      email: acompEmail.trim() || null,
      necessidade_especial: false,
      descricao_necessidade: null,
    };

    if (editandoId) {
      try {
        const fullData = { ...acompData, paciente_id: editandoId };
        if (editingAcompId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await atualizarAcompanhante(editingAcompId, fullData as any);
          if (result.error) {
            toast.error('Erro ao atualizar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
            return;
          }
          toast.success('Acompanhante atualizado', 'Os dados foram salvos.');
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await criarAcompanhante(fullData as any);
          if (result.error) {
            toast.error('Erro ao criar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
            return;
          }
          toast.success('Acompanhante adicionado', 'O acompanhante foi cadastrado.');
        }
        const { data: acomps } = await listarPorPaciente(editandoId);
        setAcompanhantes((acomps ?? []) as Record<string, unknown>[]);
      } catch (err: unknown) {
        const e = err as { message?: string };
        toast.error('Erro inesperado', e.message ?? 'Tente novamente');
      }
    } else {
      if (editingAcompId) {
        setPendingAcomps((prev) =>
          prev.map((a) => (a._tempId as string) === editingAcompId ? { ...acompData, _tempId: editingAcompId } : a),
        );
        toast.success('Acompanhante atualizado', 'Os dados foram atualizados.');
      } else {
        const tempId = `temp-${Date.now()}`;
        setPendingAcomps((prev) => [...prev, { ...acompData, _tempId: tempId }]);
        toast.success('Acompanhante adicionado', 'Será salvo junto com o paciente.');
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
      toast.success('Documento excluído', 'O arquivo foi removido.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* -------- Render -------- */
  return (
    <>
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editandoId ? 'Confirmar alterações no paciente?' : 'Confirmar cadastro de paciente?'}
        subject={nome.trim() || undefined}
        diff={saveConfirm?.diff}
        busy={saving}
        onClose={() => setSaveConfirm(null)}
        onConfirm={async () => {
          setSaving(true);
          try {
            await handleSubmit();
            setSaveConfirm(null);
          } finally {
            setSaving(false);
          }
        }}
      />

      <Drawer
        open={open}
        onClose={handleClose}
        title={editandoId ? 'Editar Paciente' : 'Novo Paciente'}
        subtitle={editandoId ? 'Atualize os dados do paciente' : 'Preencha os dados para cadastrar um novo paciente'}
        width="640px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleClose}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSubmit} disabled={saving}>
              {editandoId ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </button>
          </>
        }
      >
        {/* ── Dados Pessoais ── */}
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
          <input type="text" className="tfd-input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormField>

        <FormField label="Cartão SUS (CNS)" hint="opcional">
          <input type="text" className="tfd-input" placeholder="000 0000 0000 0000" value={cns} onChange={(e) => setCns(maskCNS(e.target.value))} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data de Nascimento" required>
            <input type="date" className="tfd-input" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
          </FormField>
          <FormField label="Sexo" required>
            <select className="tfd-input" value={sexo} onChange={(e) => setSexo(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Telefone celular" hint="ao menos um obrigatório">
            <input type="tel" className="tfd-input" placeholder="(99) 99999-0000" value={telefoneCelular} onChange={(e) => setTelefoneCelular(maskPhone(e.target.value))} />
          </FormField>
          <FormField label="Telefone fixo">
            <input type="tel" className="tfd-input" placeholder="(99) 9999-0000" value={telefoneFixo} onChange={(e) => setTelefoneFixo(maskPhone(e.target.value))} />
          </FormField>
        </div>

        <FormField label="E-mail">
          <input type="email" className="tfd-input" placeholder="paciente@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>

        <FormField label="Outros contatos">
          <textarea className="tfd-input" rows={2} placeholder="Informações adicionais de contato..." value={outrosContatos} onChange={(e) => setOutrosContatos(e.target.value)} />
        </FormField>

        {/* ── Endereço ── */}
        <hr className="tfd-divider" />
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Endereço</h3>

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
              <input type="text" className="tfd-input" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Número" required>
            <input type="text" className="tfd-input" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </FormField>
          <FormField label="Bairro" required>
            <input type="text" className="tfd-input" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </FormField>
          <FormField label="UF">
            <select className="tfd-input" value={uf} onChange={(e) => { setUf(e.target.value); setMunicipio(''); setRegionalId(''); }}>
              {UF_OPTIONS.map((u) => (<option key={u} value={u}>{u}</option>))}
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
            {cidadesIbge.map((c) => (<option key={c.id} value={c.nome}>{c.nome}</option>))}
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
                    regionaisLoading ? 'Carregando...'
                    : regSelecionada ? `${regSelecionada.codigo} — ${regSelecionada.nome}`
                    : regionalId ? regionalId
                    : municipio ? 'Regional não encontrada para este município'
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
                    regionaisLoading ? 'Carregando...'
                    : regiaoNome ? regiaoNome
                    : regSelecionada ? 'Regional sem região definida'
                    : municipio ? '—'
                    : 'Selecione o município para preencher automaticamente'
                  }
                  style={{ backgroundColor: 'var(--tfd-surface-50)', color: 'var(--tfd-text-muted)', cursor: 'default' }}
                />
              </FormField>
            </div>
          );
        })()}

        {/* ── Documentos ── */}
        <hr className="tfd-divider" />
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Documentos Pessoais</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Anexe os documentos pessoais do paciente (RG, CPF, comprovante de residência, Cartão SUS).
        </p>

        {existingDocs.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>
              Documentos já enviados
            </p>
            {existingDocs.map((doc) => (
              <div
                key={doc.id as string}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--tfd-status-success-bg)', border: '1px solid var(--tfd-surface-border)' }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                  <Paperclip size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                    {doc.nome_arquivo as string}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{doc.tipo as string}</p>
                </div>
                <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0" title="Remover documento" onClick={() => handleDeleteExistingDoc(doc.id as string, doc.url_arquivo as string)}>
                  <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-3">
          <label
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)]"
            style={{ borderColor: 'var(--tfd-surface-border)' }}
          >
            <Upload size={18} style={{ color: 'var(--tfd-primary-500)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>Clique para selecionar arquivos</span>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const newFiles: PendingFile[] = files.map((f) => ({ file: f, tipo: 'OUTROS' as TipoDocumento }));
                setPendingFiles((prev) => [...prev, ...newFiles]);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            PDF, PNG, JPG, WEBP, DOC — até 50 MB por arquivo
          </p>
        </div>

        {pendingFiles.length > 0 && (
          <div className="space-y-2 mb-3">
            {pendingFiles.map((pf, idx) => (
              <div
                key={`${pf.file.name}-${idx}`}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                  <Paperclip size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>{pf.file.name}</p>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{(pf.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <select
                  className="tfd-input text-xs py-1 px-2 w-auto min-w-[130px]"
                  value={pf.tipo}
                  onChange={(e) => setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, tipo: e.target.value as TipoDocumento } : f)))}
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNS">Cartão SUS</option>
                  <option value="COMPROVANTE_RESIDENCIA">Comp. Residência</option>
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
                {pendingFiles.length} arquivo(s) selecionado(s) — serão enviados ao salvar
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

        {/* ── Dados Bancários ── */}
        <hr className="tfd-divider" />
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Dados Bancários</h3>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E', letterSpacing: '0.06em' }}>
            Histórico — não editável aqui
          </span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          A partir de maio/2026 os dados bancários são cadastrados por solicitação,
          na aba <strong>Financeiro</strong>. Os campos abaixo mostram o último registro
          deste paciente, apenas como referência. Edições aqui não serão salvas.
        </p>

        <LookupSelect
          categoria="banco"
          label="Banco"
          value={bancoNome}
          onChange={setBancoNome}
          valueField="nome"
          orderBy="ordem"
          placeholder="Selecione o banco..."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Agência">
            <input type="text" className="tfd-input" placeholder="0000" value={bancoAgencia} onChange={(e) => setBancoAgencia(e.target.value)} style={{ fontFamily: 'var(--tfd-font-mono)' }} />
          </FormField>
          <FormField label="Conta (com dígito)">
            <input type="text" className="tfd-input" placeholder="00000-0" value={bancoConta} onChange={(e) => setBancoConta(e.target.value)} style={{ fontFamily: 'var(--tfd-font-mono)' }} />
          </FormField>
          <FormField label="Tipo de conta">
            <select className="tfd-input" value={bancoTipoConta} onChange={(e) => setBancoTipoConta(e.target.value as 'CORRENTE' | 'POUPANCA' | '')}>
              <option value="">Selecione...</option>
              <option value="CORRENTE">Conta corrente</option>
              <option value="POUPANCA">Poupança</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Nome do titular">
            <input type="text" className="tfd-input" placeholder="Nome do titular da conta" value={bancoTitular} onChange={(e) => setBancoTitular(e.target.value)} />
          </FormField>
          <FormField label="CPF do titular">
            <input type="text" className="tfd-input" placeholder="000.000.000-00" value={bancoCpfTitular} onChange={(e) => setBancoCpfTitular(maskCPF(e.target.value))} style={{ fontFamily: 'var(--tfd-font-mono)' }} />
          </FormField>
        </div>

        {bancoTitular.trim() && bancoCpfTitular.replace(/\D/g, '') !== cpf.replace(/\D/g, '') && bancoCpfTitular.replace(/\D/g, '').length === 11 && (
          <p className="text-xs mb-3 px-3 py-2 rounded" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
            CPF do titular difere do CPF do paciente — confira se a conta é de terceiro autorizado.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-2">
          <FormField label="Tipo de chave PIX" hint="opcional">
            <select className="tfd-input" value={bancoPixTipo} onChange={(e) => setBancoPixTipo(e.target.value as typeof bancoPixTipo)}>
              <option value="">— Sem PIX cadastrado —</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ALEATORIA">Chave aleatória</option>
            </select>
          </FormField>
          <FormField label="Chave PIX" hint={bancoPixTipo ? 'obrigatório se houver tipo' : 'opcional'}>
            <input
              type="text"
              className="tfd-input"
              placeholder={
                bancoPixTipo === 'CPF' ? '000.000.000-00'
                : bancoPixTipo === 'CNPJ' ? '00.000.000/0000-00'
                : bancoPixTipo === 'EMAIL' ? 'email@exemplo.com'
                : bancoPixTipo === 'TELEFONE' ? '(99) 99999-9999'
                : bancoPixTipo === 'ALEATORIA' ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                : 'Selecione o tipo primeiro'
              }
              value={bancoPixChave}
              onChange={(e) => setBancoPixChave(e.target.value)}
              disabled={!bancoPixTipo}
              style={['CPF', 'CNPJ', 'TELEFONE', 'ALEATORIA'].includes(bancoPixTipo) ? { fontFamily: 'var(--tfd-font-mono)' } : undefined}
            />
          </FormField>
        </div>
        <p className="text-[11px] mt-1 mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Atualmente o TFD não realiza transferências por PIX — o campo fica disponível para futuro uso.
        </p>

        {/* ── Acompanhantes ── */}
        <hr className="tfd-divider" />
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Acompanhantes</h3>
          {!showAcompForm && (
            <button className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={() => { resetAcompForm(); setShowAcompForm(true); }}>
              <UserPlus size={14} /> Adicionar Acompanhante
            </button>
          )}
        </div>

        {(() => {
          const displayedAcomps = editandoId ? acompanhantes : pendingAcomps;
          return displayedAcomps.length > 0 ? (
            <div className="space-y-2 mb-4">
              {displayedAcomps.map((acomp) => {
                const acompKey = (acomp.id as string) || (acomp._tempId as string);
                return (
                  <div key={acompKey} className="p-3 rounded-lg" style={{ border: '1px solid var(--tfd-surface-border)' }}>
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
                            Vínculo: {VINCULO_LABELS[(acomp.vinculo as string)] ?? (acomp.vinculo as string)}
                          </span>
                          {(acomp.telefone as string) && (
                            <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                              Tel: {maskPhone(acomp.telefone as string)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only tfd-btn--sm" title="Editar acompanhante" onClick={() => handleEditAcomp(acomp)}>
                          <Pencil size={13} />
                        </button>
                        <button className="tfd-btn tfd-btn-danger tfd-btn--icon-only tfd-btn--sm" title="Excluir acompanhante" onClick={() => handleDeleteAcomp(acompKey)}>
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

        {showAcompForm && (
          <div className="p-4 rounded-lg mb-4" style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-primary-50)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              {editingAcompId ? 'Editar Acompanhante' : 'Novo Acompanhante'}
            </p>
            <FormField label="Nome completo" required>
              <input type="text" className="tfd-input" value={acompNome} onChange={(e) => setAcompNome(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="CPF" required>
                <input type="text" className="tfd-input" placeholder="000.000.000-00" value={acompCpf} onChange={(e) => setAcompCpf(maskCPF(e.target.value))} />
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
                      setAcompAgeWarning(`Acompanhante com ${age} anos — fora da faixa padrão (20–65). Exige autorização da coordenação.`);
                    } else {
                      setAcompAgeWarning('');
                    }
                  }}
                />
              </FormField>
            </div>
            {acompAgeWarning && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <span className="text-xs font-medium" style={{ color: '#92400E' }}>{acompAgeWarning}</span>
              </div>
            )}
            <FormField label="CNS" hint="opcional">
              <input type="text" className="tfd-input" placeholder="000 0000 0000 0000" value={acompCns} onChange={(e) => setAcompCns(maskCNS(e.target.value))} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <LookupSelect
                categoria="vinculo_acompanhante"
                label="Vínculo"
                value={acompVinculo}
                onChange={(v) => setAcompVinculo(v as VinculoAcompanhante | '')}
                required
              />
              <FormField label="Telefone" required>
                <input type="tel" className="tfd-input" placeholder="(99) 99999-0000" value={acompTelefone} onChange={(e) => setAcompTelefone(maskPhone(e.target.value))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Sexo" required>
                <select className="tfd-input" value={acompSexo} onChange={(e) => setAcompSexo(e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </FormField>
              <FormField label="E-mail" hint="opcional">
                <input type="email" className="tfd-input" placeholder="exemplo@email.com" value={acompEmail} onChange={(e) => setAcompEmail(e.target.value)} />
              </FormField>
            </div>
            <div className="flex items-center gap-2">
              <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleSaveAcomp}>Salvar Acompanhante</button>
              <button className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={resetAcompForm}>Cancelar</button>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
