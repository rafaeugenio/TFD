'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Paperclip, Trash2, UserCog, UserRound } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import IdadeBadge from '@/shared/components/idade-badge';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import {
  acompanhantesPool,
  pacientesPool,
  type SolicitacaoMock,
  type AnexoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacao: SolicitacaoMock;
  snapshotPaciente?: SnapshotPacienteData;
}

type TabKey = 'paciente' | 'trocar';

/**
 * Drawer de edição rápida da solicitação. Duas abas:
 *
 * - **Paciente** (default): dados do paciente atual em read-only + edição dos
 *   campos da solicitação (acompanhantes, data do laudo, caráter, anexos).
 *
 * - **Trocar Paciente**: substitui o paciente da solicitação. Operação
 *   destrutiva — reseta acompanhantes e anexos selecionados, pois eles eram
 *   vinculados ao paciente anterior.
 */
export default function NewEditarSolicitacaoDrawer({
  open,
  onClose,
  solicitacao,
  snapshotPaciente,
}: Props) {
  const { editarSolicitacao, trocarPaciente } = useFluxoV2State();
  const [tab, setTab] = useState<TabKey>('paciente');

  /* ── Aba Paciente — estado ─────────────────────────────────────────── */
  const [acompIds, setAcompIds] = useState<string[]>([]);
  const [dataLaudo, setDataLaudo] = useState('');
  const [anexos, setAnexos] = useState<AnexoMock[]>([]);
  // T2.AG — Processo SEI
  const [numeroSEI, setNumeroSEI] = useState('');
  const [seiUrl, setSeiUrl] = useState('');

  /* ── Aba Trocar Paciente — estado ──────────────────────────────────── */
  const [novoPacienteId, setNovoPacienteId] = useState<string>('');
  const [trocaAcompIds, setTrocaAcompIds] = useState<string[]>([]);
  const [trocaAnexos, setTrocaAnexos] = useState<{ id: string; nome: string; tipo: string }[]>([]);

  useEffect(() => {
    if (open) {
      setTab('paciente');
      setAcompIds(solicitacao.acompanhantes.map((a) => a.id));
      setDataLaudo(solicitacao.dataLaudo ?? '');
      setAnexos(solicitacao.anexos.map((a) => ({ ...a })));
      setNumeroSEI(solicitacao.numeroSEI ?? '');
      setSeiUrl(solicitacao.seiUrl ?? '');
      setNovoPacienteId('');
      setTrocaAcompIds([]);
      setTrocaAnexos([]);
    }
  }, [open, solicitacao]);

  /* ── Aba Paciente — handlers ───────────────────────────────────────── */
  function toggleAcomp(id: string) {
    setAcompIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleAnexoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAnexos((prev) => [
        ...prev,
        { id: `an-${Date.now()}`, nome: file.name, tipo: file.type || 'application/octet-stream' },
      ]);
    }
    e.target.value = '';
  }

  function removerAnexo(id: string) {
    setAnexos((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSalvar() {
    editarSolicitacao(solicitacao.id, {
      acompanhanteIds: acompIds,
      dataLaudo: dataLaudo || undefined,
      anexos: anexos.map((a) => ({ id: a.id, nome: a.nome, tipo: a.tipo })),
      numeroSEI: numeroSEI.trim() || undefined,
      seiUrl: seiUrl.trim() || undefined,
    });
    onClose();
  }

  // Validação simples de URL (presença de http/https). Vazia é válida.
  const seiUrlInvalida = seiUrl.trim().length > 0 && !/^https?:\/\//i.test(seiUrl.trim());

  /* ── Aba Trocar Paciente — handlers ────────────────────────────────── */
  const pacientesDisponiveis = useMemo(
    () => pacientesPool.filter((p) => p.id !== solicitacao.paciente.id),
    [solicitacao.paciente.id],
  );
  const novoPaciente = useMemo(
    () => pacientesPool.find((p) => p.id === novoPacienteId) ?? null,
    [novoPacienteId],
  );

  function toggleTrocaAcomp(id: string) {
    setTrocaAcompIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleTrocaAnexoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setTrocaAnexos((prev) => [
        ...prev,
        { id: `an-${Date.now()}`, nome: file.name, tipo: file.type || 'application/octet-stream' },
      ]);
    }
    e.target.value = '';
  }

  function removerTrocaAnexo(id: string) {
    setTrocaAnexos((prev) => prev.filter((a) => a.id !== id));
  }

  function handleConfirmarTroca() {
    if (!novoPacienteId) return;
    trocarPaciente(
      solicitacao.id,
      novoPacienteId,
      trocaAcompIds,
      trocaAnexos.map((a) => ({ nome: a.nome, tipo: a.tipo })),
    );
    onClose();
  }

  /* ── Footer condicional por aba ────────────────────────────────────── */
  const footer =
    tab === 'paciente' ? (
      <>
        <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="tfd-btn tfd-btn-primary" onClick={handleSalvar}>
          Salvar alterações
        </button>
      </>
    ) : (
      <>
        <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="tfd-btn tfd-btn-primary"
          onClick={handleConfirmarTroca}
          disabled={!novoPacienteId}
          style={!novoPacienteId ? undefined : { background: '#B91C1C', borderColor: '#B91C1C' }}
        >
          Confirmar troca
        </button>
      </>
    );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Editar solicitação"
      subtitle={
        tab === 'paciente'
          ? 'Ajuste acompanhantes, data do laudo e anexos.'
          : 'Substitui o paciente desta solicitação.'
      }
      width="560px"
      footer={footer}
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      {/* Tabs internas */}
      <div
        className="flex items-center gap-1 mb-4 p-1"
        style={{
          background: '#F1F5F9',
          borderRadius: 10,
        }}
      >
        <TabButton
          active={tab === 'paciente'}
          onClick={() => setTab('paciente')}
          icon={<UserRound size={13} />}
          label="Paciente"
        />
        <TabButton
          active={tab === 'trocar'}
          onClick={() => setTab('trocar')}
          icon={<UserCog size={13} />}
          label="Trocar paciente"
        />
      </div>

      {tab === 'paciente' ? (
        <>
          {/* Paciente — read-only */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Paciente atual
          </label>
          <div
            className="flex flex-col gap-1.5 px-3 py-2.5 mb-4 text-[12px]"
            style={{ background: '#F8FAFC', borderRadius: 8, border: '1px dashed var(--tfd-surface-border)' }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: '#1A1D2B', fontWeight: 600, fontSize: 13 }}>
                {solicitacao.paciente.nome}
              </span>
              <IdadeBadge dataNascimento={solicitacao.paciente.dataNascimento} />
              <span className="font-mono ml-auto" style={{ color: '#94A3B8', fontSize: 11 }}>
                {solicitacao.paciente.cpf}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap" style={{ color: '#475569' }}>
              <span>
                <span style={{ color: '#94A3B8' }}>Sexo:</span>{' '}
                {solicitacao.paciente.sexo === 'F' ? 'Feminino' : 'Masculino'}
              </span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span>
                <span style={{ color: '#94A3B8' }}>Município:</span>{' '}
                {solicitacao.paciente.municipio}
              </span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span>
                <span style={{ color: '#94A3B8' }}>Regional:</span>{' '}
                {solicitacao.paciente.regional}
              </span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
              Pra trocar o paciente, use a aba <strong>Trocar paciente</strong>.
            </p>
          </div>

          {/* Data do laudo */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Data do laudo
          </label>
          <input
            type="date"
            value={dataLaudo}
            onChange={(e) => setDataLaudo(e.target.value)}
            className="w-full px-3 py-2 text-[13px] mb-4"
            style={inputStyle}
          />

          {/* Acompanhantes */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Acompanhantes
          </label>
          <div className="flex flex-col gap-1.5 mb-4">
            {acompanhantesPool.map((a) => {
              const checked = acompIds.includes(a.id);
              const idade = calcularIdade(a.dataNascimento);
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer"
                  style={{
                    background: checked ? '#EBF0FF' : 'white',
                    border: '1px solid ' + (checked ? '#C7DAFF' : 'var(--tfd-surface-border)'),
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAcomp(a.id)}
                    className="shrink-0"
                  />
                  <span style={{ color: '#1A1D2B', fontWeight: 500 }}>{a.nome}</span>
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>({a.vinculo} · {idade}a)</span>
                </label>
              );
            })}
          </div>

          {/* Anexos */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Anexos
          </label>
          {anexos.length > 0 && (
            <ul className="flex flex-col gap-1.5 mb-2">
              {anexos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 text-[12px]"
                  style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
                >
                  <Paperclip size={13} style={{ color: '#475569' }} />
                  <span className="flex-1 truncate" style={{ color: '#1A1D2B' }}>{a.nome}</span>
                  <button
                    type="button"
                    onClick={() => removerAnexo(a.id)}
                    className="inline-flex items-center justify-center"
                    style={{ color: '#9CA3AF' }}
                    aria-label="Remover anexo"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label
            className="flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer"
            style={{ background: 'white', border: '1px dashed var(--tfd-surface-border)', borderRadius: 8, color: '#6B7280' }}
          >
            <Paperclip size={14} />
            <span>Adicionar anexo</span>
            <input type="file" className="hidden" onChange={handleAnexoFile} />
          </label>
          <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
            Mock — arquivo não é realmente enviado.
          </p>

          {/* T2.AG — Processo SEI */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Número SEI
            </label>
            <input
              type="text"
              value={numeroSEI}
              onChange={(e) => setNumeroSEI(e.target.value)}
              placeholder="00000.000000/AAAA-DD"
              className="w-full px-3 py-2 text-[13px] font-mono mb-3"
              style={inputStyle}
            />

            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              URL do processo no SEI
            </label>
            <input
              type="url"
              value={seiUrl}
              onChange={(e) => setSeiUrl(e.target.value)}
              placeholder="https://sei.ses.ma.gov.br/processo/..."
              className="w-full px-3 py-2 text-[13px]"
              style={{
                ...inputStyle,
                borderColor: seiUrlInvalida ? '#FCA5A5' : 'var(--tfd-surface-border)',
              }}
            />
            {seiUrlInvalida && (
              <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
                URL inválida — deve começar com http:// ou https://
              </p>
            )}
            <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
              Quando preenchido, o número aparece como link no cabeçalho da solicitação.
            </p>
          </div>
        </>
      ) : (
        /* ── Aba Trocar Paciente ───────────────────────────────────── */
        <>
          {/* Banner de aviso */}
          <div
            className="flex items-start gap-2 px-3 py-2.5 mb-4"
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 8,
            }}
          >
            <AlertTriangle size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
            <div className="flex-1">
              <p className="text-[12.5px] font-semibold" style={{ color: '#92400E' }}>
                Atenção: trocar o paciente reseta acompanhantes e anexos selecionados.
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#78350F' }}>
                Pareceres, agendamento e movimentações financeiras são preservados —
                mas ficam vinculados ao novo paciente. Confirme com cuidado.
              </p>
            </div>
          </div>

          {/* Select novo paciente */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Novo paciente
          </label>
          <select
            value={novoPacienteId}
            onChange={(e) => {
              setNovoPacienteId(e.target.value);
              // ao trocar a seleção, limpa acompanhantes/anexos do novo (eles
              // são por sessão de troca — começam vazios)
              setTrocaAcompIds([]);
              setTrocaAnexos([]);
            }}
            className="w-full px-3 py-2 text-[13px] mb-4"
            style={inputStyle}
          >
            <option value="">— selecione —</option>
            {pacientesDisponiveis.map((p) => {
              const idade = calcularIdade(p.dataNascimento);
              return (
                <option key={p.id} value={p.id}>
                  {p.nome} · {idade}a · {p.cpf}
                </option>
              );
            })}
          </select>

          {/* Preview do novo paciente */}
          {novoPaciente && (
            <div
              className="flex flex-col gap-1.5 px-3 py-2.5 mb-4"
              style={{
                background: 'linear-gradient(180deg, #EBF0FF 0%, #F8FAFC 100%)',
                border: '1px solid #C7DAFF',
                borderRadius: 8,
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: '#1A1D2B', fontWeight: 600, fontSize: 13 }}>
                  {novoPaciente.nome}
                </span>
                <IdadeBadge dataNascimento={novoPaciente.dataNascimento} />
                <span className="font-mono ml-auto" style={{ color: '#94A3B8', fontSize: 11 }}>
                  {novoPaciente.cpf}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: '#475569' }}>
                <span>
                  <span style={{ color: '#94A3B8' }}>Sexo:</span>{' '}
                  {novoPaciente.sexo === 'F' ? 'Feminino' : 'Masculino'}
                </span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span>{novoPaciente.municipio}</span>
                <span style={{ color: '#CBD5E1' }}>·</span>
                <span>{novoPaciente.regional}</span>
              </div>
            </div>
          )}

          {/* Acompanhantes (vazio por default) */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Acompanhantes do novo paciente
          </label>
          <p className="text-[11px] mb-2" style={{ color: '#9CA3AF' }}>
            Comece sem nenhum — selecione os que se aplicam ao novo paciente.
          </p>
          <div className="flex flex-col gap-1.5 mb-4">
            {acompanhantesPool.map((a) => {
              const checked = trocaAcompIds.includes(a.id);
              const idade = calcularIdade(a.dataNascimento);
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer"
                  style={{
                    background: checked ? '#EBF0FF' : 'white',
                    border: '1px solid ' + (checked ? '#C7DAFF' : 'var(--tfd-surface-border)'),
                    borderRadius: 8,
                    opacity: novoPacienteId ? 1 : 0.55,
                    pointerEvents: novoPacienteId ? 'auto' : 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTrocaAcomp(a.id)}
                    className="shrink-0"
                    disabled={!novoPacienteId}
                  />
                  <span style={{ color: '#1A1D2B', fontWeight: 500 }}>{a.nome}</span>
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>({a.vinculo} · {idade}a)</span>
                </label>
              );
            })}
          </div>

          {/* Anexos (vazio por default) */}
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Novos anexos
          </label>
          {trocaAnexos.length > 0 && (
            <ul className="flex flex-col gap-1.5 mb-2">
              {trocaAnexos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 text-[12px]"
                  style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
                >
                  <Paperclip size={13} style={{ color: '#475569' }} />
                  <span className="flex-1 truncate" style={{ color: '#1A1D2B' }}>{a.nome}</span>
                  <button
                    type="button"
                    onClick={() => removerTrocaAnexo(a.id)}
                    className="inline-flex items-center justify-center"
                    style={{ color: '#9CA3AF' }}
                    aria-label="Remover anexo"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label
            className="flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer"
            style={{
              background: 'white',
              border: '1px dashed var(--tfd-surface-border)',
              borderRadius: 8,
              color: '#6B7280',
              opacity: novoPacienteId ? 1 : 0.55,
              pointerEvents: novoPacienteId ? 'auto' : 'none',
            }}
          >
            <Paperclip size={14} />
            <span>Adicionar anexo</span>
            <input
              type="file"
              className="hidden"
              onChange={handleTrocaAnexoFile}
              disabled={!novoPacienteId}
            />
          </label>
          <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
            Mock — arquivo não é realmente enviado.
          </p>
        </>
      )}
    </Drawer>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium transition-colors"
      style={{
        background: active ? 'white' : 'transparent',
        color: active ? '#1A1D2B' : '#64748B',
        borderRadius: 8,
        boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.06)' : 'none',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
