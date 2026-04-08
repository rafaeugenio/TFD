'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  Calendar,
  Users,
  ExternalLink,
  Loader2,
  XCircle,
  Hash,
  Pencil,
  Activity,
  CheckCircle2,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarPaciente } from '@/services/pacientes.service';
import { historicoProcessos } from '@/services/pacientes.service';
import { listarPorPaciente } from '@/services/acompanhantes.service';
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

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PacienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [paciente, setPaciente] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, unknown>[]>([]);
  const [acompanhantes, setAcompanhantes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarPaciente(id);
      if (data) setPaciente(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const [solResult, acompResult] = await Promise.all([
        historicoProcessos(id),
        listarPorPaciente(id),
      ]);
      if (solResult.data) setSolicitacoes(solResult.data as Record<string, unknown>[]);
      if (acompResult.data) setAcompanhantes(acompResult.data as Record<string, unknown>[]);
      setLoadingSol(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Paciente não encontrado</p>
        <Link href="/pacientes" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = paciente.nome_completo as string;
  const cpf = paciente.cpf as string;
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

  const enderecoCompleto = [
    logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
    bairro,
  ].filter(Boolean).join(' — ');

  const cidadeFull = municipio ? `${municipio} — ${uf}` : null;

  return (
    <>
      <PageHeader
        title={nome}
        subtitle="Detalhes do paciente"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => router.push(`/pacientes?editar=${id}`)}
            >
              <Pencil size={16} />
              Editar Paciente
            </button>
            <Link href="/pacientes" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      {/* Summary cards */}
      {(() => {
        const totalSol = solicitacoes.length;
        const emAndamento = solicitacoes.filter((s) => {
          const st = s.status as string;
          return st && !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
        }).length;
        const concluidas = solicitacoes.filter((s) => {
          const st = s.status as string;
          return st === 'CONCLUIDO' || st === 'ENCERRADO';
        }).length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="tfd-card flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Solicitações</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{loadingSol ? '...' : totalSol}</p>
              </div>
            </div>
            <div className="tfd-card flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-warning-bg)', color: 'var(--tfd-status-warning)' }}>
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Em Andamento</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{loadingSol ? '...' : emAndamento}</p>
              </div>
            </div>
            <div className="tfd-card flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídas</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{loadingSol ? '...' : concluidas}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== Coluna Esquerda: Dados do Paciente ========== */}
        <div className="lg:col-span-1 space-y-6">
          {/* Card: Dados Pessoais + Endereço (unificado) */}
          <div className="tfd-card">
            {/* Avatar + Nome */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: 'var(--tfd-primary-500)' }}
              >
                {nome.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                  {nome}
                </h2>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  {sexo === 'MASCULINO' ? 'Masculino' : sexo === 'FEMININO' ? 'Feminino' : 'Outro'}
                  {idade !== null && ` · ${idade} anos`}
                </p>
              </div>
            </div>

            {/* Dados pessoais */}
            <div className="space-y-3">
              <InfoRow icon={<CreditCard size={14} />} label="CPF" value={formatCPF(cpf)} />
              {cns && <InfoRow icon={<Hash size={14} />} label="CNS" value={formatCNS(cns)} />}
              {dataNascimento && <InfoRow icon={<Calendar size={14} />} label="Nascimento" value={formatDate(dataNascimento)} />}
              {telefone && <InfoRow icon={<Phone size={14} />} label="Celular" value={telefone} />}
              {telefoneFixo && <InfoRow icon={<Phone size={14} />} label="Fixo" value={telefoneFixo} />}
              {email && <InfoRow icon={<Mail size={14} />} label="E-mail" value={email} />}
            </div>

            {/* Separador + Endereço (mesmo card) */}
            {(logradouro || municipio) && (
              <>
                <hr className="tfd-divider my-4" />
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide" style={{ color: 'var(--tfd-text-muted)' }}>
                  <MapPin size={12} />
                  Endereço
                </h3>
                <div className="space-y-1">
                  {enderecoCompleto && (
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {enderecoCompleto}
                    </p>
                  )}
                  {cidadeFull && (
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {cidadeFull}
                    </p>
                  )}
                  {cep && (
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      CEP: {cep}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Card: Acompanhantes */}
          <div className="tfd-card">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
              <Users size={14} style={{ color: 'var(--tfd-primary-500)' }} />
              Acompanhantes
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
              >
                {acompanhantes.length}
              </span>
            </h3>

            {acompanhantes.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <Users size={24} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhum acompanhante cadastrado
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {acompanhantes.map((ac) => (
                  <div
                    key={ac.id as string}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ac.nome_completo as string}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                        CPF: {formatCPF((ac.cpf as string) || '')}
                      </span>
                      {(ac.vinculo as string | null) && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}
                        >
                          {VINCULO_LABELS[(ac.vinculo as string)] || (ac.vinculo as string).replace(/_/g, ' ')}
                        </span>
                      )}
                      {(ac.telefone as string | null) && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                          <Phone size={10} />
                          {ac.telefone as string}
                        </span>
                      )}
                    </div>
                    {(ac.necessidade_especial as boolean) && (
                      <span
                        className="inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                      >
                        Necessidade especial
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========== Coluna Direita: Histórico de Solicitações ========== */}
        <div className="lg:col-span-2">
          <div className="tfd-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
                <FileText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                Histórico de Solicitações
                {!loadingSol && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                  >
                    {solicitacoes.length} ciclo{solicitacoes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>

            {loadingSol ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando solicitações...</span>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhuma solicitação registrada para este paciente
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitacoes.map((sol, idx) => {
                  const status = sol.status as StatusSolicitacao;
                  const numProcesso = sol.numero_processo as string;
                  const dataCriacao = sol.created_at as string;
                  const cid = sol.cid10_principal as string;
                  const especialidade = sol.especialidade as string;
                  const modalidade = sol.modalidade as string;
                  const ciclo = solicitacoes.length - idx;

                  return (
                    <Link
                      key={sol.id as string}
                      href={`/solicitacoes/${sol.id}`}
                      className="block rounded-lg p-4 transition-all duration-150 group"
                      style={{
                        border: '1px solid var(--tfd-surface-border)',
                        backgroundColor: 'var(--tfd-surface-card)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--tfd-primary-200)';
                        e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--tfd-surface-border)';
                        e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)';
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}
                            >
                              Ciclo {ciclo}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                              {numProcesso}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            {cid && (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                                <User size={11} />
                                CID: {cid}
                              </span>
                            )}
                            {especialidade && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                                {especialidade}
                              </span>
                            )}
                            {modalidade && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                                {modalidade === 'INTERESTADUAL' ? 'Interestadual' : 'Intraestadual'}
                              </span>
                            )}
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              <Clock size={11} />
                              {formatDate(dataCriacao)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <StatusTag status={status} />
                          <ExternalLink
                            size={14}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--tfd-primary-500)' }}
                          />
                        </div>
                      </div>

                      {((sol.viagens as unknown[])?.length > 0 || (sol.ajudas_custo as unknown[])?.length > 0) && (
                        <div
                          className="flex items-center gap-4 mt-3 pt-3"
                          style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                        >
                          {(sol.viagens as unknown[])?.length > 0 && (
                            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              {(sol.viagens as unknown[]).length} viagem(ns)
                            </span>
                          )}
                          {(sol.ajudas_custo as unknown[])?.length > 0 && (
                            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              {(sol.ajudas_custo as unknown[]).length} ajuda(s) de custo
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── InfoRow helper ── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--tfd-text-muted)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{label}:</span>
      <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{value}</span>
    </div>
  );
}
