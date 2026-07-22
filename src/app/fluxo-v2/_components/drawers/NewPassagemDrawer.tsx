'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, User, Route, Ticket, Lock } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';
import type { ModalViagem, StatusViagem, ViagemMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { STATUS_VIAGEM_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularIdade } from '@/shared/utils/idade';
import { createClient } from '@/lib/supabase/client';
import { buscarMunicipio } from '@/services/municipios.service';
import { listarAeroportos, type Aeroporto } from '@/services/aeroportos.service';
import { distanciaKm, distanciaMilhas, distanciaMilhasNauticas } from '@/lib/distancia/haversine';
import { rotaTerrestreEntre } from '@/lib/distancia/rota-terrestre';
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
 * em duas ViagemMock independentes (T2.X). Transfer foi removido da emissão
 * de passagem em 2026 — virou categoria de Adicional.
 */
type TipoOpcao = 'ida' | 'volta' | 'ida_e_volta';

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  snapshotPaciente?: SnapshotPacienteData;
  /** T2.AL — Quando informado, entra em modo edição (sem opção de "ida e volta"). */
  editar?: ViagemMock;
  /** PBI 13237 — Acompanhamento edita pelo drawer, mas só o status é
   *  editável e salvável; os demais campos ficam somente leitura. */
  somenteStatus?: boolean;
}

