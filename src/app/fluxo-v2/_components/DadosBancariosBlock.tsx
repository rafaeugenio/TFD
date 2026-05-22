'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Landmark,
  AlertTriangle,
  Check,
  Plus,
  Key,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  listarPoolPorPaciente,
  vincularASolicitacao,
  desvincularDaSolicitacao,
  buscarVinculoDaSolicitacao,
  type DadosBancariosRow,
} from '@/services/dados-bancarios.service';
import DadosBancariosDrawer from '@/app/pacientes/_DadosBancariosDrawer';
import { useToast } from '@/shared/components/toast/Toast';

interface Props {
  solicitacaoId: string;
  pacienteId: string;
  pacienteCpf: string;
  pacienteNome: string;
  /** Quando `true`, bloqueia edição (solicitação encerrada etc.). */
  locked?: boolean;
  /** Tooltip exibido quando bloqueado. */
  lockedTip?: string;
  /** Notifica o pai quando o registro é salvo ou removido (refresca o estado de "tudo pronto"). */
  onChange?: () => void;
}

interface VinculoSnapshot {
  dados_bancarios_id: string | null;
  snapshot_banco: string | null;
  snapshot_agencia: string | null;
  snapshot_conta: string | null;
  snapshot_tipo_conta: string | null;
  snapshot_nome_titular: string | null;
  snapshot_cpf_titular: string | null;
  snapshot_titular_vinculo: string | null;
  snapshot_pix_tipo: string | null;
  snapshot_pix_chave: string | null;
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function descreverConta(c: DadosBancariosRow): string {
  const partes: string[] = [];
  if (c.banco) {
    partes.push(`${c.banco}${c.agencia && c.conta ? ` Ag.${c.agencia}/${c.conta}` : ''}`);
  }
  if (c.pix_chave) {
    partes.push(`PIX ${c.pix_tipo ?? ''}`);
  }
  const head = c.titular_vinculo ? `[${c.titular_vinculo}] ` : '';
  return `${head}${partes.join(' · ')} — ${c.nome_titular}`;
}

export default function DadosBancariosBlock({
  solicitacaoId,
  pacienteId,
  pacienteCpf,
  pacienteNome,
  locked = false,
  lockedTip,
  onChange,
}: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<DadosBancariosRow[]>([]);
  const [vinculo, setVinculo] = useState<VinculoSnapshot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trocando, setTrocando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [poolRes, vincRes] = await Promise.all([
      listarPoolPorPaciente(pacienteId),
      buscarVinculoDaSolicitacao(solicitacaoId),
    ]);
    if (poolRes.data) setPool(poolRes.data as DadosBancariosRow[]);
    setVinculo((vincRes.data ?? null) as VinculoSnapshot | null);
    setLoading(false);
  }, [pacienteId, solicitacaoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const temVinculo = !!vinculo?.dados_bancarios_id;

  async function selecionar(contaId: string) {
    if (locked) return;
    const conta = pool.find((c) => c.id === contaId);
    if (!conta) return;
    const { error } = await vincularASolicitacao(solicitacaoId, conta);
    if (error) {
      toast.error('Erro ao vincular conta', error.message);
      return;
    }
    toast.success('Dados bancários vinculados à solicitação');
    setTrocando(false);
    await carregar();
    onChange?.();
  }

  async function desvincular() {
    if (locked) return;
    if (!window.confirm('Desvincular a conta desta solicitação? O snapshot atual será apagado.')) {
      return;
    }
    const { error } = await desvincularDaSolicitacao(solicitacaoId);
    if (error) {
      toast.error('Erro ao desvincular', error.message);
      return;
    }
    toast.success('Conta desvinculada');
    await carregar();
    onChange?.();
  }

  async function onContaCriada(novaConta: DadosBancariosRow) {
    // Após criar inline, já vincula automaticamente à solicitação.
    const { error } = await vincularASolicitacao(solicitacaoId, novaConta);
    if (!error) {
      toast.success('Conta cadastrada e vinculada à solicitação');
    }
    await carregar();
    onChange?.();
  }

  const snapshot = vinculo;
  const titularEhPaciente = snapshot
    ? onlyDigits(snapshot.snapshot_cpf_titular ?? '') === onlyDigits(pacienteCpf)
    : false;
  const vinculoLabel = snapshot?.snapshot_titular_vinculo ?? null;

  return (
    <div className="mt-5 pt-4" style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ color: '#0F172A' }}>
          <Landmark size={13} style={{ color: '#475569' }} />
          Dados bancários
        </h4>
        <span className="text-[11px]" style={{ color: '#94A3B8' }}>
          Conta de recebimento da ajuda de custo desta solicitação.
        </span>
      </div>

      {loading && (
        <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Carregando…</p>
      )}

