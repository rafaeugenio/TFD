'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Home, Lock, HeartHandshake } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { criarInstrumento, useCasasApoio } from '../../_state/servicoSocialStore';
import {
  montarTemplateInstrumento,
  tipoUsaCasaApoio,
} from '../../_data/templates-instrumento';
import {
  TIPOS_INSTRUMENTO,
  TIPO_INSTRUMENTO_LABEL,
  SETOR_ORIGEM_LABEL,
  SITUACAO_DEMANDA_LABEL,
  type DemandaSocialMock,
  type TipoInstrumento,
} from '@/core/mocks/servico-social-seed';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  open: boolean;
  onClose: () => void;
  s: SolicitacaoMock;
  /** Demandas sociais da solicitação. Quando há mais de uma, o drawer pede a
   *  qual delas o instrumento pertence. */
  demandas: DemandaSocialMock[];
  /** Demanda já selecionada ao abrir (normalmente a aberta mais recente). */
  demandaInicialId: string;
}

/**
 * Criação de instrumento a partir de um modelo. O template preenche os dados
 * já existentes da solicitação, do paciente e do acompanhante; o conteúdo
 * continua editável para a profissional registrar a análise. Autora e data e
 * hora são automáticas e não aparecem como campo editável.
 */
export default function NewInstrumentoDrawer({ open, onClose, s, demandas, demandaInicialId }: Props) {
  const { user } = usePermissions();
  const casas = useCasasApoio();
  const casasAtivas = useMemo(() => casas.filter((c) => c.ativa), [casas]);

  const [demandaId, setDemandaId] = useState(demandaInicialId);
  const [tipo, setTipo] = useState<TipoInstrumento | ''>('');
  const [casaId, setCasaId] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [sigiloso, setSigiloso] = useState(false);
  const [tocado, setTocado] = useState(false);

  const profissional = user?.nome_completo ?? 'Assistente Social';

  useEffect(() => {
    if (open) setDemandaId(demandaInicialId);
  }, [open, demandaInicialId]);

  // Escolher o tipo carrega o template correspondente. Trocar a casa de apoio
  // recarrega também, mas nunca por cima de um texto que já foi editado.
  useEffect(() => {
    if (!tipo) {
      setConteudo('');
      setTocado(false);
      return;
    }
    if (tocado) return;
    setConteudo(
      montarTemplateInstrumento(tipo, {
        s,
        profissional,
        casa: casas.find((c) => c.id === casaId),
      }),
    );
  }, [tipo, casaId, casas, s, profissional, tocado]);

  function reset() {
    setDemandaId(demandaInicialId);
    setTipo('');
    setCasaId('');
    setConteudo('');
    setSigiloso(false);
    setTocado(false);
  }

  function fechar() {
    reset();
    onClose();
  }

  function salvar() {
    if (!tipo || !conteudo.trim()) return;
    criarInstrumento({
      demandaId,
      solicitacaoId: s.id,
      tipo,
      conteudo,
      sigiloso,
      autora: profissional,
      autoraId: user?.id,
      casaApoioId: tipoUsaCasaApoio(tipo) && casaId ? casaId : undefined,
    });
    reset();
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={fechar}
      title="Criar instrumento"
      subtitle={`Solicitação ${s.numero} · ${s.paciente.nome}`}
      width="min(760px, 96vw)"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={fechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            disabled={!tipo || !conteudo.trim()}
            onClick={salvar}
          >
            Salvar instrumento
          </button>
        </>
      }
    >
      {demandas.length > 1 && (
        <FormSection
          title="Demanda social"
          icon={<HeartHandshake size={12} />}
          hint="A qual demanda este instrumento pertence."
        >
          <select
            value={demandaId}
            onChange={(e) => setDemandaId(e.target.value)}
            className="w-full text-[13px] px-3 outline-none"
            style={{
              height: 38,
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 8,
              color: '#1A1D2B',
            }}
          >
            {demandas.map((d) => (
              <option key={d.id} value={d.id}>
                {new Date(d.dataEncaminhamento).toLocaleDateString('pt-BR')}
                {' · '}
                {SETOR_ORIGEM_LABEL[d.setorOrigem]}
                {' · '}
                {SITUACAO_DEMANDA_LABEL[d.situacao]}
              </option>
            ))}
          </select>
        </FormSection>
      )}

      <FormSection
        title="Tipo de instrumento"
        icon={<FileText size={12} />}
        hint="Obrigatório. A escolha carrega o modelo correspondente."
      >
        <select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as TipoInstrumento | '');
            setTocado(false);
          }}
          className="w-full text-[13px] px-3 outline-none"
          style={{
            height: 38,
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#1A1D2B',
          }}
        >
          <option value="">Selecione o tipo...</option>
          {TIPOS_INSTRUMENTO.map((t) => (
            <option key={t} value={t}>
              {TIPO_INSTRUMENTO_LABEL[t]}
            </option>
          ))}
        </select>
      </FormSection>

      {tipo && tipoUsaCasaApoio(tipo) && (
        <FormSection
          title="Casa de apoio"
          icon={<Home size={12} />}
          hint="Opcional. Só aparecem casas ativas; o encaminhamento pode ficar sem casa definida."
        >
          <select
            value={casaId}
            onChange={(e) => {
              setCasaId(e.target.value);
              setTocado(false);
            }}
            className="w-full text-[13px] px-3 outline-none"
            style={{
              height: 38,
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 8,
              color: '#1A1D2B',
            }}
          >
            <option value="">Sem casa de apoio definida</option>
            {casasAtivas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.cidadeUf ? ` - ${c.cidadeUf}` : ''}
              </option>
            ))}
          </select>
        </FormSection>
      )}

      {tipo && (
        <>
          <FormSection
            title="Conteúdo"
            icon={<FileText size={12} />}
            hint="O que estiver entre colchetes e em caixa alta precisa ser preenchido por você."
          >
            <textarea
              value={conteudo}
              onChange={(e) => {
                setConteudo(e.target.value);
                setTocado(true);
              }}
              rows={22}
              className="w-full text-[12.5px] px-3 py-2.5 outline-none resize-y font-mono leading-relaxed"
              style={{
                background: 'white',
                border: '1px solid var(--tfd-surface-border)',
                borderRadius: 8,
                color: '#1A1D2B',
              }}
            />
            <p className="text-[12px] mt-2" style={{ color: '#94A3B8' }}>
              As linhas de assinatura são referência visual do documento. O protótipo
              não faz assinatura eletrônica nem envio ao SEI.
            </p>
          </FormSection>

          <FormSection
            title="Sigilo"
            icon={<Lock size={12} />}
            hint="A decisão é sua, conforme o teor do documento."
          >
            <label
              className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer text-[13px]"
              style={{
                background: sigiloso ? '#FEF2F2' : '#F8FAFC',
                border: `1px solid ${sigiloso ? '#FCA5A5' : '#E2E8F0'}`,
                borderRadius: 6,
                color: '#1A1D2B',
              }}
            >
              <input
                type="checkbox"
                checked={sigiloso}
                onChange={(e) => setSigiloso(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>
                <span className="font-medium">Conteúdo sigiloso</span>
                <span className="block text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                  O instrumento continua aparecendo na lista com tipo, data, autora e o
                  selo Sigiloso. Abrir e baixar o conteúdo fica restrito às profissionais
                  do Serviço Social, inclusive para administradores e para a direção do TFD.
                </span>
              </span>
            </label>
          </FormSection>

          <p className="text-[12px] px-1" style={{ color: '#94A3B8' }}>
            Autora e data e hora de criação são registradas automaticamente:{' '}
            <span style={{ color: '#475569' }}>{profissional}</span>.
          </p>
        </>
      )}
    </Drawer>
  );
}
