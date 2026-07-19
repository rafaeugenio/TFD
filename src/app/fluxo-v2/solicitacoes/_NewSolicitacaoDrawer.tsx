'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import IdadeBadge from '@/shared/components/idade-badge';
import FormSection from '@/shared/components/drawer/FormSection';
import {
  Paperclip,
  Trash2,
  AlertTriangle,
  Upload,
  Loader2,
  ExternalLink,
  UserPlus,
  Plus,
  Pencil,
  MapPin,
  Phone,
  Mail,
  IdCard,
  CalendarPlus,
  User,
  Users,
  CalendarCheck,
  Stethoscope,
  Hash,
  Paperclip as PaperclipIcon,
} from 'lucide-react';
import { type TipoProcedimento } from '@/core/mocks/fluxo-v2-v3-seed';
import { useTiposProcedimento } from '@/shared/hooks/useTiposProcedimento';
import { maskCEP } from '@/shared/pipes/formatters';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { listarPacientes } from '@/services/pacientes.service';
import { listarPorPaciente, criarAcompanhante } from '@/services/acompanhantes.service';
import { listarUnidadesSaude } from '@/services/unidades-saude.service';
import { listarPorCategoria, criarItemAuxiliar } from '@/services/tabelas-auxiliares.service';
import { calcularIdade } from '@/shared/utils/idade';
import { maskCPF, maskCNS, maskPhone } from '@/shared/pipes/formatters';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';

interface Props { open: boolean; onClose: () => void }

interface PacienteRow {
  id: string;
  nome_completo: string;
  cpf: string;
  cns: string | null;
  sexo: 'M' | 'F' | string | null;
  data_nascimento: string;
  telefone_celular: string | null;
  telefone_fixo: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
}

interface AgendamentoLinha {
  id: string;
  tipoProcedimento: TipoProcedimento | '';
  data: string;
}

function novaLinhaAgendamento(): AgendamentoLinha {
  return {
    id: `ag-${Math.random().toString(36).slice(2, 9)}`,
    tipoProcedimento: '',
    data: '',
  };
}

interface AcompanhanteRow {
  id: string;
  nome_completo: string;
  cpf: string;
  cns: string | null;
  data_nascimento: string;
  vinculo: string | null;
  telefone: string | null;
  necessidade_especial: boolean | null;
  descricao_necessidade: string | null;
}

interface UnidadeRow {
  id: string;
  nome: string;
  cnes: string | null;
  cidade: string;
  uf: string;
}

interface TipoDocRow {
  codigo: string;
  nome: string;
}

