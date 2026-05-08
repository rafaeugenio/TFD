'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@/shared/components/drawer/Drawer';
import IdadeBadge from '@/shared/components/idade-badge';
import { Paperclip, Trash2, AlertTriangle } from 'lucide-react';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { acompanhantesPool, pacientesPool } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';

interface Props { open: boolean; onClose: () => void }

export default function NewSolicitacaoDrawer({ open, onClose }: Props) {
  const { createSolicitacao } = useFluxoV2State();
  const router = useRouter();

  const [pacienteId, setPacienteId] = useState('');
  const [acompanhanteIds, setAcompanhanteIds] = useState<string[]>([]);
  const [agendamentoEnabled, setAgendamentoEnabled] = useState(false);
  const [unidade, setUnidade] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [dataLaudo, setDataLaudo] = useState('');
  const [anexos, setAnexos] = useState<{ nome: string; tipo: string }[]>([]);
  const [novoAnexoNome, setNovoAnexoNome] = useState('');

  const paciente = pacientesPool.find((p) => p.id === pacienteId);
  const idade = paciente ? calcularIdade(paciente.dataNascimento) : 0;
  const isMenor = paciente && idade < 18;

  const acompanhantesAdultos = useMemo(
    () => acompanhantesPool.filter((a) => acompanhanteIds.includes(a.id) && calcularIdade(a.dataNascimento) >= 18),
    [acompanhanteIds],
  );
  const validacaoMenor = isMenor && acompanhantesAdultos.length === 0;

  const podeSalvar = !!paciente && !validacaoMenor && (!agendamentoEnabled || (unidade && data && hora));

  function reset() {
    setPacienteId('');
    setAcompanhanteIds([]);
    setAgendamentoEnabled(false);
    setUnidade(''); setData(''); setHora('');
    setDataLaudo('');
    setAnexos([]);
    setNovoAnexoNome('');
  }

  function handleSalvar() {
    if (!paciente) return;
    const id = createSolicitacao({
      pacienteId: paciente.id,
      acompanhanteIds,
      agendamento: agendamentoEnabled ? { unidade, data, hora } : undefined,
      dataLaudo: dataLaudo || undefined,
      anexos,
    });
    reset();
    onClose();
    router.push(`/fluxo-v2/solicitacoes/${id}`);
  }

  return (
    <Drawer
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Nova solicitação"
      subtitle="Crie uma solicitação a partir de um paciente cadastrado."
      width="560px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => { reset(); onClose(); }}>
            Cancelar
          </button>
          <button type="button" className="tfd-btn tfd-btn-primary" disabled={!podeSalvar} onClick={handleSalvar}>
            Salvar e abrir
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Paciente */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Paciente
          </h3>
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
          >
            <option value="">Selecione um paciente...</option>
            {pacientesPool.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} — {p.cpf}</option>
            ))}
          </select>
          {paciente && (
            <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: '#475569' }}>
              <IdadeBadge dataNascimento={paciente.dataNascimento} />
              <span>{paciente.municipio}</span>
            </div>
          )}
        </section>

        {/* Acompanhantes */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Acompanhantes
          </h3>
          <div className="flex flex-col gap-1.5">
            {acompanhantesPool.map((a) => {
              const checked = acompanhanteIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    border: '1px solid ' + (checked ? 'var(--tfd-blue)' : 'var(--tfd-surface-border)'),
                    background: checked ? '#EBF0FF' : 'white',
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setAcompanhanteIds((prev) =>
                        e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id),
                      );
                    }}
                  />
                  <span className="text-[13px] font-medium" style={{ color: '#1A1D2B' }}>{a.nome}</span>
                  <IdadeBadge dataNascimento={a.dataNascimento} />
                  <span className="text-[11px] ml-auto" style={{ color: '#6B7280' }}>{a.vinculo}</span>
                </label>
              );
            })}
          </div>
          {validacaoMenor && (
            <div
              className="mt-2 flex items-center gap-2 px-3 py-2 text-[12px]"
              style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 8 }}
            >
              <AlertTriangle size={14} />
              Paciente menor de 18 anos exige ao menos um acompanhante adulto (≥ 18 anos).
            </div>
          )}
        </section>

        {/* Agendamento opcional */}
        <section>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agendamentoEnabled}
              onChange={(e) => setAgendamentoEnabled(e.target.checked)}
            />
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
              Agendamento já existe
            </span>
          </label>
          <p className="text-[11px] mb-2" style={{ color: '#9CA3AF' }}>
            Se preenchido, a solicitação pula o agendamento de exceção e segue direto para o financeiro após deferimento.
          </p>
          {agendamentoEnabled && (
            <div className="grid grid-cols-2 gap-2">
              <input
                value={unidade} onChange={(e) => setUnidade(e.target.value)}
                placeholder="Unidade de saúde"
                className="col-span-2 px-3 py-2 text-[13px]"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
              <input
                type="date" value={data} onChange={(e) => setData(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
              <input
                type="time" value={hora} onChange={(e) => setHora(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
            </div>
          )}
        </section>

        {/* Data laudo */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Data do laudo
          </h3>
          <input
            type="date" value={dataLaudo} onChange={(e) => setDataLaudo(e.target.value)}
            className="px-3 py-2 text-[13px]"
            style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
          />
        </section>

        {/* Anexos */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Anexos
          </h3>
          <div className="flex gap-2 mb-2">
            <input
              value={novoAnexoNome} onChange={(e) => setNovoAnexoNome(e.target.value)}
              placeholder="Nome do arquivo (ex.: laudo.pdf)"
              className="flex-1 px-3 py-2 text-[13px]"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
              disabled={!novoAnexoNome.trim()}
              onClick={() => {
                setAnexos((prev) => [...prev, { nome: novoAnexoNome.trim(), tipo: 'application/octet-stream' }]);
                setNovoAnexoNome('');
              }}
            >
              <Paperclip size={14} /> Anexar
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {anexos.map((a, idx) => (
              <li key={idx} className="flex items-center gap-2 px-3 py-1.5 text-[12px]"
                style={{ background: '#F8FAFC', borderRadius: 6 }}>
                <Paperclip size={12} style={{ color: '#6B7280' }} />
                <span className="flex-1 truncate" style={{ color: '#1A1D2B' }}>{a.nome}</span>
                <button
                  type="button"
                  onClick={() => setAnexos((prev) => prev.filter((_, i) => i !== idx))}
                  className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
                  aria-label="Remover"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}
