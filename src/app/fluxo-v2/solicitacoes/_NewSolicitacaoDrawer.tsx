'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import IdadeBadge from '@/shared/components/idade-badge';
import {
  Paperclip,
  Trash2,
  AlertTriangle,
  Upload,
  Loader2,
  ExternalLink,
  Plus,
  UserPlus,
} from 'lucide-react';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { listarPacientes } from '@/services/pacientes.service';
import { listarPorPaciente, criarAcompanhante } from '@/services/acompanhantes.service';
import { listarUnidadesSaude } from '@/services/unidades-saude.service';
import { listarPorCategoria, criarItemAuxiliar } from '@/services/tabelas-auxiliares.service';
import { calcularIdade } from '@/shared/utils/idade';
import { maskCPF } from '@/shared/pipes/formatters';

interface Props { open: boolean; onClose: () => void }

interface PacienteRow {
  id: string;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
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

const VINCULO_OPTIONS = [
  { value: 'CONJUGE', label: 'Cônjuge' },
  { value: 'FILHO', label: 'Filho(a)' },
  { value: 'PAI_MAE', label: 'Pai/Mãe' },
  { value: 'RESPONSAVEL_LEGAL', label: 'Responsável Legal' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export default function NewSolicitacaoDrawer({ open, onClose }: Props) {
  const { createSolicitacao } = useFluxoV2State();
  const toast = useToast();
  const router = useRouter();

  const [pacienteId, setPacienteId] = useState('');
  const [acompanhanteIds, setAcompanhanteIds] = useState<string[]>([]);
  const [semAgendamento, setSemAgendamento] = useState(false);
  const [unidade, setUnidade] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [dataLaudo, setDataLaudo] = useState('');
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
  const [novoAcompVinculo, setNovoAcompVinculo] = useState<string>('OUTRO');
  const [novoAcompTelefone, setNovoAcompTelefone] = useState('');
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

  const unidadeSelecionada = unidades.find((u) => u.id === unidadeId);
  const podeSalvar =
    !!paciente &&
    !validacaoMenor &&
    !seiUrlInvalido &&
    (semAgendamento || (unidadeId && data && hora));

  function reset() {
    setPacienteId('');
    setAcompanhanteIds([]);
    setSemAgendamento(false);
    setUnidade(''); setUnidadeId(''); setData(''); setHora('');
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
    setNovoAcompVinculo('OUTRO');
    setNovoAcompTelefone('');
  }

  async function salvarNovoAcompanhante() {
    if (!pacienteId || !novoAcompNome.trim() || !novoAcompCpf.trim() || !novoAcompNasc) return;
    setSavingAcomp(true);
    const cpfLimpo = novoAcompCpf.replace(/\D/g, '');
    const payload = {
      paciente_id: pacienteId,
      nome_completo: novoAcompNome.trim(),
      cpf: cpfLimpo,
      data_nascimento: novoAcompNasc,
      vinculo: novoAcompVinculo,
      telefone: novoAcompTelefone.trim() || null,
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
    if (!paciente) return;

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

    const acompanhantesSnapshot = acompanhantes.map((a) => ({
      id: a.id,
      nome: a.nome_completo,
      cpf: a.cpf,
      dataNascimento: a.data_nascimento,
      vinculo: a.vinculo ?? 'Outro',
    }));

    const unidadeNome =
      unidadeSelecionada
        ? `${unidadeSelecionada.nome}${unidadeSelecionada.cnes ? ` (CNES ${unidadeSelecionada.cnes})` : ''}`
        : unidade;

    const id = await createSolicitacao({
      pacienteId: paciente.id,
      acompanhanteIds,
      agendamento: !semAgendamento ? { unidade: unidadeNome, data, hora } : undefined,
      dataLaudo: dataLaudo || undefined,
      numeroSEI: numeroSEI.trim() || undefined,
      seiUrl: seiUrl.trim() || undefined,
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
      width="560px"
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
      <div className="flex flex-col gap-6">
        {/* Paciente */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
              Paciente
            </h3>
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
          </div>
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
          {paciente && (
            <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: '#475569' }}>
              <IdadeBadge dataNascimento={paciente.data_nascimento} />
              <span>
                {paciente.municipio
                  ? `${paciente.municipio}${paciente.uf ? ` - ${paciente.uf}` : ''}`
                  : '—'}
              </span>
            </div>
          )}
        </section>

        {/* Acompanhantes */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
              Acompanhantes
            </h3>
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
              style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 8 }}
            >
              <AlertTriangle size={14} />
              Paciente menor de 18 anos exige ao menos um acompanhante adulto (≥ 18 anos).
            </div>
          )}

          {novoAcompForm && pacienteId && (
            <div
              className="mt-3 p-3 flex flex-col gap-2"
              style={{
                background: '#F8FAFC',
                border: '1px solid var(--tfd-surface-border)',
                borderRadius: 8,
              }}
            >
              <p className="text-[12px] font-semibold" style={{ color: '#1A1D2B' }}>
                Cadastrar acompanhante para este paciente
              </p>
              <input
                placeholder="Nome completo"
                value={novoAcompNome}
                onChange={(e) => setNovoAcompNome(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 6 }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="CPF"
                  value={novoAcompCpf}
                  onChange={(e) => setNovoAcompCpf(maskCPF(e.target.value))}
                  className="px-3 py-2 text-[13px] font-mono"
                  style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 6 }}
                />
                <input
                  type="date"
                  value={novoAcompNasc}
                  onChange={(e) => setNovoAcompNasc(e.target.value)}
                  className="px-3 py-2 text-[13px]"
                  style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 6 }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={novoAcompVinculo}
                  onChange={(e) => setNovoAcompVinculo(e.target.value)}
                  className="px-3 py-2 text-[13px]"
                  style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 6 }}
                >
                  {VINCULO_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
                <input
                  placeholder="Telefone (opcional)"
                  value={novoAcompTelefone}
                  onChange={(e) => setNovoAcompTelefone(e.target.value)}
                  className="px-3 py-2 text-[13px]"
                  style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 6 }}
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
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
                  disabled={savingAcomp || !novoAcompNome.trim() || !novoAcompCpf.trim() || !novoAcompNasc}
                  className="tfd-btn tfd-btn-primary tfd-btn--sm"
                >
                  {savingAcomp ? (
                    <><Loader2 size={12} className="animate-spin" /> Salvando...</>
                  ) : (
                    <><Plus size={12} /> Adicionar</>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Agendamento — exibido por padrão (caso normal) */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Agendamento
          </h3>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                    Selecione a unidade cadastrada
                  </span>
                  <a
                    href="/unidades-saude"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] inline-flex items-center gap-1 hover:underline"
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
                  className="px-3 py-2 text-[13px]"
                  style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
                >
                  <option value="">
                    {loadingUnidades
                      ? 'Carregando unidades...'
                      : unidades.length === 0
                        ? 'Nenhuma unidade cadastrada — clique em "Cadastrar nova unidade"'
                        : 'Selecione a unidade de saúde...'}
                  </option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                      {u.cnes ? ` — CNES ${u.cnes}` : ''}
                      {u.cidade ? ` (${u.cidade}${u.uf ? `/${u.uf}` : ''})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="date" value={data} onChange={(e) => setData(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
              <input
                type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
            </div>
          )}
        </section>

        {/* Data laudo */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Data do laudo
          </h3>
          <input
            type="date" value={dataLaudo} onChange={(e) => setDataLaudo(e.target.value)}
            className="px-3 py-2 text-[13px]"
            style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
          />
        </section>

        {/* Processo SEI */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Processo SEI <span className="font-normal normal-case" style={{ color: '#94A3B8' }}>(opcional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={numeroSEI}
              onChange={(e) => setNumeroSEI(e.target.value)}
              placeholder="Número SEI (ex.: 00100.000456/2026-12)"
              className="px-3 py-2 text-[13px] font-mono"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <input
              value={seiUrl}
              onChange={(e) => setSeiUrl(e.target.value)}
              placeholder="URL do processo (https://...)"
              className="px-3 py-2 text-[13px]"
              style={{
                background: 'white',
                border: `1px solid ${seiUrlInvalido ? '#FCA5A5' : 'var(--tfd-surface-border)'}`,
                borderRadius: 8,
              }}
            />
          </div>
          {seiUrlInvalido && (
            <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
              URL inválida — comece com http:// ou https://
            </p>
          )}
        </section>

        {/* Anexos */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
              Documentos anexos <span className="font-normal normal-case" style={{ color: '#94A3B8' }}>(opcional, múltiplos arquivos)</span>
            </h3>
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
          </div>

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
        </section>
      </div>
    </Drawer>
  );
}
