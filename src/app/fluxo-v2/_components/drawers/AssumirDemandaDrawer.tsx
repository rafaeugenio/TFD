'use client';

import { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { useToast } from '@/shared/components/toast/Toast';
import { assumirDemanda } from '../../_state/servicoSocialStore';
import { useProfissionaisServicoSocial } from '../../_state/useProfissionaisServicoSocial';
import {
  SETOR_ORIGEM_LABEL,
  type DemandaSocialMock,
} from '@/core/mocks/servico-social-seed';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda: DemandaSocialMock;
}

/**
 * Assumir uma demanda social. É aqui que o responsável pela demanda é
 * definido: quem pega escolhe a profissional que vai responder por ela, e a
 * escolha fica salva na demanda e passa a aparecer na fila. Não existe
 * responsável antes disso, porque abrir a demanda não move a solicitação de
 * setor nem transfere responsabilidade do fluxo.
 */
export default function AssumirDemandaDrawer({ open, onClose, demanda }: Props) {
  const toast = useToast();

  /** Usuários com o perfil "Serviço Social" (PBI 16409, RN09). */
  const { profissionais, isLoading, erro, demonstracao } = useProfissionaisServicoSocial(open);
  const opcoes = profissionais.map((p) => p.nome);

  const [profissional, setProfissional] = useState('');

  useEffect(() => {
    if (!open) return;
    const atual = demanda.profissionalResponsavel;
    setProfissional(atual && opcoes.includes(atual) ? atual : opcoes[0] ?? '');
    // `opcoes` muda de identidade a cada render; a chave estável é a lista de nomes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, demanda.profissionalResponsavel, opcoes.join('|')]);

  function confirmar() {
    if (!profissional) return;
    assumirDemanda(demanda.id, profissional);
    toast.success('Demanda assumida', `Responsável: ${profissional}.`);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Assumir demanda"
      subtitle={`${demanda.solicitacaoNumero} · ${demanda.pacienteNome}`}
      width="440px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            disabled={!profissional}
            onClick={confirmar}
          >
            <UserCheck size={14} /> Assumir demanda
          </button>
        </>
      }
    >
      <div
        className="px-3 py-2.5 mb-4 text-[12.5px] leading-relaxed"
        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, color: '#475569' }}
      >
        Aberta por <strong style={{ color: '#1E293B' }}>{demanda.encaminhadoPor}</strong>
        {' · '}
        {SETOR_ORIGEM_LABEL[demanda.setorOrigem]}
        {' · '}
        {new Date(demanda.dataEncaminhamento).toLocaleDateString('pt-BR')}
      </div>

      <FormSection
        title="Profissional responsável"
        icon={<UserCheck size={12} />}
        hint="Quem responde por esta demanda a partir de agora."
      >
        <select
          value={profissional}
          onChange={(e) => setProfissional(e.target.value)}
          disabled={isLoading || opcoes.length === 0}
          aria-label="Profissional responsável"
          className="w-full text-[13px] px-3 outline-none"
          style={{
            height: 38,
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#1A1D2B',
          }}
        >
          {isLoading && <option value="">Carregando profissionais...</option>}
          {!isLoading && opcoes.length === 0 && <option value="">Nenhuma profissional disponível</option>}
          {opcoes.map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
        {erro && (
          <p className="text-[12px] mt-1.5" role="alert" style={{ color: 'var(--tfd-status-danger)' }}>
            {erro} Feche e abra o drawer para tentar de novo.
          </p>
        )}
        {demonstracao && (
          <p className="text-[12px] mt-1.5" style={{ color: '#94A3B8' }}>
            Nomes de demonstração: ainda não há usuário com o perfil Serviço Social.
          </p>
        )}
      </FormSection>

      <p className="text-[12px] px-1" style={{ color: '#94A3B8' }}>
        A demanda passa para <strong style={{ color: '#475569' }}>Em atendimento</strong> e o
        nome escolhido aparece como responsável na fila do Serviço Social. A
        solicitação continua no setor em que está.
      </p>
    </Drawer>
  );
}