export default function NewSolicitacaoDrawer({ open, onClose }: Props) {
  const { createSolicitacao } = useFluxoV2State();
  const { tipos: tiposProcedimento, loading: loadingTiposProc } = useTiposProcedimento();
  const toast = useToast();
  const router = useRouter();

  const [pacienteId, setPacienteId] = useState('');
  const [acompanhanteIds, setAcompanhanteIds] = useState<string[]>([]);
  const [acompDoadores, setAcompDoadores] = useState<Set<string>>(new Set());
  const [semAgendamento, setSemAgendamento] = useState(false);
  const [unidade, setUnidade] = useState('');
  /** Lista de agendamentos (tipoProcedimento + data). 0..N — o paciente pode
   *  ter vários procedimentos planejados na mesma unidade. */
  const [agendamentos, setAgendamentos] = useState<AgendamentoLinha[]>([novaLinhaAgendamento()]);
  const [dataLaudo, setDataLaudo] = useState('');
  const [origemLaudoUnidadeId, setOrigemLaudoUnidadeId] = useState('');
  const [numeroSEI, setNumeroSEI] = useState('');
  const [seiUrl, setSeiUrl] = useState('');
  const [anexos, setAnexos] = useState<{ nome: string; tipo: string; tipoDocumento?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tipos de documento (tabela auxiliar)
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocRow[]>([]);
  const seiUrlInvalido = seiUrl.trim().length > 0 && !/^https?:\/\//i.test(seiUrl.trim());

  // Pacientes do banco (carregados quando o drawer abre)
  const [pacientes, setPacientes] = useState<PacienteRow[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);

  // Acompanhantes vinculados ao paciente selecionado
  const [acompanhantes, setAcompanhantes] = useState<AcompanhanteRow[]>([]);
  const [loadingAcompanhantes, setLoadingAcompanhantes] = useState(false);

  // Unidades de saúde do banco
  const [unidades, setUnidades] = useState<UnidadeRow[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [unidadeId, setUnidadeId] = useState('');

  // Cadastro inline de acompanhante
  const [novoAcompForm, setNovoAcompForm] = useState(false);
  const [novoAcompNome, setNovoAcompNome] = useState('');
  const [novoAcompCpf, setNovoAcompCpf] = useState('');
  const [novoAcompNasc, setNovoAcompNasc] = useState('');
  const [novoAcompCns, setNovoAcompCns] = useState('');
  const [novoAcompVinculo, setNovoAcompVinculo] = useState<string>('');
  const [novoAcompTelefone, setNovoAcompTelefone] = useState('');
  const [novoAcompAgeWarning, setNovoAcompAgeWarning] = useState('');
  const [savingAcomp, setSavingAcomp] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPacientes(true);
    listarPacientes({ pageSize: 9999 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[NewSolicitacaoDrawer] erro ao carregar pacientes:', error.message);
      }
      const rows = (data ?? []) as unknown as PacienteRow[];
      setPacientes(rows.filter((p) => p.nome_completo).sort((a, b) =>
        a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'),
      ));
      setLoadingPacientes(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  // Carrega unidades de saúde quando o drawer abre
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUnidades(true);
    listarUnidadesSaude({ pageSize: 9999 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[NewSolicitacaoDrawer] erro ao carregar unidades:', error.message);
      }
      setUnidades(((data ?? []) as unknown as UnidadeRow[]).filter((u) => u.nome));
      setLoadingUnidades(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  // Carrega tipos de documento (tabela auxiliar)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listarPorCategoria('tipo_documento').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[NewSolicitacaoDrawer] erro ao carregar tipos de documento:', error.message);
        return;
      }
      // Deduplica por nome (categoria tem entries duplicados — ex.: "Comprovante de Residência" 2x)
      const seen = new Set<string>();
      const dedup = ((data ?? []) as unknown as TipoDocRow[]).filter((t) => {
        const key = t.nome.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTiposDocumento(dedup);
    });
    return () => { cancelled = true; };
  }, [open]);

  // Sempre que muda o paciente, reseta acompanhantes selecionados e busca os do paciente
  useEffect(() => {
    setAcompanhanteIds([]);
    setAcompDoadores(new Set());
    if (!pacienteId) {
      setAcompanhantes([]);
      return;
    }
    let cancelled = false;
    setLoadingAcompanhantes(true);
    listarPorPaciente(pacienteId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[NewSolicitacaoDrawer] erro ao carregar acompanhantes:', error.message);
      }
      setAcompanhantes((data ?? []) as unknown as AcompanhanteRow[]);
      setLoadingAcompanhantes(false);
    });
    return () => { cancelled = true; };
  }, [pacienteId]);

  const paciente = pacientes.find((p) => p.id === pacienteId);
  const idade = paciente ? calcularIdade(paciente.data_nascimento) : 0;
  const isMenor = paciente && idade < 18;

  const acompanhantesAdultos = useMemo(
    () =>
      acompanhantes.filter(
        (a) => acompanhanteIds.includes(a.id) && calcularIdade(a.data_nascimento) >= 18,
      ),
    [acompanhanteIds, acompanhantes],
  );
  const validacaoMenor = isMenor && acompanhantesAdultos.length === 0;

  // PBI 13124 — a unidade de origem do laudo é sempre uma unidade de saúde do
  // Maranhão (onde o paciente foi atendido/diagnosticado); a unidade de
  // agendamento do TFD é sempre fora do Maranhão (destino do tratamento).
  const unidadesOrigemLaudo = useMemo(
    () => unidades.filter((u) => u.uf === 'MA'),
    [unidades],
  );
  const unidadesAgendamento = useMemo(
    () => unidades.filter((u) => u.uf !== 'MA'),
    [unidades],
  );

  const unidadeSelecionada = unidadesAgendamento.find((u) => u.id === unidadeId);
  const agendamentosValidos = agendamentos.filter((a) => a.tipoProcedimento && a.data);
  // PBI 13218 — Número do processo SEI e link passam a ser obrigatórios na
  // criação da solicitação.
  const seiPreenchido = numeroSEI.trim().length > 0 && seiUrl.trim().length > 0;
  const podeSalvar =
    !!paciente &&
    !validacaoMenor &&
    seiPreenchido &&
    !seiUrlInvalido &&
    (semAgendamento || (!!unidadeId && agendamentosValidos.length > 0));

  function reset() {
    setPacienteId('');
    setAcompanhanteIds([]);
    setAcompDoadores(new Set());
    setSemAgendamento(false);
    setUnidade(''); setUnidadeId('');
    setAgendamentos([novaLinhaAgendamento()]);
    setDataLaudo('');
    setNumeroSEI(''); setSeiUrl('');
    setAnexos([]);
    resetNovoAcompForm();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function resetNovoAcompForm() {
    setNovoAcompForm(false);
    setNovoAcompNome('');
    setNovoAcompCpf('');
    setNovoAcompNasc('');
    setNovoAcompCns('');
    setNovoAcompVinculo('');
    setNovoAcompTelefone('');
    setNovoAcompAgeWarning('');
  }

  async function salvarNovoAcompanhante() {
    if (!pacienteId || !novoAcompNome.trim() || !novoAcompCpf.trim() || !novoAcompNasc || !novoAcompVinculo || !novoAcompTelefone.trim()) return;
    setSavingAcomp(true);
    const cpfLimpo = novoAcompCpf.replace(/\D/g, '');
    const cnsLimpo = novoAcompCns.replace(/\D/g, '');
    const telLimpo = novoAcompTelefone.replace(/\D/g, '');
    const payload = {
      paciente_id: pacienteId,
      nome_completo: novoAcompNome.trim(),
      cpf: cpfLimpo,
      cns: cnsLimpo || null,
      data_nascimento: novoAcompNasc,
      vinculo: novoAcompVinculo,
      telefone: telLimpo,
      necessidade_especial: false,
      descricao_necessidade: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const { data: criado, error } = await criarAcompanhante(payload);
    setSavingAcomp(false);
    if (error) {
      console.warn('[NewSolicitacaoDrawer] erro ao criar acompanhante:', error.message);
      return;
    }
    if (criado) {
      const novo = criado as unknown as AcompanhanteRow;
      setAcompanhantes((prev) => [...prev, novo]);
      setAcompanhanteIds((prev) => [...prev, novo.id]);
    }
    resetNovoAcompForm();
  }

  async function handleSalvar() {
    if (!paciente || !podeSalvar) return;

    // Snapshots no shape do mock (PacienteMock/AcompanhanteMock) — o Provider
    // ainda usa essa view-model. A persistência real no banco ficará para o
    // próximo passo (createSolicitacao via Supabase).
    const pacienteSnapshot = {
      id: paciente.id,
      nome: paciente.nome_completo,
      cpf: paciente.cpf,
      dataNascimento: paciente.data_nascimento,
      sexo: 'M' as const, // simplificação; o front v2 não usa para o que importa aqui
      telefone: '',
      municipio: paciente.municipio
        ? `${paciente.municipio}${paciente.uf ? ` - ${paciente.uf}` : ''}`
        : '',
      regional: '',
      zonaRegional: 'Centro' as const,
      endereco: { logradouro: '', numero: '', bairro: '', cep: '' },
    };

    const acompanhantesSnapshot = acompanhantes
      .filter((a) => acompanhanteIds.includes(a.id))
      .map((a) => ({
        id: a.id,
        nome: a.nome_completo,
        cpf: a.cpf,
        dataNascimento: a.data_nascimento,
        vinculo: a.vinculo ?? 'Outro',
        // doador é por solicitação — vem do estado local do drawer.
        doador: acompDoadores.has(a.id),
      }));

    const unidadeNome =
      unidadeSelecionada
        ? `${unidadeSelecionada.nome}${unidadeSelecionada.cnes ? ` (CNES ${unidadeSelecionada.cnes})` : ''}`
        : unidade;

    const id = await createSolicitacao({
      pacienteId: paciente.id,
      acompanhanteIds,
      agendamento:
        !semAgendamento && agendamentosValidos.length > 0
          ? {
              unidade: unidadeNome,
              procedimentos: agendamentosValidos.map((a) => ({
                tipoProcedimento: a.tipoProcedimento as TipoProcedimento,
                data: a.data,
              })),
            }
          : undefined,
      dataLaudo: dataLaudo || undefined,
      origemLaudoUnidadeId: origemLaudoUnidadeId || undefined,
      numeroSEI: numeroSEI.trim(),
      seiUrl: seiUrl.trim(),
      anexos,
      pacienteSnapshot,
      acompanhantesSnapshot,
    });
    reset();
    onClose();
    toast.success('Solicitação criada', paciente.nome_completo ?? 'Paciente cadastrado');
    router.push(`/fluxo-v2/solicitacoes/${id}`);
  }

  function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos = Array.from(files).map((f) => ({
      nome: f.name,
      tipo: f.type || 'application/octet-stream',
    }));
    setAnexos((prev) => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Drawer
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Nova solicitação"
      subtitle="Crie uma solicitação a partir de um paciente cadastrado."
      width="min(680px, 95vw)"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => { reset(); onClose(); }}>
            Cancelar
          </button>
          <button type="button" className="tfd-btn tfd-btn-primary" disabled={!podeSalvar} onClick={handleSalvar}>
            Salvar e abrir
          </button>
        </>
      }
    >
      <div className="flex flex-col">
        {/* Paciente e Acompanhantes — unificados num mesmo bloco visual */}
        <FormSection
          title="Paciente e Acompanhantes"
          icon={<Users size={12} />}
          tone="info"
          action={
            <a
              href="/pacientes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--tfd-blue)' }}
            >
              <ExternalLink size={11} />
              Cadastrar novo paciente
            </a>
          }
        >
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            disabled={loadingPacientes}
            className="w-full px-3 py-2 text-[13px]"
            style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
          >
            <option value="">
              {loadingPacientes ? 'Carregando pacientes...' : 'Selecione um paciente...'}
            </option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo} — {p.cpf}
              </option>
            ))}
          </select>
          {paciente && <ResumoPaciente paciente={paciente} />}

          {/* Acompanhantes — sub-bloco dentro do agrupamento Paciente */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--tfd-text-primary)' }}>
                <Users size={12} style={{ color: '#64748B' }} />
                Acompanhantes
              </p>
              {pacienteId && !novoAcompForm && (
                <button
                  type="button"
                  onClick={() => setNovoAcompForm(true)}
                  className="text-[11px] inline-flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--tfd-blue)' }}
                >
                  <UserPlus size={11} />
                  Novo acompanhante
                </button>
              )}
            </div>
          {!pacienteId ? (
            <p
              className="px-3 py-3 text-[12px] text-center"
              style={{
                background: '#F8FAFC',
                border: '1px dashed var(--tfd-surface-border)',
                borderRadius: 8,
                color: '#94A3B8',
              }}
            >
              Selecione um paciente para listar os acompanhantes cadastrados.
            </p>
          ) : loadingAcompanhantes ? (
            <div
              className="flex items-center justify-center gap-2 py-4"
              style={{ color: '#94A3B8' }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[12px]">Carregando acompanhantes...</span>
            </div>
          ) : acompanhantes.length === 0 ? (
            <p
              className="px-3 py-3 text-[12px] text-center"
              style={{
                background: '#F8FAFC',
                border: '1px dashed var(--tfd-surface-border)',
                borderRadius: 8,
                color: '#94A3B8',
              }}
            >
              Este paciente não possui acompanhantes cadastrados.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {acompanhantes.map((a) => {
                const checked = acompanhanteIds.includes(a.id);
                return (
                  <AcompanhanteCard
                    key={a.id}
                    acompanhante={a}
                    checked={checked}
                    onToggle={() => {
                      setAcompanhanteIds((prev) =>
                        prev.includes(a.id)
                          ? prev.filter((id) => id !== a.id)
                          : [...prev, a.id],
                      );
                      // Desmarcar acompanhante remove o flag de doador.
                      setAcompDoadores((prev) => {
                        if (!prev.has(a.id)) return prev;
                        const next = new Set(prev);
                        next.delete(a.id);
                        return next;
                      });
                    }}
                    doador={acompDoadores.has(a.id)}
                    onToggleDoador={() => {
                      setAcompDoadores((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      });
                    }}
                  />
                );
              })}
            </div>
          )}
          {validacaoMenor && (
            <div
              className="mt-2 flex items-center gap-2 px-3 py-2 text-[12px]"
              style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 8 }}
            >
              <AlertTriangle size={14} />
              Paciente menor de 18 anos exige ao menos um acompanhante adulto (≥ 18 anos).
            </div>
          )}

          {novoAcompForm && pacienteId && (
            <div
              className="mt-3 p-4 flex flex-col gap-3"
              style={{
                background: '#F8FAFC',
                border: '1px solid var(--tfd-surface-border)',
                borderRadius: 8,
              }}
            >
              <p className="text-[12px] font-semibold" style={{ color: '#1A1D2B' }}>
                Novo Acompanhante
              </p>

              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Nome completo <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={novoAcompNome}
                  onChange={(e) => setNovoAcompNome(e.target.value)}
                  className="tfd-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    CPF <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={novoAcompCpf}
                    onChange={(e) => setNovoAcompCpf(maskCPF(e.target.value))}
                    className="tfd-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    Data de Nascimento <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={novoAcompNasc}
                    onChange={(e) => {
                      setNovoAcompNasc(e.target.value);
                      const age = calcularIdade(e.target.value);
                      if (age !== null && (age < 20 || age > 65)) {
                        setNovoAcompAgeWarning(`Acompanhante com ${age} anos — fora da faixa padrão (20–65). Exige autorização da coordenação.`);
                      } else {
                        setNovoAcompAgeWarning('');
                      }
                    }}
                    className="tfd-input"
                  />
                </div>
              </div>

              {novoAcompAgeWarning && (
                <div
                  className="flex items-start gap-2 px-3 py-2"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8 }}
                >
                  <AlertTriangle size={14} style={{ color: '#92400E', flexShrink: 0, marginTop: 2 }} />
                  <span className="text-[11px] font-medium" style={{ color: '#92400E' }}>
                    {novoAcompAgeWarning}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                  CNS <span style={{ color: 'var(--tfd-text-muted)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="000 0000 0000 0000"
                  value={novoAcompCns}
                  onChange={(e) => setNovoAcompCns(maskCNS(e.target.value))}
                  className="tfd-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LookupSelect
                  categoria="vinculo"
                  label="Vínculo"
                  value={novoAcompVinculo}
                  onChange={setNovoAcompVinculo}
                  required
                />
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    Telefone <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(99) 99999-0000"
                    value={novoAcompTelefone}
                    onChange={(e) => setNovoAcompTelefone(maskPhone(e.target.value))}
                    className="tfd-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end mt-1">
                <button
                  type="button"
                  onClick={resetNovoAcompForm}
                  className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarNovoAcompanhante}
                  disabled={savingAcomp || !novoAcompNome.trim() || !novoAcompCpf.trim() || !novoAcompNasc || !novoAcompVinculo || !novoAcompTelefone.trim()}
                  className="tfd-btn tfd-btn-primary tfd-btn--sm"
                >
                  {savingAcomp ? (
                    <><Loader2 size={12} className="animate-spin" /> Salvando...</>
                  ) : (
                    <>Salvar Acompanhante</>
                  )}
                </button>
              </div>
            </div>
          )}
          </div>
        </FormSection>

        {/* Agendamento — vale tanto para solicitação normal quanto para
            ajuda de custo. Ambos os tipos podem ter ou não ter agendamento;
            o checkbox "sem agendamento" cobre o caso de exceção. */}
        <FormSection title="Agendamento" icon={<CalendarCheck size={12} />} tone="success">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={semAgendamento}
              onChange={(e) => setSemAgendamento(e.target.checked)}
            />
            <span className="text-[13px]" style={{ color: '#475569' }}>
              Solicitação <strong>sem agendamento</strong> (caso de exceção)
            </span>
          </label>
          <p className="text-[11px] mb-3" style={{ color: '#9CA3AF' }}>
            Marque apenas quando o paciente ainda não tem unidade/data definidas — o caso seguirá para a Regulação registrar o agendamento posteriormente (CNRAC, CET ou Outros).
          </p>
          {!semAgendamento && (
            <div className="flex flex-col gap-3 min-w-0">
              {/* Unidade — compartilhada entre todos os procedimentos */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                    Selecione a unidade cadastrada
                  </span>
                  <a
                    href="/unidades-saude"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] inline-flex items-center gap-1 hover:underline flex-shrink-0"
                    style={{ color: 'var(--tfd-blue)' }}
                  >
                    <ExternalLink size={11} />
                    Cadastrar nova unidade
                  </a>
                </div>
                <select
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  disabled={loadingUnidades}
                  className="w-full px-3 py-2 text-[13px] min-w-0"
                  style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
                >
                  <option value="">
                    {loadingUnidades
                      ? 'Carregando unidades...'
                      : unidadesAgendamento.length === 0
                        ? 'Nenhuma unidade fora do Maranhão cadastrada — clique em "Cadastrar nova unidade"'
                        : 'Selecione a unidade de saúde (fora do Maranhão)...'}
                  </option>
                  {unidadesAgendamento.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                      {u.cnes ? ` — CNES ${u.cnes}` : ''}
                      {u.cidade ? ` (${u.cidade}${u.uf ? `/${u.uf}` : ''})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px]" style={{ color: '#94A3B8' }}>
                  O agendamento do TFD é sempre em unidade fora do Maranhão — o destino do tratamento.
                </p>
              </div>

              {/* Lista repetível de Procedimento + Data — múltiplos
                  agendamentos por solicitação. Cada linha vira uma tentativa
                  confirmada dentro do mesmo container de agendamento. */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                  Procedimentos agendados {agendamentos.length > 1 ? `(${agendamentos.length})` : ''}
                </span>
                {agendamentos.map((linha, idx) => (
                  <div
                    key={linha.id}
                    className="grid items-center gap-2"
                    style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) 32px' }}
                  >
                    <select
                      value={linha.tipoProcedimento}
                      disabled={loadingTiposProc}
                      onChange={(e) =>
                        setAgendamentos((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, tipoProcedimento: e.target.value as TipoProcedimento | '' }
                              : l,
                          ),
                        )
                      }
                      className="px-3 py-2 text-[13px]"
                      style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
                    >
                      <option value="">
                        {loadingTiposProc
                          ? 'Carregando tipos...'
                          : tiposProcedimento.length === 0
                            ? 'Nenhum tipo cadastrado'
                            : 'Tipo do procedimento...'}
                      </option>
                      {tiposProcedimento.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={linha.data}
                      onChange={(e) =>
                        setAgendamentos((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, data: e.target.value } : l)),
                        )
                      }
                      className="px-3 py-2 text-[13px]"
                      style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAgendamentos((prev) =>
                          prev.length === 1
                            ? [novaLinhaAgendamento()]
                            : prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
                      title={agendamentos.length === 1 ? 'Limpar' : 'Remover este agendamento'}
                      aria-label="Remover agendamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setAgendamentos((prev) => [...prev, novaLinhaAgendamento()])
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 mt-1 text-[12.5px] font-medium transition-colors"
                  style={{
                    background: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 8,
                    color: '#146BFA',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#EFF6FF';
                    e.currentTarget.style.borderColor = '#146BFA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#CBD5E1';
                  }}
                >
                  <CalendarPlus size={13} />
                  Adicionar agendamento
                </button>
              </div>
            </div>
          )}
        </FormSection>

        {/* Laudo médico — origem (unidade de saúde) + data */}
        <FormSection title="Laudo médico" icon={<Stethoscope size={12} />} tone="warning">
          <div className="grid grid-cols-3 gap-2 min-w-0">
            <div className="col-span-2 min-w-0">
              <label className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>
                Origem do laudo
              </label>
              <select
                value={origemLaudoUnidadeId}
                onChange={(e) => setOrigemLaudoUnidadeId(e.target.value)}
                disabled={loadingUnidades}
                className="w-full px-3 py-2 text-[13px] mt-1"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              >
                <option value="">— Selecione a unidade de saúde do Maranhão —</option>
                {unidadesOrigemLaudo.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}{u.cidade ? ` — ${u.cidade}${u.uf ? `/${u.uf}` : ''}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10.5px] mt-1" style={{ color: '#94A3B8' }}>
                Origem do laudo é sempre uma unidade de saúde do Maranhão.
              </p>
            </div>
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>
                Data do laudo
              </label>
              <input
                type="date" value={dataLaudo} onChange={(e) => setDataLaudo(e.target.value)}
                className="w-full px-3 py-2 text-[13px] mt-1"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
            </div>
          </div>
        </FormSection>

        {/* Processo SEI — obrigatório (PBI 13218) */}
        <FormSection
          title="Processo SEI"
          icon={<Hash size={12} />}
          tone="default"
          hint="Número e link do processo são obrigatórios."
        >
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>
                Número SEI <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </label>
              <input
                value={numeroSEI}
                onChange={(e) => setNumeroSEI(e.target.value)}
                placeholder="ex.: 00100.000456/2026-12"
                className="w-full px-3 py-2 text-[13px] font-mono mt-1"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>
                Link do processo <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </label>
              <input
                value={seiUrl}
                onChange={(e) => setSeiUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-[13px] mt-1"
                style={{
                  background: 'white',
                  border: `1px solid ${seiUrlInvalido ? '#FCA5A5' : 'var(--tfd-surface-border)'}`,
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
          {seiUrlInvalido && (
            <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
              URL inválida — comece com http:// ou https://
            </p>
          )}
        </FormSection>

        {/* Anexos */}
        <FormSection
          title="Documentos anexos"
          icon={<PaperclipIcon size={12} />}
          tone="info"
          hint="Opcional — múltiplos arquivos permitidos."
          action={
            <a
              href="/sistema/configuracoes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--tfd-blue)' }}
            >
              <ExternalLink size={11} />
              Cadastrar novo tipo
            </a>
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFilesPicked(e.target.files)}
            className="hidden"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-1 py-5 transition-colors"
            style={{
              background: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: 8,
              color: '#475569',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#146BFA'; e.currentTarget.style.background = '#EFF6FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
          >
            <Upload size={16} />
            <span className="text-[13px] font-medium">Selecionar arquivos</span>
            <span className="text-[11px]" style={{ color: '#94A3B8' }}>
              Selecione um ou mais arquivos. Pode adicionar mais depois.
            </span>
          </button>

          {anexos.length > 0 && (
            <ul className="flex flex-col gap-1.5 mt-3">
              {anexos.map((a, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 text-[13px]"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}
                >
                  <Paperclip size={13} style={{ color: '#64748B' }} />
                  <span className="flex-1 min-w-0 truncate" style={{ color: '#1A1D2B' }}>
                    {a.nome}
                  </span>
                  <select
                    value={a.tipoDocumento ?? ''}
                    onChange={(e) => {
                      const v = e.target.value || undefined;
                      setAnexos((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, tipoDocumento: v } : it)),
                      );
                    }}
                    className="px-2 py-1 text-[12px] shrink-0"
                    style={{
                      background: 'white',
                      border: '1px solid var(--tfd-surface-border)',
                      borderRadius: 6,
                      maxWidth: 220,
                    }}
                    title="Tipo do documento"
                  >
                    <option value="">Tipo do documento...</option>
                    {tiposDocumento.map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setAnexos((prev) => prev.filter((_, i) => i !== idx))}
                    className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
                    aria-label="Remover"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormSection>
      </div>
    </Drawer>
  );
}

/**
 * Card de listagem de acompanhante com dados expandidos — CPF, CNS, telefone,
 * idade, vínculo e necessidade especial ficam sempre visíveis (não somente
 * quando selecionado), para o usuário da SES conferir cadastro antes de
 * marcar quem vai junto na viagem.
 */
function AcompanhanteCard({
  acompanhante: a,
  checked,
  onToggle,
  doador,
  onToggleDoador,
}: {
  acompanhante: AcompanhanteRow;
  checked: boolean;
  onToggle: () => void;
  doador: boolean;
  onToggleDoador: () => void;
}) {
  return (
    <label
      className="flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        border: '1px solid ' + (checked ? 'var(--tfd-blue)' : 'var(--tfd-surface-border)'),
        background: checked ? '#EBF0FF' : 'white',
        borderRadius: 8,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 shrink-0"
      />
      <div className="flex-1 min-w-0">
        {/* Linha 1 — Nome + idade + vínculo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold" style={{ color: '#1A1D2B' }}>
            {a.nome_completo}
          </span>
          <IdadeBadge dataNascimento={a.data_nascimento} />
          {a.vinculo && (
            <span
              className="inline-flex items-center px-1.5 py-[1px] text-[10px] font-semibold uppercase"
              style={{
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                letterSpacing: '0.04em',
              }}
            >
              {a.vinculo}
            </span>
          )}
          {a.necessidade_especial && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[1px] text-[10px] font-semibold uppercase"
              style={{
                background: '#FFFBEB',
                color: '#92400E',
                border: '1px solid #FDE68A',
                borderRadius: 4,
                letterSpacing: '0.04em',
              }}
              title={a.descricao_necessidade ?? 'Necessidade especial cadastrada'}
            >
              <AlertTriangle size={10} strokeWidth={2.4} />
              Necessidade especial
            </span>
          )}
        </div>

        {/* Linha 2 — CPF + CNS + Telefone */}
        <div
          className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-[11.5px]"
          style={{ color: '#64748B' }}
        >
          <span title="CPF" className="inline-flex items-center gap-1">
            <span style={{ color: '#94A3B8' }}>CPF</span>
            <span className="font-mono" style={{ color: '#1E293B' }}>{maskCPF(a.cpf)}</span>
          </span>
          {a.cns && (
            <>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span title="CNS" className="inline-flex items-center gap-1">
                <IdCard size={11} style={{ color: '#94A3B8' }} />
                <span className="font-mono" style={{ color: '#1E293B' }}>{maskCNS(a.cns)}</span>
              </span>
            </>
          )}
          {a.telefone && (
            <>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span title="Telefone" className="inline-flex items-center gap-1">
                <Phone size={11} style={{ color: '#94A3B8' }} />
                <span className="font-mono" style={{ color: '#1E293B' }}>{maskPhone(a.telefone)}</span>
              </span>
            </>
          )}
        </div>

        {/* Descrição da necessidade — em linha sutil quando aplicável */}
        {a.necessidade_especial && a.descricao_necessidade && (
          <p
            className="text-[11.5px] mt-1 italic"
            style={{ color: '#92400E' }}
            title={a.descricao_necessidade}
          >
            {a.descricao_necessidade}
          </p>
        )}

        {/* Toggle "doador" — só aparece quando o acompanhante está selecionado
            para esta solicitação. É per-solicitação, não trait do cadastro. */}
        {checked && (
          <div
            className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none"
            style={{
              background: doador ? '#FFE4E6' : '#F8FAFC',
              border: '1px solid ' + (doador ? '#FECDD3' : '#E2E8F0'),
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleDoador();
            }}
            title="Doador (órgão/tecido): conta como paciente no cálculo SIGTAP do BPA"
          >
            <input
              type="checkbox"
              checked={doador}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
              readOnly
            />
            <span
              className="text-[11.5px] font-medium"
              style={{ color: doador ? '#9F1239' : '#475569' }}
            >
              Marcar como <strong>doador</strong> nesta solicitação
              {doador && (
                <span className="ml-1.5 text-[10.5px]" style={{ opacity: 0.85 }}>
                  · conta como paciente no BPA
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </label>
  );
}

/**
 * Card de resumo dos campos obrigatórios do paciente, exibido quando um
 * paciente é selecionado no drawer. Permite ao usuário da SES conferir se
 * os dados estão atualizados antes de criar a solicitação. Link "Editar
 * cadastro" abre a tela do paciente em nova aba.
 */
function ResumoPaciente({ paciente }: { paciente: PacienteRow }) {
  const telefone = paciente.telefone_celular || paciente.telefone_fixo;
  const enderecoLinha = [
    paciente.logradouro,
    paciente.numero,
    paciente.bairro,
  ]
    .filter(Boolean)
    .join(', ');
  const municipioLinha = paciente.municipio
    ? `${paciente.municipio}${paciente.uf ? ` - ${paciente.uf}` : ''}`
    : null;
  const sexoLabel = paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Feminino' : null;

  return (
    <div
      className="mt-3 overflow-hidden"
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5"
        style={{ background: 'white', borderBottom: '1px solid #E2E8F0' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
            Resumo do cadastro
          </span>
          <IdadeBadge dataNascimento={paciente.data_nascimento} />
        </div>
        <a
          href={`/pacientes/${paciente.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] inline-flex items-center gap-1 hover:underline"
          style={{ color: 'var(--tfd-blue)' }}
        >
          <Pencil size={11} />
          Editar cadastro
        </a>
      </div>

      <div
        className="grid gap-x-4 gap-y-2 px-4 py-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        <ResumoField label="Nome completo" value={paciente.nome_completo} />
        <ResumoField label="CPF" value={maskCPF(paciente.cpf)} mono />
        <ResumoField label="CNS" value={paciente.cns ? maskCNS(paciente.cns) : null} mono icon={<IdCard size={11} />} />
        <ResumoField label="Sexo" value={sexoLabel} />
        <ResumoField
          label="Telefone"
          value={telefone ? maskPhone(telefone) : null}
          mono
          icon={<Phone size={11} />}
        />
        <ResumoField label="E-mail" value={paciente.email} icon={<Mail size={11} />} />
        <ResumoField
          label="Município"
          value={municipioLinha}
          icon={<MapPin size={11} />}
        />
        <ResumoField
          label="Endereço"
          value={enderecoLinha || null}
          extra={paciente.cep ? `CEP ${maskCEP(paciente.cep)}` : undefined}
        />
      </div>
    </div>
  );
}

function ResumoField({
  label,
  value,
  mono,
  icon,
  extra,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  icon?: React.ReactNode;
  extra?: string;
}) {
  const vazio = !value;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 mb-0.5">
        {icon && <span style={{ color: '#94A3B8' }}>{icon}</span>}
        <span
          className="text-[10px] font-semibold uppercase"
          style={{ color: '#9CA3AF', letterSpacing: '0.05em' }}
        >
          {label}
        </span>
      </div>
      <div
        className={`text-[12.5px] truncate ${mono ? 'font-mono' : ''}`}
        style={{ color: vazio ? '#CBD5E1' : '#1A1D2B', fontStyle: vazio ? 'italic' : 'normal' }}
        title={value ?? ''}
      >
        {value ?? 'Não informado'}
      </div>
      {extra && (
        <div className="text-[11px] mt-0.5 font-mono" style={{ color: '#64748B' }}>
          {extra}
        </div>
      )}
    </div>
  );
}

