'use client';

import { use, useMemo, useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';

export default function ParecerPrintPage({ params }: { params: Promise<{ parecerId: string }> }) {
  const { parecerId } = use(params);
  const { solicitacoes } = useFluxoV2State();

  const found = useMemo(() => {
    for (const s of solicitacoes) {
      const p = s.pareceres.find((pp) => pp.id === parecerId);
      if (p) return { s, p };
    }
    return null;
  }, [solicitacoes, parecerId]);

  useEffect(() => {
    document.title = found
      ? `Parecer ${found.s.numero} — ${found.s.paciente.nome}`
      : 'Parecer';
  }, [found]);

  if (!found) {
    return (
      <div style={{ padding: 48, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <p style={{ fontSize: 14, color: '#6B7280' }}>
          Parecer não encontrado nesta sessão. Os pareceres ficam apenas em memória — abra o link a partir da
          aba de Regulação.
        </p>
        <Link href="/fluxo-v2/solicitacoes" style={{ color: '#3D5BDB', fontSize: 13, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Ir para Solicitações
        </Link>
      </div>
    );
  }

  const { s, p } = found;
  const decisaoLabel = p.decisao === 'deferido' ? 'DEFERIDO' : 'INDEFERIDO';
  const decisaoColor = p.decisao === 'deferido' ? '#15803D' : '#B91C1C';
  const emissao = new Date().toLocaleString('pt-BR');

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @page { size: A4 portrait; margin: 18mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
        }
        .print-root {
          background: #F1F5F9;
          min-height: 100vh;
          padding: 32px 16px 64px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1A1D2B;
        }
        .print-page {
          background: white;
          max-width: 760px;
          margin: 0 auto;
          padding: 56px 64px;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          box-shadow: 0 8px 30px rgba(15,23,42,0.08);
        }
        .print-page h1 { font-family: 'Georgia', serif; font-weight: 700; font-size: 22px; letter-spacing: -0.01em; text-align: center; margin: 0 0 4px; }
        .print-page h2 { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 13px; text-align: center; color: #475569; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 0.08em; }
        .print-page hr { border: none; border-top: 1px solid #CBD5E1; margin: 20px 0; }
        .print-row { display: grid; grid-template-columns: 180px 1fr; gap: 8px; margin-bottom: 8px; font-size: 13px; }
        .print-row .lbl { color: #475569; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; padding-top: 2px; }
        .print-row .val { color: #1A1D2B; }
        .print-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; font-weight: 700; margin: 16px 0 8px; }
        .print-decisao {
          display: inline-block;
          padding: 8px 18px;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.12em;
          border: 2px solid;
          border-radius: 4px;
        }
        .print-obs {
          background: #F8FAFC;
          border-left: 3px solid #1A1D2B;
          padding: 14px 16px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: #1A1D2B;
        }
        .print-stamp {
          font-size: 10px;
          color: #6B7280;
          font-style: italic;
          text-align: center;
          margin-top: 24px;
        }
        .print-toolbar {
          max-width: 760px;
          margin: 0 auto 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .print-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
          background: #1A1D2B; color: white; border: none; cursor: pointer;
          transition: transform 100ms ease, box-shadow 100ms ease;
        }
        .print-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.18); }
        .print-back { color: #475569; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; text-decoration: none; }
        .print-back:hover { color: #1A1D2B; }
      `}</style>

      <div className="print-root">
        <div className="print-toolbar no-print">
          <Link href={`/fluxo-v2/solicitacoes/${s.id}?tab=regulacao`} className="print-back">
            <ArrowLeft size={12} /> Voltar para a solicitação
          </Link>
          <button type="button" className="print-btn" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir / Salvar como PDF
          </button>
        </div>

        <div className="print-page">
          <h1>PARECER MÉDICO — Tratamento Fora de Domicílio (TFD)</h1>
          <h2>Secretaria de Estado da Saúde — Maranhão</h2>
          <hr />

          <p className="print-section-title">Dados do paciente</p>
          <div className="print-row"><span className="lbl">Nome</span><span className="val">{s.paciente.nome}</span></div>
          <div className="print-row"><span className="lbl">CPF</span><span className="val">{s.paciente.cpf}</span></div>
          <div className="print-row"><span className="lbl">Data de nascimento</span><span className="val">{new Date(s.paciente.dataNascimento).toLocaleDateString('pt-BR')}</span></div>
          <div className="print-row"><span className="lbl">Sexo</span><span className="val">{s.paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}</span></div>
          <div className="print-row"><span className="lbl">Município</span><span className="val">{s.paciente.municipio}</span></div>
          <div className="print-row"><span className="lbl">Regional</span><span className="val">{s.paciente.regional} ({s.paciente.zonaRegional})</span></div>
          <div className="print-row"><span className="lbl">Telefone</span><span className="val">{s.paciente.telefone}</span></div>

          <p className="print-section-title">Dados da solicitação</p>
          <div className="print-row"><span className="lbl">Número</span><span className="val">{s.numero}</span></div>
          <div className="print-row"><span className="lbl">Data de criação</span><span className="val">{new Date(s.dataCriacao).toLocaleString('pt-BR')}</span></div>
          {s.dataLaudo && (
            <div className="print-row"><span className="lbl">Data do laudo</span><span className="val">{new Date(s.dataLaudo).toLocaleDateString('pt-BR')}</span></div>
          )}

          <p className="print-section-title">Decisão</p>
          <p style={{ margin: '6px 0 16px' }}>
            <span className="print-decisao" style={{ color: decisaoColor, borderColor: decisaoColor }}>{decisaoLabel}</span>
          </p>

          {(p.cidPrincipal || p.cidSecundario) && (
            <>
              <p className="print-section-title">CIDs (versão CID-{p.versaoCID ?? '10'})</p>
              {p.cidPrincipal && <div className="print-row"><span className="lbl">Principal</span><span className="val">{p.cidPrincipal}</span></div>}
              {p.cidSecundario && <div className="print-row"><span className="lbl">Secundário</span><span className="val">{p.cidSecundario}</span></div>}
            </>
          )}

          <p className="print-section-title">Observação / fundamentação</p>
          <div className="print-obs">{p.observacao || '— Sem observação registrada —'}</div>

          <p className="print-section-title" style={{ marginTop: 28 }}>Médico parecerista</p>
          <div className="print-row"><span className="lbl">Nome</span><span className="val">{p.medico}</span></div>
          <div className="print-row"><span className="lbl">Data do parecer</span><span className="val">{new Date(p.data).toLocaleString('pt-BR')}</span></div>

          <hr style={{ marginTop: 32 }} />
          <p className="print-stamp">
            Documento emitido pelo sistema TFD em {emissao}. Identificador do parecer: {p.id}.
          </p>
        </div>
      </div>
    </>
  );
}
