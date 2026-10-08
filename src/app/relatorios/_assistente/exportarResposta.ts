'use client';

import type { RespostaAssistente, Unidade } from './contrato';

/**
 * Saídas de uma resposta do assistente, geradas no navegador a partir do
 * resultado que já veio do servidor: nenhuma chamada nova ao Gemini nem ao
 * JEV (custo zero de IA). Imagem do cartão (copiar ou baixar), tabela para
 * colar no Excel ou Google Sheets, CSV, Excel e PDF com o gráfico.
 */

export interface TabelaResposta {
  titulo: string;
  meta: [string, string][];
  cabecalho: string[];
  /** Células já tipadas: número continua número (para a planilha somar). */
  linhas: (string | number)[][];
  /** Colunas numéricas: índice → formato. */
  formatos: Record<number, Unidade | 'percentual'>;
}

const dataBR = (s: string) => s.split('-').reverse().join('/');
const nomeArquivo = (titulo: string, ext: string) =>
  `${titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'resposta'}-${new Date().toISOString().slice(0, 10)}.${ext}`;

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

const rotuloValor = (u: Unidade) => (u === 'BRL' ? 'Valor (R$)' : u === 'dias' ? 'Média (dias)' : 'Quantidade');
const fmtCelula = (v: string | number, f?: Unidade | 'percentual') => {
  if (typeof v !== 'number') return v;
  if (f === 'BRL') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (f === 'percentual') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  if (f === 'dias') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
  return v.toLocaleString('pt-BR');
};

/** Monta a tabela da resposta: grupos (com % do total) ou o número e sua composição. */
export function montarTabela(r: RespostaAssistente): TabelaResposta | null {
  const res = r.resultado;
  if (!res) return null;
  const meta: [string, string][] = [];
  if (r.perguntaInterpretada) meta.push(['Pergunta', r.perguntaInterpretada]);
  if (r.periodo) meta.push(['Período', `${r.periodo.descricao}: ${dataBR(r.periodo.inicio)} a ${dataBR(r.periodo.fim)} (${r.periodo.campoData})`]);
  for (const f of r.filtros ?? []) meta.push([f.rotulo, f.valor]);
  if (r.fonte) meta.push(['Fonte', `${r.fonte}${r.geradoEm ? `, ${new Date(r.geradoEm).toLocaleString('pt-BR')}` : ''}`]);

  if (res.unidade === 'data' || res.atributos?.length) {
    // Registro em destaque: tabela de campo e valor.
    const linhas: (string | number)[][] = [];
    if (res.unidade === 'data') linhas.push(['Data', res.dataIso ? new Date(res.dataIso).toLocaleString('pt-BR') : '']);
    else linhas.push(['Valor', res.valor]);
    for (const a of res.atributos ?? []) linhas.push([a.rotulo, a.valor]);
    return { titulo: res.rotulo, meta, cabecalho: ['Campo', 'Valor'], linhas, formatos: res.unidade === 'data' ? {} : { 1: res.unidade } };
  }
  const g = r.grupos && r.grupos.itens.length > 0 ? r.grupos : undefined;
  if (g) {
    const soma = res.unidade !== 'dias';
    const comQtd = res.unidade !== 'quantidade' && g.itens.some((i) => i.quantidade !== undefined);
    const cabecalho = [g.titulo, rotuloValor(res.unidade), ...(comQtd ? ['Registros'] : []), ...(soma ? ['% do total'] : [])];
    const pct = (v: number) => (res.valor > 0 ? Math.round((v / res.valor) * 1000) / 10 : 0);
    const linhas = g.itens.map((i) => [i.rotulo, i.valor, ...(comQtd ? [i.quantidade ?? ''] : []), ...(soma ? [pct(i.valor)] : [])]);
    if (soma) linhas.push(['Total', res.valor, ...(comQtd ? [''] : []), 100]);
    const formatos: TabelaResposta['formatos'] = { 1: res.unidade };
    if (soma) formatos[cabecalho.length - 1] = 'percentual';
    return { titulo: res.rotulo, meta, cabecalho, linhas, formatos };
  }
  const linhas: (string | number)[][] = [[res.rotulo, res.valor]];
  for (const c of res.composicao ?? []) linhas.push([c.rotulo, c.valor]);
  return { titulo: res.rotulo, meta, cabecalho: ['Indicador', rotuloValor(res.unidade)], linhas, formatos: { 1: res.unidade } };
}

/**
 * Copia a tabela em dois formatos ao mesmo tempo: HTML (Google Sheets, Excel,
 * Docs e e-mail colam como tabela) e texto separado por tabulação (cai em
 * colunas em qualquer planilha). Números vão no padrão brasileiro.
 */
export async function copiarTabela(t: TabelaResposta): Promise<void> {
  const num = (v: string | number, f?: Unidade | 'percentual') => (typeof v === 'number' ? (f === 'percentual' ? `${String(v).replace('.', ',')}%` : String(v).replace('.', ',')) : v);
  const tsv = [t.cabecalho, ...t.linhas.map((l) => l.map((v, j) => num(v, t.formatos[j])))].map((l) => l.join('\t')).join('\n');
  const esc = (s: string | number) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<table><thead><tr>${t.cabecalho.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.linhas
    .map((l) => `<tr>${l.map((v, j) => `<td>${esc(fmtCelula(v, t.formatos[j]))}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([tsv], { type: 'text/plain' }) })]);
  } else {
    await navigator.clipboard.writeText(tsv);
  }
}

