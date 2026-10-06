'use client';

/* -------------------------------------------------------------------------- */
/*  Exportação da competência (PDF, CSV e Excel), por aba e respeitando a     */
/*  busca e o filtro da tela. Mesmas bibliotecas do construtor de relatórios  */
/*  (jspdf, jspdf-autotable, exceljs), numa versão enxuta: a tabela da        */
/*  competência tem colunas fixas e não passa pelo motor do construtor.       */
/*  Aba fechada exporta a cópia do fechamento; aberta, os dados atuais.       */
/* -------------------------------------------------------------------------- */

import { registrarLog } from '@/services/auditoria.service';
import type { InsertDTO } from '@/lib/supabase/database.types';
import { fmtBRL, fmtDataBR } from '@/app/relatorios/_shared/format';
import { avisoPeriodo, valorBpa, type LinhaBpa, type LinhaFaturamento } from './dados';

export type Formato = 'pdf' | 'csv' | 'xlsx';
type TipoColuna = 'texto' | 'moeda' | 'numero';
type Celula = string | number | null;

export interface ColunaExportada {
  rotulo: string;
  tipo?: TipoColuna;
}

export interface Planilha {
  /** Título do arquivo e do cabeçalho do PDF. */
  titulo: string;
  /** Descrição do recorte (competência, aba, situação, filtro) e totais. */
  resumo: Array<{ rotulo: string; valor: string }>;
  colunas: ColunaExportada[];
  linhas: Celula[][];
}

const LIMITE_COLUNAS_PDF = 10;

function nomeArquivo(titulo: string, ext: string) {
  const base = titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base || 'competencia'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const textoCelula = (c: ColunaExportada, v: Celula) => {
  if (v === null || v === '') return '';
  if (c.tipo === 'moeda') return fmtBRL(Number(v));
  if (c.tipo === 'numero') return Number(v).toLocaleString('pt-BR');
  return String(v);
};

function exportarCSV(p: Planilha) {
  const esc = (s: Celula) => {
    const t = s === null ? '' : typeof s === 'number' ? String(s).replace('.', ',') : s;
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const corpo = [p.colunas.map((c) => esc(c.rotulo)).join(';'), ...p.linhas.map((l) => l.map(esc).join(';'))].join('\r\n');
  // BOM para o Excel abrir acentos corretamente; ";" é o separador do Excel em pt-BR.
  baixar(new Blob([`﻿${corpo}`], { type: 'text/csv;charset=utf-8' }), nomeArquivo(p.titulo, 'csv'));
}

async function exportarXLSX(p: Planilha) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TFD SES-MA';
  const dados = wb.addWorksheet('Dados');
  dados.columns = p.colunas.map((c, i) => ({
    header: c.rotulo,
    key: String(i),
    width: Math.min(48, Math.max(14, c.rotulo.length + 4)),
    style: c.tipo === 'moeda' ? { numFmt: '"R$" #,##0.00' } : c.tipo === 'numero' ? { numFmt: '#,##0.##' } : {},
  }));
  dados.getRow(1).font = { bold: true };
  dados.views = [{ state: 'frozen', ySplit: 1 }];
  for (const l of p.linhas) dados.addRow(Object.fromEntries(l.map((v, i) => [String(i), v ?? ''])));

  const sobre = wb.addWorksheet('Sobre a exportação');
  sobre.columns = [{ width: 28 }, { width: 90 }];
  sobre.addRow([p.titulo]).font = { bold: true, size: 14 };
  sobre.addRow([]);
  for (const r of p.resumo) sobre.addRow([r.rotulo, r.valor]);
  sobre.addRow(['Gerado em', new Date().toLocaleString('pt-BR')]);

  const buffer = await wb.xlsx.writeBuffer();
  baixar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArquivo(p.titulo, 'xlsx'));
}

