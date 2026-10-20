'use client';

/* -------------------------------------------------------------------------- */
/*  PDF dos instrumentos do Serviço Social                                    */
/*                                                                            */
/*  Mesmo desenho do documento de parecer (/parecer/[id]): título serifado    */
/*  centralizado, subtítulo em caixa alta, linhas de dados com rótulo em      */
/*  caixa alta, seções separadas por título cinza e rodapé com a emissão.     */
/*  Vale para os quatro tipos (parecer social, encaminhamento, declaração e   */
/*  "Outros"). O texto sai exatamente como a profissional deixou no campo     */
/*  Conteúdo, inclusive as linhas de assinatura.                              */
/* -------------------------------------------------------------------------- */

import { TIPO_INSTRUMENTO_LABEL, type CasaApoioMock, type InstrumentoSocialMock } from '@/core/mocks/servico-social-seed';

const TEXTO = [26, 29, 43] as const;
const APOIO = [71, 85, 105] as const;
const SECAO = [107, 114, 128] as const;
const LINHA = [203, 213, 225] as const;

const dataHoraBR = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
};

/** Título do documento: o digitado, no tipo "Outros", ou o nome do tipo. */
export function tituloDoInstrumento(i: Pick<InstrumentoSocialMock, 'tipo' | 'titulo'>): string {
  return (i.tipo === 'outros' && i.titulo?.trim()) || TIPO_INSTRUMENTO_LABEL[i.tipo];
}

/** Trechos entre colchetes e em caixa alta que ainda não foram preenchidos. */
export function pendenciasDoConteudo(conteudo: string): string[] {
  return [...new Set(conteudo.match(/\[[A-ZÀ-Ú0-9 /._-]{3,}\]/g) ?? [])];
}

export function nomeArquivoInstrumento(i: Pick<InstrumentoSocialMock, 'tipo' | 'titulo' | 'solicitacaoNumero'>): string {
  const base = `${tituloDoInstrumento(i)} ${i.solicitacaoNumero ?? ''}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${base || 'instrumento'}.pdf`;
}

export async function baixarPdfInstrumento(i: InstrumentoSocialMock, casa?: CasaApoioMock): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 56;
  const util = largura - margem * 2;
  const colRotulo = 150;
  let y = 64;

  const cor = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const garantir = (espaco: number) => {
    if (y + espaco > altura - 54) { doc.addPage(); y = 64; }
  };

  // Cabeçalho
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  cor(TEXTO);
  const titulo = doc.splitTextToSize(tituloDoInstrumento(i).toUpperCase(), util);
  doc.text(titulo, largura / 2, y, { align: 'center' });
  y += 24 * titulo.length - 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  cor(APOIO);
  doc.text('TRATAMENTO FORA DE DOMICÍLIO (TFD)  ·  SECRETARIA DE ESTADO DA SAÚDE  ·  MARANHÃO', largura / 2, y + 6, { align: 'center' });
  y += 20;
  doc.setDrawColor(LINHA[0], LINHA[1], LINHA[2]);
  doc.line(margem, y, largura - margem, y);
  y += 8;

  const secao = (texto: string) => {
    garantir(40);
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    cor(SECAO);
    doc.text(texto.toUpperCase(), margem, y);
    y += 14;
  };
  const linha = (rotulo: string, valor: string | undefined) => {
    if (!valor) return;
    const partes = doc.splitTextToSize(valor, util - colRotulo);
    garantir(14 * partes.length);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    cor(APOIO);
    doc.text(rotulo.toUpperCase(), margem, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    cor(TEXTO);
    doc.text(partes, margem + colRotulo, y);
    y += 14 * partes.length;
  };

  if (i.pacienteNome || i.pacienteCpf) {
    secao('Dados do paciente');
    linha('Nome', i.pacienteNome);
    linha('CPF', i.pacienteCpf);
  }
  secao('Dados da solicitação');
  linha('Número', i.solicitacaoNumero);
  secao('Dados do documento');
  linha('Tipo', TIPO_INSTRUMENTO_LABEL[i.tipo]);
  linha('Elaborado por', i.autora);
  linha('Data de elaboração', dataHoraBR(i.dataCriacao));
  if (casa) {
    linha('Casa de apoio', casa.nome);
    linha('Endereço', `${casa.endereco}${casa.cidadeUf ? `, ${casa.cidadeUf}` : ''}`);
    linha('Contato', casa.contato);
  }
  if (i.sigiloso) linha('Sigilo', 'Documento sigiloso');

  // Conteúdo, com as quebras de linha da profissional
  secao('Conteúdo');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  cor(TEXTO);
  for (const par of i.conteudo.replace(/\r/g, '').split('\n')) {
    if (!par.trim()) { y += 8; continue; }
    const partes = doc.splitTextToSize(par, util);
    for (const p of partes) {
      garantir(15);
      doc.text(p, margem, y);
      y += 15;
    }
  }

  // Rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  for (let n = 1; n <= total; n++) {
    doc.setPage(n);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    cor(SECAO);
    doc.text(`TFD SES-MA  ·  emitido em ${new Date().toLocaleString('pt-BR')}`, margem, altura - 30);
    doc.text(`Página ${n} de ${total}`, largura - margem, altura - 30, { align: 'right' });
  }

  doc.save(nomeArquivoInstrumento(i));
}
