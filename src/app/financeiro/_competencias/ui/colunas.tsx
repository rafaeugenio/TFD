'use client';

import { ArrowRightLeft, Eye, HandCoins, ReceiptText, Trash2 } from 'lucide-react';
import { TipoBeneficiarioBadge, TipoPercursoBadge } from '@/app/relatorios/_shared/ReportTable';
import { fmtBRL, fmtDataBR } from '@/app/relatorios/_shared/format';
import { avisoPeriodo, valorBpa, type LinhaBpa, type LinhaFaturamento, type LinhaObito, type LinhaReembolso } from '../dados';
import type { RegistroDespesasObito, RegistroReembolso } from '../store';
import { totalDespesas } from '../resumo';
import type { Coluna } from './Tabela';

const mono: React.CSSProperties = { fontFamily: 'var(--tfd-mono)' };
const apoio: React.CSSProperties = { fontSize: 11.5, color: 'var(--tfd-text-muted)' };

export interface OpcoesColunas {
  /** Mês da competência (AAAA-MM): linhas de outro mês ganham o selo "Fora do período". */
  mesCompetencia?: string;
  onVer: (solicitacaoId: string) => void;
  /** Remover da competência (só com a frente aberta). */
  onRemover?: (chave: string) => void;
  /** Competência onde a linha já está (tela de inclusão). */
  competenciaDe?: (chave: string) => string | undefined;
}

/** Ação extra da linha (registrar reembolso, registrar despesas). */
interface AcaoExtra {
  rotulo: string;
  icone: React.ReactNode;
  onClick: () => void;
}

/** Selo permanente de linha fora do mês da competência (ex.: lançamento atrasado). */
function ForaDoPeriodo({ mesReferencia, mesCompetencia }: { mesReferencia: string; mesCompetencia?: string }) {
  const aviso = mesCompetencia ? avisoPeriodo(mesReferencia, mesCompetencia) : '';
  if (!aviso) return null;
  return (
    <span className="tfd-tag tfd-tag--warning" style={{ display: 'flex', width: 'fit-content', marginTop: 4, fontSize: 11, padding: '2px 8px' }}>
      {aviso}
    </span>
  );
}

function Acoes({ solicitacaoId, chave, o, olho, extra }: {
  solicitacaoId: string; chave: string; o: OpcoesColunas;
  /** Substitui "Ver solicitação" (ex.: abrir as despesas em modo leitura). */
  olho?: { rotulo: string; onClick: () => void };
  extra?: AcaoExtra;
}) {
  const botao: React.CSSProperties = { width: 32, height: 32, borderRadius: 6 };
  const rotuloOlho = olho?.rotulo ?? 'Ver solicitação';
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {extra && (
        <button type="button" title={extra.rotulo} aria-label={extra.rotulo} onClick={extra.onClick} className="inline-flex items-center justify-center hover:bg-[var(--tfd-blue-50)]" style={{ ...botao, color: 'var(--tfd-blue-500)' }}>
          {extra.icone}
        </button>
      )}
      <button type="button" title={rotuloOlho} aria-label={rotuloOlho} onClick={olho ? olho.onClick : () => o.onVer(solicitacaoId)} className="inline-flex items-center justify-center hover:bg-[var(--tfd-100)]" style={{ ...botao, color: 'var(--tfd-text-muted)' }}>
        <Eye size={16} />
      </button>
      {o.onRemover && (
        <button type="button" title="Remover da competência" aria-label="Remover da competência" onClick={() => o.onRemover!(chave)} className="inline-flex items-center justify-center hover:bg-[#FEF2F2]" style={{ ...botao, color: 'var(--tfd-danger)' }}>
          <Trash2 size={15} />
        </button>
      )}
    </span>
  );
}

function Pessoa({ l }: { l: LinhaBpa }) {
  const sub = [l.documento, l.sexo?.[0]?.toUpperCase(), l.nascimento ? fmtDataBR(l.nascimento) : ''].filter(Boolean).join(' · ');
  return (
    <div style={{ minWidth: 200 }}>
      <span className="inline-flex items-center gap-1.5"><TipoBeneficiarioBadge tipo={l.beneficiario} /><strong style={{ fontWeight: 600 }}>{l.nome || 'Não informado'}</strong></span>
      <span className="block" style={{ ...apoio, ...mono }}>{sub || 'Sem documento'}</span>
    </div>
  );
}