async function exportarPDF(p: Planilha) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: p.colunas.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const margem = 40;
  const largura = doc.internal.pageSize.getWidth() - margem * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(p.titulo, margem, 50);
  let y = 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  for (const r of p.resumo) {
    const texto = doc.splitTextToSize(`${r.rotulo}: ${r.valor}`, largura);
    doc.text(texto, margem, y);
    y += 13 * texto.length;
  }

  autoTable(doc, {
    startY: y + 8,
    head: [p.colunas.map((c) => c.rotulo)],
    body: p.linhas.map((l) => l.map((v, i) => textoCelula(p.colunas[i], v))),
    styles: { fontSize: p.colunas.length > LIMITE_COLUNAS_PDF ? 6.5 : 8, cellPadding: 4 },
    headStyles: { fillColor: [20, 107, 250], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margem, right: margem },
    columnStyles: Object.fromEntries(p.colunas.map((c, j) => [j, c.tipo === 'moeda' || c.tipo === 'numero' ? { halign: 'right' as const } : {}])),
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`TFD SES-MA · gerado em ${new Date().toLocaleString('pt-BR')}`, margem, h - 20);
    },
  });
  doc.save(nomeArquivo(p.titulo, 'pdf'));
}

export async function gerarArquivo(formato: Formato, p: Planilha) {
  if (formato === 'csv') exportarCSV(p);
  else if (formato === 'xlsx') await exportarXLSX(p);
  else await exportarPDF(p);
}

/* ── Linhas de cada aba ──────────────────────────────────────────────────── */

const beneficiario = (b: string) => (b === 'acompanhante' ? 'Acompanhante' : 'Paciente');
const tipoPercurso = (t: LinhaFaturamento['tipo']) => (t === 'IDA_E_VOLTA' ? 'Ida e volta' : t === 'VOLTA' ? 'Volta' : 'Ida');

export function planilhaFaturamento(linhas: LinhaFaturamento[], mesCompetencia: string, aposReabertura: Set<string>) {
  return {
    colunas: [
      { rotulo: 'Processo' }, { rotulo: 'Data emissão' }, { rotulo: 'Aviso de período' }, { rotulo: 'Passageiro' }, { rotulo: 'Beneficiário' },
      { rotulo: 'Tipo' }, { rotulo: 'Data viagem' }, { rotulo: 'Origem' }, { rotulo: 'Destino' },
      { rotulo: 'Valor', tipo: 'moeda' as const }, { rotulo: 'Reembolso ao TFD', tipo: 'moeda' as const }, { rotulo: 'Incluída após reabertura' },
    ],
    linhas: linhas.map((l): Celula[] => [
      l.processo, fmtDataBR(l.dataEmissao), avisoPeriodo(l.mesReferencia, mesCompetencia), l.passageiro, beneficiario(l.beneficiario),
      tipoPercurso(l.tipo), l.dataViagem ? fmtDataBR(l.dataViagem) : '', l.origem, l.destino,
      l.valor, l.valorReembolso, aposReabertura.has(l.chave) ? 'Sim' : 'Não',
    ]),
  };
}

const pessoa = (l: LinhaBpa): Celula[] => [
  l.nome, beneficiario(l.beneficiario), l.documento, l.sexo ?? '', l.nascimento ? fmtDataBR(l.nascimento) : '',
  l.telefone ?? '', l.email ?? '', l.endereco ?? '', l.bairro ?? '', l.cep ?? '', l.municipio ?? '',
];
const colunasPessoa: ColunaExportada[] = [
  { rotulo: 'Nome' }, { rotulo: 'Beneficiário' }, { rotulo: 'CNS/CPF' }, { rotulo: 'Sexo' }, { rotulo: 'Nascimento' },
  { rotulo: 'Telefone' }, { rotulo: 'E-mail' }, { rotulo: 'Endereço' }, { rotulo: 'Bairro' }, { rotulo: 'CEP' }, { rotulo: 'Município' },
];

