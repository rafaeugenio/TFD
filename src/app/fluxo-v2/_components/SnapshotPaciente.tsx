'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Paperclip, FileCheck2 } from 'lucide-react';
import IdadeBadge from '@/shared/components/idade-badge';
import LaudoValidadeBadge from './badges/LaudoValidadeBadge';

export interface SnapshotAnexo {
  id: string;
  nome: string;
  documentoUrl?: string;
}

export interface SnapshotPacienteData {
  pacienteId: string;
  nome: string;
  dataNascimento: string;
  cpf: string;
  numeroSolicitacao: string;
  dataLaudo?: string;
  /** Lista detalhada de anexos. Cada um vira um chip clicável. */
  anexos: SnapshotAnexo[];
  ultimoParecer?: {
    decisao: 'deferido' | 'indeferido';
    medico: string;
    data: string;
  } | null;
}

/**
 * Mini-card com contexto do paciente — usado no topo dos drawers de ação rápida
 * (parecer, carimbo, agendamento, passagem, ajuda, adicional) quando a ação é
 * disparada a partir da lista. Ajuda o operador a confirmar que tá no paciente
 * certo sem precisar abrir o detalhe.
 *
 * T2.U — Nome do paciente é hyperlink pra `/pacientes/[id]`. Anexos viram
 * chips/links: se houver `documentoUrl` reais, abre em nova aba; senão exibe
 * alert mockado de visualização.
 */
export default function SnapshotPaciente({ data }: { data: SnapshotPacienteData }) {
  const decMap = {
    deferido: { bg: '#DCFCE7', fg: '#15803D', label: 'Deferido' },
    indeferido: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Indeferido' },
  } as const;

  return (
    <div
      className="px-4 py-3 mb-4"
      style={{
        background: 'linear-gradient(180deg, #F8FAFC 0%, #FBFCFE 100%)',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 10,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <PacienteLink id={data.pacienteId} nome={data.nome} />
        <IdadeBadge dataNascimento={data.dataNascimento} />
        <span className="font-mono" style={{ color: '#6B7280', fontSize: 11 }}>
          {data.cpf}
        </span>
        <span style={{ color: '#CBD5E1', fontSize: 11 }}>·</span>
        <span style={{ color: '#475569', fontSize: 11, fontWeight: 500 }}>
          {data.numeroSolicitacao}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: '#475569' }}>
        <span className="inline-flex items-center gap-1">
          <FileCheck2 size={11} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#94A3B8' }}>Laudo:</span>
          <LaudoValidadeBadge dataLaudo={data.dataLaudo} variant="compact" />
        </span>
        <span style={{ color: '#CBD5E1' }}>·</span>
        <span className="inline-flex items-center gap-1 flex-wrap">
          <Paperclip size={11} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#94A3B8' }}>
            {data.anexos.length} {data.anexos.length === 1 ? 'anexo' : 'anexos'}:
          </span>
          {data.anexos.length === 0 && (
            <span style={{ color: '#CBD5E1' }}>—</span>
          )}
          {data.anexos.map((a) => (
            <AnexoChip key={a.id} anexo={a} />
          ))}
        </span>
        {data.ultimoParecer && (
          <>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span style={{ color: '#94A3B8' }}>Último parecer:</span>
              <span
                style={{
                  background: decMap[data.ultimoParecer.decisao].bg,
                  color: decMap[data.ultimoParecer.decisao].fg,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 999,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {decMap[data.ultimoParecer.decisao].label}
              </span>
              <span style={{ color: '#475569' }}>{data.ultimoParecer.medico}</span>
            </span>
          </>
        )}
      </div>

    </div>
  );
}

/** Link do nome do paciente — azul tfd-blue-700, underline ao hover. */
function PacienteLink({ id, nome }: { id: string; nome: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/pacientes/${id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color: 'var(--tfd-blue-700)',
        fontWeight: 600,
        fontSize: 14,
        textDecoration: hover ? 'underline' : 'none',
      }}
    >
      {nome}
    </Link>
  );
}

/** Chip de anexo — link real se houver documentoUrl, botão mockado se não. */
function AnexoChip({ anexo }: { anexo: SnapshotAnexo }) {
  const baseStyle: React.CSSProperties = {
    color: 'var(--tfd-blue-700)',
    background: '#EBF0FF',
    border: '1px solid #C7DAFF',
    borderRadius: 999,
    padding: '1px 8px 1px 6px',
    fontSize: 10.5,
    fontWeight: 500,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
    cursor: 'pointer',
  };
  const inner = (
    <>
      <Paperclip size={10} />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={anexo.nome}
      >
        {anexo.nome}
      </span>
    </>
  );

  if (anexo.documentoUrl) {
    return (
      <a
        href={anexo.documentoUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={baseStyle}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => alert('Visualização mockada')}
      title="Visualizar (mock)"
      style={baseStyle}
    >
      {inner}
    </button>
  );
}

/** Helper que monta o snapshot a partir de uma SolicitacaoMock. */
export function snapshotFromSolicitacao(s: {
  paciente: { id: string; nome: string; dataNascimento: string; cpf: string };
  numero: string;
  dataLaudo?: string;
  anexos: { id: string; nome: string; documentoUrl?: string }[];
  pareceres: { data: string; decisao: 'deferido' | 'indeferido'; medico: string }[];
}): SnapshotPacienteData {
  const ultimo = s.pareceres[s.pareceres.length - 1];
  return {
    pacienteId: s.paciente.id,
    nome: s.paciente.nome,
    dataNascimento: s.paciente.dataNascimento,
    cpf: s.paciente.cpf,
    numeroSolicitacao: s.numero,
    dataLaudo: s.dataLaudo,
    anexos: s.anexos.map((a) => ({
      id: a.id,
      nome: a.nome,
      documentoUrl: a.documentoUrl,
    })),
    ultimoParecer: ultimo
      ? { decisao: ultimo.decisao, medico: ultimo.medico, data: ultimo.data }
      : null,
  };
}
