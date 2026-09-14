'use client';

import { useEffect, useRef, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import SnapshotPaciente, { snapshotFromSolicitacao } from '../SnapshotPaciente';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { useToast } from '@/shared/components/toast/Toast';
import { abrirDemanda } from '../../_state/servicoSocialStore';
import { setorAtual } from '../../_utils/lock';
import type { SetorOrigemDemanda } from '@/core/mocks/servico-social-seed';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

const SETOR_ORIGEM: Record<string, SetorOrigemDemanda> = {
  dados_basicos: 'dados_basicos',
  regulacao: 'regulacao',
  passagens: 'passagens',
  ajuda_custo: 'ajuda_custo',
  acompanhamento: 'acompanhamento',
  aprovacao: 'aprovacao',
  encerramento: 'acompanhamento',
};

interface Props {
  open: boolean;
  onClose: () => void;
  s: SolicitacaoMock;
}

/**
 * Abertura de uma demanda social. Não é tramitação nem encaminhamento de
 * setor: é um pedido de análise à equipe do Serviço Social, aberto por
 * qualquer setor que tenha acesso à solicitação. A solicitação continua
 * exatamente onde está, sem trava e sem mudar de etapa, e o pedido fica
 * visível para todo mundo, com um alerta ao lado do número, até ser concluído
 * ou cancelado pela equipe social.
 */
export default function NovaDemandaSocialDrawer({ open, onClose, s }: Props) {
  const { user } = usePermissions();
  const toast = useToast();
  const [motivo, setMotivo] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMotivo('');
      setTimeout(() => ref.current?.focus(), 100);
    }
  }, [open]);

  function abrir() {
    if (!motivo.trim()) {
      toast.error('Campo obrigatório', 'Descreva o que a equipe social precisa avaliar.');
      return;
    }
    abrirDemanda({
      solicitacaoId: s.id,
      solicitacaoNumero: s.numero,
      pacienteNome: s.paciente.nome,
      pacienteCpf: s.paciente.cpf,
      motivo,
      setorOrigem: SETOR_ORIGEM[setorAtual(s)] ?? 'dados_basicos',
      encaminhadoPor: user?.nome_completo ?? 'Você',
    });
    toast.success(
      'Demanda social aberta',
      'A equipe do Serviço Social recebeu o pedido. A solicitação continua no setor atual.',
    );
    setMotivo('');
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova demanda social"
      subtitle="Pedido de análise à equipe do Serviço Social. A solicitação continua onde está e segue o fluxo normalmente."
      width="480px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            disabled={!motivo.trim()}
            onClick={abrir}
          >
            <HeartHandshake size={14} /> Abrir demanda social
          </button>
        </>
      }
    >
      <SnapshotPaciente data={snapshotFromSolicitacao(s)} />

      <label
        className="block text-[12px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: '#6B7280' }}
      >
        O que precisa ser avaliado <span style={{ color: 'var(--tfd-status-danger)' }}>*</span>
      </label>
      <textarea
        ref={ref}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={6}
        placeholder="Ex.: paciente relata não ter onde ficar durante o tratamento e não tem familiar na cidade de destino."
        className="w-full px-3 py-2 text-[13px]"
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8,
        }}
      />
      <p className="text-[11px] mt-1 mb-5" style={{ color: '#9CA3AF' }}>
        Quem abriu, o setor de origem e a data e hora são registrados
        automaticamente.
      </p>

      <div
        className="px-3 py-2.5 text-[12px] leading-relaxed"
        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, color: '#475569' }}
      >
        A demanda entra na fila do Serviço Social sem responsável; quem for
        assumi-la escolhe a profissional naquele momento. Enquanto estiver
        aberta, um alerta aparece ao lado do número da solicitação em todas as
        telas, inclusive depois de ela ser tramitada para outro setor.
      </div>
    </Drawer>
  );
}
