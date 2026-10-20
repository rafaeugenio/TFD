import type { AnexoInstrumentoMock } from '@/core/mocks/servico-social-seed';

/** Cópia assinada do instrumento: PDF ou foto do documento, até 10 MB. */
export const TIPOS_ANEXO_ASSINADO = 'application/pdf,image/png,image/jpeg';
export const LIMITE_ANEXO_BYTES = 10 * 1024 * 1024;

export const tamanhoLegivel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Valida o arquivo escolhido e monta o anexo. Devolve a mensagem de erro em português quando não serve. */
export function montarAnexoAssinado(
  arquivo: File,
  enviadoPor: string,
): { ok: true; anexo: AnexoInstrumentoMock } | { ok: false; erro: string } {
  const aceito = TIPOS_ANEXO_ASSINADO.split(',');
  if (!aceito.includes(arquivo.type)) return { ok: false, erro: 'Envie o documento assinado em PDF, PNG ou JPG.' };
  if (arquivo.size > LIMITE_ANEXO_BYTES) return { ok: false, erro: 'O arquivo passa de 10 MB. Reduza o tamanho e envie de novo.' };
  return {
    ok: true,
    anexo: {
      nome: arquivo.name,
      tamanho: arquivo.size,
      mime: arquivo.type,
      url: URL.createObjectURL(arquivo),
      enviadoPor,
      enviadoEm: new Date().toISOString(),
    },
  };
}