function Contato({ l }: { l: LinhaBpa }) {
  return (
    <div style={{ minWidth: 150 }}>
      <span className="block" style={mono}>{l.telefone || 'Sem telefone'}</span>
      <span className="block" style={{ ...apoio, overflowWrap: 'anywhere' }}>{l.email || 'Sem e-mail'}</span>
    </div>
  );
}

function Endereco({ l }: { l: LinhaBpa }) {
  const bairroCep = [l.bairro, l.cep].filter(Boolean).join(' · ');
  if (!l.endereco && !bairroCep && !l.municipio) return <span style={apoio}>Sem endereço</span>;
  return (
    <div style={{ minWidth: 170 }}>
      {l.endereco && <span className="block">{l.endereco}</span>}
      {bairroCep && <span className="block" style={apoio}>{bairroCep}</span>}
      {l.municipio && <span className="block" style={apoio}>{l.municipio}</span>}
    </div>
  );
}

function Procedimento({ codigo, descricao, qtd, valor }: { codigo?: string; descricao?: string; qtd?: number; valor: number | null }) {
  if (!codigo || !qtd) return <span style={apoio}>Não se aplica</span>;
  return (
    <div title={descricao}>
      <span className="block" style={{ ...mono, whiteSpace: 'nowrap' }}>{codigo}</span>
      <span className="block" style={{ ...apoio, whiteSpace: 'nowrap' }}>{qtd} dia{qtd > 1 ? 's' : ''} · {valor != null ? fmtBRL(valor) : 'sem valor'}</span>
    </div>
  );
}

export function colunasFaturamento(o: OpcoesColunas): Coluna<LinhaFaturamento>[] {
  return [
    { key: 'processo', header: 'Processo', render: (l) => <span style={{ ...mono, whiteSpace: 'nowrap' }}>{l.processo || 'Sem número'}</span> },
    {
      key: 'emissao', header: 'Data emissão',
      render: (l) => (<><span style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(l.dataEmissao)}</span><ForaDoPeriodo mesReferencia={l.mesReferencia} mesCompetencia={o.mesCompetencia} /></>),
    },
    { key: 'passageiro', header: 'Passageiro', render: (l) => <span className="inline-flex items-center gap-1.5"><TipoBeneficiarioBadge tipo={l.beneficiario} /><span style={{ fontWeight: 500 }}>{l.passageiro}</span></span> },
    { key: 'tipo', header: 'Tipo', render: (l) => <TipoPercursoBadge tipo={l.tipo} /> },
    { key: 'viagem', header: 'Data viagem', render: (l) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(l.dataViagem)}</span> },
    {
      key: 'trecho', header: 'Trecho',
      render: (l) => <span className="inline-flex items-center gap-1" style={{ ...mono, fontSize: 12 }}>{l.origem}<ArrowRightLeft size={10} style={{ color: 'var(--tfd-400)' }} />{l.destino}</span>,
    },
    { key: 'valor', header: 'Valor', align: 'right', render: (l) => <span style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(l.valor)}</span> },
    { key: 'total', header: 'Total', align: 'right', render: (l) => <strong style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(l.valor)}</strong> },
    ...(o.competenciaDe ? [{ key: 'comp', header: 'Competência', render: (l: LinhaFaturamento) => <span style={apoio}>{o.competenciaDe!(l.chave) ?? 'Nenhuma'}</span> }] : []),
    { key: 'acoes', header: 'Ações', align: 'right', render: (l) => <Acoes solicitacaoId={l.solicitacaoId} chave={l.chave} o={o} /> },
  ];
}

