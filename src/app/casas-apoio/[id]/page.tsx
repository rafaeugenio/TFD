'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Phone, MapPin, FileText, User, Clock, ExternalLink, Home } from 'lucide-react';
import { useToast } from '@/shared/components/toast/Toast';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { encaminhamentosDaCasa, useCasasApoio } from '@/app/fluxo-v2/_state/servicoSocialStore';
import { SITUACAO_DEMANDA_LABEL, TIPO_INSTRUMENTO_LABEL } from '@/core/mocks/servico-social-seed';
import CasaApoioDrawer from '../_CasaApoioDrawer';
import ExcluirCasaDialog from '../_ExcluirCasaDialog';

const dataBR = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
};

/**
 * Detalhe da casa de apoio, no mesmo formato do detalhe de Unidade de Saúde:
 * cartão de cabeçalho com Editar, indicadores e a lista dos encaminhamentos
 * do Serviço Social que citam a casa.
 */
export default function CasaApoioDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const casas = useCasasApoio();
  const { can } = usePermissions();
  const podeEditar = can('casa_apoio.editar');
  const podeExcluir = can('casa_apoio.excluir');
  const casa = casas.find((c) => c.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  if (!casa) {
    return (
      <div>
        <Link href="/casas-apoio" className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]" style={{ color: '#6B7280' }}>
          <ArrowLeft size={12} /> Voltar para Casas de Apoio
        </Link>
        <div className="tfd-card tfd-card--flat text-center py-12">
          <Home size={28} className="mx-auto mb-2" style={{ color: 'var(--tfd-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Casa de apoio não encontrada. Ela pode ter sido excluída.</p>
        </div>
      </div>
    );
  }

  const encaminhamentos = encaminhamentosDaCasa(casa.id);
  // Pacientes diferentes: pelo CPF copiado no instrumento (vale também para o avulso).
  const pacientes = new Set(
    encaminhamentos.map((e) => e.instrumento.pacienteCpf ?? e.demanda?.pacienteCpf ?? e.instrumento.solicitacaoId),
  ).size;
  const emAberto = encaminhamentos.filter((e) => e.demanda && (e.demanda.situacao === 'pendente' || e.demanda.situacao === 'em_atendimento')).length;

  return (
    <div>
      <Link href="/casas-apoio" className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]" style={{ color: '#6B7280' }}>
        <ArrowLeft size={12} /> Voltar para Casas de Apoio
      </Link>

      {/* ============ Header card ============ */}
      <div className="mb-6 overflow-hidden" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}>
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3 flex-wrap">
          <h1 className="text-[20px] font-semibold min-w-0" style={{ color: '#146BFA', letterSpacing: '-0.02em' }}>{casa.nome}</h1>
          <div className="flex gap-2 shrink-0">
            {podeExcluir && (
              <button className="tfd-btn tfd-btn-secondary" style={{ color: '#DC2626' }} onClick={() => setExcluindo(true)}>
                <Trash2 size={14} /> Excluir
              </button>
            )}
            {podeEditar && (
              <button className="tfd-btn tfd-btn-primary" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Editar
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <span><span style={{ color: '#94A3B8' }}>Responsável </span>{casa.responsavel}</span>
            <Sep />
            <span><span style={{ color: '#94A3B8' }}>Unidade vinculada </span>{casa.unidadeVinculadaNome ?? 'Sem unidade vinculada'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 pb-5 text-[13px]" style={{ color: '#475569' }}>
          <span className="inline-flex items-center gap-1.5">
            <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
            <span>{casa.contato}</span>
          </span>
          <Sep />
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
            <span>{casa.endereco}{casa.cidadeUf ? `, ${casa.cidadeUf}` : ''}</span>
          </span>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 overflow-hidden" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10 }}>
        {[
          { label: 'Encaminhamentos', value: encaminhamentos.length },
          { label: 'Pacientes Encaminhados', value: pacientes },
          { label: 'Demandas em Aberto', value: emAberto },
        ].map((k, i) => (
          <div key={k.label} className="px-5 py-4" style={{ borderLeft: i ? '1px solid #E2E8F0' : undefined }}>
            <p className="text-[11px] font-semibold uppercase" style={{ color: '#64748B', letterSpacing: '0.06em' }}>{k.label}</p>
            <p className="text-[22px] font-bold mt-1" style={{ color: '#1A1D2B', fontFamily: 'var(--tfd-mono)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ============ Encaminhamentos vinculados ============ */}
      <div className="tfd-card tfd-card--flat">
        <div className="flex items-center gap-2 mb-4">
          <span style={{ color: 'var(--tfd-primary-500)' }}><FileText size={18} /></span>
          <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Encaminhamentos Vinculados</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>{encaminhamentos.length}</span>
        </div>
        {encaminhamentos.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum encaminhamento registrado para esta casa.</p>
        ) : (
          <div className="space-y-2">
            {encaminhamentos.map(({ instrumento, demanda }) => (
              <Link
                key={instrumento.id}
                href={`/fluxo-v2/solicitacoes/${instrumento.solicitacaoId}?tab=servico-social`}
                className="block rounded-lg p-3 transition-colors duration-150 group hover:bg-[var(--tfd-primary-50)]"
                style={{ border: '1px solid var(--tfd-surface-border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{instrumento.solicitacaoNumero ?? demanda?.solicitacaoNumero ?? 'Solicitação'}</span>
                      <span className="text-[11px] px-2 py-[1px] rounded-full" style={{ background: '#F1F5F9', color: '#475569' }}>{TIPO_INSTRUMENTO_LABEL[instrumento.tipo]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                      {(instrumento.pacienteNome ?? demanda?.pacienteNome) && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-secondary)' }}><User size={11} />{instrumento.pacienteNome ?? demanda?.pacienteNome}</span>
                      )}
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}><Clock size={11} />{dataBR(instrumento.dataCriacao)}</span>
                      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{demanda ? SITUACAO_DEMANDA_LABEL[demanda.situacao] : 'Instrumento avulso'}</span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--tfd-primary-500)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CasaApoioDrawer open={editOpen} casa={editOpen ? casa : null} onClose={() => setEditOpen(false)} />
      <ExcluirCasaDialog
        casa={excluindo ? casa : null}
        onClose={() => setExcluindo(false)}
        onExcluida={(nome) => { toast.success('Casa de apoio excluída', `${nome} foi removida do cadastro.`); router.push('/casas-apoio'); }}
      />
    </div>
  );
}

function Sep() {
  return <span aria-hidden style={{ color: '#CBD5E1' }}>·</span>;
}
