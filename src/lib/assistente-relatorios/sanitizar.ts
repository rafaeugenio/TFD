import 'server-only';
import { LIMITE_PERGUNTA } from '@/app/relatorios/_assistente/contrato';

/**
 * Limpeza e barreira determinística da pergunta, antes de qualquer IA.
 * Rejeita perguntas com identificadores pessoais ou pedidos de dado
 * individualizado; o JEV faz uma segunda checagem semântica depois.
 */

export type ResultadoSanitizacao =
  | { ok: true; pergunta: string }
  | { ok: false; motivo: 'vazia' | 'longa' | 'dado_pessoal' };

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const CNS = /\b[1-9]\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/;
const NUMERO_LONGO = /\d{11,}/; // cartão, documento ou conta sem máscara (datas não chegam a 11 dígitos seguidos)
const TERMOS_SENSIVEIS = [
  'cpf', 'cns', 'cartão sus', 'cartao sus', 'rg ', 'agência', 'agencia', 'conta corrente', 'conta bancária', 'conta bancaria',
  'chave pix', 'pix', 'dados bancários', 'dados bancarios', 'laudo', 'diagnóstico', 'diagnostico', 'cid ', 'cid-10', 'cid10',
  'prontuário', 'prontuario', 'endereço do paciente', 'endereco do paciente', 'telefone do paciente', 'nome do paciente',
  'nomes dos pacientes', 'lista de pacientes', 'quais pacientes', 'qual paciente', 'quem são os pacientes', 'quem sao os pacientes',
];

export function sanitizarPergunta(entrada: unknown): ResultadoSanitizacao {
  if (typeof entrada !== 'string') return { ok: false, motivo: 'vazia' };
  // Remove caracteres de controle e espaços repetidos.
  const limpa = entrada.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!limpa) return { ok: false, motivo: 'vazia' };
  if (limpa.length > LIMITE_PERGUNTA) return { ok: false, motivo: 'longa' };

  const minuscula = ` ${limpa.toLowerCase()} `;
  if (CPF.test(limpa) || CNS.test(limpa) || NUMERO_LONGO.test(limpa)) return { ok: false, motivo: 'dado_pessoal' };
  if (TERMOS_SENSIVEIS.some((t) => minuscula.includes(t))) return { ok: false, motivo: 'dado_pessoal' };
  return { ok: true, pergunta: limpa };
}