export function colunasBpaAjuda(o: OpcoesColunas, sig: Record<string, number>): Coluna<LinhaBpa>[] {
  return [
    { key: 'n', header: '#', render: (_l, i) => <span style={mono}>{String(i + 1).padStart(3, '0')}</span> },
    { key: 'pessoa', header: 'Pessoa', render: (l) => <Pessoa l={l} /> },
    { key: 'contato', header: 'Contato', render: (l) => <Contato l={l} /> },
    { key: 'endereco', header: 'Endereço', render: (l) => <Endereco l={l} /> },
    { key: 'inicio', header: 'Início ajuda', render: (l) => (<><span style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtDataBR(l.dataAtendimento)}</span><ForaDoPeriodo mesReferencia={l.mesReferencia} mesCompetencia={o.mesCompetencia} /></>) },
    { key: 'cid', header: 'CID', render: (l) => <span style={mono}>{l.cid || 'Sem CID'}</span> },
    { key: 'com', header: 'Proced. c/ pernoite', render: (l) => <Procedimento codigo={l.codigoPernoite} descricao={l.descricaoPernoite} qtd={l.qtdPernoite} valor={l.codigoPernoite && l.qtdPernoite ? (sig[l.codigoPernoite] ?? 0) * l.qtdPernoite : null} /> },
    { key: 'sem', header: 'Proced. s/ pernoite', render: (l) => <Procedimento codigo={l.codigoSemPernoite} descricao={l.descricaoSemPernoite} qtd={l.qtdSemPernoite} valor={l.codigoSemPernoite && l.qtdSemPernoite ? (sig[l.codigoSemPernoite] ?? 0) * l.qtdSemPernoite : null} /> },
    { key: 'total', header: 'Total', align: 'right', render: (l) => <strong style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(valorBpa(l, sig))}</strong> },
    ...(o.competenciaDe ? [{ key: 'comp', header: 'Competência', render: (l: LinhaBpa) => <span style={apoio}>{o.competenciaDe!(l.chave) ?? 'Nenhuma'}</span> }] : []),
    { key: 'acoes', header: 'Ações', align: 'right', render: (l) => <Acoes solicitacaoId={l.solicitacaoId} chave={l.chave} o={o} /> },
  ];
}

export function colunasBpaDeslocamento(o: OpcoesColunas, sig: Record<string, number>): Coluna<LinhaBpa>[] {
  return [
    { key: 'n', header: '#', render: (_l, i) => <span style={mono}>{String(i + 1).padStart(3, '0')}</span> },
    { key: 'pessoa', header: 'Pessoa', render: (l) => <Pessoa l={l} /> },
    { key: 'contato', header: 'Contato', render: (l) => <Contato l={l} /> },
    { key: 'endereco', header: 'Endereço', render: (l) => <Endereco l={l} /> },
    { key: 'dt', header: 'Dt. viagem', render: (l) => (<><span style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtDataBR(l.dataAtendimento)}</span><ForaDoPeriodo mesReferencia={l.mesReferencia} mesCompetencia={o.mesCompetencia} /></>) },
    {
      key: 'rota', header: 'Rota',
      render: (l) => (
        <div style={{ minWidth: 180 }}>
          <span className="block" style={{ fontSize: 12.5 }}>{l.rota}</span>
          <span className="block" style={{ ...apoio, ...mono }}>
            {l.modal === 'aereo' ? 'Aéreo' : l.modal === 'fluvial' ? 'Fluvial' : 'Terrestre'} · {l.distancia != null ? `${l.distancia.toLocaleString('pt-BR')} ${l.unidade ?? ''}` : <span style={{ color: '#C2410C' }}>sem distância</span>}
          </span>
        </div>
      ),
    },
    { key: 'sigtap', header: 'SIGTAP', render: (l) => <div title={l.descricao}><span className="block" style={mono}>{l.codigo}</span><span className="block" style={apoio}>{l.descricao}</span></div> },
    { key: 'qtd', header: 'Qtd.', align: 'right', render: (l) => (l.quantidade == null ? <span style={{ color: '#C2410C', whiteSpace: 'nowrap' }}>pendente</span> : l.quantidade) },
    { key: 'cid', header: 'CID', render: (l) => <span style={mono}>{l.cid || 'Sem CID'}</span> },
    { key: 'valor', header: 'Valor SIGTAP', align: 'right', render: (l) => <span style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(valorBpa(l, sig))}</span> },
    ...(o.competenciaDe ? [{ key: 'comp', header: 'Competência', render: (l: LinhaBpa) => <span style={apoio}>{o.competenciaDe!(l.chave) ?? 'Nenhuma'}</span> }] : []),
    { key: 'acoes', header: 'Ações', align: 'right', render: (l) => <Acoes solicitacaoId={l.solicitacaoId} chave={l.chave} o={o} /> },
  ];
}

