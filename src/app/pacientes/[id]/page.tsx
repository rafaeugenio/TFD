'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  FileText,
  Clock,
  ExternalLink,
  XCircle,
  Pencil,
  Users,
  Phone,
  Mail,
  Landmark,
  Key,
  Plus,
  Trash2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

import StatusTag from '@/shared/components/status-tag/StatusTag';
import { useSaldoPaciente } from '@/app/fluxo-v2/_state/saldoAjudaCustoStore';
import { DetailPageSkeleton, CardListSkeleton } from '@/shared/components/skeleton';
import { useToast } from '@/shared/components/toast/Toast';
import { buscarPaciente, historicoProcessos } from '@/services/pacientes.service';
import PacienteDrawer from '../_PacienteDrawer';
import DadosBancariosDrawer from '../_DadosBancariosDrawer';
import { listarPorPaciente } from '@/services/acompanhantes.service';
import {
  listarPoolPorPaciente,
  inativarConta,
  type DadosBancariosRow,
} from '@/services/dados-bancarios.service';
import { formatCPF, formatCNS, formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Helpers                                           */
/* -------------------------------------------------- */

function calcIdade(dataNasc: string): number {
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

const VINCULO_LABELS: Record<string, string> = {
  CONJUGE: 'Cônjuge',
  FILHO: 'Filho(a)',
  PAI_MAE: 'Pai/Mãe',
  RESPONSAVEL_LEGAL: 'Responsável Legal',
  IRMAO: 'Irmão(ã)',
  OUTRO: 'Outro',
};

const SETOR_LABELS: Record<string, string> = {
  dados_basicos: 'Dados Básicos',
  regulacao: 'Regulação',
  financeiro: 'Financeiro',
  encerrada: 'Encerrada',
};

const TIPO_CONTA_LABELS: Record<string, string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança',
};

const PIX_TIPO_LABELS: Record<string, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
};

/** Formata a chave PIX conforme o tipo (CPF/CNPJ/Telefone vão como mono). */
function formatarChavePix(tipo: string | null | undefined, chave: string | null | undefined): string {
  if (!chave) return '';
  const digits = chave.replace(/\D/g, '');
  switch (tipo) {
    case 'CPF':
      if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      return chave;
    case 'CNPJ':
      if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      return chave;
    case 'TELEFONE':
      if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      return chave;
    default:
      return chave;
  }
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PacienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <PacienteDetalheInner id={id} />
    </Suspense>
  );
}

