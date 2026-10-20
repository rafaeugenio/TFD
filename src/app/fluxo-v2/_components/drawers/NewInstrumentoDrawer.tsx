'use client';

import { useEffect, useState } from 'react';
import { FileText, Home, Lock, HeartHandshake, Paperclip, X } from 'lucide-react';
import { useToast } from '@/shared/components/toast/Toast';
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
import type { AnexoInstrumentoMock } from '@/core/mocks/servico-social-seed';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { TIPOS_ANEXO_ASSINADO, montarAnexoAssinado, tamanhoLegivel } from '../../_utils/anexoInstrumento';

interface Props {
  open: boolean;
  onClose: () => void;
  s: SolicitacaoMock;
  /** Demandas sociais da solicitação. Quando há mais de uma, o drawer pede a
   *  qual delas o instrumento pertence. */
  demandas: DemandaSocialMock[];
  /** Demanda já selecionada ao abrir (normalmente a aberta mais recente).
   *  Vazio abre como instrumento avulso. */
  demandaInicialId: string;
}

/**
 * Criação de instrumento a partir de um modelo. O template preenche os dados
 * já existentes da solicitação, do paciente e do acompanhante; o conteúdo
 * continua editável para a profissional registrar a análise. Autora e data e
 * hora são automáticas e não aparecem como campo editável.
 *
 * O instrumento pode responder a uma demanda social ou ser avulso, quando a
 * profissional produz um documento sem que exista um pedido por trás.
 */
export default function NewInstrumentoDrawer({ open, onClose, s, demandas, demandaInicialId }: Props) {
  const { user } = usePermissions();
  const casas = useCasasApoio();
  const toast = useToast();

  const [demandaId, setDemandaId] = useState(demandaInicialId);
  const [tipo, setTipo] = useState<TipoInstrumento | ''>('');
  const [casaId, setCasaId] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [sigiloso, setSigiloso] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [anexo, setAnexo] = useState<AnexoInstrumentoMock | null>(null);
  const casaEscolhida = casas.find((c) => c.id === casaId);
  const ehOutros = tipo === 'outros';

  const profissional = user?.nome_completo ?? 'Assistente Social';

  useEffect(() => {
    if (open) setDemandaId(demandaInicialId);
  }, [open, demandaInicialId]);

  // Escolher o tipo carrega o template correspondente. Trocar o tipo ou a
  // casa de apoio recarrega também, mas nunca por cima de um texto que a
  // profissional já editou (PBI 16406, RN07).
  useEffect(() => {
    if (tocado) return;
    if (!tipo) {
      setConteudo('');
      return;
    }
    setConteudo(
      montarTemplateInstrumento(tipo, {
        s,
        profissional,
        casa: casas.find((c) => c.id === casaId),
      }),
    );
  }, [tipo, casaId, casas, s, profissional, tocado]);

  function reset(revogarAnexo = true) {
    setDemandaId(demandaInicialId);
    setTipo('');
    setCasaId('');
    setConteudo('');
    setSigiloso(false);
    setTocado(false);
    setTitulo('');
    if (anexo && revogarAnexo) URL.revokeObjectURL(anexo.url);
    setAnexo(null);
  }

  function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    const r = montarAnexoAssinado(arquivo, profissional);
    if (!r.ok) { toast.error('Arquivo não aceito', r.erro); return; }
    if (anexo) URL.revokeObjectURL(anexo.url);
    setAnexo(r.anexo);
  }

  function fechar() {
    reset();
    onClose();
  }

  function salvar() {
    if (!tipo || !conteudo.trim() || (ehOutros && !titulo.trim())) return;
    criarInstrumento({
      titulo: ehOutros ? titulo : undefined,
      anexoAssinado: anexo ?? undefined,
      demandaId: demandaId || undefined,
      solicitacaoId: s.id,
      tipo,
      conteudo,
      sigiloso,
      autora: profissional,
      autoraId: user?.id,
      casaApoioId: tipoUsaCasaApoio(tipo) && casaId ? casaId : undefined,
      solicitacaoNumero: s.numero,
      pacienteNome: s.paciente.nome,
      pacienteCpf: s.paciente.cpf,
    });
    // O arquivo passa a pertencer ao instrumento: não revoga a URL ao limpar.
    reset(false);
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
            disabled={!tipo || !conteudo.trim() || (ehOutros && !titulo.trim())}
            onClick={salvar}
          >
            Salvar instrumento
          </button>
        </>
      }
    >
      <FormSection
        title="Demanda social"
        icon={<HeartHandshake size={12} />}
        hint="A qual demanda este instrumento responde. Pode ficar avulso, sem demanda."
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
          <option value="">Avulso, sem demanda vinculada</option>
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

      <FormSection
        title="Tipo de instrumento"
        icon={<FileText size={12} />}
        hint="Obrigatório. A escolha carrega o modelo correspondente."
      >
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoInstrumento | '')}
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
          hint="Opcional. Aparecem todas as casas cadastradas; o encaminhamento pode ficar sem casa definida."
        >
          <select
            value={casaId}
            onChange={(e) => setCasaId(e.target.value)}
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
            {casas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.cidadeUf ? ` - ${c.cidadeUf}` : ''}
              </option>
            ))}
          </select>
          {casaEscolhida?.descricao && (
            <p className="text-[12.5px] mt-2 px-3 py-2 whitespace-pre-wrap" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, color: '#475569' }}>
              <span className="font-semibold" style={{ color: '#1E293B' }}>Sobre a casa: </span>{casaEscolhida.descricao}
            </p>
          )}
        </FormSection>
      )}

      {ehOutros && (
        <FormSection title="Título do documento" icon={<FileText size={12} />} hint="Obrigatório. Aparece na lista e no cabeçalho do PDF.">
          <input
            type="text"
            value={titulo}
            maxLength={120}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Relatório de visita domiciliar"
            className="tfd-input"
          />
        </FormSection>
      )}

      {tipo && (
        <>
          <FormSection
            title="Conteúdo"
            icon={<FileText size={12} />}
            hint={ehOutros ? 'Escreva o documento do jeito que precisar. O texto sai igual no PDF.' : 'O que estiver entre colchetes e em caixa alta precisa ser preenchido por você.'}
          >
            <textarea
              value={conteudo}
              onChange={(e) => {
                setConteudo(e.target.value);
                setTocado(true);
              }}
              rows={22}
              placeholder={ehOutros ? 'Digite aqui o conteúdo do documento.' : undefined}
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

          <FormSection title="Documento assinado" icon={<Paperclip size={12} />} hint="Opcional. Pode ser anexado depois, na lista de instrumentos.">
            {anexo ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-[13px]" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Paperclip size={13} style={{ color: '#94A3B8' }} />
                  <span className="truncate" style={{ color: '#1A1D2B' }}>{anexo.nome}</span>
                  <span style={{ color: '#94A3B8' }}>{tamanhoLegivel(anexo.tamanho)}</span>
                </span>
                <button type="button" aria-label="Remover arquivo" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => { URL.revokeObjectURL(anexo.url); setAnexo(null); }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="tfd-btn tfd-btn-secondary tfd-btn--sm inline-flex cursor-pointer">
                <Paperclip size={13} /> Escolher arquivo
                <input type="file" accept={TIPOS_ANEXO_ASSINADO} className="sr-only" onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            )}
            <p className="text-[12px] mt-2" style={{ color: '#94A3B8' }}>PDF, PNG ou JPG, até 10 MB.</p>
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
                  do Serviço Social; administradores também não abrem.
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