/** Linhas do Reembolso. Sem `reg`, é a tela de inclusão (sem colunas de registro). */
export function colunasReembolso(
  o: OpcoesColunas,
  reg?: Record<string, RegistroReembolso>,
  onRegistrar?: (l: LinhaReembolso) => void,
): Coluna<LinhaReembolso>[] {
  return [
    { key: 'processo', header: 'Processo', render: (l) => <span style={{ ...mono, whiteSpace: 'nowrap' }}>{l.processo || 'Sem número'}</span> },
    { key: 'passageiro', header: 'Passageiro', render: (l) => <span style={{ fontWeight: 500 }}>{l.passageiro}</span> },
    { key: 'tipo', header: 'Tipo', render: (l) => <TipoPercursoBadge tipo={l.tipo} /> },
    { key: 'viagem', header: 'Data viagem', render: (l) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(l.dataViagem)}</span> },
    {
      key: 'trecho', header: 'Trecho',
      render: (l) => <span className="inline-flex items-center gap-1" style={{ ...mono, fontSize: 12 }}>{l.origem}<ArrowRightLeft size={10} style={{ color: 'var(--tfd-400)' }} />{l.destino}</span>,
    },
    { key: 'passagem', header: 'Valor passagem', align: 'right', render: (l) => <span style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(l.valorPassagem)}</span> },
    ...(reg
      ? [
          {
            key: 'data', header: 'Data reembolso',
            render: (l: LinhaReembolso) => (reg[l.chave] ? <span style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(reg[l.chave].data)}</span> : <span className="tfd-tag tfd-tag--warning" style={{ fontSize: 11, padding: '2px 8px', whiteSpace: 'nowrap' }}>Pendente</span>),
          },
          {
            key: 'receber', header: 'A receber', align: 'right' as const,
            render: (l: LinhaReembolso) => (reg[l.chave] ? <strong style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(reg[l.chave].valor)}</strong> : <span style={apoio}>Sem valor</span>),
          },
        ]
      : []),
    {
      key: 'acoes', header: 'Ações', align: 'right',
      render: (l) => (
        <Acoes
          solicitacaoId={l.solicitacaoId} chave={l.chave} o={o}
          extra={onRegistrar ? { rotulo: reg?.[l.chave] ? 'Corrigir reembolso' : 'Registrar reembolso', icone: <HandCoins size={16} />, onClick: () => onRegistrar(l) } : undefined}
        />
      ),
    },
  ];
}

/** Linhas do Óbito. Sem `reg`, é a tela de inclusão (sem colunas de despesas). */
export function colunasObito(
  o: OpcoesColunas,
  reg?: Record<string, RegistroDespesasObito>,
  acoes?: { onDetalhar: (l: LinhaObito) => void; onRegistrar?: (l: LinhaObito) => void },
): Coluna<LinhaObito>[] {
  return [
    { key: 'processo', header: 'Processo', render: (l) => <span style={{ ...mono, whiteSpace: 'nowrap' }}>{l.processo || 'Sem número'}</span> },
    {
      key: 'paciente', header: 'Paciente',
      render: (l) => (
        <div style={{ minWidth: 180 }}>
          <strong style={{ fontWeight: 600 }}>{l.paciente}</strong>
          <span className="block" style={{ ...apoio, ...mono }}>{l.documento || 'Sem documento'}</span>
        </div>
      ),
    },
    { key: 'falecimento', header: 'Data falecimento', render: (l) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(l.dataFalecimento)}</span> },
    ...(reg
      ? [
          {
            key: 'pagamento', header: 'Data pagamento',
            render: (l: LinhaObito) => (reg[l.chave] ? <span style={{ whiteSpace: 'nowrap' }}>{fmtDataBR(reg[l.chave].dataPagamento)}</span> : <span className="tfd-tag tfd-tag--warning" style={{ fontSize: 11, padding: '2px 8px', whiteSpace: 'nowrap' }}>Pendente</span>),
          },
          { key: 'itens', header: 'Itens', align: 'right' as const, render: (l: LinhaObito) => <span style={mono}>{reg[l.chave]?.despesas.length ?? 0}</span> },
          {
            key: 'total', header: 'Valor total', align: 'right' as const,
            render: (l: LinhaObito) => (reg[l.chave] ? <strong style={{ ...mono, whiteSpace: 'nowrap' }}>{fmtBRL(totalDespesas(reg[l.chave]))}</strong> : <span style={apoio}>Sem despesas</span>),
          },
        ]
      : [{ key: 'sinalizado', header: 'Sinalizado por', render: (l: LinhaObito) => <span style={apoio}>{l.sinalizadoPor}</span> }]),
    {
      key: 'acoes', header: 'Ações', align: 'right',
      render: (l) => (
        <Acoes
          solicitacaoId={l.solicitacaoId} chave={l.chave} o={o}
          olho={acoes ? { rotulo: 'Ver despesas', onClick: () => acoes.onDetalhar(l) } : undefined}
          extra={acoes?.onRegistrar ? { rotulo: 'Registrar despesas', icone: <ReceiptText size={16} />, onClick: () => acoes.onRegistrar!(l) } : undefined}
        />
      ),
    },
  ];
}
