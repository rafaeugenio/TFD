'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { useTiposProcedimento } from '@/shared/hooks/useTiposProcedimento';
import { listarUnidadesSaude } from '@/services/unidades-saude.service';
import AgendamentoProcedimentosField, {
  novaLinhaAgendamento,
  type AgendamentoLinha,
  type UnidadeAgendamentoRow,
} from '../AgendamentoProcedimentosField';
import { type TipoProcedimento } from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
}

/**
 * Cadastro de agendamento pela Regulação — mesmo formulário usado na criação
 * da solicitação: unidade de saúde de destino + lista de procedimentos
 * agendados (tipo + data), permitindo registrar vários agendamentos de uma
 * vez. Cada procedimento vira um agendamento confirmado próprio, separado do
 * histórico de tentativas de contato.
 */
export default function NewAgendamentoDrawer({ open, onClose, solicitacaoId }: Props) {
  const { addAgendamentos } = useFluxoV2State();
  const { tipos: tiposProcedimento, loading: loadingTiposProc } = useTiposProcedimento();
  const toast = useToast();

  const [unidadeId, setUnidadeId] = useState('');
  const [linhas, setLinhas] = useState<AgendamentoLinha[]>([novaLinhaAgendamento()]);
  const [unidades, setUnidades] = useState<UnidadeAgendamentoRow[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUnidades(true);
    listarUnidadesSaude({ pageSize: 9999 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[NewAgendamentoDrawer] erro ao carregar unidades:', error.message);
      setUnidades(((data ?? []) as unknown as UnidadeAgendamentoRow[]).filter((u) => u.nome));
      setLoadingUnidades(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setUnidadeId('');
      setLinhas([novaLinhaAgendamento()]);
    }
  }, [open]);

  // PBI 13124 — o agendamento do TFD é sempre em unidade fora do Maranhão.
  const unidadesAgendamento = useMemo(() => unidades.filter((u) => u.uf !== 'MA'), [unidades]);
  const unidadeSelecionada = unidadesAgendamento.find((u) => u.id === unidadeId);

  const linhasValidas = linhas.filter((l) => l.tipoProcedimento && l.data);
  const podeSalvar = !!unidadeId && linhasValidas.length > 0;

  function handleSalvar() {
    if (!unidadeSelecionada || linhasValidas.length === 0) return;
    const unidadeNome = `${unidadeSelecionada.nome}${
      unidadeSelecionada.cnes ? ` (CNES ${unidadeSelecionada.cnes})` : ''
    }`;
    addAgendamentos(solicitacaoId, {
      unidadeId: unidadeSelecionada.id,
      unidade: unidadeNome,
      procedimentos: linhasValidas.map((l) => ({
        tipoProcedimento: l.tipoProcedimento as TipoProcedimento,
        data: l.data,
      })),
    });
    toast.success(
      linhasValidas.length > 1 ? 'Agendamentos registrados' : 'Agendamento registrado',
      unidadeNome,
    );
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Adicionar agendamento"
      subtitle="Unidade de destino e procedimentos agendados — o mesmo formulário usado na criação da solicitação."
      width="540px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!podeSalvar}
          >
            Salvar agendamento{linhasValidas.length > 1 ? 's' : ''}
          </button>
        </>
      }
    >
      <FormSection title="Agendamento" icon={<CalendarCheck size={12} />} tone="primary">
        <AgendamentoProcedimentosField
          unidadeId={unidadeId}
          onUnidadeIdChange={setUnidadeId}
          unidades={unidadesAgendamento}
          loadingUnidades={loadingUnidades}
          linhas={linhas}
          onLinhasChange={setLinhas}
          tiposProcedimento={tiposProcedimento}
          loadingTiposProc={loadingTiposProc}
        />
      </FormSection>
    </Drawer>
  );
}
