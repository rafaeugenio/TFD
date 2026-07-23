'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  UserPlus,
  FileSignature,
  Users,
  Wallet,
} from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import Autocomplete from '@/shared/components/autocomplete/Autocomplete';
import {
  buscarPorId,
  buscarPorSolicitacao,
  criarDespacho,
  atualizarDespacho,
} from '@/services/despachos-financeiros.service';
import { listarUsuarios } from '@/services/usuarios.service';
import {
  REPRESENTANTES_PADRAO,
  type RepresentanteDespacho,
} from '@/core/despacho/representantes';
import { montarCorpoDespachoTemplate } from '@/core/despacho/corpoTemplate';

interface CriarPrefill {
  solicitacaoId: string;
  numeroSEI: string;
  texto: string;
  representantes: RepresentanteDespacho[];
}

/** PBI 13195 — cada ajuda de custo tem processo próprio no SEI; o despacho
 *  passa a referenciar uma ajuda específica da solicitação. */
export interface AjudaCustoOption {
  id: string;
  numeroSEI?: string;
  periodoLabel: string;
  valorLabel: string;
}

interface Props {
  open: boolean;
  /** Edição direta por id (barra do documento). */
  despachoId?: string;
  /** Criação/edição a partir da solicitação (tela financeiro), já com prefill. */
  criar?: CriarPrefill;
  /**
   * Corpo modelo montado pela página (dados do banco). Usado como prefill na
   * edição quando o despacho ainda não tem `texto_despacho` salvo, para o
   * campo nunca abrir em branco.
   */
  corpoPadrao?: string;
  onClose: () => void;
  /** Chamado após salvar com sucesso, recebendo o id do despacho. */
  aposSalvar?: (despachoId: string) => void;
  /** PBI 13195 — ajudas de custo da solicitação, para o select obrigatório. */
  ajudasCusto?: AjudaCustoOption[];
  /** PBI 13195 — nome do paciente (maiúsculas), usado para regerar o corpo
   *  do despacho ao trocar a ajuda de custo selecionada. */
  nomePaciente?: string;
  /** PBI 13279: ajuda de custo já escolhida no select unificado do card de
   *  fechamento; prefila o select deste drawer na criação de um despacho novo. */
  ajudaCustoIdInicial?: string;
  /**
   * Ajuste do cliente (2026-07): a seleção da ajuda de custo agora acontece
   * dentro do drawer (não há mais um seletor global no card). Chamado sempre
   * que `ajudaCustoId` fica definido, seja pela troca manual no select, seja
   * pelo carregamento de um despacho já existente, para o card de fechamento
   * manter os botões de Despacho e Recibo sincronizados com a mesma ajuda.
   */
  onAjudaCustoChange?: (id: string) => void;
}