export function planilhaBpaAjuda(linhas: LinhaBpa[], sig: Record<string, number>, lancados: Set<string>, mesCompetencia: string) {
  return {
    colunas: [
      { rotulo: '#' }, { rotulo: 'Processo' }, ...colunasPessoa, { rotulo: 'Início ajuda' }, { rotulo: 'Aviso de período' }, { rotulo: 'CID' },
      { rotulo: 'Proced. c/ pernoite' }, { rotulo: 'Qtd. c/ pernoite', tipo: 'numero' as const }, { rotulo: 'Valor c/ pernoite', tipo: 'moeda' as const },
      { rotulo: 'Proced. s/ pernoite' }, { rotulo: 'Qtd. s/ pernoite', tipo: 'numero' as const }, { rotulo: 'Valor s/ pernoite', tipo: 'moeda' as const },
      { rotulo: 'Total', tipo: 'moeda' as const }, { rotulo: 'Lançada no BPA' },
    ],
    linhas: linhas.map((l, i): Celula[] => [
      String(i + 1).padStart(3, '0'), l.processo, ...pessoa(l), fmtDataBR(l.dataAtendimento), avisoPeriodo(l.mesReferencia, mesCompetencia), l.cid ?? '',
      l.codigoPernoite ?? '', l.qtdPernoite ?? null, l.codigoPernoite && l.qtdPernoite ? (sig[l.codigoPernoite] ?? 0) * l.qtdPernoite : null,
      l.codigoSemPernoite ?? '', l.qtdSemPernoite ?? null, l.codigoSemPernoite && l.qtdSemPernoite ? (sig[l.codigoSemPernoite] ?? 0) * l.qtdSemPernoite : null,
      valorBpa(l, sig), lancados.has(l.chave) ? 'Sim' : 'Não',
    ]),
  };
}

export function planilhaBpaDeslocamento(linhas: LinhaBpa[], sig: Record<string, number>, lancados: Set<string>, mesCompetencia: string) {
  const modal = (m?: string) => (m === 'aereo' ? 'Aéreo' : m === 'fluvial' ? 'Fluvial' : 'Terrestre');
  return {
    colunas: [
      { rotulo: '#' }, { rotulo: 'Processo' }, ...colunasPessoa, { rotulo: 'Data viagem' }, { rotulo: 'Aviso de período' }, { rotulo: 'Rota' }, { rotulo: 'Modal' },
      { rotulo: 'Distância', tipo: 'numero' as const }, { rotulo: 'Unidade' }, { rotulo: 'SIGTAP' }, { rotulo: 'Descrição' },
      { rotulo: 'Qtd.', tipo: 'numero' as const }, { rotulo: 'CID' }, { rotulo: 'Valor SIGTAP', tipo: 'moeda' as const }, { rotulo: 'Lançada no BPA' },
    ],
    linhas: linhas.map((l, i): Celula[] => [
      String(i + 1).padStart(3, '0'), l.processo, ...pessoa(l), fmtDataBR(l.dataAtendimento), avisoPeriodo(l.mesReferencia, mesCompetencia), l.rota ?? '', modal(l.modal),
      l.distancia ?? null, l.unidade ?? '', l.codigo ?? '', l.descricao ?? '',
      l.quantidade ?? null, l.cid ?? '', valorBpa(l, sig), lancados.has(l.chave) ? 'Sim' : 'Não',
    ]),
  };
}

/* ── Log do sistema ──────────────────────────────────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Registra a ação no log do sistema (tabela log_auditoria). Falha no log não
 * bloqueia a ação do usuário: o arquivo já foi gerado ou a competência já
 * foi excluída.
 */
export async function registrarNoLog(
  usuario: { id: string; perfil: string } | null,
  acao: 'COMPETENCIA_EXPORTADA' | 'COMPETENCIA_EXCLUIDA',
  competenciaId: string,
  detalhes: Record<string, unknown>,
) {
  if (!usuario) return;
  try {
    await registrarLog({
      usuario_id: usuario.id,
      perfil_usuario: usuario.perfil,
      acao,
      entidade_alterada: 'competencias_financeiro',
      // Competências antigas do protótipo não têm id UUID: o id vai nos detalhes.
      entidade_id: UUID.test(competenciaId) ? competenciaId : null,
      valor_novo: { competencia_id: competenciaId, ...detalhes },
    } as unknown as InsertDTO<'log_auditoria'>);
  } catch {
    /* log indisponível: segue sem bloquear */
  }
}