      {/* Nenhuma conta no pool — operador cria inline */}
      {!loading && pool.length === 0 && !temVinculo && (
        <div
          className="flex items-center justify-between gap-3 px-3 py-3"
          style={{ background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}
        >
          <p className="text-[12px]" style={{ color: '#64748B' }}>
            Este paciente ainda não tem dados bancários cadastrados.
          </p>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={() => setDrawerOpen(true)}
            disabled={locked}
            title={locked ? lockedTip : undefined}
          >
            <Plus size={13} /> Cadastrar dados bancários
          </button>
        </div>
      )}

      {/* Sem vínculo, mas com pool disponível — operador escolhe */}
      {!loading && pool.length > 0 && (!temVinculo || trocando) && (
        <div
          className="px-3 py-3"
          style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid var(--tfd-surface-border)' }}
        >
          <label className="block text-[11px] font-semibold mb-1" style={{ color: '#475569' }}>
            Selecione a conta de recebimento
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                className="tfd-input"
                style={{ paddingRight: 28, appearance: 'none' }}
                defaultValue=""
                onChange={(e) => selecionar(e.target.value)}
                disabled={locked}
              >
                <option value="">— Escolha uma conta —</option>
                {pool.map((c) => (
                  <option key={c.id} value={c.id}>
                    {descreverConta(c)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}
              />
            </div>
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              onClick={() => setDrawerOpen(true)}
              disabled={locked}
              title="Cadastrar nova conta para este paciente"
            >
              <Plus size={13} /> Nova conta
            </button>
            {trocando && (
              <button
                type="button"
                className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                onClick={() => setTrocando(false)}
              >
                <X size={13} /> Cancelar
              </button>
            )}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>
            Confira no documento anexado à solicitação qual conta o paciente indicou. Se faltar, use <strong>Nova conta</strong> para cadastrar.
          </p>
        </div>
      )}

      {/* Conta vinculada — mostra snapshot */}
      {!loading && temVinculo && !trocando && snapshot && (
        <div className="flex items-start gap-3 px-3 py-3" style={{ background: '#F8FAFC', borderRadius: 8 }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {vinculoLabel && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: '#EEF2FF', color: '#3730A3' }}
                >
                  {vinculoLabel}
                </span>
              )}
              {snapshot.snapshot_banco && (
                <span className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider inline-flex items-center gap-1" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
                  <Landmark size={9} /> Conta
                </span>
              )}
              {snapshot.snapshot_pix_chave && (
                <span className="text-[9.5px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider inline-flex items-center gap-1" style={{ background: '#ECFEFF', color: '#0E7490' }}>
                  <Key size={9} /> PIX
                </span>
              )}
            </div>
            {snapshot.snapshot_banco && (
              <div className="flex items-center gap-2 flex-wrap text-[13px]" style={{ color: '#0F172A' }}>
                <span style={{ fontWeight: 600 }}>{snapshot.snapshot_banco}</span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span className="font-mono">Ag. {snapshot.snapshot_agencia} / Conta {snapshot.snapshot_conta}</span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span style={{ color: '#475569' }}>
                  {snapshot.snapshot_tipo_conta === 'POUPANCA' ? 'Poupança' : 'Corrente'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 text-[11.5px] flex-wrap" style={{ color: '#475569' }}>
              <span>Titular: <strong style={{ color: '#0F172A' }}>{snapshot.snapshot_nome_titular}</strong></span>
              {snapshot.snapshot_cpf_titular && (
                <>
                  <span style={{ color: '#CBD5E1' }}>·</span>
                  <span className="font-mono">{snapshot.snapshot_cpf_titular}</span>
                </>
              )}
            </div>
            {snapshot.snapshot_pix_chave && (
              <div className="text-[11.5px] mt-0.5" style={{ color: '#475569' }}>
                PIX <strong style={{ color: '#0F172A' }}>{snapshot.snapshot_pix_tipo}</strong>:{' '}
                <span className="font-mono">{snapshot.snapshot_pix_chave}</span>
              </div>
            )}
            {!titularEhPaciente ? (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 text-[11px]" style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 6 }}>
                <AlertTriangle size={12} />
                Titular diferente do paciente — verifique se o <strong>Termo de Autorização</strong> está nos anexos.
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 text-[11px]" style={{ background: '#DCFCE7', color: '#166534', borderRadius: 6 }}>
                <Check size={12} />
                Titular é o próprio paciente.
              </div>
            )}
            <p className="text-[10.5px] mt-2" style={{ color: '#94A3B8' }}>
              Snapshot congelado nesta solicitação. Edições futuras na conta-mãe não afetam o histórico financeiro.
            </p>
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              onClick={() => setTrocando(true)}
              disabled={locked}
              title={locked ? lockedTip : 'Trocar por outra conta'}
            >
              Trocar
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              onClick={desvincular}
              disabled={locked}
              title="Desvincular"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      <DadosBancariosDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pacienteId={pacienteId}
        pacienteNome={pacienteNome}
        pacienteCpf={pacienteCpf}
        conta={null}
        onSaved={(c) => {
          setDrawerOpen(false);
          onContaCriada(c);
        }}
      />
    </div>
  );
}
