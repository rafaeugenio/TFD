'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserCheck } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { useToast } from '@/shared/components/toast/Toast';
import { assumirDemanda } from '../../_state/servicoSocialStore';
import {
  PROFISSIONAIS_SERVICO_SOCIAL,
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
  const { user } = usePermissions();
  const toast = useToast();

  /** As profissionais cadastradas mais quem está logado, para o protótipo
   *  funcionar com qualquer usuário na validação presencial. */
  const opcoes = useMemo(() => {
    const nomes = PROFISSIONAIS_SERVICO_SOCIAL.map((p) => p.nome);
    const eu = user?.nome_completo;
    return eu && !nomes.includes(eu) ? [...nomes, eu] : nomes;
  }, [user]);

  const [profissional, setProfissional] = useState(opcoes[0] ?? '');

  useEffect(() => {
    if (open) setProfissional(demanda.profissionalResponsavel ?? opcoes[0] ?? '');
  }, [open, demanda.profissionalResponsavel, opcoes]);

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
          className="w-full text-[13px] px-3 outline-none"
          style={{
            height: 38,
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#1A1D2B',
          }}
        >
          {opcoes.map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
      </FormSection>

      <p className="text-[12px] px-1" style={{ color: '#94A3B8' }}>
        A demanda passa para <strong style={{ color: '#475569' }}>Em atendimento</strong> e o
        nome escolhido aparece como responsável na fila do Serviço Social. A
        solicitação continua no setor em que está.
      </p>
    </Drawer>
  );
}