interface DespachoData {
  id?: string;
  solicitacao_id?: string;
  numero_sei?: string | null;
  texto_despacho?: string | null;
  observacoes?: string | null;
  representantes?: RepresentanteDespacho[] | null;
  ajuda_custo_id?: string | null;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

const labelClass = 'block text-[12px] font-semibold mb-2';
const labelStyle: React.CSSProperties = { color: '#6B7280' };

/**
 * Padroniza o <input> interno do Autocomplete para casar com os demais campos
 * do drawer (mesma fonte, padding, borda e raio) — mesmo truque usado no
 * NewParecerDrawer com os autocompletes de CID.
 */
const buscaWrapperClass =
  '[&_input]:w-full [&_input]:px-3 [&_input]:py-2 [&_input]:text-[13px] ' +
  '[&_input]:bg-white [&_input]:rounded-[8px] ' +
  '[&_input]:border [&_input]:border-[var(--tfd-surface-border)] [&_input]:shadow-none';

export default function DespachoFinanceiroDrawer({
  open,
  despachoId,
  criar,
  corpoPadrao,
  onClose,
  aposSalvar,
  ajudasCusto = [],
  nomePaciente,
  ajudaCustoIdInicial,
  onAjudaCustoChange,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Quando preenchido, estamos editando um despacho que já existe.
  const [idAtual, setIdAtual] = useState<string | null>(despachoId ?? null);
  const [solicitacaoId, setSolicitacaoId] = useState<string | null>(
    criar?.solicitacaoId ?? null,
  );

  const [numeroSEI, setNumeroSEI] = useState('');
  const [texto, setTexto] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [representantes, setRepresentantes] = useState<RepresentanteDespacho[]>([]);
  // PBI 13195 — ajuda de custo referenciada pelo despacho (obrigatório).
  const [ajudaCustoId, setAjudaCustoId] = useState<string | null>(null);
  // Remonta o Autocomplete para limpar o input após cada escolha.
  const [buscaKey, setBuscaKey] = useState(0);

  // Ajuste do cliente: propaga a ajuda de custo (do select ou do despacho já
  // salvo) para o card de fechamento, que não tem mais seletor próprio.
  useEffect(() => {
    if (ajudaCustoId) onAjudaCustoChange?.(ajudaCustoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajudaCustoId]);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;

    // Corpo usado quando o registro não tem texto salvo: o prefill da criação
    // (tela financeiro) ou o modelo montado pela página (edição). Evita o campo
    // abrir em branco em despachos antigos.
    const fallbackTexto = criar?.texto || corpoPadrao || '';

    function carregar(data: DespachoData) {
      setNumeroSEI(data.numero_sei ?? '');
      const salvo = data.texto_despacho?.trim();
      setTexto(salvo ? (data.texto_despacho as string) : fallbackTexto);
      setObservacoes(data.observacoes ?? '');
      const reps = data.representantes ?? [];
      setRepresentantes(reps.length ? reps : REPRESENTANTES_PADRAO);
      if (data.solicitacao_id) setSolicitacaoId(data.solicitacao_id);
      setAjudaCustoId(data.ajuda_custo_id ?? null);
    }

    (async () => {
      setLoading(true);
      setErro(null);

      // 1) Edição direta por id (barra do documento).
      if (despachoId) {
        setIdAtual(despachoId);
        const { data } = await buscarPorId(despachoId);
        if (!cancelado && data) carregar(data as DespachoData);
        if (!cancelado) setLoading(false);
        return;
      }

      // 2) A partir da solicitação: reaproveita despacho existente ou usa prefill.
      if (criar) {
        setSolicitacaoId(criar.solicitacaoId);
        const { data } = await buscarPorSolicitacao(criar.solicitacaoId);
        if (!cancelado) {
          if (data) {
            setIdAtual((data as DespachoData).id ?? null);
            carregar(data as DespachoData);
          } else {
            setIdAtual(null);
            setNumeroSEI(criar.numeroSEI);
            setTexto(criar.texto);
            setObservacoes('');
            setRepresentantes(
              criar.representantes.length ? criar.representantes : REPRESENTANTES_PADRAO,
            );
            // PBI 13279: prefila com a ajuda de custo já escolhida no select
            // unificado do card, mas o usuário ainda pode trocar aqui.
            setAjudaCustoId(ajudaCustoIdInicial ?? null);
          }
          setLoading(false);
        }
        return;
      }

      if (!cancelado) setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, despachoId, criar?.solicitacaoId, corpoPadrao]);

  // PBI 13195 — ao trocar a ajuda de custo selecionada, o processo SEI e o
  // corpo do despacho passam a referenciar os dados dela (processo próprio +
  // valor + período), em vez do processo geral da solicitação.
  function selecionarAjudaCusto(id: string) {
    setAjudaCustoId(id);
    const ajuda = ajudasCusto.find((a) => a.id === id);
    if (!ajuda) return;
    if (ajuda.numeroSEI) setNumeroSEI(ajuda.numeroSEI);
    if (nomePaciente) {
      setTexto(
        montarCorpoDespachoTemplate({
          nome: nomePaciente,
          processo: ajuda.numeroSEI?.trim() || numeroSEI || '____',
          valor: ajuda.valorLabel,
        }),
      );
    }
  }

  async function buscarUsuarios(query: string) {
    const { data } = await listarUsuarios({ search: query, pageSize: 20 });
    const jaEscolhidos = new Set(
      representantes.map((r) => r.usuario_id).filter(Boolean) as string[],
    );
    return (data ?? [])
      .filter((u) => !jaEscolhidos.has(u.id as string))
      .map((u) => ({
        value: u.id as string,
        label: (u.nome_completo as string) ?? '',
        perfil: (u.perfil as string) ?? '',
        cargo: (u.cargo as string | null) ?? '',
        matricula: (u.matricula as string | null) ?? '',
      }));
  }

  function adicionarRepresentante(item: {
    value: string;
    label: string;
    cargo?: string;
    matricula?: string;
  }) {
    setRepresentantes((rs) => {
      if (rs.some((r) => r.usuario_id === item.value)) return rs;
      // ID e Cargo vêm preenchidos do usuário; ficam editáveis no drawer.
      const matricula = item.matricula?.trim() ?? '';
      return [
        ...rs,
        {
          usuario_id: item.value,
          nome: item.label,
          cargo: item.cargo?.trim() ?? '',
          id_funcional: matricula ? `ID ${matricula}` : '',
        },
      ];
    });
    setBuscaKey((k) => k + 1);
  }

  function atualizarRep(i: number, patch: Partial<RepresentanteDespacho>) {
    setRepresentantes((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removerRep(i: number) {
    setRepresentantes((rs) => rs.filter((_, idx) => idx !== i));
  }

  function moverRep(i: number, dir: -1 | 1) {
    setRepresentantes((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const novo = [...rs];
      [novo[i], novo[j]] = [novo[j], novo[i]];
      return novo;
    });
  }

  async function salvar() {
    setSaving(true);
    setErro(null);
    const payload = {
      numero_sei: numeroSEI.trim() || null,
      texto_despacho: texto.trim() || null,
      observacoes: observacoes.trim() || null,
      representantes: representantes.map((r) => ({
        usuario_id: r.usuario_id,
        nome: r.nome.trim(),
        cargo: r.cargo.trim(),
        id_funcional: r.id_funcional.trim(),
      })),
      ajuda_custo_id: ajudaCustoId,
    };

    try {
      let id = idAtual;
      if (id) {
        const { error } = await atualizarDespacho(id, payload);
        if (error) throw error;
      } else {
        if (!solicitacaoId) throw new Error('Solicitação não identificada.');
        const { data, error } = await criarDespacho({
          solicitacao_id: solicitacaoId,
          ...payload,
        });
        if (error || !data) throw error ?? new Error('Falha ao gerar despacho.');
        id = (data as { id: string }).id;
      }
      setSaving(false);
      onClose();
      if (id) aposSalvar?.(id);
    } catch (e) {
      setSaving(false);
      setErro(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.');
    }
  }

  const modoEdicao = !!idAtual;
  const totalReps = representantes.length;
  // PBI 13195 — select de ajuda de custo é sempre obrigatório para gerar
  // ou editar o despacho.
  const exigeAjudaCusto = ajudasCusto.length > 0;
  const podeSalvar = !!ajudaCustoId;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={modoEdicao ? 'Editar despacho financeiro' : 'Cadastrar despacho financeiro'}
      subtitle="Corpo puxado da solicitação, número SEI e representantes que assinam o documento."
      width="560px"
      footer={
        <>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={salvar}
            disabled={loading || saving || !podeSalvar}
            title={!podeSalvar ? 'Selecione a ajuda de custo referenciada pelo despacho' : undefined}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Salvando…
              </>
            ) : modoEdicao ? (
              'Salvar despacho'
            ) : (
              'Gerar despacho'
            )}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-10" style={{ color: '#94A3B8' }}>
          <Loader2 size={16} className="animate-spin mr-2" /> Carregando…
        </div>
      ) : (
        <>
          {/* PBI 13195 — Ajuda de custo referenciada pelo despacho (obrigatório). */}
          <FormSection
            title="Ajuda de custo"
            icon={<Wallet size={12} />}
            hint="No SEI, cada ajuda de custo abre um processo próprio. Escolha qual período este despacho encaminha."
          >
            {exigeAjudaCusto ? (
              <select
                value={ajudaCustoId ?? ''}
                onChange={(e) => selecionarAjudaCusto(e.target.value)}
                className="w-full px-3 py-2 text-[13px]"
                style={{
                  ...inputStyle,
                  borderColor: !ajudaCustoId ? '#FCA5A5' : (inputStyle.border as string),
                }}
              >
                <option value="" disabled>
                  Selecione a ajuda de custo…
                </option>
                {ajudasCusto.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.numeroSEI ? `SEI ${a.numeroSEI}` : 'Sem processo SEI'} — {a.periodoLabel} — {a.valorLabel}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C' }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                Nenhuma ajuda de custo cadastrada nesta solicitação. Cadastre um período antes de emitir o despacho.
              </div>
            )}
            {exigeAjudaCusto && !ajudaCustoId && (
              <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
                Obrigatório — selecione a ajuda de custo referenciada por este despacho.
              </p>
            )}
          </FormSection>

          {/* Despacho — SEI + corpo */}
          <FormSection title="Despacho" icon={<FileSignature size={12} />}>
            <label className={labelClass} style={labelStyle}>
              Processo SEI
            </label>
            <input
              type="text"
              placeholder="0000.000000/2026-00"
              value={numeroSEI}
              onChange={(e) => setNumeroSEI(e.target.value)}
              className="w-full px-3 py-2 text-[13px] mb-1"
              style={inputStyle}
            />
            <p className="text-[11px] mb-4" style={{ color: '#94A3B8' }}>
              Preenchido a partir da solicitação quando já houver. Caso contrário, informe aqui.
            </p>

            <label className={labelClass} style={labelStyle}>
              Corpo do despacho
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              placeholder="Texto do despacho…"
              className="w-full px-3 py-2 text-[13px] leading-relaxed"
              style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 220 }}
            />
          </FormSection>

          {/* Representantes — multi-select de usuários + Cargo/ID por pessoa */}
          <FormSection
            title="Representantes"
            icon={<Users size={12} />}
            hint="Adicione os usuários que assinam, na ordem em que aparecem. O último entra como “De acordo,”. Cargo e ID são preenchidos manualmente por enquanto."
          >
            <div className={`${buscaWrapperClass} mb-3`}>
              <Autocomplete
                key={buscaKey}
                placeholder="Buscar usuário por nome…"
                size="sm"
                onSearch={buscarUsuarios}
                onSelect={(item) =>
                  adicionarRepresentante({
                    value: item.value,
                    label: item.label,
                    cargo: typeof item.cargo === 'string' ? item.cargo : '',
                    matricula: typeof item.matricula === 'string' ? item.matricula : '',
                  })
                }
                renderOption={(item) => (
                  <div className="flex flex-col">
                    <span className="text-[13px]" style={{ color: '#1A1D2B' }}>
                      {item.label}
                    </span>
                    {typeof item.perfil === 'string' && item.perfil && (
                      <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                        {item.perfil}
                      </span>
                    )}
                  </div>
                )}
              />
            </div>

            {totalReps === 0 ? (
              <div
                className="flex items-center gap-2 px-3 py-3 text-[12px]"
                style={{ background: '#F8FAFC', border: '1px dashed var(--tfd-surface-border)', borderRadius: 8, color: '#94A3B8' }}
              >
                <UserPlus size={14} /> Nenhum representante. Busque um usuário acima para adicionar.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {representantes.map((r, i) => {
                  const ehDeAcordo = totalReps > 1 && i === totalReps - 1;
                  return (
                    <div
                      key={`${r.usuario_id ?? 'manual'}-${i}`}
                      className="px-3 py-2.5"
                      style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 8, background: '#F8FAFC' }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-flex items-center justify-center text-[11px] font-semibold shrink-0"
                            style={{ width: 20, height: 20, borderRadius: 999, background: '#EEF2FF', color: '#4338CA' }}
                          >
                            {i + 1}
                          </span>
                          <strong className="text-[13px] truncate" style={{ color: '#1A1D2B' }}>
                            {r.nome || '—'}
                          </strong>
                          {ehDeAcordo && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 shrink-0"
                              style={{ background: '#ECFDF5', color: '#047857', borderRadius: 999 }}
                            >
                              De acordo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moverRep(i, -1)}
                            disabled={i === 0}
                            title="Mover para cima"
                            className="p-1 disabled:opacity-30"
                            style={{ color: '#64748B' }}
                          >
                            <ChevronUp size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverRep(i, 1)}
                            disabled={i === totalReps - 1}
                            title="Mover para baixo"
                            className="p-1 disabled:opacity-30"
                            style={{ color: '#64748B' }}
                          >
                            <ChevronDown size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerRep(i)}
                            title="Remover representante"
                            className="p-1"
                            style={{ color: '#DC2626' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-medium mb-0.5" style={{ color: '#94A3B8' }}>
                            Cargo
                          </label>
                          <input
                            type="text"
                            value={r.cargo}
                            onChange={(e) => atualizarRep(i, { cargo: e.target.value })}
                            placeholder="A validar com o cliente"
                            className="w-full px-2.5 py-1.5 text-[12px]"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-medium mb-0.5" style={{ color: '#94A3B8' }}>
                            ID
                          </label>
                          <input
                            type="text"
                            value={r.id_funcional}
                            onChange={(e) => atualizarRep(i, { id_funcional: e.target.value })}
                            placeholder="ID 00000000-00"
                            className="w-full px-2.5 py-1.5 text-[12px]"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FormSection>

          {erro && (
            <div
              className="flex items-start gap-2 px-3 py-2"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}
            >
              <AlertTriangle size={14} style={{ color: '#B91C1C', flexShrink: 0, marginTop: 2 }} />
              <span className="text-[11.5px] font-medium" style={{ color: '#B91C1C' }}>
                {erro}
              </span>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