export default function NewPassagemDrawer({ open, onClose, solicitacaoId, snapshotPaciente, editar, somenteStatus }: Props) {
  const { addViagem, addViagensIdaEVolta, editarViagem, getById, addAnexos } = useFluxoV2State();
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const toast = useToast();
  const isEdicao = !!editar;
  const firstInputRef = useRef<HTMLSelectElement>(null);

  const solicitacao = getById(solicitacaoId);

  // Origem / destino — UF + cidade separados (usado quando modal != aereo).
  const [origemUf, setOrigemUf] = useState('MA');
  const [origemCidade, setOrigemCidade] = useState('');
  const [destinoUf, setDestinoUf] = useState('');
  const [destinoCidade, setDestinoCidade] = useState('');

  // Aeroportos — usados quando modal === 'aereo'.
  const [aeroportos, setAeroportos] = useState<Aeroporto[]>([]);
  const [loadingAeroportos, setLoadingAeroportos] = useState(false);
  const [aeroportosErro, setAeroportosErro] = useState<string | null>(null);
  const [origemAeroportoId, setOrigemAeroportoId] = useState('');
  const [destinoAeroportoId, setDestinoAeroportoId] = useState('');

  // Demais campos
  const [data, setData] = useState('');
  const [dataVolta, setDataVolta] = useState('');
  const [modal, setModal] = useState<ModalViagem>('aereo');
  const [tipo, setTipo] = useState<TipoOpcao>('ida');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState<StatusViagem>('agendada');
  const [beneficiario, setBeneficiario] = useState<string>('p');
  // Reembolso — preenchido só quando status === 'reembolso'.
  const [valorReembolso, setValorReembolso] = useState('');
  const [dataReembolso, setDataReembolso] = useState('');

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

  // Carrega aeroportos (apenas quando o drawer abre — pequeno o suficiente
  // para vir todo de uma vez e filtrar no client).
  useEffect(() => {
    if (!open) return;
    setLoadingAeroportos(true);
    setAeroportosErro(null);
    listarAeroportos().then(({ data, error }) => {
      setAeroportos(data);
      setAeroportosErro(error);
      setLoadingAeroportos(false);
    });
  }, [open]);

  const origemAeroporto = aeroportos.find((a) => a.id === origemAeroportoId);
  const destinoAeroporto = aeroportos.find((a) => a.id === destinoAeroportoId);
  const isAereo = modal === 'aereo';

  // Auto-cálculo de distância e ajuda de custo sempre que origem/destino/modal mudam.
  // Quando o modal é aéreo, usa coordenadas reais dos aeroportos; caso contrário,
  // cai no centroide IBGE da cidade (que é mais aproximado mas suficiente para
  // modais terrestre/fluvial).
  useEffect(() => {
    const algumPreenchidoAereo = isAereo && origemAeroporto && destinoAeroporto;
    const algumPreenchidoCidade = !isAereo && origemCidade && origemUf && destinoCidade && destinoUf;
    if (!algumPreenchidoAereo && !algumPreenchidoCidade) {
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
        let coordOrigem: { lat: number; lon: number } | null = null;
        let coordDestino: { lat: number; lon: number } | null = null;

        if (isAereo) {
          if (!origemAeroporto || !destinoAeroporto) return;
          coordOrigem = { lat: origemAeroporto.latitude, lon: origemAeroporto.longitude };
          coordDestino = { lat: destinoAeroporto.latitude, lon: destinoAeroporto.longitude };
        } else {
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
          coordOrigem = o;
          coordDestino = d;
        }

        if (!coordOrigem || !coordDestino) return;
        let valorBase: number;
        if (modal === 'aereo') {
          valorBase = Math.round(distanciaMilhas(coordOrigem, coordDestino));
        } else if (modal === 'fluvial') {
          valorBase = Math.round(distanciaMilhasNauticas(coordOrigem, coordDestino));
        } else {
          // Terrestre — usa rota rodoviária real via ORS (OpenStreetMap).
          // Fallback para haversine se a API estiver indisponível ou sem chave.
          try {
            const rota = await rotaTerrestreEntre(coordOrigem, coordDestino);
            if (cancelado) return;
            valorBase = Math.round(rota.distanciaKm);
          } catch (e) {
            console.warn('[NewPassagemDrawer] rota terrestre falhou, usando linha reta:', e);
            valorBase = Math.round(distanciaKm(coordOrigem, coordDestino));
            setDistErro('Rota rodoviária indisponível — distância em linha reta como aproximação.');
          }
        }
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
  }, [isAereo, origemAeroporto, destinoAeroporto, origemCidade, origemUf, destinoCidade, destinoUf, modal, tipo]);

  // Inicialização ao abrir
  useEffect(() => {
    if (!open) return;
    if (editar) {
      setOrigemCidade(editar.origemCidade ?? '');
      setOrigemUf(editar.origemUf ?? 'MA');
      setDestinoCidade(editar.destinoCidade ?? '');
      setDestinoUf(editar.destinoUf ?? '');
      setOrigemAeroportoId('');
      setDestinoAeroportoId('');
      setData(editar.data);
      setDataVolta('');
      setModal(editar.modal);
      // Defensivo: registros legados com tipo='transfer' caem em 'ida'.
      setTipo(editar.tipo === 'transfer' ? 'ida' : (editar.tipo as TipoOpcao));
      setValor(String(editar.valor));
      setStatus(editar.status);
      setBeneficiario(
        editar.beneficiarioTipo === 'paciente'
          ? 'p'
          : `a:${editar.beneficiarioId ?? ''}`,
      );
      setCompanhiaId('');
      setValorReembolso(editar.valorReembolso != null ? String(editar.valorReembolso) : '');
      setDataReembolso(editar.dataReembolso ?? '');
    } else {
      setOrigemCidade(''); setOrigemUf('MA');
      setDestinoCidade(''); setDestinoUf('');
      setOrigemAeroportoId(''); setDestinoAeroportoId('');
      setData(''); setDataVolta('');
      setModal('aereo'); setTipo('ida');
      setValor(''); setStatus('agendada');
      setBeneficiario('p'); setCompanhiaId('');
      setValorReembolso(''); setDataReembolso('');
    }
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [open, editar]);

  // Quando carregam as companhias e estamos editando, casa pelo nome
  useEffect(() => {
    if (!editar || companhias.length === 0 || companhiaId || !editar.companhia) return;
    const match = companhias.find((c) => c.nome === editar.companhia);
    if (match) setCompanhiaId(match.id);
  }, [editar, companhias, companhiaId]);

  // Em edição aérea, pré-seleciona o aeroporto a partir do IATA persistido.
  useEffect(() => {
    if (!editar || aeroportos.length === 0) return;
    if (editar.modal !== 'aereo') return;
    if (editar.origemAeroporto && !origemAeroportoId) {
      const m = aeroportos.find((a) => a.iata === editar.origemAeroporto);
      if (m) setOrigemAeroportoId(m.id);
    }
    if (editar.destinoAeroporto && !destinoAeroportoId) {
      const m = aeroportos.find((a) => a.iata === editar.destinoAeroporto);
      if (m) setDestinoAeroportoId(m.id);
    }
  }, [editar, aeroportos, origemAeroportoId, destinoAeroportoId]);

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
    // No modo aéreo, origem/destino vêm do aeroporto selecionado.
    const oCidade = isAereo ? (origemAeroporto?.cidade ?? '') : origemCidade;
    const oUf = isAereo ? (origemAeroporto?.uf ?? '') : origemUf;
    const dCidade = isAereo ? (destinoAeroporto?.cidade ?? '') : destinoCidade;
    const dUf = isAereo ? (destinoAeroporto?.uf ?? '') : destinoUf;
    if (!oCidade || !oUf || !dCidade || !dUf || !data || !valor) return;

    const companhiaNome = companhias.find((c) => c.id === companhiaId)?.nome;
    const origemStr = isAereo && origemAeroporto
      ? `${origemAeroporto.cidade}/${origemAeroporto.uf} (${origemAeroporto.iata})`
      : `${oCidade} - ${oUf}`;
    const destinoStr = isAereo && destinoAeroporto
      ? `${destinoAeroporto.cidade}/${destinoAeroporto.uf} (${destinoAeroporto.iata})`
      : `${dCidade} - ${dUf}`;
    const aeroportoExtras = isAereo
      ? { origemAeroporto: origemAeroporto?.iata, destinoAeroporto: destinoAeroporto?.iata }
      : { origemAeroporto: undefined, destinoAeroporto: undefined };
    const distExtras = distanciaValor != null
      ? {
          distanciaValor,
          distanciaUnidade: unidadeDoModal(modal),
          valorAjudaCustoPaciente: ajudaPaciente?.valorTotal,
          valorAjudaCustoAcompanhante: acompanhanteSelecionado || temAcompanhantes ? ajudaAcompanhante?.valorTotal : undefined,
        }
      : {};

    // Reembolso só vale quando o status é 'reembolso'; senão limpa os campos.
    const reembolsoExtras = status === 'reembolso'
      ? {
          valorReembolso: valorReembolso ? Number(valorReembolso) : 0,
          dataReembolso: dataReembolso || undefined,
        }
      : { valorReembolso: undefined, dataReembolso: undefined };

    if (isEdicao && editar) {
      editarViagem(solicitacaoId, editar.id, {
        origem: origemStr,
        destino: destinoStr,
        origemCidade: oCidade, origemUf: oUf,
        destinoCidade: dCidade, destinoUf: dUf,
        ...aeroportoExtras,
        data, modal,
        tipo: tipo as 'ida' | 'volta',
        status,
        valor: Number(valor),
        companhia: companhiaNome,
        ...beneficiarioPayload,
        ...distExtras,
        ...reembolsoExtras,
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
        origemCidade: oCidade, origemUf: oUf,
        destinoCidade: dCidade, destinoUf: dUf,
        ...aeroportoExtras,
        modal, status,
        dataIda: data, dataVolta,
        valorTotal: Number(valor),
        ...beneficiarioPayload,
        ...distExtras,
        ...reembolsoExtras,
      });
      toast.success('Passagens criadas', `Ida e volta — ${origemStr} ⇄ ${destinoStr}`);
    } else {
      addViagem(solicitacaoId, {
        origem: origemStr,
        destino: destinoStr,
        origemCidade: oCidade, origemUf: oUf,
        destinoCidade: dCidade, destinoUf: dUf,
        ...aeroportoExtras,
        data, modal,
        tipo: tipo as 'ida' | 'volta',
        status,
        valor: Number(valor),
        companhia: companhiaNome,
        ...beneficiarioPayload,
        ...distExtras,
        ...reembolsoExtras,
      });
      toast.success('Passagem registrada', `${origemStr} → ${destinoStr}`);
    }
    if (anexos.length > 0) {
      addAnexos(solicitacaoId, anexos, 'passagem');
      setAnexos([]);
    }
    onClose();
  }

  const valid = isAereo
    ? !!origemAeroporto && !!destinoAeroporto && !!data && !!valor && (!isIdaEVolta || !!dataVolta)
    : !!origemCidade && !!origemUf && !!destinoCidade && !!destinoUf && !!data && !!valor && (!isIdaEVolta || !!dataVolta);

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

      {/* Aviso do Acompanhamento — só o status pode ser alterado aqui. */}
      {somenteStatus && (
        <div
          className="flex items-start gap-3 mb-4 px-4 py-3"
          style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, color: '#475569' }}
        >
          <Lock size={16} style={{ flexShrink: 0, marginTop: 1, color: '#64748B' }} />
          <div className="text-[12.5px] leading-relaxed">
            <strong style={{ color: '#1A1D2B' }}>Somente leitura em Acompanhamento.</strong>{' '}
            Os demais campos ficam travados. Apenas o status pode ser atualizado aqui.
          </div>
        </div>
      )}

      {/* Beneficiário */}
      <FormSection title="Beneficiário" icon={<User size={12} />} tone="primary">
      {/* O Status fica fora deste fieldset — em Acompanhamento é o único
          campo editável, então precisa continuar habilitado. */}
      <fieldset disabled={somenteStatus} style={{ display: 'contents' }}>
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
            {a.doador ? "Acompanhante Doador" : "Acompanhante"} — {a.nome} ({calcularIdade(a.dataNascimento)} anos) — {a.vinculo}
          </option>
        ))}
      </select>
      {isIdaEVolta && (
        <p className="text-[11px] mb-3 -mt-2" style={{ color: '#94A3B8' }}>
          Ambas as passagens (ida + volta) ficam vinculadas ao mesmo beneficiário.
        </p>
      )}
      </fieldset>

      {/* Modal / Tipo / Status — vêm logo após o beneficiário porque definem o
          formato dos campos de origem/destino (cidade vs aeroporto). */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <fieldset disabled={somenteStatus} style={{ display: 'contents' }}>
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
            {!isEdicao && <option value="ida_e_volta">Ida e volta</option>}
          </select>
        </div>
        </fieldset>
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

      <fieldset disabled={somenteStatus} style={{ display: 'contents' }}>
      {status === 'reembolso' && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Valor reembolsado (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valorReembolso}
              onChange={(e) => setValorReembolso(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
              Data do reembolso
            </label>
            <input
              type="date"
              value={dataReembolso}
              onChange={(e) => setDataReembolso(e.target.value)}
              className="w-full px-3 py-2 text-[13px]"
              style={inputStyle}
            />
          </div>
          <p className="col-span-2 text-[11px]" style={{ color: '#94A3B8' }}>
            O valor reembolsado é subtraído do custo da passagem nos totais e KPIs.
          </p>
        </div>
      )}
      </fieldset>
      </FormSection>

      {/* Origem / Destino: aeroporto (aéreo) ou UF+cidade (terrestre/fluvial). */}
      <FormSection title="Trajeto" icon={<Route size={12} />} tone="info" disabled={somenteStatus}>
      {isAereo ? (
        <>
          {!loadingAeroportos && (aeroportosErro || aeroportos.length === 0) && (
            <div
              className="mb-4 px-3 py-2.5 text-[12px]"
              style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: 8,
                color: '#78350F',
              }}
            >
              {aeroportosErro ? (
                <>
                  Não foi possível carregar a lista de aeroportos.
                  Verifique se a migration <code>00051_aeroportos.sql</code> foi aplicada no Supabase.
                  <br /><span className="text-[11px] opacity-80">Erro: {aeroportosErro}</span>
                </>
              ) : (
                <>
                  A tabela <code>aeroportos</code> está vazia. Aplique a migration{' '}
                  <code>00051_aeroportos.sql</code> no Supabase para popular o seed.
                </>
              )}
            </div>
          )}
          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            Aeroporto de origem <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            value={origemAeroportoId}
            onChange={(e) => setOrigemAeroportoId(e.target.value)}
            className="w-full px-3 py-2 text-[13px] mb-4"
            style={inputStyle}
          >
            <option value="">
              {loadingAeroportos
                ? 'Carregando aeroportos...'
                : aeroportosErro
                  ? `Erro ao carregar (${aeroportosErro})`
                  : aeroportos.length === 0
                    ? 'Nenhum aeroporto cadastrado'
                    : 'Selecione o aeroporto...'}
            </option>
            {aeroportos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata} — {a.cidade}/{a.uf} ({a.nome})
              </option>
            ))}
          </select>

          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            Aeroporto de destino <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            value={destinoAeroportoId}
            onChange={(e) => setDestinoAeroportoId(e.target.value)}
            className="w-full px-3 py-2 text-[13px] mb-4"
            style={inputStyle}
          >
            <option value="">
              {loadingAeroportos
                ? 'Carregando aeroportos...'
                : aeroportosErro
                  ? `Erro ao carregar (${aeroportosErro})`
                  : aeroportos.length === 0
                    ? 'Nenhum aeroporto cadastrado'
                    : 'Selecione o aeroporto...'}
            </option>
            {aeroportos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iata} — {a.cidade}/{a.uf} ({a.nome})
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <p className="text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>Origem</p>
          <UfCidadeSelect
            ufLabel="UF"
            cidadeLabel="Cidade"
            uf={origemUf}
            cidade={origemCidade}
            onUfChange={setOrigemUf}
            onCidadeChange={setOrigemCidade}
            required
          />
          <p className="text-[12px] font-semibold mb-2 mt-4" style={{ color: '#6B7280' }}>Destino</p>
          <UfCidadeSelect
            ufLabel="UF"
            cidadeLabel="Cidade"
            uf={destinoUf}
            cidade={destinoCidade}
            onUfChange={setDestinoUf}
            onCidadeChange={setDestinoCidade}
            required
          />
        </>
      )}

      {/* Distância (calculada) */}
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Distância ({unidade})
      </label>
      <div className="relative mb-1">
        <input
          type="text"
          readOnly
          tabIndex={-1}
          className="w-full px-3 py-2 text-[13px]"
          placeholder={
            isAereo
              ? (!origemAeroporto || !destinoAeroporto
                  ? 'Selecione origem e destino'
                  : calculandoDist ? 'Calculando…' : '')
              : (!origemCidade || !destinoCidade
                  ? 'Selecione origem e destino'
                  : calculandoDist ? 'Calculando…' : '')
          }
          value={distanciaValor != null ? `${distanciaValor.toLocaleString('pt-BR')} ${unidade}` : ''}
          style={readonlyInputStyle}
        />
        {calculandoDist && (
          <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
        )}
      </div>
      <p className="text-[10px] mb-4" style={{ color: distErro ? '#DC2626' : '#94A3B8' }}>
        {distErro ??
          (isAereo
            ? 'Calculado em linha reta entre as coordenadas dos aeroportos.'
            : modal === 'terrestre'
              ? 'Rota rodoviária real via OpenStreetMap (OpenRouteService).'
              : 'Calculado em linha reta a partir das coordenadas IBGE da cidade.')}
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

      </FormSection>

      {/* Datas, valor e companhia */}
      <FormSection title="Detalhes da passagem" icon={<Ticket size={12} />} tone="success" disabled={somenteStatus}>
      {isIdaEVolta ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
              <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
            <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
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

      </FormSection>

      <AnexosUploadField value={anexos} onChange={setAnexos} hint="Bilhete, voucher ou comprovante de embarque (opcional)." disabled={somenteStatus} />
    </Drawer>
  );
}
