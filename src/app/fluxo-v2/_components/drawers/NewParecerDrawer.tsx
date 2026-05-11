'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import Autocomplete, { type AutocompleteOption } from '@/shared/components/autocomplete/Autocomplete';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { templatesParecer, aplicarPlaceholders } from '../../_data/templates-parecer';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import { buscarCid10 } from '@/services/cid10.service';
import { buscarCid11 } from '@/services/cid11.service';
import type { DecisaoParecer, ParecerMock, TipoParecer } from '@/core/mocks/fluxo-v2-v3-seed';
import { TIPO_PARECER_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  /** Quando informado, drawer mostra um header secundário com infos do paciente. */
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição. */
  editar?: ParecerMock;
}

export default function NewParecerDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addParecer, editarParecer, getById } = useFluxoV2State();
  const solicitacao = getById(solicitacaoId);
  const isEdicao = !!editar;

  const [decisao, setDecisao] = useState<DecisaoParecer>('deferido');
  const [tipo, setTipo] = useState<TipoParecer>('tfd_completo');
  const [cidPrincipal, setCidPrincipal] = useState('');
  const [cidSecundario, setCidSecundario] = useState('');
  const [versaoCID, setVersaoCID] = useState<'10' | '11'>('10');
  const [obs, setObs] = useState('');
  const [medico, setMedico] = useState('Dr. Ricardo Mello');

  useEffect(() => {
    if (open) {
      if (editar) {
        setDecisao(editar.decisao);
        setTipo(editar.tipo ?? 'tfd_completo');
        setCidPrincipal(editar.cidPrincipal ?? '');
        setCidSecundario(editar.cidSecundario ?? '');
        setVersaoCID(editar.versaoCID ?? '10');
        setObs(editar.observacao ?? '');
        setMedico(editar.medico);
      } else {
        setDecisao('deferido');
        setTipo('tfd_completo');
        setCidPrincipal('');
        setCidSecundario('');
        setVersaoCID('10');
        setObs('');
      }
    }
  }, [open, editar]);

  /**
   * Template é único para cada combinação de tipo + decisão.
   * Pegamos o primeiro disponível — se houver mais de um, vence o primeiro
   * registrado no array. Se não houver, o botão fica desabilitado.
   */
  const templateAtual = templatesParecer.find(
    (t) => t.tipo === tipo && t.decisao === decisao,
  );

  function aplicarModelo() {
    if (!templateAtual) return;
    const textoFinal = solicitacao
      ? aplicarPlaceholders(templateAtual.texto, solicitacao, templateAtual.tipo)
      : templateAtual.texto;
    setObs(textoFinal);
  }

  /* Search handlers para autocomplete dos CIDs — depende da versão selecionada */
  const cidSearch = useCallback(
    async (q: string): Promise<AutocompleteOption[]> => {
      if (!q.trim()) return [];
      const fn = versaoCID === '11' ? buscarCid11 : buscarCid10;
      const { data } = await fn(q);
      const rows = (data ?? []) as { codigo: string; descricao: string }[];
      return rows.map((r) => ({
        value: r.codigo,
        label: r.codigo,
        descricao: r.descricao,
      }));
    },
    [versaoCID],
  );

  const renderCidOption = (item: AutocompleteOption) => (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[12px] font-semibold" style={{ color: '#146BFA' }}>
        {item.value}
      </span>
      <span className="text-[12px]" style={{ color: '#475569' }}>
        {item.descricao as string}
      </span>
    </div>
  );

  function handleSalvar() {
    const payload = {
      decisao,
      tipo,
      cidPrincipal: cidPrincipal || undefined,
      cidSecundario: cidSecundario || undefined,
      versaoCID,
      observacao: obs || undefined,
      medico,
    };
    if (isEdicao && editar) {
      editarParecer(solicitacaoId, editar.id, payload);
    } else {
      addParecer(solicitacaoId, payload);
    }
    onClose();
  }

  // T2.AH — Cores específicas por decisão para destaque visual.
  const DEC_VISUAL: Record<DecisaoParecer, { borda: string; bg: string; fg: string; label: string }> = {
    deferido: { borda: '#15803D', bg: '#DCFCE7', fg: '#15803D', label: 'Deferido' },
    indeferido: { borda: '#B91C1C', bg: '#FEE2E2', fg: '#B91C1C', label: 'Indeferido' },
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar parecer médico' : 'Novo parecer médico'}
      subtitle="Decisão, CIDs e observações do médico regulador."
      width="560px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!medico.trim()}
          >
            {isEdicao ? 'Salvar alterações' : 'Salvar parecer'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}
      {/* T2.AH — Decisão (segmented control com 2 opções) */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Decisão
      </label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['deferido', 'indeferido'] as DecisaoParecer[]).map((d) => {
          const v = DEC_VISUAL[d];
          const ativo = decisao === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDecisao(d)}
              className="px-3 py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                border: '1px solid ' + (ativo ? v.borda : 'var(--tfd-surface-border)'),
                background: ativo ? v.bg : 'white',
                color: ativo ? v.fg : '#475569',
                borderRadius: 8,
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Tipo de parecer */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Tipo de parecer
      </label>
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoParecer)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        {(Object.keys(TIPO_PARECER_LABEL) as TipoParecer[]).map((t) => (
          <option key={t} value={t}>
            {TIPO_PARECER_LABEL[t]}
          </option>
        ))}
      </select>

      {/* Template — único botão de ação direta */}
      <div className="mb-4">
        <button
          type="button"
          onClick={aplicarModelo}
          disabled={!templateAtual}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: templateAtual ? '#475569' : '#CBD5E1',
            cursor: templateAtual ? 'pointer' : 'not-allowed',
          }}
          title={
            templateAtual
              ? 'Preencher a observação com o modelo padrão para esta combinação.'
              : 'Nenhum modelo padrão para esta combinação de tipo e decisão.'
          }
        >
          <Sparkles size={13} style={{ color: templateAtual ? 'var(--tfd-blue)' : '#CBD5E1' }} />
          Inserir modelo
        </button>
      </div>

      {/* T2.AI — Versão CID (pills) */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Versão CID
      </label>
      <div
        className="inline-flex items-center gap-0 mb-4 p-0.5"
        style={{
          background: '#F1F5F9',
          borderRadius: 999,
        }}
      >
        {(['10', '11'] as const).map((v) => {
          const ativo = versaoCID === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVersaoCID(v)}
              className="px-3 py-1 text-[12px] font-semibold transition-colors"
              style={{
                background: ativo ? 'white' : 'transparent',
                color: ativo ? '#1A1D2B' : '#64748B',
                borderRadius: 999,
                boxShadow: ativo ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                minWidth: 64,
              }}
            >
              CID-{v}
            </button>
          );
        })}
      </div>

      {/* CIDs — autocomplete puxando da tabela CID-10 ou CID-11 */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        CIDs
      </label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <Autocomplete
            placeholder={`CID principal (CID-${versaoCID})`}
            value={cidPrincipal}
            onChange={(v) => setCidPrincipal(v)}
            onSearch={cidSearch}
            onSelect={(item) => setCidPrincipal(item.value)}
            renderOption={renderCidOption}
            size="sm"
          />
        </div>
        <div>
          <Autocomplete
            placeholder={`CID secundário (CID-${versaoCID})`}
            value={cidSecundario}
            onChange={(v) => setCidSecundario(v)}
            onSearch={cidSearch}
            onSelect={(item) => setCidSecundario(item.value)}
            renderOption={renderCidOption}
            size="sm"
          />
        </div>
      </div>

      {/* Observação */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Observação
      </label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={5}
        placeholder="Observações do parecer..."
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      />

      {/* Médico */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Médico responsável
      </label>
      <input
        value={medico}
        onChange={(e) => setMedico(e.target.value)}
        placeholder="Nome do médico"
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      />
    </Drawer>
  );
}
