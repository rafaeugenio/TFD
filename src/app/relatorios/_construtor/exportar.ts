'use client';

/* -------------------------------------------------------------------------- */
/*  Exportação. Os três formatos usam exatamente o resultado da tela:         */
/*  mesmo período, referência de data, filtros, colunas e ordenação.          */
/*  CSV e Excel priorizam dados estruturados (números como números); PDF      */
/*  prioriza leitura, com cabeçalho descrevendo o que foi analisado.          */
/* -------------------------------------------------------------------------- */

import { formatarValor, fmtMoeda, fmtNumero, type ResultadoRelatorio } from './motor';
import { dataBR } from './periodo';
import type { Campo, Linha } from './tipos';

export interface DescricaoRelatorio {
  titulo: string;
  linhasResumo: Array<{ rotulo: string; valor: string }>;
}

function nomeArquivo(titulo: string, ext: string) {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base || 'relatorio'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
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

/** Valor bruto para planilha: número continua número, data vira dd/mm/aaaa. */
function valorPlanilha(campo: Campo, v: Linha[string]): string | number {
  if (v === null || v === undefined || v === '') return '';
  if (campo.tipo === 'moeda' || campo.tipo === 'numero') return Number(v);
  if (campo.tipo === 'data') return dataBR(String(v));
  return String(v);
}

export function exportarCSV(res: ResultadoRelatorio, desc: DescricaoRelatorio) {
  const esc = (s: string | number) => {
    const t = typeof s === 'number' ? String(s).replace('.', ',') : s;
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const linhas = [
    res.colunas.map((c) => esc(c.label)).join(';'),
    ...res.linhas.map((l) => res.colunas.map((c) => esc(valorPlanilha(c, l[c.id]))).join(';')),
  ];
  // BOM para o Excel abrir acentos corretamente; ";" é o separador do Excel em pt-BR.
  baixar(new Blob([`﻿${linhas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), nomeArquivo(desc.titulo, 'csv'));
}

export async function exportarXLSX(res: ResultadoRelatorio, desc: DescricaoRelatorio) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TFD SES-MA';

  const dados = wb.addWorksheet('Dados');
  dados.columns = res.colunas.map((c) => ({
    header: c.label,
    key: c.id,
    width: Math.min(48, Math.max(14, c.label.length + 4)),
    style: c.tipo === 'moeda' ? { numFmt: '"R$" #,##0.00' } : c.tipo === 'numero' ? { numFmt: '#,##0.##' } : {},
  }));
  dados.getRow(1).font = { bold: true };
  dados.views = [{ state: 'frozen', ySplit: 1 }];
  for (const l of res.linhas) {
    const row: Record<string, string | number> = {};
    for (const c of res.colunas) row[c.id] = valorPlanilha(c, l[c.id]);
    dados.addRow(row);
  }

  const sobre = wb.addWorksheet('Sobre o relatório');
  sobre.columns = [{ width: 28 }, { width: 90 }];
  sobre.addRow([desc.titulo]).font = { bold: true, size: 14 };
  sobre.addRow([]);
  for (const r of desc.linhasResumo) sobre.addRow([r.rotulo, r.valor]);
  sobre.addRow([]);
  sobre.addRow(['Totais']).font = { bold: true };
  for (const t of res.totais) sobre.addRow([t.label, t.formato === 'moeda' ? fmtMoeda(t.valor) : fmtNumero(t.valor)]);
  sobre.addRow([]);
  sobre.addRow(['Gerado em', new Date().toLocaleString('pt-BR')]);

  const buffer = await wb.xlsx.writeBuffer();
  baixar(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    nomeArquivo(desc.titulo, 'xlsx'),
  );
}

export async function exportarPDF(res: ResultadoRelatorio, desc: DescricaoRelatorio) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: res.colunas.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const margem = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(desc.titulo, margem, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let y = 70;
  for (const r of desc.linhasResumo) {
    const texto = doc.splitTextToSize(`${r.rotulo}: ${r.valor}`, doc.internal.pageSize.getWidth() - margem * 2);
    doc.text(texto, margem, y);
    y += 13 * texto.length;
  }
  const totais = res.totais.map((t) => `${t.label}: ${t.formato === 'moeda' ? fmtMoeda(t.valor) : fmtNumero(t.valor)}`).join('   ·   ');
  doc.setFont('helvetica', 'bold');
  const tt = doc.splitTextToSize(totais, doc.internal.pageSize.getWidth() - margem * 2);
  doc.text(tt, margem, y + 6);
  y += 14 * tt.length + 10;

  autoTable(doc, {
    startY: y,
    head: [res.colunas.map((c) => c.label)],
    body: res.linhas.map((l) => res.colunas.map((c) => formatarValor(c, l[c.id]))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [20, 107, 250], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margem, right: margem },
    // Valores e quantidades alinhados à direita, como na tela.
    columnStyles: Object.fromEntries(
      res.colunas.map((c, i) => [i, c.tipo === 'moeda' || c.tipo === 'numero' ? { halign: 'right' as const } : {}]),
    ),
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`TFD SES-MA · gerado em ${new Date().toLocaleString('pt-BR')}`, margem, h - 20);
    },
  });

  doc.save(nomeArquivo(desc.titulo, 'pdf'));
}
