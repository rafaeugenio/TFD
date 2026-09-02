'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
  Upload,
  UserPlus,
  User,
  Users,
  CalendarCheck,
  Stethoscope,
  Hash,
} from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { useToast } from '@/shared/components/toast/Toast';
import IdadeBadge from '@/shared/components/idade-badge';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import RegistrarAgendamentoDrawer from './RegistrarAgendamentoDrawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import {
  type AcompanhanteMock,
  type PacienteMock,
  type SolicitacaoMock,
  type ZonaRegional,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { listarPacientes } from '@/services/pacientes.service';
import { listarPorPaciente, criarAcompanhante } from '@/services/acompanhantes.service';
import { listarPorCategoria } from '@/services/tabelas-auxiliares.service';
import { calcularIdade } from '@/shared/utils/idade';
import { maskCPF, maskCNS, maskPhone } from '@/shared/pipes/formatters';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { agendamentoConfirmado } from '../../_utils/agendamento';
import { historicoProcessosSei } from '../../_utils/processoSei';
import ProcessosSeiField, {
  novaLinhaProcessoSei,
  type ProcessoSeiLinha,
} from '../ProcessosSeiField';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacao: SolicitacaoMock;
  snapshotPaciente?: SnapshotPacienteData;
}

interface PacienteRow {
  id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  sexo?: string | null;
  telefone_celular?: string | null;
  email?: string | null;
  municipio: string | null;
  uf: string | null;
}

interface AcompanhanteRow {
  id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  vinculo: string | null;
}

interface TipoDocRow {
  codigo: string;
  nome: string;
}

interface AnexoEdit {
  /** Presente quando vem de solicitação existente. Novos uploads não têm id ainda. */
  id?: string;
  nome: string;
  tipo: string;
  tipoDocumento?: string;
}

/**
 * Drawer de edição da solicitação. Espelha o NewSolicitacaoDrawer (cadastro)
 * com os dados pré-preenchidos. Única divergência intencional: a seção de
 * Agendamento abre o RegistrarAgendamentoDrawer dedicado (mesmo formulário
 * usado em outros pontos do fluxo).
 */
