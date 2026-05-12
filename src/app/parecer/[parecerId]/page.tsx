import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { TIPO_PARECER_LABEL, type TipoParecer } from '@/core/mocks/fluxo-v2-v3-seed';
import ExportButton from './ExportButton';

interface ParecerRow {
  id: string;
  decisao: string;
  tipo: string | null;
  cid_principal: string | null;
  cid_secundario: string | null;
  versao_cid: string | null;
  justificativa: string | null;
  observacoes_medicas: string | null;
  autoriza_acompanhante: boolean | null;
  created_at: string;
  medico_auditor_id: string | null;
  medico_auditor: {
    id: string;
    nome_completo: string | null;
    crm: string | null;
    crm_uf: string | null;
    especialidade_medica: string | null;
  } | null;
  solicitacao: {
    id: string;
    numero_processo: string | null;
    numero_protocolo: string | null;
    data_laudo: string | null;
    descricao_diagnostico: string | null;
    justificativa_tfd: string | null;
    tipo_procedimento: string | null;
    cid10_principal: string | null;
    cid10_secundario: string | null;
    necessidade_acompanhante: boolean | null;
    medico_solicitante_nome: string | null;
    medico_solicitante_crm: string | null;
    medico_solicitante_uf: string | null;
    paciente: {
      id: string;
      nome_completo: string | null;
      cpf: string | null;
      cns: string | null;
      data_nascimento: string | null;
      sexo: string | null;
      municipio: string | null;
      uf: string | null;
      telefone_celular: string | null;
    } | null;
  } | null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function idade(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const hoje = new Date();
  let anos = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) anos--;
  return `${anos} anos`;
}

