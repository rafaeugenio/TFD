'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@/shared/components/drawer/Drawer';
import IdadeBadge from '@/shared/components/idade-badge';
import { Paperclip, Trash2, AlertTriangle, Upload } from 'lucide-react';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { acompanhantesPool, pacientesPool } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';

interface Props { open: boolean; onClose: () => void }

export default function NewSolicitacaoDrawer({ open, onClose }: Props) {
  const { createSolicitacao } = useFluxoV2State();
  const router = useRouter();

  const [pacienteId, setPacienteId] = useState('');
  const [acompanhanteIds, setAcompanhanteIds] = useState<string[]>([]);
  const [semAgendamento, setSemAgendamento] = useState(false);
  const [unidade, setUnidade] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [dataLaudo, setDataLaudo] = useState('');
  const [numeroSEI, setNumeroSEI] = useState('');
  const [seiUrl, setSeiUrl] = useState('');
  const [anexos, setAnexos] = useState<{ nome: string; tipo: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const seiUrlInvalido = seiUrl.trim().length > 0 && !/^https?:\/\//i.test(seiUrl.trim());

  const paciente = pacientesPool.find((p) => p.id === pacienteId);
  const idade = paciente ? calcularIdade(paciente.dataNascimento) : 0;
  const isMenor = paciente && idade < 18;

  const acompanhantesAdultos = useMemo(
    () => acompanhantesPool.filter((a) => acompanhanteIds.includes(a.id) && calcularIdade(a.dataNascimento) >= 18),
    [acompanhanteIds],
  );
  const validacaoMenor = isMenor && acompanhantesAdultos.length === 0;

  const podeSalvar = !!paciente && !validacaoMenor && !seiUrlInvalido && (semAgendamento || (unidade && data && hora));

  function reset() {
    setPacienteId('');
    setAcompanhanteIds([]);
    setSemAgendamento(false);
    setUnidade(''); setData(''); setHora('');
    setDataLaudo('');
    setNumeroSEI(''); setSeiUrl('');
    setAnexos([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSalvar() {
    if (!paciente) return;
    const id = createSolicitacao({
      pacienteId: paciente.id,
      acompanhanteIds,
      agendamento: !semAgendamento ? { unidade, data, hora } : undefined,
      dataLaudo: dataLaudo || undefined,
      numeroSEI: numeroSEI.trim() || undefined,
      seiUrl: seiUrl.trim() || undefined,
      anexos,
    });
    reset();
    onClose();
    router.push(`/fluxo-v2/solicitacoes/${id}`);
  }

  function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos = Array.from(files).map((f) => ({
      nome: f.name,
      tipo: f.type || 'application/octet-stream',
    }));
    setAnexos((prev) => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

        {/* Agendamento — exibido por padrão (caso normal) */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Agendamento
          </h3>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={semAgendamento}
              onChange={(e) => setSemAgendamento(e.target.checked)}
            />
            <span className="text-[13px]" style={{ color: '#475569' }}>
              Solicitação <strong>sem agendamento</strong> (caso de exceção)
            </span>
          </label>
          <p className="text-[11px] mb-3" style={{ color: '#9CA3AF' }}>
            Marque apenas quando o paciente ainda não tem unidade/data definidas — o caso seguirá para a Regulação registrar o agendamento posteriormente (CNRAC, CET ou Outros).
          </p>
          {!semAgendamento && (
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

        {/* Processo SEI */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Processo SEI <span className="font-normal normal-case" style={{ color: '#94A3B8' }}>(opcional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={numeroSEI}
              onChange={(e) => setNumeroSEI(e.target.value)}
              placeholder="Número SEI (ex.: 00100.000456/2026-12)"
              className="px-3 py-2 text-[13px] font-mono"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <input
              value={seiUrl}
              onChange={(e) => setSeiUrl(e.target.value)}
              placeholder="URL do processo (https://...)"
              className="px-3 py-2 text-[13px]"
              style={{
                background: 'white',
                border: `1px solid ${seiUrlInvalido ? '#FCA5A5' : 'var(--tfd-surface-border)'}`,
                borderRadius: 8,
              }}
            />
          </div>
          {seiUrlInvalido && (
            <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
              URL inválida — comece com http:// ou https://
            </p>
          )}
        </section>

        {/* Anexos */}
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Documentos anexos <span className="font-normal normal-case" style={{ color: '#94A3B8' }}>(opcional, múltiplos arquivos)</span>
          </h3>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFilesPicked(e.target.files)}
            className="hidden"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-1 py-5 transition-colors"
            style={{
              background: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: 8,
              color: '#475569',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#146BFA'; e.currentTarget.style.background = '#EFF6FF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
          >
            <Upload size={16} />
            <span className="text-[13px] font-medium">Selecionar arquivos</span>
            <span className="text-[11px]" style={{ color: '#94A3B8' }}>
              Selecione um ou mais arquivos. Pode adicionar mais depois.
            </span>
          </button>

          {anexos.length > 0 && (
            <ul className="flex flex-col gap-1 mt-3">
              {anexos.map((a, idx) => (
                <li key={idx} className="flex items-center gap-2 px-3 py-2 text-[13px]"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                  <Paperclip size={13} style={{ color: '#64748B' }} />
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
          )}
        </section>
      </div>
    </Drawer>
  );
}