export function baixarCSV(t: TabelaResposta) {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? String(v).replace('.', ',') : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [...t.meta.map(([k, v]) => [k, v]), [], t.cabecalho, ...t.linhas].map((l) => l.map(esc).join(';'));
  // BOM para acentos no Excel; ";" é o separador do Excel em pt-BR.
  baixar(new Blob([`﻿${linhas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), nomeArquivo(t.titulo, 'csv'));
}

export async function baixarXLSX(t: TabelaResposta, imagemPng?: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TFD SES-MA';
  const ws = wb.addWorksheet('Resultado');
  ws.addRow([t.titulo]).font = { bold: true, size: 14 };
  for (const [k, v] of t.meta) ws.addRow([k, v]);
  ws.addRow([]);
  const cab = ws.addRow(t.cabecalho);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF146BFA' } }; });
  for (const l of t.linhas) {
    const row = ws.addRow(l.map((v, j) => (typeof v === 'number' && t.formatos[j] === 'percentual' ? v / 100 : v)));
    if (l[0] === 'Total') row.font = { bold: true };
    row.eachCell((c, col) => {
      const f = t.formatos[col - 1];
      if (f === 'BRL') c.numFmt = '"R$" #,##0.00';
      else if (f === 'percentual') c.numFmt = '0.0%';
      else if (f === 'dias') c.numFmt = '#,##0.0';
      else if (typeof c.value === 'number') c.numFmt = '#,##0';
    });
  }
  ws.columns.forEach((col, i) => { col.width = i === 0 ? 34 : 18; });
  if (imagemPng) {
    const id = wb.addImage({ base64: imagemPng, extension: 'png' });
    ws.addImage(id, { tl: { col: t.cabecalho.length + 1, row: 1 }, ext: { width: 520, height: 320 } });
  }
  const buffer = await wb.xlsx.writeBuffer();
  baixar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomeArquivo(t.titulo, 'xlsx'));
}

export async function baixarPDF(t: TabelaResposta, imagemPng?: { dataUrl: string; largura: number; altura: number }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margem = 40;
  const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(t.titulo, margem, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let y = 70;
  for (const [k, v] of t.meta) {
    const linhas = doc.splitTextToSize(`${k}: ${v}`, larguraUtil);
    doc.text(linhas, margem, y);
    y += 13 * linhas.length;
  }
  if (imagemPng) {
    const w = Math.min(larguraUtil, imagemPng.largura);
    const h = (imagemPng.altura / imagemPng.largura) * w;
    // Compressão FAST: sem ela o PNG em alta resolução deixa o PDF com vários MB.
    doc.addImage(imagemPng.dataUrl, 'PNG', margem, y + 8, w, h, undefined, 'FAST');
    y += h + 20;
  }
  autoTable(doc, {
    startY: y + 6,
    head: [t.cabecalho],
    body: t.linhas.map((l) => l.map((v, j) => String(fmtCelula(v, t.formatos[j])))),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [20, 107, 250], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margem, right: margem },
    columnStyles: Object.fromEntries(t.cabecalho.map((_, j) => [j, j > 0 ? { halign: 'right' as const } : {}])),
    didParseCell: (d) => { if (d.section === 'body' && d.row.raw && (d.row.raw as string[])[0] === 'Total') d.cell.styles.fontStyle = 'bold'; },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.text(`TFD SES-MA · Assistente de IA · gerado em ${new Date().toLocaleString('pt-BR')}`, margem, h - 20);
    },
  });
  doc.save(nomeArquivo(t.titulo, 'pdf'));
}

/** Gera o PNG do cartão (número + gráfico), sem botões nem detalhes, em alta resolução. */
export async function imagemDoCartao(el: HTMLElement): Promise<{ blob: Blob; dataUrl: string; largura: number; altura: number }> {
  const { toBlob } = await import('html-to-image');
  // Respiro de 24px em volta para a imagem não colar o texto na borda.
  const respiro = 24;
  const blob = await toBlob(el, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    width: el.offsetWidth + respiro * 2,
    height: el.offsetHeight + respiro * 2,
    style: { margin: '0', padding: `${respiro}px`, boxSizing: 'content-box' },
    filter: (n) => !(n instanceof HTMLElement && n.dataset.exportar === 'ignorar'),
  });
  if (!blob) throw new Error('Não foi possível gerar a imagem.');
  const dataUrl = await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.readAsDataURL(blob); });
  return { blob, dataUrl, largura: el.offsetWidth + respiro * 2, altura: el.offsetHeight + respiro * 2 };
}

/** Copia a imagem para a área de transferência (cola em documento, e-mail, WhatsApp). */
export async function copiarImagem(blob: Blob): Promise<'copiada' | 'sem_suporte'> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return 'sem_suporte';
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  return 'copiada';
}

export const baixarPNG = (blob: Blob, titulo: string) => baixar(blob, nomeArquivo(titulo, 'png'));