export default async function ParecerPage({ params }: { params: Promise<{ parecerId: string }> }) {
  const { parecerId } = await params;
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('pareceres')
    .select(
      `id, decisao, tipo, cid_principal, cid_secundario, versao_cid,
       justificativa, observacoes_medicas, autoriza_acompanhante, created_at,
       medico_auditor_id,
       medico_auditor:usuarios!medico_auditor_id (
         id, nome_completo, crm, crm_uf, especialidade_medica
       ),
       solicitacao:solicitacoes!solicitacao_id (
         id, numero_processo, numero_protocolo, data_laudo,
         descricao_diagnostico, justificativa_tfd, tipo_procedimento,
         cid10_principal, cid10_secundario, necessidade_acompanhante,
         medico_solicitante_nome, medico_solicitante_crm, medico_solicitante_uf,
         paciente:pacientes!paciente_id (
           id, nome_completo, cpf, cns, data_nascimento, sexo,
           municipio, uf, telefone_celular
         )
       )`,
    )
    .eq('id', parecerId)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const p = data as unknown as ParecerRow;
  const s = p.solicitacao;
  const pac = s?.paciente;
  const deferido = p.decisao === 'DEFERIDO';
  const tipoLabel = p.tipo ? (TIPO_PARECER_LABEL[p.tipo as TipoParecer] ?? p.tipo) : null;

  return (
    <>
      <ExportButton />
      <main className="parecer-page">
        <article className="folha">
          {/* Cabeçalho institucional */}
          <header className="cabecalho">
            <div className="brasao">
              <div className="brasao-circle">
                <span className="brasao-text">SES</span>
              </div>
            </div>
            <div className="cabecalho-textos">
              <h1>Governo do Estado do Maranhão</h1>
              <h2>Secretaria de Estado da Saúde — SES/MA</h2>
              <h3>Tratamento Fora do Domicílio — TFD</h3>
            </div>
          </header>

          <div className="titulo-doc">
            <h2>PARECER MÉDICO</h2>
            <p className="protocolo">
              Solicitação nº <strong>{s?.numero_processo ?? '—'}</strong>
              {s?.numero_protocolo && (
                <> · SEI <strong>{s.numero_protocolo}</strong></>
              )}
            </p>
          </div>

          {/* Bloco: identificação do paciente */}
          <section className="bloco">
            <h3 className="bloco-titulo">1. Identificação do paciente</h3>
            <dl className="grid-dl">
              <div>
                <dt>Nome completo</dt>
                <dd className="forte">{pac?.nome_completo ?? '—'}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd className="mono">{pac?.cpf ?? '—'}</dd>
              </div>
              <div>
                <dt>CNS</dt>
                <dd className="mono">{pac?.cns ?? '—'}</dd>
              </div>
              <div>
                <dt>Data de nascimento</dt>
                <dd>{fmtDate(pac?.data_nascimento)} <span className="muted">({idade(pac?.data_nascimento)})</span></dd>
              </div>
              <div>
                <dt>Sexo</dt>
                <dd>{pac?.sexo ?? '—'}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{pac?.telefone_celular ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt>Município de origem</dt>
                <dd>{pac?.municipio ? `${pac.municipio}${pac.uf ? ' - ' + pac.uf : ''}` : '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Bloco: dados clínicos */}
          <section className="bloco">
            <h3 className="bloco-titulo">2. Dados clínicos</h3>
            <dl className="grid-dl">
              <div>
                <dt>CID principal</dt>
                <dd className="mono">{s?.cid10_principal ?? p.cid_principal ?? '—'}</dd>
              </div>
              <div>
                <dt>CID secundário</dt>
                <dd className="mono">{s?.cid10_secundario ?? p.cid_secundario ?? '—'}</dd>
              </div>
              <div>
                <dt>Procedimento solicitado</dt>
                <dd>{s?.tipo_procedimento ?? '—'}</dd>
              </div>
              <div>
                <dt>Data do laudo</dt>
                <dd>{fmtDate(s?.data_laudo)}</dd>
              </div>
              <div className="col-span-2">
                <dt>Diagnóstico</dt>
                <dd className="multilinha">{s?.descricao_diagnostico ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt>Justificativa do TFD</dt>
                <dd className="multilinha">{s?.justificativa_tfd ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Bloco: médico solicitante */}
          <section className="bloco">
            <h3 className="bloco-titulo">3. Médico solicitante</h3>
            <dl className="grid-dl">
              <div className="col-span-2">
                <dt>Nome</dt>
                <dd className="forte">{s?.medico_solicitante_nome ?? '—'}</dd>
              </div>
              <div>
                <dt>CRM</dt>
                <dd className="mono">
                  {s?.medico_solicitante_crm ?? '—'}
                  {s?.medico_solicitante_uf && ` / ${s.medico_solicitante_uf}`}
                </dd>
              </div>
            </dl>
          </section>

          {/* Bloco: decisão (destaque) */}
          <section className="bloco">
            <h3 className="bloco-titulo">4. Decisão do parecer</h3>
            <div className={`decisao-box ${deferido ? 'deferido' : 'indeferido'}`}>
              <span className="decisao-label">Parecer</span>
              <span className="decisao-valor">{deferido ? 'DEFERIDO' : 'INDEFERIDO'}</span>
            </div>
            <dl className="grid-dl" style={{ marginTop: 12 }}>
              {tipoLabel && (
                <div className="col-span-2">
                  <dt>Tipo de parecer</dt>
                  <dd className="forte">{tipoLabel}</dd>
                </div>
              )}
              <div>
                <dt>Autoriza acompanhante</dt>
                <dd>{p.autoriza_acompanhante ? 'Sim' : (s?.necessidade_acompanhante ? 'Sim (indicado pelo solicitante)' : 'Não')}</dd>
              </div>
              <div>
                <dt>Versão CID</dt>
                <dd>{p.versao_cid ? `CID-${p.versao_cid}` : 'CID-10'}</dd>
              </div>
            </dl>
            {p.justificativa && (
              <div className="campo-largo">
                <dt>Justificativa do médico auditor</dt>
                <dd className="multilinha">{p.justificativa}</dd>
              </div>
            )}
            {p.observacoes_medicas && (
              <div className="campo-largo">
                <dt>Observações médicas</dt>
                <dd className="multilinha">{p.observacoes_medicas}</dd>
              </div>
            )}
          </section>

          {/* Bloco: médico auditor / assinatura */}
          <section className="bloco assinatura">
            <h3 className="bloco-titulo">5. Médico auditor</h3>
            <dl className="grid-dl">
              <div className="col-span-2">
                <dt>Nome</dt>
                <dd className="forte">{p.medico_auditor?.nome_completo ?? '—'}</dd>
              </div>
              <div>
                <dt>CRM</dt>
                <dd className="mono">
                  {p.medico_auditor?.crm ?? '—'}
                  {p.medico_auditor?.crm_uf && ` / ${p.medico_auditor.crm_uf}`}
                </dd>
              </div>
              <div>
                <dt>Especialidade</dt>
                <dd>{p.medico_auditor?.especialidade_medica ?? '—'}</dd>
              </div>
              <div>
                <dt>Data da emissão</dt>
                <dd>{fmtDateTime(p.created_at)}</dd>
              </div>
            </dl>

            <div className="assinatura-linha">
              <div className="linha" />
              <p>
                {p.medico_auditor?.nome_completo ?? 'Médico Auditor TFD'}
                {p.medico_auditor?.crm && ` — CRM ${p.medico_auditor.crm}${p.medico_auditor.crm_uf ? '/' + p.medico_auditor.crm_uf : ''}`}
              </p>
            </div>
          </section>

          <footer className="rodape">
            <p>Documento gerado eletronicamente pelo sistema TFD/SES-MA em {fmtDateTime(new Date().toISOString())}.</p>
            <p>Parecer nº <span className="mono">{p.id}</span></p>
          </footer>
        </article>
      </main>

      <style>{`
        :root {
          --tinta: #1A1D2B;
          --tinta-fraca: #475569;
          --tinta-muito-fraca: #94A3B8;
          --linha: #CBD5E1;
          --linha-clara: #E2E8F0;
          --primary: #146BFA;
        }
        .parecer-page {
          background: #E5E7EB;
          min-height: 100vh;
          padding: 24px 0 48px;
          display: flex;
          justify-content: center;
        }
        .folha {
          background: white;
          width: 210mm;
          min-height: 297mm;
          padding: 22mm 20mm;
          box-shadow: 0 4px 24px rgba(15,23,42,0.10);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--tinta);
          font-size: 11.5pt;
          line-height: 1.45;
        }
        .cabecalho {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 14px;
          border-bottom: 2px solid var(--tinta);
          margin-bottom: 18px;
        }
        .brasao-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid var(--tinta);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brasao-text {
          font-weight: 700;
          font-size: 16pt;
          letter-spacing: 0.5px;
        }
        .cabecalho-textos h1 {
          font-size: 11pt;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.2px;
        }
        .cabecalho-textos h2 {
          font-size: 10pt;
          font-weight: 600;
          margin: 2px 0 0;
          color: var(--tinta-fraca);
        }
        .cabecalho-textos h3 {
          font-size: 9pt;
          font-weight: 500;
          margin: 2px 0 0;
          color: var(--tinta-fraca);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .titulo-doc {
          text-align: center;
          margin-bottom: 22px;
        }
        .titulo-doc h2 {
          font-size: 15pt;
          font-weight: 700;
          margin: 0;
          letter-spacing: 2px;
        }
        .titulo-doc .protocolo {
          font-size: 10pt;
          margin: 4px 0 0;
          color: var(--tinta-fraca);
        }
        .bloco {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .bloco-titulo {
          font-size: 11pt;
          font-weight: 700;
          margin: 0 0 8px;
          padding: 4px 8px;
          background: #F1F5F9;
          border-left: 3px solid var(--primary);
          color: var(--tinta);
        }
        .grid-dl {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
          margin: 0;
        }
        .grid-dl > div {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .grid-dl .col-span-2 {
          grid-column: span 2;
        }
        .grid-dl dt {
          font-size: 8.5pt;
          font-weight: 600;
          color: var(--tinta-muito-fraca);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .grid-dl dd {
          font-size: 11pt;
          margin: 0;
          color: var(--tinta);
        }
        .grid-dl dd.forte { font-weight: 600; }
        .grid-dl dd.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 10.5pt; }
        .grid-dl dd.multilinha {
          white-space: pre-wrap;
          text-align: justify;
          line-height: 1.55;
        }
        .grid-dl .muted { color: var(--tinta-muito-fraca); font-weight: 400; }
        .campo-largo {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .campo-largo dt {
          font-size: 8.5pt;
          font-weight: 600;
          color: var(--tinta-muito-fraca);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .campo-largo dd {
          font-size: 11pt;
          margin: 0;
          color: var(--tinta);
          white-space: pre-wrap;
          text-align: justify;
          line-height: 1.55;
        }
        .decisao-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-radius: 6px;
          border-width: 2px;
          border-style: solid;
        }
        .decisao-box.deferido {
          background: #ECFDF5;
          border-color: #15803D;
          color: #15803D;
        }
        .decisao-box.indeferido {
          background: #FEF2F2;
          border-color: #B91C1C;
          color: #B91C1C;
        }
        .decisao-label {
          font-size: 10pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }
        .decisao-valor {
          font-size: 18pt;
          font-weight: 800;
          letter-spacing: 2px;
        }
        .assinatura .assinatura-linha {
          margin-top: 32px;
          padding-top: 4px;
          text-align: center;
        }
        .assinatura-linha .linha {
          border-top: 1px solid var(--tinta);
          width: 60%;
          margin: 0 auto 4px;
        }
        .assinatura-linha p {
          margin: 0;
          font-size: 10pt;
          color: var(--tinta-fraca);
        }
        .rodape {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid var(--linha-clara);
          text-align: center;
        }
        .rodape p {
          margin: 1px 0;
          font-size: 8.5pt;
          color: var(--tinta-muito-fraca);
        }
        .rodape .mono { font-family: ui-monospace, monospace; }

        /* PRINT */
        @media print {
          .parecer-page { background: white; padding: 0; }
          .folha { box-shadow: none; width: auto; min-height: auto; padding: 14mm 16mm; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
