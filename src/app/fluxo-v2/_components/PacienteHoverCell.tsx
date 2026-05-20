'use client';

import Link from 'next/link';
import type { PacienteMock } from '@/core/mocks/fluxo-v2-v3-seed';
import HoverTooltip, { TooltipKV } from './HoverTooltip';

function fmtDataBR(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

function idadeAnos(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) anos--;
  return anos;
}

function maskCPF(cpf?: string) {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskTelefone(tel?: string) {
  if (!tel) return '—';
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

interface Props {
  paciente: PacienteMock;
  /** Tamanho da fonte do nome. Default 14. */
  size?: number;
}

/**
 * Célula reutilizável do paciente:
 * - Mostra nome (link para a ficha) + idade.
 * - CPF embaixo (mascarado).
 * - Hover no nome revela tooltip com resumo completo.
 */
export default function PacienteHoverCell({ paciente, size = 14 }: Props) {
  const idade = idadeAnos(paciente.dataNascimento);
  const sexoLabel = paciente.sexo === 'F' ? 'Feminino' : paciente.sexo === 'M' ? 'Masculino' : '—';

  const tooltipContent = (
    <TooltipKV
      rows={[
        { k: 'Nome', v: paciente.nome || '—' },
        { k: 'CPF', v: maskCPF(paciente.cpf), mono: true },
        ...(paciente.cns ? [{ k: 'CNS', v: paciente.cns, mono: true }] : []),
        { k: 'Nascimento', v: idade !== null ? `${fmtDataBR(paciente.dataNascimento)} · ${idade} anos` : fmtDataBR(paciente.dataNascimento) },
        { k: 'Sexo', v: sexoLabel },
        { k: 'Telefone', v: maskTelefone(paciente.telefone) },
        ...(paciente.email ? [{ k: 'E-mail', v: paciente.email }] : []),
        { k: 'Município', v: paciente.municipio || '—' },
        ...(paciente.regional
          ? [{
              k: 'Regional',
              v: `${paciente.regionalCodigo ? `${paciente.regionalCodigo} · ` : ''}${paciente.regional}${paciente.regionalSede && paciente.regionalSede !== paciente.regional ? ` (sede: ${paciente.regionalSede})` : ''}`,
            }]
          : []),
      ]}
    />
  );

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <HoverTooltip content={tooltipContent} maxWidth={340}>
          <Link
            href={`/pacientes/${paciente.id}`}
            className="transition-colors hover:underline"
            style={{ color: '#146BFA', fontWeight: 500, fontSize: size, textUnderlineOffset: 3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {paciente.nome}
          </Link>
        </HoverTooltip>
        {idade !== null && (
          <span className="text-[12px]" style={{ color: '#94A3B8' }}>{idade} anos</span>
        )}
      </div>
      <div className="text-[12px] font-mono mt-0.5" style={{ color: '#94A3B8' }}>
        {maskCPF(paciente.cpf)}
      </div>
    </>
  );
}
