'use client';

/**
 * D4 — Prontuário / histórico completo do paciente.
 *
 * Tela consultada pelo médico parecerista antes de emitir novo parecer para
 * visualizar toda a vida TFD do paciente: solicitações anteriores, pareceres,
 * diagnósticos, tratamentos, viagens e encerramentos.
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  FileText,
  Stethoscope,
  Plane,
  CalendarClock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Heart,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { DetailHeaderSkeleton, SectionSkeleton } from '@/shared/components/skeleton';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarPaciente, historicoProcessosCompleto } from '@/services/pacientes.service';
import { formatCPF, formatCNS, formatDate } from '@/shared/pipes/formatters';

const decisaoLabels: Record<string, { label: string; bg: string; color: string }> = {
  DEFERIDO: { label: 'Deferido', bg: '#DCFCE7', color: '#15803D' },
  INDEFERIDO: { label: 'Indeferido', bg: '#FEE2E2', color: '#B91C1C' },
  EXIGENCIA: { label: 'Exigência', bg: '#FEF3C7', color: '#92400E' },
};

const motivoLabels: Record<string, string> = {
  ALTA_MEDICA: 'Alta Médica',
  OBITO: 'Óbito',
  DESISTENCIA: 'Desistência',
  ABANDONO: 'Abandono',
  TRANSFERENCIA: 'Transferência',
};

export default function ProntuarioPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [paciente, setPaciente] = useState<any>(null);
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const pacRes: any = await buscarPaciente(id);
      const procRes: any = await historicoProcessosCompleto(id);
      if (pacRes?.data) setPaciente(pacRes.data);
      if (procRes?.data) setProcessos(procRes.data as any[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <>
        <PageHeader title="Prontuário do paciente" />
        <DetailHeaderSkeleton />
        <SectionSkeleton rows={6} />
      </>
    );
  }

  if (!paciente) {
    return (
      <>
        <PageHeader title="Paciente não encontrado" />
        <div className="tfd-card text-center py-12">
          <XCircle
            size={48}
            className="mx-auto mb-3"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <Link
            href="/pacientes"
            className="tfd-btn tfd-btn-primary tfd-btn--sm mt-4 inline-flex"
          >
            <ArrowLeft size={14} />
            Voltar para pacientes
          </Link>
        </div>
      </>
    );
  }

  const totalCiclos = processos.length;
  const totalViagens = processos.reduce(
    (s, p) => s + (p.viagens?.length ?? 0),
    0,
  );
  const totalPareceres = processos.reduce(
    (s, p) => s + (p.pareceres?.length ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title={`Prontuário — ${paciente.nome_completo}`}
        subtitle="Histórico completo TFD do paciente (consulta de contexto clínico)"
        breadcrumbs={[
          { label: 'Pacientes', href: '/pacientes' },
          { label: paciente.nome_completo, href: `/pacientes/${id}` },
          { label: 'Prontuário' },
        ]}
      />

      {/* Dados do paciente */}
      <div className="tfd-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} style={{ color: 'var(--tfd-primary-500)' }} />
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Dados do paciente
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <CreditCard size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            <div>
              <p className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                CPF
              </p>
              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--tfd-text-primary)',
                  fontFamily: 'var(--tfd-font-mono)',
                }}
              >
                {formatCPF(paciente.cpf ?? '')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Heart size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            <div>
              <p className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                CNS
              </p>
              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--tfd-text-primary)',
                  fontFamily: 'var(--tfd-font-mono)',
                }}
              >
                {paciente.cns ? formatCNS(paciente.cns) : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            <div>
              <p className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                Nascimento
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                {paciente.data_nascimento
                  ? formatDate(paciente.data_nascimento)
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs do histórico */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Ciclos TFD</p>
            <p className="tfd-kpi-value tfd-number">{totalCiclos}</p>
            <p className="tfd-kpi-sub">solicitações abertas</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--blue">
            <FileText size={22} />
          </div>
        </div>
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Pareceres</p>
            <p className="tfd-kpi-value tfd-number">{totalPareceres}</p>
            <p className="tfd-kpi-sub">avaliações médicas</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--violet">
            <Stethoscope size={22} />
          </div>
        </div>
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Viagens</p>
            <p className="tfd-kpi-value tfd-number">{totalViagens}</p>
            <p className="tfd-kpi-sub">deslocamentos realizados</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--green">
            <Plane size={22} />
          </div>
        </div>
      </div>

      {/* Lista de processos */}
      <div className="tfd-card">
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: 'var(--tfd-text-primary)' }}
        >
          Histórico de solicitações
        </h2>

        {processos.length === 0 ? (
          <div className="text-center py-8">
            <FileText
              size={32}
              className="mx-auto mb-2"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Paciente ainda não possui solicitações TFD.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {processos.map((proc) => {
              const parecer = proc.pareceres?.[0];
              const encerramento = proc.encerramentos?.[0];
              const dec = parecer ? decisaoLabels[parecer.decisao] : null;

              return (
                <li
                  key={proc.id}
                  className="rounded-lg p-4"
                  style={{ border: '1px solid var(--tfd-surface-border)' }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/fluxo-v2/solicitacoes/${proc.id}?from=pacientes`}
                          className="text-sm font-semibold hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                        >
                          {proc.numero_processo}
                        </Link>
                        <StatusTag status={proc.status} />
                        {encerramento && (
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                encerramento.motivo === 'OBITO'
                                  ? '#FEE2E2'
                                  : '#DCFCE7',
                              color:
                                encerramento.motivo === 'OBITO'
                                  ? '#B91C1C'
                                  : '#15803D',
                            }}
                          >
                            {motivoLabels[encerramento.motivo] ?? encerramento.motivo}
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--tfd-text-muted)' }}
                      >
                        Aberto em {formatDate(proc.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Diagnóstico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                    >
                      <p
                        className="text-[11px] uppercase tracking-wider font-semibold mb-1"
                        style={{ color: 'var(--tfd-text-muted)' }}
                      >
                        Diagnóstico
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--tfd-text-primary)' }}
                      >
                        <code
                          className="text-xs px-1.5 py-0.5 rounded mr-1.5"
                          style={{
                            backgroundColor: 'var(--tfd-primary-50)',
                            color: 'var(--tfd-primary-700)',
                            fontFamily: 'var(--tfd-font-mono)',
                          }}
                        >
                          {proc.cid10_principal ?? '—'}
                        </code>
                        {proc.especialidade?.replace(/_/g, ' ') ?? '—'}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--tfd-text-secondary)' }}
                      >
                        {proc.tipo_procedimento ?? '—'}
                      </p>
                    </div>

                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                    >
                      <p
                        className="text-[11px] uppercase tracking-wider font-semibold mb-1"
                        style={{ color: 'var(--tfd-text-muted)' }}
                      >
                        Parecer médico
                      </p>
                      {parecer ? (
                        <>
                          <span
                            className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1"
                            style={{
                              backgroundColor: dec?.bg,
                              color: dec?.color,
                            }}
                          >
                            {dec?.label ?? parecer.decisao}
                          </span>
                          <p
                            className="text-xs line-clamp-2"
                            style={{ color: 'var(--tfd-text-secondary)' }}
                          >
                            {parecer.observacoes_medicas ?? '—'}
                          </p>
                        </>
                      ) : (
                        <p
                          className="text-xs"
                          style={{ color: 'var(--tfd-text-muted)' }}
                        >
                          Sem parecer registrado
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Viagens */}
                  {(proc.viagens ?? []).length > 0 && (
                    <div className="mb-3">
                      <p
                        className="text-[11px] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1"
                        style={{ color: 'var(--tfd-text-muted)' }}
                      >
                        <Plane size={11} />
                        Viagens ({proc.viagens.length})
                      </p>
                      <div className="space-y-1">
                        {proc.viagens.map((v: any) => (
                          <div
                            key={v.id}
                            className="text-xs flex items-center gap-2"
                            style={{ color: 'var(--tfd-text-secondary)' }}
                          >
                            <span className="font-medium">
                              {v.tipo === 'IDA' ? '→' : '←'}
                            </span>
                            <span>
                              {v.origem_cidade}/{v.origem_uf} → {v.destino_cidade}/
                              {v.destino_uf}
                            </span>
                            <span style={{ color: 'var(--tfd-text-muted)' }}>
                              {v.data_embarque_prevista
                                ? formatDate(v.data_embarque_prevista)
                                : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Permanências */}
                  {(proc.permanencias ?? []).length > 0 && (
                    <div className="text-xs flex items-center gap-1.5 mb-1">
                      <CalendarClock
                        size={11}
                        style={{ color: 'var(--tfd-text-muted)' }}
                      />
                      <span style={{ color: 'var(--tfd-text-secondary)' }}>
                        {proc.permanencias.length} permanência(s) registrada(s)
                      </span>
                    </div>
                  )}

                  {/* Encerramento */}
                  {encerramento && (
                    <div
                      className="text-xs flex items-start gap-1.5 mt-2 pt-2"
                      style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                    >
                      {encerramento.motivo === 'ALTA_MEDICA' ? (
                        <CheckCircle2
                          size={12}
                          style={{ color: 'var(--tfd-status-success)' }}
                        />
                      ) : (
                        <XCircle
                          size={12}
                          style={{ color: 'var(--tfd-status-danger)' }}
                        />
                      )}
                      <span style={{ color: 'var(--tfd-text-secondary)' }}>
                        Encerrado em {formatDate(encerramento.data_encerramento)} —{' '}
                        {encerramento.observacoes ?? '—'}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