export default function NewEditarSolicitacaoDrawer({
  open,
  onClose,
  solicitacao,
  snapshotPaciente,
}: Props) {
  const { editarSolicitacao, trocarPaciente } = useFluxoV2State();
  const toast = useToast();

  const originalPacienteId = solicitacao.paciente.id;
  const originalAcompanhanteIds = useMemo(
    () => solicitacao.acompanhantes.map((a) => a.id),
    [solicitacao.acompanhantes],
  );

  /* ── Estado ─────────────────────────────────────────────────────────── */
  const [pacienteId, setPacienteId] = useState(originalPacienteId);
  const [acompanhanteIds, setAcompanhanteIds] = useState<string[]>(originalAcompanhanteIds);
  const [dataLaudo, setDataLaudo] = useState(solicitacao.dataLaudo ?? '');
  /** Pedido do Rafael (26/08/2026) — histórico de processos SEI; o último
   *  item da lista é o vigente. */
  const [linhasSei, setLinhasSei] = useState<ProcessoSeiLinha[]>(() => {
    const historico = historicoProcessosSei(solicitacao);
    return historico.length > 0
      ? historico.map((p) => ({ id: p.id, numero: p.numero, url: p.url ?? '' }))
      : [novaLinhaProcessoSei()];
  });
  const [anexos, setAnexos] = useState<AnexoEdit[]>(
    solicitacao.anexos.map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tipoDocumento: a.tipoDocumento,
    })),
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drawer aninhado de agendamento
  const [agendamentoOpen, setAgendamentoOpen] = useState(false);

  // Catálogos do banco
  const [pacientes, setPacientes] = useState<PacienteRow[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [acompanhantes, setAcompanhantes] = useState<AcompanhanteRow[]>([]);
  const [loadingAcompanhantes, setLoadingAcompanhantes] = useState(false);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocRow[]>([]);

  // Cadastro inline de acompanhante (idêntico ao create)
  const [novoAcompForm, setNovoAcompForm] = useState(false);
  const [novoAcompNome, setNovoAcompNome] = useState('');
  const [novoAcompCpf, setNovoAcompCpf] = useState('');
  const [novoAcompNasc, setNovoAcompNasc] = useState('');
  const [novoAcompCns, setNovoAcompCns] = useState('');
  const [novoAcompVinculo, setNovoAcompVinculo] = useState<string>('');
  const [novoAcompTelefone, setNovoAcompTelefone] = useState('');
  const [novoAcompAgeWarning, setNovoAcompAgeWarning] = useState('');
  const [savingAcomp, setSavingAcomp] = useState(false);

  /* ── Reset quando reabre ────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    setPacienteId(originalPacienteId);
    setAcompanhanteIds(originalAcompanhanteIds);
    setDataLaudo(solicitacao.dataLaudo ?? '');
    const historico = historicoProcessosSei(solicitacao);
    setLinhasSei(
      historico.length > 0
        ? historico.map((p) => ({ id: p.id, numero: p.numero, url: p.url ?? '' }))
        : [novaLinhaProcessoSei()],
    );
    setAnexos(
      solicitacao.anexos.map((a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        tipoDocumento: a.tipoDocumento,
      })),
    );
    resetNovoAcompForm();
  }, [open, solicitacao, originalPacienteId, originalAcompanhanteIds]);

  /* ── Carrega pacientes ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPacientes(true);
    listarPacientes({ pageSize: 9999 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[EditarSolicitacaoDrawer] erro pacientes:', error.message);
      const rows = (data ?? []) as unknown as PacienteRow[];
      setPacientes(
        rows
          .filter((p) => p.nome_completo)
          .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR')),
      );
      setLoadingPacientes(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* ── Carrega tipos de documento ─────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listarPorCategoria('tipo_documento').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('[EditarSolicitacaoDrawer] erro tipos documento:', error.message);
        return;
      }
      const seen = new Set<string>();
      const dedup = ((data ?? []) as unknown as TipoDocRow[]).filter((t) => {
        const key = t.nome.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTiposDocumento(dedup);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* ── Carrega acompanhantes do paciente selecionado ──────────────────── */
  useEffect(() => {
    if (!open || !pacienteId) {
      setAcompanhantes([]);
      return;
    }
    let cancelled = false;
    setLoadingAcompanhantes(true);
    listarPorPaciente(pacienteId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[EditarSolicitacaoDrawer] erro acompanhantes:', error.message);
      setAcompanhantes((data ?? []) as unknown as AcompanhanteRow[]);
      setLoadingAcompanhantes(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, pacienteId]);

  /* ── Quando troca o paciente, limpa acompanhantes selecionados ──────── */
  useEffect(() => {
    if (pacienteId !== originalPacienteId) {
      setAcompanhanteIds([]);
    } else {
      setAcompanhanteIds(originalAcompanhanteIds);
    }
  }, [pacienteId, originalPacienteId, originalAcompanhanteIds]);

  /* ── Derivados ──────────────────────────────────────────────────────── */
  const paciente = pacientes.find((p) => p.id === pacienteId);
  const idadePaciente = paciente ? calcularIdade(paciente.data_nascimento) : 0;
  const isMenor = !!paciente && idadePaciente < 18;
  const acompanhantesAdultos = useMemo(
    () =>
      acompanhantes.filter(
        (a) => acompanhanteIds.includes(a.id) && calcularIdade(a.data_nascimento) >= 18,
      ),
    [acompanhanteIds, acompanhantes],
  );
  const validacaoMenor = isMenor && acompanhantesAdultos.length === 0;
  const seiUrlInvalido = linhasSei.some(
    (l) => l.url.trim().length > 0 && !/^https?:\/\//i.test(l.url.trim()),
  );
  const trocouPaciente = pacienteId !== originalPacienteId;

  const podeSalvar = !!pacienteId && !validacaoMenor && !seiUrlInvalido;

  /* ── Handlers ───────────────────────────────────────────────────────── */
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
      console.warn('[EditarSolicitacaoDrawer] erro ao criar acompanhante:', error.message);
      return;
    }
    if (criado) {
      const novo = criado as unknown as AcompanhanteRow;
      setAcompanhantes((prev) => [...prev, novo]);
      setAcompanhanteIds((prev) => [...prev, novo.id]);
    }
    resetNovoAcompForm();
  }

  function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos: AnexoEdit[] = Array.from(files).map((f) => ({
      nome: f.name,
      tipo: f.type || 'application/octet-stream',
    }));
    setAnexos((prev) => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removerAnexo(idx: number) {
    setAnexos((prev) => prev.filter((_, i) => i !== idx));
  }

  function toPacienteSnapshot(p: PacienteRow): PacienteMock {
    return {
      id: p.id,
      nome: p.nome_completo,
      cpf: p.cpf,
      dataNascimento: p.data_nascimento,
      sexo: (p.sexo === 'F' || p.sexo === 'FEMININO' ? 'F' : 'M') as 'M' | 'F',
      telefone: p.telefone_celular ?? '',
      email: p.email ?? undefined,
      municipio: p.municipio
        ? `${p.municipio}${p.uf ? ` - ${p.uf}` : ''}`
        : '',
      regional: '',
      zonaRegional: 'Centro' as ZonaRegional,
      endereco: { logradouro: '', numero: '', bairro: '', cep: '' },
    };
  }

  function toAcompanhanteSnapshot(a: AcompanhanteRow): AcompanhanteMock {
    return {
      id: a.id,
      nome: a.nome_completo,
      cpf: a.cpf,
      dataNascimento: a.data_nascimento,
      vinculo: a.vinculo ?? 'Outro',
    };
  }

  function handleSalvar() {
    if (!paciente) return;

    const acompanhantesSnapshot = acompanhantes
      .filter((a) => acompanhanteIds.includes(a.id))
      .map(toAcompanhanteSnapshot);

    const anexosPayload = anexos.map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tipoDocumento: a.tipoDocumento,
    }));

    // Preserva a data de cadastro dos processos já existentes; novos ganham
    // a data de agora. A ordem da lista é a ordem de cadastro — o último é
    // sempre o vigente.
    const historicoAtual = historicoProcessosSei(solicitacao);
    const processosSeiPayload = linhasSei
      .filter((l) => l.numero.trim())
      .map((l) => ({
        id: l.id,
        numero: l.numero.trim(),
        url: l.url.trim() || undefined,
        data: historicoAtual.find((p) => p.id === l.id)?.data ?? new Date().toISOString(),
      }));

    if (trocouPaciente) {
      // Troca de paciente — provider reseta acompanhantes/anexos via trocarPaciente
      trocarPaciente(
        solicitacao.id,
        paciente.id,
        acompanhanteIds,
        anexosPayload.map((a) => ({ nome: a.nome, tipo: a.tipo, tipoDocumento: a.tipoDocumento })),
        {
          paciente: toPacienteSnapshot(paciente),
          acompanhantes: acompanhantesSnapshot,
        },
      );
      // Aplica também laudo/SEI no patch normal (não cobertos pelo trocarPaciente)
      editarSolicitacao(solicitacao.id, {
        dataLaudo: dataLaudo || undefined,
        processosSei: processosSeiPayload,
      });
    } else {
      editarSolicitacao(solicitacao.id, {
        acompanhanteIds,
        acompanhantesSnapshot,
        dataLaudo: dataLaudo || undefined,
        anexos: anexosPayload,
        processosSei: processosSeiPayload,
      });
    }
    toast.success(trocouPaciente ? 'Paciente atualizado' : 'Solicitação atualizada', solicitacao.numero);
    onClose();
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  const agendamentoAtual = agendamentoConfirmado(solicitacao);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Editar solicitação"
        subtitle={`Atualize os dados da solicitação ${solicitacao.numero}.`}
        width="min(680px, 95vw)"
        footer={
          <>
            <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-primary"
              disabled={!podeSalvar}
              onClick={handleSalvar}
            >
              Salvar alterações
            </button>
          </>
        }
      >
        {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

        <div className="flex flex-col">
          {/* ─── Paciente e Acompanhantes (unificados) ─────────────────── */}
          <FormSection
            title="Paciente e Acompanhantes"
            icon={<Users size={12} />}
            tone="primary"
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
              style={inputStyle}
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
            {paciente && (
              <div
                className="mt-2 flex items-center gap-2 text-[12px]"
                style={{ color: '#475569' }}
              >
                <IdadeBadge dataNascimento={paciente.data_nascimento} />
                <span>
                  {paciente.municipio
                    ? `${paciente.municipio}${paciente.uf ? ` - ${paciente.uf}` : ''}`
                    : '—'}
                </span>
              </div>
            )}
            {trocouPaciente && (
              <div
                className="mt-3 flex items-start gap-2 px-3 py-2.5"
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: 8,
                }}
              >
                <AlertTriangle
                  size={16}
                  style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }}
                />
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold" style={{ color: '#92400E' }}>
                    Atenção: trocar o paciente reseta acompanhantes e anexos da solicitação.
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#78350F' }}>
                    Pareceres, agendamento e movimentações financeiras são preservados — mas ficam
                    vinculados ao novo paciente. Confirme com cuidado.
                  </p>
                </div>
              </div>
            )}

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
              <div className="flex flex-col gap-1.5">
                {acompanhantes.map((a) => {
                  const checked = acompanhanteIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        border:
                          '1px solid ' +
                          (checked ? 'var(--tfd-blue)' : 'var(--tfd-surface-border)'),
                        background: checked ? '#EBF0FF' : 'white',
                        borderRadius: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setAcompanhanteIds((prev) =>
                            e.target.checked
                              ? [...prev, a.id]
                              : prev.filter((id) => id !== a.id),
                          );
                        }}
                      />
                      <span className="text-[13px] font-medium" style={{ color: '#1A1D2B' }}>
                        {a.nome_completo}
                      </span>
                      <IdadeBadge dataNascimento={a.data_nascimento} />
                      <span className="text-[11px] ml-auto" style={{ color: '#6B7280' }}>
                        {a.vinculo ?? '—'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {validacaoMenor && (
              <div
                className="mt-2 flex items-center gap-2 px-3 py-2 text-[12px]"
                style={{
                  background: '#FEF2F2',
                  color: '#991B1B',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                }}
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
                    disabled={
                      savingAcomp ||
                      !novoAcompNome.trim() ||
                      !novoAcompCpf.trim() ||
                      !novoAcompNasc ||
                      !novoAcompVinculo ||
                      !novoAcompTelefone.trim()
                    }
                    className="tfd-btn tfd-btn-primary tfd-btn--sm"
                  >
                    {savingAcomp ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>Salvar Acompanhante</>
                    )}
                  </button>
                </div>
              </div>
            )}
            </div>
          </FormSection>

          {/* ─── Agendamento (abre drawer dedicado) ──────────────────── */}
          <FormSection
            title="Agendamento"
            icon={<CalendarCheck size={12} />}
            tone="success"
            action={
              <button
                type="button"
                onClick={() => setAgendamentoOpen(true)}
                className="text-[11px] inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--tfd-blue)' }}
              >
                <Pencil size={11} />
                {agendamentoAtual ? 'Editar agendamento' : 'Registrar agendamento'}
              </button>
            }
          >
            {agendamentoAtual ? (
              <div
                className="px-3 py-2.5 text-[12.5px]"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid var(--tfd-surface-border)',
                  borderRadius: 8,
                  color: '#1A1D2B',
                }}
              >
                <div className="font-medium">{agendamentoAtual.unidade}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: '#6B7280' }}>
                  {agendamentoAtual.data?.slice(0, 10)} · {agendamentoAtual.hora}
                </div>
              </div>
            ) : (
              <p
                className="px-3 py-3 text-[12px] text-center"
                style={{
                  background: '#F8FAFC',
                  border: '1px dashed var(--tfd-surface-border)',
                  borderRadius: 8,
                  color: '#94A3B8',
                }}
              >
                Sem agendamento confirmado. Clique em "Registrar agendamento" para criar.
              </p>
            )}
          </FormSection>

          {/* ─── Data do laudo ───────────────────────────────────────── */}
          <FormSection title="Laudo médico" icon={<Stethoscope size={12} />} tone="warning">
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
              Data do laudo
            </label>
            <input
              type="date"
              value={dataLaudo}
              onChange={(e) => setDataLaudo(e.target.value)}
              className="px-3 py-2 text-[13px]"
              style={inputStyle}
            />
          </FormSection>

          {/* ─── Processo SEI ─────────────────────────────────────────── */}
          <FormSection
            title="Processo SEI"
            icon={<Hash size={12} />}
            tone="default"
            hint="A solicitação acumula um processo novo por vez; o último da lista é o vigente."
          >
            <ProcessosSeiField linhas={linhasSei} onLinhasChange={setLinhasSei} />
          </FormSection>

          {/* ─── Anexos ──────────────────────────────────────────────── */}
          <FormSection
            title="Documentos anexos"
            icon={<Paperclip size={12} />}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#146BFA';
                e.currentTarget.style.background = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.background = '#F8FAFC';
              }}
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
                    key={a.id ?? `new-${idx}`}
                    className="flex items-center gap-2 px-3 py-2 text-[13px]"
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                    }}
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
                      onClick={() => removerAnexo(idx)}
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

      {/* Drawer aninhado: Agendamento — espelha o cadastro */}
      {agendamentoOpen && (
        <RegistrarAgendamentoDrawer
          open={agendamentoOpen}
          onClose={() => setAgendamentoOpen(false)}
          solicitacaoId={solicitacao.id}
          carimbo={solicitacao.carimboRegulacao ?? null}
          agendamentoAtual={solicitacao.agendamento ?? null}
          snapshotPaciente={snapshotPaciente}
        />
      )}
    </>
  );
}