function PacienteDetalheInner({ id }: { id: string }) {
  const router = useRouter();

  const toast = useToast();
  const [paciente, setPaciente] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, unknown>[]>([]);
  const [acompanhantes, setAcompanhantes] = useState<Record<string, unknown>[]>([]);
  const [contas, setContas] = useState<DadosBancariosRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [contaDrawer, setContaDrawer] = useState<{ open: boolean; conta: DadosBancariosRow | null }>({ open: false, conta: null });
  const [reloadFlag, setReloadFlag] = useState(0);
  // PBI — Saldo de ajuda de custo entre ciclos (07/08/2026, chave corrigida
  // para CPF em 11/08/2026). O store não depende do FluxoV2Provider (esta
  // tela fica fora de /fluxo-v2), por isso pode ser consultado diretamente
  // aqui. O saldo é agrupado pelo CPF do paciente, não pelo id da rota — o
  // fluxo-v2 usa ids de outro espaço (seed mock), então só o CPF atravessa
  // os dois mundos.
  const pacienteCpf = paciente?.cpf as string | undefined;
  const { saldo: saldoAjudaCusto, extrato: extratoSaldoAjudaCusto } = useSaldoPaciente(pacienteCpf);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarPaciente(id);
      if (data) setPaciente(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const [solResult, acompResult, contasRes] = await Promise.all([
        historicoProcessos(id),
        listarPorPaciente(id),
        listarPoolPorPaciente(id),
      ]);
      if (solResult.data) setSolicitacoes(solResult.data as unknown as Record<string, unknown>[]);
      if (acompResult.data) setAcompanhantes(acompResult.data as Record<string, unknown>[]);
      if (contasRes.data) setContas(contasRes.data as DadosBancariosRow[]);
      setLoadingSol(false);
    }
    load();
  }, [id, reloadFlag]);

  async function handleInativarConta(c: DadosBancariosRow) {
    if (!window.confirm(`Inativar conta "${c.banco ?? 'PIX'}" de ${c.nome_titular}?\nSolicitações antigas mantêm o histórico, mas ela some do select de novas solicitações.`)) {
      return;
    }
    const { error } = await inativarConta(c.id);
    if (error) {
      toast.error('Erro ao inativar', error.message);
      return;
    }
    toast.success('Conta inativada');
    setReloadFlag((n) => n + 1);
  }

  if (loading) {
    return <DetailPageSkeleton tabs={0} />;
  }

  if (!paciente) {
    return (
      <div className="text-center py-20">
        <XCircle size={40} className="inline-block mb-3" style={{ color: '#94A3B8' }} />
        <p className="text-[14px]" style={{ color: '#6B7280' }}>Paciente não encontrado.</p>
        <Link href="/pacientes" className="tfd-btn tfd-btn-ghost mt-4 inline-flex">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = paciente.nome_completo as string;
  const cpf = pacienteCpf as string;
  const cns = paciente.cns as string;
  const sexo = paciente.sexo as string;
  const dataNascimento = paciente.data_nascimento as string;
  const telefone = paciente.telefone_celular as string;
  const telefoneFixo = paciente.telefone_fixo as string;
  const email = paciente.email as string;
  const municipio = paciente.municipio as string;
  const uf = (paciente.uf as string) || 'MA';
  const logradouro = paciente.logradouro as string;
  const numero = paciente.numero as string;
  const bairro = paciente.bairro as string;
  const cep = paciente.cep as string;
  const idade = dataNascimento ? calcIdade(dataNascimento) : null;

  const enderecoLinha = [
    logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
    bairro,
  ].filter(Boolean).join(' — ');
  const cidadeFull = municipio ? `${municipio} — ${uf}` : null;

  const totalSol = solicitacoes.length;
  const emAndamento = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st && !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
  }).length;
  const concluidas = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st === 'CONCLUIDO' || st === 'ENCERRADO';
  }).length;

  const sexoLabel = sexo === 'MASCULINO' ? 'Masculino' : sexo === 'FEMININO' ? 'Feminino' : sexo;

  return (
    <div>
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]"
        style={{ color: '#6B7280' }}
      >
        <ArrowLeft size={12} /> Voltar para Pacientes
      </Link>

      {/* ============ Header card (estilo fluxo-v2) ============ */}
      <div
        className="mb-6 overflow-hidden"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {/* Linha 1 — Nome + idade + CPF + Editar */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[20px] font-semibold"
                style={{ color: '#146BFA', letterSpacing: '-0.02em' }}
              >
                {nome}
              </h1>
              {idade !== null && (
                <span className="text-[14px]" style={{ color: '#64748B' }}>{idade} anos</span>
              )}
              <span className="text-[13px] font-mono" style={{ color: '#94A3B8' }}>
                {cpf ? formatCPF(cpf) : '—'}
              </span>
            </div>
          </div>
          <button
            className="tfd-btn tfd-btn-primary shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={14} /> Editar
          </button>
        </div>

        {/* Linha 2 — metadados secundários */}
        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            {cns && (
              <>
                <span><span style={{ color: '#94A3B8' }}>CNS </span><span className="font-mono" style={{ color: '#1E293B', fontWeight: 500 }}>{formatCNS(cns)}</span></span>
                <Sep />
              </>
            )}
            {sexoLabel && (
              <>
                <span><span style={{ color: '#94A3B8' }}>Sexo </span>{sexoLabel}</span>
                <Sep />
              </>
            )}
            {dataNascimento && (
              <span><span style={{ color: '#94A3B8' }}>Nasc. </span>{formatDate(dataNascimento)}</span>
            )}
          </div>
        </div>

        {/* Linha 3 — Contato | Endereço */}
        <div className="header-groups px-6 pb-5 text-[13px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            {telefone && (
              <a
                href={`tel:${telefone.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]"
                title="Ligar"
              >
                <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span className="font-mono">{telefone}</span>
              </a>
            )}
            {email && (
              <>
                {telefone && <Sep />}
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA] truncate max-w-[260px]"
                  title={email}
                >
                  <Mail size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="truncate">{email}</span>
                </a>
              </>
            )}
            {telefoneFixo && (
              <>
                {(telefone || email) && <Sep />}
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="font-mono">{telefoneFixo}</span>
                </span>
              </>
            )}
          </div>

          <span aria-hidden className="header-groups-divider" />

          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            {cidadeFull && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span>{cidadeFull}</span>
              </span>
            )}
            {enderecoLinha && (
              <>
                {cidadeFull && <Sep />}
                <span className="truncate max-w-[360px]">{enderecoLinha}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <KpiBar
        items={[
          { label: 'Total de Solicitações', value: loadingSol ? '...' : String(totalSol) },
          { label: 'Em Andamento',          value: loadingSol ? '...' : String(emAndamento) },
          { label: 'Concluídas',            value: loadingSol ? '...' : String(concluidas) },
        ]}
      />

      {/* ============ Conteúdo linear (sem abas) ============ */}
      <div className="space-y-4">
        {/* Histórico de Solicitações — em destaque no topo */}
        <Section
          title="Histórico de Solicitações"
          icon={<FileText size={18} />}
          badge={
            !loadingSol ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                {solicitacoes.length} ciclo{solicitacoes.length !== 1 ? 's' : ''}
              </span>
            ) : undefined
          }
        >
          {loadingSol ? (
            <CardListSkeleton rows={3} />
          ) : solicitacoes.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhuma solicitação registrada para este paciente.
            </p>
          ) : (
            <div className="space-y-2">
              {solicitacoes.map((sol, idx) => {
                const status = sol.status as StatusSolicitacao;
                const numProcesso = sol.numero_processo as string;
                const dataCriacao = sol.created_at as string;
                const setorAtual = sol.setor_atual as string | null;
                const dataLaudo = sol.data_laudo as string | null;
                const numeroProtocolo = sol.numero_protocolo as string | null;
                const ciclo = solicitacoes.length - idx;

                // Unidades vinculadas a esta solicitação — duas pontas distintas:
                // origem do laudo (uma) + destinos de agendamento (várias possíveis).
                const origemLaudo = sol.origem_laudo_unidade as { id: string; nome: string; cnes?: string } | null | undefined;
                const agendamentos = (sol.agendamentos as Array<{ id: string; unidades_destino?: { id: string; nome: string; cnes?: string } | null }> | undefined) ?? [];
                type UnidVinc = { id: string; nome: string; tipo: 'origem_laudo' | 'destino_agendamento' };
                const unidadesVinculadas: UnidVinc[] = [];
                if (origemLaudo?.id) {
                  unidadesVinculadas.push({ id: origemLaudo.id, nome: origemLaudo.nome, tipo: 'origem_laudo' });
                }
                for (const ag of agendamentos) {
                  const u = ag.unidades_destino;
                  if (u?.id && !unidadesVinculadas.some((x) => x.id === u.id && x.tipo === 'destino_agendamento')) {
                    unidadesVinculadas.push({ id: u.id, nome: u.nome, tipo: 'destino_agendamento' });
                  }
                }

                return (
                  <Link
                    key={sol.id as string}
                    href={`/solicitacoes/${sol.id}?from=pacientes`}
                    className="block rounded-lg p-3 transition-colors duration-150 group"
                    style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)'; e.currentTarget.style.borderColor = 'var(--tfd-primary-200)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)'; e.currentTarget.style.borderColor = 'var(--tfd-surface-border)'; }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}>
                            Ciclo {ciclo}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                            {numProcesso}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                            <Clock size={11} />
                            Criada em {formatDate(dataCriacao)}
                          </span>
                          {setorAtual && (
                            <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                              Setor: <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{SETOR_LABELS[setorAtual] ?? setorAtual}</span>
                            </span>
                          )}
                          {dataLaudo && (
                            <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                              Laudo: {formatDate(dataLaudo)}
                            </span>
                          )}
                          {numeroProtocolo && (
                            <span className="text-xs font-mono" style={{ color: 'var(--tfd-text-muted)' }}>
                              SEI: {numeroProtocolo}
                            </span>
                          )}
                        </div>
                        {unidadesVinculadas.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {unidadesVinculadas.map((u) => (
                              <span
                                key={`${u.id}-${u.tipo}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.open(`/unidades-saude/${u.id}`, '_blank');
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-[2px] text-[11px] rounded cursor-pointer hover:underline"
                                style={{
                                  background: u.tipo === 'origem_laudo' ? '#EEF2FF' : '#ECFDF5',
                                  color: u.tipo === 'origem_laudo' ? '#3730A3' : '#047857',
                                }}
                                title={u.tipo === 'origem_laudo' ? 'Origem do laudo' : 'Destino de agendamento'}
                              >
                                <span className="text-[9px] font-bold uppercase tracking-wider">
                                  {u.tipo === 'origem_laudo' ? 'Laudo' : 'Agendamento'}
                                </span>
                                <span style={{ opacity: 0.5 }}>·</span>
                                <span className="truncate max-w-[220px]">{u.nome}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusTag status={status} />
                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--tfd-primary-500)' }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* Saldo de ajuda de custo — entre ciclos do paciente (correção de
            regra 11/08/2026, tem sinal). Positivo: ele tem valor a receber
            (ex.: ajuda aditiva ainda não paga). Negativo: ele recebeu a mais
            (ex.: ajuda subtrativa ou volta antecipada) e a diferença é
            descontada do próximo pagamento — nunca devolvida em dinheiro. */}
        {extratoSaldoAjudaCusto.length > 0 && (
          <Section
            title="Saldo de ajuda de custo"
            icon={<Wallet size={18} />}
            badge={
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: saldoAjudaCusto > 0.005 ? '#F0FDF4' : saldoAjudaCusto < -0.005 ? '#FEF2F2' : 'var(--tfd-surface-100)',
                  color: saldoAjudaCusto > 0.005 ? '#15803D' : saldoAjudaCusto < -0.005 ? '#B91C1C' : 'var(--tfd-text-secondary)',
                }}
              >
                {saldoAjudaCusto > 0.005 ? '+' : ''}
                {saldoAjudaCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            }
          >
            <ul className="flex flex-col gap-1.5">
              {extratoSaldoAjudaCusto.map((m) => {
                const positivo = m.tipo === 'CREDITO';
                return (
                  <li
                    key={m.id}
                    className="flex items-start gap-2.5 px-3 py-2"
                    style={{ background: 'var(--tfd-surface-50)', borderRadius: 8, border: '1px solid var(--tfd-surface-border)' }}
                  >
                    {positivo ? (
                      <ArrowUpCircle size={15} style={{ color: '#15803D', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <ArrowDownCircle size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
                          {formatDate(m.data)}
                          {(m.solicitacaoOrigemNumero || m.solicitacaoDestinoNumero) && (
                            <>
                              {' · '}
                              {m.solicitacaoOrigemNumero ? `origem ${m.solicitacaoOrigemNumero}` : `destino ${m.solicitacaoDestinoNumero}`}
                            </>
                          )}
                        </span>
                        <span
                          className="text-[13px] font-semibold font-mono shrink-0"
                          style={{ color: positivo ? '#15803D' : '#B45309' }}
                        >
                          {positivo ? '+' : '−'}
                          {m.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {m.motivo}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {/* Endereço */}
        <Section title="Endereço" icon={<MapPin size={18} />}>
          {(logradouro || municipio) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {enderecoLinha && <InfoRow label="Logradouro" value={enderecoLinha} />}
              {cidadeFull && <InfoRow label="Município / UF" value={cidadeFull} />}
              {cep && <InfoRow label="CEP" value={cep} mono />}
            </div>
          ) : (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
              Endereço não cadastrado.
            </p>
          )}
        </Section>

        {/* Dados Bancários — POOL do paciente (CRUD) */}
        <Section
          title="Dados Bancários"
          icon={<Landmark size={18} />}
          badge={
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
              {contas.length}
            </span>
          }
          action={
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
              onClick={() => setContaDrawer({ open: true, conta: null })}
            >
              <Plus size={13} /> Adicionar conta
            </button>
          }
        >
          {contas.length === 0 ? (
            <div className="py-6 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
              <p className="text-sm mb-2">Nenhum dado bancário cadastrado.</p>
              <p className="text-[12px]">As contas ficam disponíveis no select quando a Ajuda de Custo for criar uma nova solicitação.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {contas.map((c) => {
                const banco = c.banco;
                const agencia = c.agencia;
                const conta = c.conta;
                const tipoConta = c.tipo_conta;
                const titular = c.nome_titular;
                const cpfTitular = c.cpf_titular;
                const vinculo = c.titular_vinculo;
                const pixTipo = c.pix_tipo;
                const pixChave = c.pix_chave;
                const temConta = !!(banco || agencia || conta);
                const temPix = !!(pixTipo || pixChave);
                return (
                  <li
                    key={c.id}
                    className="px-3 py-2.5"
                    style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--tfd-surface-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {vinculo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider" style={{ backgroundColor: '#EEF2FF', color: '#3730A3' }}>
                            {vinculo}
                          </span>
                        )}
                        {temConta && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider inline-flex items-center gap-1" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                            <Landmark size={9} /> Conta
                          </span>
                        )}
                        {temPix && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider inline-flex items-center gap-1" style={{ backgroundColor: '#ECFEFF', color: '#0E7490' }}>
                            <Key size={9} /> PIX
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                          onClick={() => setContaDrawer({ open: true, conta: c })}
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                          onClick={() => handleInativarConta(c)}
                          title="Inativar (não aparece mais em novas solicitações)"
                        >
                          <Trash2 size={12} style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                    </div>
                    {temConta && (
                      <div className="text-[12.5px] flex items-center gap-2 flex-wrap" style={{ color: '#0F172A' }}>
                        <span style={{ fontWeight: 600 }}>{banco}</span>
                        <span style={{ color: '#CBD5E1' }}>·</span>
                        <span className="font-mono">Ag. {agencia} / Conta {conta}</span>
                        {tipoConta && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
                            {TIPO_CONTA_LABELS[tipoConta] ?? tipoConta}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-[11.5px] mt-0.5" style={{ color: '#475569' }}>
                      Titular: <strong style={{ color: '#0F172A' }}>{titular}</strong>
                      {cpfTitular && <span className="font-mono ml-2">{formatCPF(cpfTitular)}</span>}
                    </div>
                    {pixTipo && pixChave && (
                      <div className="text-[11.5px] mt-0.5 inline-flex items-center gap-1.5" style={{ color: '#475569' }}>
                        <Key size={11} style={{ color: '#0EA5E9' }} />
                        PIX <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#ECFEFF', color: '#0E7490' }}>{PIX_TIPO_LABELS[pixTipo] ?? pixTipo}</span>
                        <span className={['CPF','CNPJ','TELEFONE','ALEATORIA'].includes(pixTipo) ? 'font-mono' : ''}>
                          {formatarChavePix(pixTipo, pixChave)}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Acompanhantes */}
        <Section
          title="Acompanhantes"
          icon={<Users size={18} />}
          badge={
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
              {acompanhantes.length}
            </span>
          }
        >
          {acompanhantes.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhum acompanhante cadastrado.
            </p>
          ) : (
            <div className="space-y-2">
              {acompanhantes.map((ac) => (
                <div
                  key={ac.id as string}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ac.nome_completo as string}
                    </p>
                    {(ac.vinculo as string | null) && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
                        {VINCULO_LABELS[(ac.vinculo as string)] || (ac.vinculo as string).replace(/_/g, ' ')}
                      </span>
                    )}
                    {(ac.necessidade_especial as boolean) && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        Necessidade especial
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      CPF: {formatCPF((ac.cpf as string) || '')}
                    </span>
                    {(ac.telefone as string | null) && (
                      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                        Tel: {ac.telefone as string}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <style jsx>{`
        .header-groups { display: flex; flex-direction: column; gap: 6px; }
        .header-groups-divider { display: none; }
        @media (min-width: 1100px) {
          .header-groups { flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
          .header-groups-divider { display: inline-block; width: 1px; height: 16px; background: #E2E8F0; flex-shrink: 0; }
        }
      `}</style>

      <PacienteDrawer
        open={editOpen}
        editandoId={editOpen ? id : null}
        editandoData={editOpen ? paciente : null}
        onClose={() => setEditOpen(false)}
        onSaved={() => setReloadFlag((n) => n + 1)}
      />

      <DadosBancariosDrawer
        open={contaDrawer.open}
        conta={contaDrawer.conta}
        pacienteId={id}
        pacienteNome={nome}
        pacienteCpf={cpf}
        onClose={() => setContaDrawer({ open: false, conta: null })}
        onSaved={() => setReloadFlag((n) => n + 1)}
      />
    </div>
  );
}

/* -------------------------------------------------- */
/*  Helpers visuais                                    */
/* -------------------------------------------------- */

function Sep() {
  return <span aria-hidden style={{ color: '#CBD5E1' }}>·</span>;
}

function Section({
  title,
  icon,
  children,
  badge,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="tfd-card tfd-card--flat">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{title}</h2>
        {badge}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
      <span className="text-sm font-medium shrink-0 w-40" style={{ color: 'var(--tfd-text-secondary)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--tfd-text-primary)', fontFamily: mono ? 'var(--tfd-font-mono)' : undefined }}>
        {value}
      </span>
    </div>
  );
}

function KpiBar({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div
      className="mb-6 overflow-hidden"
      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 kpi-bar">
        {items.map((it, i) => (
          <div key={i} className="px-5 py-4 kpi-cell">
            <p className="text-[11px] font-medium uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>
              {it.label}
            </p>
            <p className="text-[22px] font-semibold leading-tight mt-1" style={{ color: '#0F172A' }}>
              {it.value}
            </p>
            {it.sub && (
              <p className="text-[12px] mt-1" style={{ color: '#94A3B8' }}>{it.sub}</p>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        @media (min-width: 640px) {
          .kpi-cell + .kpi-cell { border-left: 1px solid #F1F5F9; }
        }
      `}</style>
    </div>
  );
}
