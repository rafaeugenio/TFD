'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { ModalViagem, StatusViagem, ViagemMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { STATUS_VIAGEM_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';
import { listarRotas, criarRota } from '@/services/rotas-deslocamento.service';
import type { RotaDeslocamento } from '@/core/models';
import { createClient } from '@/lib/supabase/client';

interface CompanhiaRow {
  id: string;
  nome: string;
  tipo_modal: string;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

/**
 * Tipo do select. `'ida_e_volta'` é virtual: ao salvar, o provider expande
 * em duas ViagemMock independentes (T2.X). Os outros três persistem 1:1.
 */
type TipoOpcao = 'ida' | 'volta' | 'transfer' | 'ida_e_volta';

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição (sem opção de "ida e volta"). */
  editar?: ViagemMock;
}

export default function NewPassagemDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar }: Props) {
  const { addViagem, addViagensIdaEVolta, editarViagem, getById } = useFluxoV2State();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [data, setData] = useState('');
  const [dataVolta, setDataVolta] = useState('');
  const [modal, setModal] = useState<ModalViagem>('aereo');
  const [tipo, setTipo] = useState<TipoOpcao>('ida');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState<StatusViagem>('agendada');
  // T2.AF — Beneficiário. Valor "p" = paciente; "a:<id>" = acompanhante.
  const [beneficiario, setBeneficiario] = useState<string>('p');

  // Companhia de transporte
  const [companhias, setCompanhias] = useState<CompanhiaRow[]>([]);
  const [companhiaId, setCompanhiaId] = useState('');

  // Rotas (origem/destino vêm de rotas_deslocamento)
  const [rotas, setRotas] = useState<RotaDeslocamento[]>([]);
  const [rotaId, setRotaId] = useState<string>('');
  const [loadingRotas, setLoadingRotas] = useState(false);
  const [novaRotaOpen, setNovaRotaOpen] = useState(false);
  const [novaRotaOrigemCidade, setNovaRotaOrigemCidade] = useState('');
  const [novaRotaOrigemUf, setNovaRotaOrigemUf] = useState('MA');
  const [novaRotaDestinoCidade, setNovaRotaDestinoCidade] = useState('');
  const [novaRotaDestinoUf, setNovaRotaDestinoUf] = useState('');
  const [savingRota, setSavingRota] = useState(false);

  const carregarRotas = async () => {
    setLoadingRotas(true);
    const { data, error } = await listarRotas({ pageSize: 9999 });
    if (error) console.warn('[NewPassagemDrawer] rotas:', error.message);
    setRotas((data ?? []) as unknown as RotaDeslocamento[]);
    setLoadingRotas(false);
  };

  useEffect(() => {
    if (!open) return;
    carregarRotas();
    // Companhias filtradas pelo modal selecionado
    const supabase = createClient();
    supabase
      .from('companhias_transporte')
      .select('id, nome, tipo_modal')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.warn('[NewPassagemDrawer] companhias:', error.message);
          return;
        }
        setCompanhias((data ?? []) as unknown as CompanhiaRow[]);
      });
  }, [open]);

  // Lista todas as companhias, ordenadas pelo modal selecionado primeiro
  const companhiasDoModal = useMemo(() => {
    const modalUp = modal.toUpperCase();
    return [...companhias].sort((a, b) => {
      const aMatch = a.tipo_modal === modalUp ? 0 : 1;
      const bMatch = b.tipo_modal === modalUp ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [companhias, modal]);

  const MODAL_PT: Record<string, string> = {
    AEREO: 'Aéreo',
    TERRESTRE: 'Terrestre',
    FLUVIAL: 'Fluvial',
  };

  function sincronizarOrigemDestino(rid: string) {
    setRotaId(rid);
    const r = rotas.find((x) => String(x.id) === rid);
    if (r) {
      setOrigem(`${r.cidade_origem} - ${r.uf_origem}`);
      setDestino(`${r.cidade_destino} - ${r.uf_destino}`);
    } else {
      setOrigem('');
      setDestino('');
    }
  }

  async function salvarNovaRota() {
    if (!novaRotaOrigemCidade.trim() || !novaRotaOrigemUf.trim() || !novaRotaDestinoCidade.trim() || !novaRotaDestinoUf.trim()) return;
    setSavingRota(true);
    const { data: criada, error } = await criarRota({
      cidade_origem: novaRotaOrigemCidade.trim(),
      uf_origem: novaRotaOrigemUf.trim().toUpperCase(),
      cidade_destino: novaRotaDestinoCidade.trim(),
      uf_destino: novaRotaDestinoUf.trim().toUpperCase(),
    });
    setSavingRota(false);
    if (error) {
      console.warn('[NewPassagemDrawer] erro ao criar rota:', error.message);
      return;
    }
    if (criada) {
      const nova = criada as unknown as RotaDeslocamento;
      setRotas((prev) => [...prev, nova]);
      sincronizarOrigemDestino(String(nova.id));
    }
    setNovaRotaOpen(false);
    setNovaRotaOrigemCidade('');
    setNovaRotaOrigemUf('MA');
    setNovaRotaDestinoCidade('');
    setNovaRotaDestinoUf('');
  }

  useEffect(() => {
    if (open) {
      if (editar) {
        setOrigem(editar.origem);
        setDestino(editar.destino);
        setData(editar.data);
        setDataVolta('');
        setModal(editar.modal);
        setTipo(editar.tipo);
        setValor(String(editar.valor));
        setStatus(editar.status);
        setBeneficiario(
          editar.beneficiarioTipo === 'paciente'
            ? 'p'
            : `a:${editar.beneficiarioId ?? ''}`,
        );
        setRotaId('');
        setCompanhiaId('');
      } else {
        setOrigem('');
        setDestino('');
        setData('');
        setDataVolta('');
        setModal('aereo');
        setTipo('ida');
        setValor('');
        setStatus('agendada');
        setBeneficiario('p');
        setRotaId('');
        setCompanhiaId('');
      }
      setNovaRotaOpen(false);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open, editar]);

  // Quando carregam as companhias e estamos editando, casa pelo nome
  useEffect(() => {
    if (!editar || companhias.length === 0 || companhiaId || !editar.companhia) return;
    const match = companhias.find((c) => c.nome === editar.companhia);
    if (match) setCompanhiaId(match.id);
  }, [editar, companhias, companhiaId]);

  // Quando rotas carregam e estamos editando, tenta casar origem/destino com uma rota existente.
  useEffect(() => {
    if (!editar || rotas.length === 0 || rotaId) return;
    const match = rotas.find(
      (r) =>
        `${r.cidade_origem} - ${r.uf_origem}` === editar.origem &&
        `${r.cidade_destino} - ${r.uf_destino}` === editar.destino,
    );
    if (match) setRotaId(String(match.id));
  }, [editar, rotas, rotaId]);

  const isIdaEVolta = tipo === 'ida_e_volta';

  const beneficiarioPayload = useMemo(() => {
    if (beneficiario === 'p') {
      return { beneficiarioTipo: 'paciente' as const, beneficiarioId: undefined };
    }
    const id = beneficiario.startsWith('a:') ? beneficiario.slice(2) : beneficiario;
    return { beneficiarioTipo: 'acompanhante' as const, beneficiarioId: id };
  }, [beneficiario]);

  function handleSalvar() {
    if (!origem || !destino || !data || !valor) return;
    const companhiaNome = companhias.find((c) => c.id === companhiaId)?.nome;
    if (isEdicao && editar) {
      // T2.AL — Edição não suporta ida_e_volta (cada viagem é independente).
      editarViagem(solicitacaoId, editar.id, {
        origem,
        destino,
        data,
        modal,
        tipo: tipo as 'ida' | 'volta' | 'transfer',
        status,
        valor: Number(valor),
        companhia: companhiaNome,
        ...beneficiarioPayload,
      });
      onClose();
      return;
    }
    if (isIdaEVolta) {
      if (!dataVolta) return;
      addViagensIdaEVolta(solicitacaoId, {
        origem,
        destino,
        modal,
        status,
        dataIda: data,
        dataVolta,
        valorTotal: Number(valor),
        ...beneficiarioPayload,
      });
    } else {
      addViagem(solicitacaoId, {
        origem,
        destino,
        data,
        modal,
        tipo: tipo as 'ida' | 'volta' | 'transfer',
        status,
        valor: Number(valor),
        companhia: companhiaNome,
        ...beneficiarioPayload,
      });
    }
    onClose();
  }

  const valid =
    origem && destino && data && valor && (!isIdaEVolta || !!dataVolta);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdicao ? 'Editar passagem' : 'Nova passagem'}
      subtitle={isIdaEVolta && !isEdicao ? 'Trecho com retorno — gera duas passagens.' : 'Trecho, modal e valor da viagem.'}
      width="520px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!valid}
          >
            {isEdicao ? 'Salvar alterações' : isIdaEVolta ? 'Salvar (gera 2 passagens)' : 'Salvar passagem'}
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      {/* T2.AF — Beneficiário (obrigatório, no topo do form) */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Beneficiário
      </label>
      <select
        ref={firstInputRef}
        value={beneficiario}
        onChange={(e) => setBeneficiario(e.target.value)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        {solicitacao && (
          <option value="p">
            Paciente — {solicitacao.paciente.nome} ({calcularIdade(solicitacao.paciente.dataNascimento)} anos)
          </option>
        )}
        {solicitacao?.acompanhantes.map((a) => (
          <option key={a.id} value={`a:${a.id}`}>
            Acompanhante — {a.nome} ({calcularIdade(a.dataNascimento)} anos) — {a.vinculo}
          </option>
        ))}
      </select>
      {isIdaEVolta && (
        <p className="text-[11px] mb-3 -mt-2" style={{ color: '#94A3B8' }}>
          Ambas as passagens (ida + volta) ficam vinculadas ao mesmo beneficiário.
        </p>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
            Rota (origem → destino)
          </label>
          {!novaRotaOpen && (
            <button
              type="button"
              onClick={() => setNovaRotaOpen(true)}
              className="text-[11px] inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--tfd-blue)' }}
            >
              <Plus size={11} /> Cadastrar nova rota
            </button>
          )}
        </div>
        <select
          value={rotaId}
          onChange={(e) => sincronizarOrigemDestino(e.target.value)}
          disabled={loadingRotas}
          className="w-full px-3 py-2 text-[13px]"
          style={inputStyle}
        >
          <option value="">
            {loadingRotas
              ? 'Carregando rotas...'
              : rotas.length === 0
                ? 'Nenhuma rota cadastrada — clique em "Cadastrar nova rota"'
                : 'Selecione a rota...'}
          </option>
          {rotas.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.cidade_origem} - {r.uf_origem} → {r.cidade_destino} - {r.uf_destino}
            </option>
          ))}
        </select>

        {novaRotaOpen && (
          <div
            className="mt-2 p-3 flex flex-col gap-2"
            style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
          >
            <p className="text-[12px] font-semibold" style={{ color: '#1A1D2B' }}>Cadastrar nova rota</p>
            <div className="grid grid-cols-[1fr_70px_1fr_70px] gap-2">
              <input
                placeholder="Cidade origem"
                value={novaRotaOrigemCidade}
                onChange={(e) => setNovaRotaOrigemCidade(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={inputStyle}
              />
              <input
                placeholder="UF"
                maxLength={2}
                value={novaRotaOrigemUf}
                onChange={(e) => setNovaRotaOrigemUf(e.target.value.toUpperCase())}
                className="px-3 py-2 text-[13px] text-center font-mono"
                style={inputStyle}
              />
              <input
                placeholder="Cidade destino"
                value={novaRotaDestinoCidade}
                onChange={(e) => setNovaRotaDestinoCidade(e.target.value)}
                className="px-3 py-2 text-[13px]"
                style={inputStyle}
              />
              <input
                placeholder="UF"
                maxLength={2}
                value={novaRotaDestinoUf}
                onChange={(e) => setNovaRotaDestinoUf(e.target.value.toUpperCase())}
                className="px-3 py-2 text-[13px] text-center font-mono"
                style={inputStyle}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setNovaRotaOpen(false)}
                className="tfd-btn tfd-btn-ghost tfd-btn--sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarNovaRota}
                disabled={savingRota}
                className="tfd-btn tfd-btn-primary tfd-btn--sm"
              >
                {savingRota ? <><Loader2 size={12} className="animate-spin" /> Salvando...</> : <><Plus size={12} /> Adicionar rota</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {isIdaEVolta ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                Data ida
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 text-[13px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                Data volta
              </label>
              <input
                type="date"
                value={dataVolta}
                onChange={(e) => setDataVolta(e.target.value)}
                className="w-full px-3 py-2 text-[13px]"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Valor total da ida e volta (R$)
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#6B7280' }}>
              O sistema criará 2 passagens separadas (ida e volta), com valor
              dividido 50/50, para permitir edições/remarcações independentes.
            </p>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Valor (R$)
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Modal
          </label>
          <select
            value={modal}
            onChange={(e) => setModal(e.target.value as ModalViagem)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            <option value="aereo">Aéreo</option>
            <option value="terrestre">Terrestre</option>
            <option value="fluvial">Fluvial</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Tipo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOpcao)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            <option value="ida">Ida</option>
            <option value="volta">Volta</option>
            <option value="transfer">Transfer</option>
            {!isEdicao && <option value="ida_e_volta">Ida e volta</option>}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusViagem)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            {(Object.keys(STATUS_VIAGEM_LABEL) as StatusViagem[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_VIAGEM_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Companhia de transporte
      </label>
      <select
        value={companhiaId}
        onChange={(e) => setCompanhiaId(e.target.value)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        <option value="">
          {companhiasDoModal.length === 0
            ? 'Nenhuma companhia cadastrada'
            : 'Selecione a companhia...'}
        </option>
        {companhiasDoModal.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome} — {MODAL_PT[c.tipo_modal] ?? c.tipo_modal}
          </option>
        ))}
      </select>

      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
        Anexo do bilhete poderá ser adicionado após salvar.
      </p>
    </Drawer>
  );
}
