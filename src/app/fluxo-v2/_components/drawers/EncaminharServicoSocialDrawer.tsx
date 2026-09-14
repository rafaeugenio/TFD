'use client';

import { useState } from 'react';
import { HeartHandshake, AlertTriangle } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { abrirDemanda } from '../../_state/servicoSocialStore';
import {
  ETAPAS_IMPACTADAS,
  ETAPA_IMPACTADA_LABEL,
  type EtapaImpactada,
  type SetorOrigemDemanda,
} from '@/core/mocks/servico-social-seed';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

const STATUS_PARA_SETOR: Record<SolicitacaoMock['status'], SetorOrigemDemanda> = {
  em_dados_basicos: 'dados_basicos',
  em_regulacao: 'regulacao',
  em_passagens: 'passagens',
  em_ajuda_custo: 'ajuda_custo',
  em_acompanhamento: 'acompanhamento',
  em_aprovacao: 'aprovacao',
  em_encerramento: 'acompanhamento',
};

interface Props {
  open: boolean;
  onClose: () => void;
  s: SolicitacaoMock;
  onCriada?: () => void;
}

/**
 * Abre uma demanda paralela de Serviço Social a partir da solicitação. Não
 * altera o setor responsável nem a etapa atual do fluxo principal, e uma
 * mesma solicitação pode ter várias demandas ao longo do tempo.
 */
export default function EncaminharServicoSocialDrawer({ open, onClose, s, onCriada }: Props) {
  const { user } = usePermissions();
  const [motivo, setMotivo] = useState('');
  const [etapas, setEtapas] = useState<EtapaImpactada[]>([]);

  function reset() {
    setMotivo('');
    setEtapas([]);
  }

  function fechar() {
    reset();
    onClose();
  }

  function toggleEtapa(e: EtapaImpactada) {
    setEtapas((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  function encaminhar() {
    if (!motivo.trim()) return;
    abrirDemanda({
      solicitacaoId: s.id,
      solicitacaoNumero: s.numero,
      pacienteNome: s.paciente.nome,
      pacienteCpf: s.paciente.cpf,
      motivo,
      etapasImpactadas: etapas,
      setorOrigem: STATUS_PARA_SETOR[s.status] ?? 'dados_basicos',
      encaminhadoPor: user?.nome_completo ?? 'Você',
    });
    reset();
    onCriada?.();
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={fechar}
      title="Encaminhar ao Serviço Social"
      subtitle="A demanda corre em paralelo. O setor e a etapa da solicitação continuam como estão."
      width="min(560px, 95vw)"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={fechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            disabled={!motivo.trim()}
            onClick={encaminhar}
          >
            Encaminhar
          </button>
        </>
      }
    >
      <FormSection
        title="Motivo do encaminhamento"
        icon={<HeartHandshake size={12} />}
        hint="Obrigatório. Descreva o que a equipe social precisa avaliar."
      >
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={5}
          placeholder="Ex.: paciente relata não ter onde ficar durante o tratamento e não tem familiar na cidade de destino."
          className="w-full text-[13px] px-3 py-2 outline-none resize-y"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#1A1D2B',
          }}
        />
      </FormSection>

      <FormSection
        title="Etapas potencialmente impactadas"
        icon={<AlertTriangle size={12} />}
        hint="Opcional. Pode marcar mais de uma."
      >
        <div className="flex flex-col gap-1.5">
          {ETAPAS_IMPACTADAS.map((e) => {
            const marcada = etapas.includes(e);
            return (
              <label
                key={e}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-[13px] transition-colors"
                style={{
                  background: marcada ? '#FFF7ED' : '#F8FAFC',
                  border: `1px solid ${marcada ? '#FDBA74' : '#E2E8F0'}`,
                  borderRadius: 6,
                  color: '#1A1D2B',
                }}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => toggleEtapa(e)}
                  className="shrink-0"
                />
                <span>{ETAPA_IMPACTADA_LABEL[e]}</span>
              </label>
            );
          })}
        </div>

        <p className="text-[12px] mt-2.5 leading-relaxed" style={{ color: '#92400E' }}>
          Marcar uma etapa apenas exibe um alerta para o setor responsável. Nada é
          bloqueado: o setor decide se aguarda a análise social antes de prosseguir.
        </p>
      </FormSection>

      <p className="text-[12px] px-1" style={{ color: '#94A3B8' }}>
        Quem encaminhou e a data e hora do encaminhamento são registrados
        automaticamente.
      </p>
    </Drawer>
  );
}
