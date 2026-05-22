'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Phone, Target, MessageSquare } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import AnexosUploadField, { type AnexoLocal } from '@/shared/components/anexos-upload-field/AnexosUploadField';
import { useToast } from '@/shared/components/toast/Toast';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import {
  DESFECHO_TENTATIVA_LABEL,
  type DesfechoTentativa,
  type TentativaUnidadeMock,
  type TipoProcedimento,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { agendamentoConfirmado } from '../../_utils/agendamento';
import { listarUnidadesSaude } from '@/services/unidades-saude.service';
import AuxSelectInline from '@/shared/components/aux-select-inline/AuxSelectInline';
import { maskPhone } from '@/shared/pipes/formatters';

// Validações simples para os campos livres de contato.
const TELEFONE_REGEX = /^\(\d{2}\) 9?\d{4}-\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UnidadeRow {
  id: string;
  nome: string;
  cnes: string | null;
  cidade: string;
  uf: string;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  /** T2.AL — Quando informado, drawer entra em modo edição. */
  editar?: TentativaUnidadeMock;
}

const DESFECHOS_ORDENADOS: DesfechoTentativa[] = [
  'pendente',
  'negou',
  'pediu_documento',
  'aceitou',
  'sem_resposta',
  'agendamento_confirmado',
];

export default function NewTentativaDrawer({ open, onClose, solicitacaoId, editar }: Props) {
  const { addTentativa, editarTentativa, getById, addAnexos } = useFluxoV2State();
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const toast = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [unidade, setUnidade] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [data, setData] = useState(''); // data da tentativa (contato com a unidade)
  const [dataAgendamento, setDataAgendamento] = useState(''); // data do agendamento do paciente
  const [desfecho, setDesfecho] = useState<DesfechoTentativa>('pendente');
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimento | ''>('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [obs, setObs] = useState('');
  const [forcarSubstituicao, setForcarSubstituicao] = useState(false);

  const [unidades, setUnidades] = useState<UnidadeRow[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUnidades(true);
    listarUnidadesSaude({ pageSize: 9999 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn('[NewTentativaDrawer] unidades:', error.message);
      setUnidades(((data ?? []) as unknown as UnidadeRow[]).filter((u) => u.nome));
      setLoadingUnidades(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  const isEdicao = !!editar;
  const solic = getById(solicitacaoId);
  const confirmadaAtual = solic ? agendamentoConfirmado(solic) : undefined;

  useEffect(() => {
    if (!open) return;
    if (editar) {
      setUnidade(editar.unidade);
      setUnidadeId('');
      // Date input usa só YYYY-MM-DD; aceita ISO datetime cortando.
      setData(editar.data?.slice(0, 10) ?? '');
      setDataAgendamento(editar.dataAgendamento?.slice(0, 10) ?? '');
      setDesfecho(editar.desfecho);
      setTipoProcedimento(editar.tipoProcedimento ?? '');
      // Tenta separar telefone do email se vier no formato "tel · email" do legado.
      const partes = (editar.contatoUnidade ?? '').split(' · ');
      const possivelEmail = partes.find((p) => p.includes('@'));
      const possivelTel = partes.find((p) => !p.includes('@'));
      setTelefoneContato(possivelTel ?? '');
      setEmailContato(possivelEmail ?? '');
      // "Observações de chegada" foi unificado em uma única observação.
      setObs(editar.observacao ?? editar.observacoesChegada ?? '');
    } else {
      setUnidade('');
      setUnidadeId('');
      setData('');
      setDataAgendamento('');
      setDesfecho('pendente');
      setTipoProcedimento('');
      setTelefoneContato('');
      setEmailContato('');
      setObs('');
    }
    setForcarSubstituicao(false);
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [open, editar]);

  const isConfirmacao = desfecho === 'agendamento_confirmado';

  // Há uma OUTRA tentativa confirmada nessa solicitação? (ignora a própria, em edição)
  const conflitoConfirmacao = useMemo(() => {
    if (!isConfirmacao || !confirmadaAtual) return null;
    if (editar && confirmadaAtual.id === editar.id) return null;
    return confirmadaAtual;
  }, [isConfirmacao, confirmadaAtual, editar]);

  // Telefone e email são opcionais, mas se preenchidos precisam estar válidos.
  const telTrim = telefoneContato.trim();
  const emailTrim = emailContato.trim();
  const telefoneValido = telTrim.length === 0 || TELEFONE_REGEX.test(telTrim);
  const emailValido = emailTrim.length === 0 || EMAIL_REGEX.test(emailTrim);

  const valido =
    (unidadeId.length > 0 || unidade.trim().length > 0) &&
    data.length > 0 &&
    telefoneValido &&
    emailValido &&
    (!isConfirmacao || dataAgendamento.length > 0) &&
    (!conflitoConfirmacao || forcarSubstituicao);

  function handleSalvar() {
    if (!valido) return;
    // Junta telefone + email no campo `contatoUnidade` (registra como o
    // contato foi feito — separados por " · ").
    const partes: string[] = [];
    if (telTrim) partes.push(telTrim);
    if (emailTrim) partes.push(emailTrim);
    const contatoFinal = partes.length > 0 ? partes.join(' · ') : undefined;

    const payload = {
      unidade: unidade.trim(),
      data, // data de contato com a unidade
      desfecho,
      observacao: obs.trim() || undefined,
      // Data efetiva do agendamento do paciente (≠ data da tentativa).
      dataAgendamento: isConfirmacao ? dataAgendamento : undefined,
      hora: undefined,
      tipoProcedimento: isConfirmacao ? (tipoProcedimento || undefined) : undefined,
      contatoUnidade: contatoFinal,
      observacoesChegada: undefined,
    };
    if (isEdicao && editar) {
      editarTentativa(solicitacaoId, editar.id, payload);
      toast.success('Tentativa atualizada', unidade);
    } else {
      addTentativa(solicitacaoId, payload);
      toast.success('Tentativa registrada', unidade);
    }
    if (anexos.length > 0) {
      addAnexos(solicitacaoId, anexos, 'tentativa');
      setAnexos([]);
    }
    onClose();
  }

  const titulo = isEdicao ? 'Editar tentativa' : 'Nova tentativa';
  const subtitulo = isEdicao
    ? 'Atualize unidade, desfecho ou detalhes do agendamento.'
    : 'Registre o contato com a unidade — e quando ela aceitar, marque como agendamento confirmado.';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={subtitulo}
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
            disabled={!valido}
          >
            {isEdicao
              ? 'Salvar alterações'
              : isConfirmacao && conflitoConfirmacao && forcarSubstituicao
                ? 'Confirmar e substituir'
                : 'Salvar tentativa'}
          </button>
        </>
      }
    >
      <FormSection title="Contato" icon={<Phone size={12} />} tone="primary">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[12px] font-semibold" style={{ color: '#6B7280' }}>
          Unidade contatada
        </label>
        <a
          href="/unidades-saude"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] inline-flex items-center gap-1 hover:underline"
          style={{ color: 'var(--tfd-blue)' }}
        >
          <ExternalLink size={11} />
          Cadastrar nova unidade
        </a>
      </div>
      <select
        ref={firstInputRef as unknown as React.RefObject<HTMLSelectElement>}
        value={unidadeId}
        onChange={(e) => {
          const id = e.target.value;
          setUnidadeId(id);
          const u = unidades.find((x) => x.id === id);
          setUnidade(u ? `${u.nome}${u.cnes ? ` (CNES ${u.cnes})` : ''}` : '');
        }}
        disabled={loadingUnidades}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        <option value="">
          {loadingUnidades
            ? 'Carregando unidades...'
            : unidades.length === 0
              ? 'Nenhuma unidade cadastrada'
              : 'Selecione a unidade...'}
        </option>
        {unidades.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
            {u.cnes ? ` — CNES ${u.cnes}` : ''}
            {u.cidade ? ` (${u.cidade}${u.uf ? `/${u.uf}` : ''})` : ''}
          </option>
        ))}
      </select>

      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Data da tentativa
      </label>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      />

      {/* Telefone + email — campos livres pra registrar como o contato foi feito.
          O canal (WhatsApp, SMS, e-mail, Telegram, etc.) vem na linha abaixo. */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            Telefone
          </label>
          <input
            type="tel"
            value={telefoneContato}
            onChange={(e) => setTelefoneContato(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            className="w-full px-3 py-2 text-[13px] font-mono"
            style={{
              ...inputStyle,
              borderColor: telefoneValido ? 'var(--tfd-surface-border)' : '#DC2626',
            }}
          />
          {!telefoneValido && (
            <p className="mt-1 text-[11px]" style={{ color: '#DC2626' }}>
              Formato esperado: (DD) XXXX-XXXX ou (DD) 9XXXX-XXXX.
            </p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
            E-mail
          </label>
          <input
            type="email"
            value={emailContato}
            onChange={(e) => setEmailContato(e.target.value)}
            placeholder="contato@unidade.gov.br"
            inputMode="email"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full px-3 py-2 text-[13px]"
            style={{
              ...inputStyle,
              borderColor: emailValido ? 'var(--tfd-surface-border)' : '#DC2626',
            }}
          />
          {!emailValido && (
            <p className="mt-1 text-[11px]" style={{ color: '#DC2626' }}>
              E-mail inválido.
            </p>
          )}
        </div>
      </div>
      </FormSection>

      <FormSection title="Desfecho da tentativa" icon={<Target size={12} />} tone="info">
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Desfecho
      </label>
      <select
        value={desfecho}
        onChange={(e) => setDesfecho(e.target.value as DesfechoTentativa)}
        className="w-full px-3 py-2 text-[13px] mb-4"
        style={inputStyle}
      >
        {DESFECHOS_ORDENADOS.map((d) => (
          <option key={d} value={d}>
            {DESFECHO_TENTATIVA_LABEL[d]}
          </option>
        ))}
      </select>

      {isConfirmacao && (
        <div
          className="mb-4 px-4 py-3"
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 10,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} style={{ color: '#15803D' }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#15803D', letterSpacing: '0.06em' }}>
              Detalhes do agendamento
            </span>
          </div>

          <AuxSelectInline
            categoria="tipo_procedimento"
            label="Tipo de procedimento"
            value={tipoProcedimento}
            onChange={(v) => setTipoProcedimento(v as TipoProcedimento | '')}
            placeholder="— não informado —"
            className="mb-3"
          />

          <label className="block text-[12px] font-semibold mb-2" style={{ color: '#15803D' }}>
            Data do agendamento <span style={{ color: '#94A3B8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(data em que o paciente vai à unidade)</span>
          </label>
          <input
            type="date"
            value={dataAgendamento}
            onChange={(e) => setDataAgendamento(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={inputStyle}
          />

          <p className="mt-2 text-[11.5px]" style={{ color: '#475569' }}>
            A <strong>data da tentativa</strong> acima é quando o contato foi feito;
            a <strong>data do agendamento</strong> é quando o paciente comparece à unidade.
          </p>
        </div>
      )}

      {/* Aviso de substituição */}
      {conflitoConfirmacao && (
        <div
          className="mb-4 px-3 py-3 flex items-start gap-2.5"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: 10,
            color: '#78350F',
          }}
        >
          <AlertTriangle size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 text-[12.5px] leading-relaxed">
            <strong style={{ color: '#92400E' }}>Já existe um agendamento confirmado</strong>
            {' em '}
            <strong>{conflitoConfirmacao.unidade}</strong>.
            <br />
            Salvar isso vai mover o agendamento confirmado para esta tentativa — a anterior volta para
            o desfecho <em>Aceitou</em>.
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forcarSubstituicao}
                onChange={(e) => setForcarSubstituicao(e.target.checked)}
              />
              <span className="text-[12px] font-medium" style={{ color: '#92400E' }}>
                Sim, substituir o agendamento confirmado.
              </span>
            </label>
          </div>
        </div>
      )}

      </FormSection>

      <FormSection title="Observação" icon={<MessageSquare size={12} />} tone="default">
      <label className="block text-[12px] font-semibold mb-2" style={{ color: '#6B7280' }}>
        Observação
      </label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={3}
        placeholder="Detalhes da tentativa..."
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      />
      </FormSection>

      <AnexosUploadField value={anexos} onChange={setAnexos} hint="E-mail trocado, print de WhatsApp, comprovante (opcional)." />
    </Drawer>
  );
}
