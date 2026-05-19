'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { ModalViagem, StatusViagem, ViagemMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { STATUS_VIAGEM_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';
import { createClient } from '@/lib/supabase/client';
import { buscarMunicipio } from '@/services/municipios.service';
import { distanciaKm, distanciaMilhas, distanciaMilhasNauticas } from '@/lib/distancia/haversine';
import { calcularAjudaCusto, unidadeDoModal, type AjudaCustoCalculada } from '@/lib/distancia/ajuda-custo';

interface CompanhiaRow {
  id: string;
  nome: string;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

const readonlyInputStyle: React.CSSProperties = {
  background: '#F1F5F9',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
  cursor: 'not-allowed',
};

const UNIDADE_LABEL: Record<'km' | 'milhas' | 'milhas_nauticas', string> = {
  km: 'km',
  milhas: 'milhas',
  milhas_nauticas: 'milhas náuticas',
};

function formatarMoeda(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
  const toast = useToast();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  // Origem / destino — UF + cidade separados
  const [origemUf, setOrigemUf] = useState('MA');
  const [origemCidade, setOrigemCidade] = useState('');
  const [destinoUf, setDestinoUf] = useState('');
  const [destinoCidade, setDestinoCidade] = useState('');

  // Demais campos
  const [data, setData] = useState('');
  const [dataVolta, setDataVolta] = useState('');
  const [modal, setModal] = useState<ModalViagem>('aereo');
  const [tipo, setTipo] = useState<TipoOpcao>('ida');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState<StatusViagem>('agendada');
  const [beneficiario, setBeneficiario] = useState<string>('p');

  // Companhia de transporte
  const [companhias, setCompanhias] = useState<CompanhiaRow[]>([]);
  const [companhiaId, setCompanhiaId] = useState('');

  // Distância e ajuda de custo (calculados)
  const [distanciaValor, setDistanciaValor] = useState<number | null>(null);
  const [calculandoDist, setCalculandoDist] = useState(false);
  const [distErro, setDistErro] = useState<string | null>(null);
  const [ajudaPaciente, setAjudaPaciente] = useState<AjudaCustoCalculada | null>(null);
  const [ajudaAcompanhante, setAjudaAcompanhante] = useState<AjudaCustoCalculada | null>(null);

  // Carrega companhias ativas (todas — sem filtrar por modal).
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from('companhias_transporte')
      .select('id, nome')
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

  // Auto-cálculo de distância e ajuda de custo sempre que origem/destino/modal mudam.
  useEffect(() => {
    if (!origemCidade || !origemUf || !destinoCidade || !destinoUf) {
      setDistanciaValor(null);
      setDistErro(null);
      setAjudaPaciente(null);
      setAjudaAcompanhante(null);
      return;
    }
    let cancelado = false;
    setCalculandoDist(true);
    setDistErro(null);
    (async () => {
      try {
        const [o, d] = await Promise.all([
          buscarMunicipio(origemCidade, origemUf),
          buscarMunicipio(destinoCidade, destinoUf),
        ]);
        if (cancelado) return;
        if (!o) {
          setDistErro(`Cidade de origem "${origemCidade}/${origemUf}" não está na base IBGE.`);
          setDistanciaValor(null); setAjudaPaciente(null); setAjudaAcompanhante(null);
          return;
        }
        if (!d) {
          setDistErro(`Cidade de destino "${destinoCidade}/${destinoUf}" não está na base IBGE.`);
          setDistanciaValor(null); setAjudaPaciente(null); setAjudaAcompanhante(null);
          return;
        }
        const valorBase = modal === 'aereo'
          ? Math.round(distanciaMilhas(o, d))
          : modal === 'fluvial'
            ? Math.round(distanciaMilhasNauticas(o, d))
            : Math.round(distanciaKm(o, d));
        const valorDist = tipo === 'ida_e_volta' ? valorBase * 2 : valorBase;
        setDistanciaValor(valorDist);

        // Ajuda de custo
        const [paciente, acompanhante] = await Promise.all([
          calcularAjudaCusto(valorDist, modal, 'paciente'),
          calcularAjudaCusto(valorDist, modal, 'acompanhante'),
        ]);
        if (cancelado) return;
        setAjudaPaciente(paciente);
        setAjudaAcompanhante(acompanhante);
      } catch (err) {
        if (!cancelado) {
          setDistErro(err instanceof Error ? err.message : 'Falha ao calcular distância.');
          setDistanciaValor(null); setAjudaPaciente(null); setAjudaAcompanhante(null);
        }
      } finally {
        if (!cancelado) setCalculandoDist(false);
      }
    })();
    return () => { cancelado = true; };
  }, [origemCidade, origemUf, destinoCidade, destinoUf, modal, tipo]);

  // Inicialização ao abrir
  useEffect(() => {
    if (!open) return;
    if (editar) {
      setOrigemCidade(editar.origemCidade ?? '');
      setOrigemUf(editar.origemUf ?? 'MA');
      setDestinoCidade(editar.destinoCidade ?? '');
      setDestinoUf(editar.destinoUf ?? '');
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
      setCompanhiaId('');
    } else {
      setOrigemCidade(''); setOrigemUf('MA');
      setDestinoCidade(''); setDestinoUf('');
      setData(''); setDataVolta('');
      setModal('aereo'); setTipo('ida');
      setValor(''); setStatus('agendada');
      setBeneficiario('p'); setCompanhiaId('');
    }
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [open, editar]);

  // Quando carregam as companhias e estamos editando, casa pelo nome
  useEffect(() => {
    if (!editar || companhias.length === 0 || companhiaId || !editar.companhia) return;
    const match = companhias.find((c) => c.nome === editar.companhia);
    if (match) setCompanhiaId(match.id);
  }, [editar, companhias, companhiaId]);

  const isIdaEVolta = tipo === 'ida_e_volta';
  const acompanhanteSelecionado = beneficiario.startsWith('a:');
  const temAcompanhantes = (solicitacao?.acompanhantes.length ?? 0) > 0;

  const beneficiarioPayload = useMemo(() => {
    if (beneficiario === 'p') {
      return { beneficiarioTipo: 'paciente' as const, beneficiarioId: undefined };
    }
    const id = beneficiario.startsWith('a:') ? beneficiario.slice(2) : beneficiario;
    return { beneficiarioTipo: 'acompanhante' as const, beneficiarioId: id };
  }, [beneficiario]);

  function handleSalvar() {
    if (!origemCidade || !origemUf || !destinoCidade || !destinoUf || !data || !valor) return;
    const companhiaNome = companhias.find((c) => c.id === companhiaId)?.nome;
    const origemStr = `${origemCidade} - ${origemUf}`;
    const destinoStr = `${destinoCidade} - ${destinoUf}`;
    const distExtras = distanciaValor != null
      ? {
          distanciaValor,
          distanciaUnidade: unidadeDoModal(modal),
          valorAjudaCustoPaciente: ajudaPaciente?.valorTotal,
          valorAjudaCustoAcompanhante: acompanhanteSelecionado || temAcompanhantes ? ajudaAcompanhante?.valorTotal : undefined,
        }
      : {};

    if (isEdicao && editar) {
      editarViagem(solicitacaoId, editar.id, {
        origem: origemStr,
        destino: destinoStr,
        origemCidade, origemUf,
        destinoCidade, destinoUf,
        data, modal,
        tipo: tipo as 'ida' | 'volta' | 'transfer',
        status,
        valor: Number(valor),
        companhia: companhiaNome,
        ...beneficiarioPayload,
        ...distExtras,
      });
      toast.success('Passagem atualizada', `${origemStr} → ${destinoStr}`);
      onClose();
      return;
    }
    if (isIdaEVolta) {
      if (!dataVolta) return;
      addViagensIdaEVolta(solicitacaoId, {
        origem: origemStr,
        destino: destinoStr,
        origemCidade, origemUf,
        destinoCidade, destinoUf,
        modal, status,
        dataIda: data, dataVolta,
        valorTotal: Number(valor),
        ...beneficiarioPayload,
        ...distExtras,
      });
      toast.success('Passagens criadas', `Ida e volta — ${origemStr} ⇄ ${destinoStr}`);
    } else {
      addViagem(solicitacaoId, {
        origem: origemStr,
        destino: destinoStr,
        origemCidade, origemUf,
        destinoCidade, destinoUf,
        data, modal,
        tipo: tipo as 'ida' | 'volta' | 'transfer',
        status,
        valor: Number(valor),
        companhia: companhiaNome,
        ...beneficiarioPayload,
        ...distExtras,
      });
      toast.success('Passagem registrada', `${origemStr} → ${destinoStr}`);
    }
    onClose();
  }

  const valid =
    origemCidade && origemUf && destinoCidade && destinoUf && data && valor && (!isIdaEVolta || !!dataVolta);

  const unidade = UNIDADE_LABEL[unidadeDoModal(modal)];

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

      {/* Beneficiário */}
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

      {/* Origem */}
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Origem</h3>
      <UfCidadeSelect
        ufLabel="UF"
        cidadeLabel="Cidade"
        uf={origemUf}
        cidade={origemCidade}
        onUfChange={setOrigemUf}
        onCidadeChange={setOrigemCidade}
        required
      />

      {/* Destino */}
      <h3 className="text-sm font-semibold mb-3 mt-4" style={{ color: 'var(--tfd-text-primary)' }}>Destino</h3>
      <UfCidadeSelect
        ufLabel="UF"
        cidadeLabel="Cidade"
        uf={destinoUf}
        cidade={destinoCidade}
        onUfChange={setDestinoUf}
        onCidadeChange={setDestinoCidade}
        required
      />

      {/* Modal */}
      <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
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

      {/* Distância (calculada) */}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Distância ({unidade})
      </label>
      <div className="relative mb-1">
        <input
          type="text"
          readOnly
          tabIndex={-1}
          className="w-full px-3 py-2 text-[13px]"
          placeholder={
            !origemCidade || !destinoCidade
              ? 'Selecione origem e destino'
              : calculandoDist ? 'Calculando…' : ''
          }
          value={distanciaValor != null ? `${distanciaValor.toLocaleString('pt-BR')} ${unidade}` : ''}
          style={readonlyInputStyle}
        />
        {calculandoDist && (
          <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
        )}
      </div>
      <p className="text-[10px] mb-4" style={{ color: distErro ? '#DC2626' : '#94A3B8' }}>
        {distErro ?? 'Calculado automaticamente em linha reta a partir das coordenadas IBGE.'}
      </p>

      {/* Ajuda de custo (paciente sempre; acompanhante se houver) */}
      {(ajudaPaciente || ajudaAcompanhante) && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#0369A1' }}>
            Ajuda de custo (SIGTAP)
          </p>
          {ajudaPaciente && (
            <div className="flex items-baseline justify-between text-[13px]">
              <span style={{ color: '#0C4A6E' }}>Paciente</span>
              <span className="font-mono font-semibold" style={{ color: '#0C4A6E' }}>
                {formatarMoeda(ajudaPaciente.valorTotal)}
                <span className="text-[10px] font-normal ml-2" style={{ color: '#0369A1' }}>
                  {ajudaPaciente.quantidade}× {formatarMoeda(ajudaPaciente.valorUnitario)}
                </span>
              </span>
            </div>
          )}
          {ajudaAcompanhante && temAcompanhantes && (
            <div className="flex items-baseline justify-between text-[13px] mt-1">
              <span style={{ color: '#0C4A6E' }}>Acompanhante</span>
              <span className="font-mono font-semibold" style={{ color: '#0C4A6E' }}>
                {formatarMoeda(ajudaAcompanhante.valorTotal)}
                <span className="text-[10px] font-normal ml-2" style={{ color: '#0369A1' }}>
                  {ajudaAcompanhante.quantidade}× {formatarMoeda(ajudaAcompanhante.valorUnitario)}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
      {distanciaValor != null && !ajudaPaciente && !ajudaAcompanhante && (
        <p className="text-[11px] mb-4" style={{ color: '#94A3B8' }}>
          Nenhum procedimento SIGTAP de ajuda de custo cadastrado para o modal {modal}. Cadastre em Configurações → SIGTAP.
        </p>
      )}

      {/* Data / Valor */}
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

      {/* Companhia */}
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
          {companhias.length === 0
            ? 'Nenhuma companhia cadastrada'
            : 'Selecione a companhia...'}
        </option>
        {companhias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
        Anexo do bilhete poderá ser adicionado após salvar.
      </p>
    </Drawer>
  );
}
