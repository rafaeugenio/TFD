import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import DespachoToolbar from './DespachoToolbar';
import './print.css';

interface PacienteRow {
  nome_completo: string;
  cpf: string;
  municipio: string;
  uf: string;
}

interface SolicitacaoRow {
  numero_processo: string;
  created_at: string;
  paciente: PacienteRow | null;
}

interface ResponsavelRow {
  nome_completo: string;
  perfil: string;
}

interface DespachoRow {
  id: string;
  numero_sei: string | null;
  texto_despacho: string | null;
  observacoes: string | null;
  created_at: string;
  solicitacao: SolicitacaoRow | null;
  responsavel: ResponsavelRow | null;
}

function formatarData(iso: string, comHora = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return comHora ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
}

export default async function DespachoFinanceiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('despachos_financeiros')
    .select(
      `id, numero_sei, texto_despacho, observacoes, created_at,
       solicitacao:solicitacoes(
         numero_processo, created_at,
         paciente:pacientes(nome_completo, cpf, municipio, uf)
       ),
       responsavel:usuarios!despachos_financeiros_gerado_por_fkey(nome_completo, perfil)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  const despacho = data as unknown as DespachoRow;
  const s = despacho.solicitacao;
  const paciente = s?.paciente ?? null;
  const responsavel = despacho.responsavel;
  const emissao = new Date().toLocaleString('pt-BR');

  return (
    <div className="print-root">
      <DespachoToolbar despachoId={despacho.id} />

      {/* Aviso TEMP — remover quando o template oficial for fornecido */}
      <div className="no-print template-warning">
        ⚠ Aguardando template oficial do TFD/SES — este layout é provisório.
        O texto do despacho abaixo é editado livremente até a versão final.
      </div>

      <div className="print-page">
        <h1>DESPACHO FINANCEIRO — Tratamento Fora de Domicílio (TFD)</h1>
        <h2>Secretaria de Estado da Saúde — Maranhão</h2>
        <hr />

        {paciente ? (
          <>
            <p className="print-section-title">Dados do paciente</p>
            <div className="print-row"><span className="lbl">Nome</span><span className="val">{paciente.nome_completo}</span></div>
            <div className="print-row"><span className="lbl">CPF</span><span className="val">{paciente.cpf}</span></div>
            <div className="print-row"><span className="lbl">Município</span><span className="val">{paciente.municipio}/{paciente.uf}</span></div>
          </>
        ) : null}

        {s ? (
          <>
            <p className="print-section-title">Dados da solicitação</p>
            <div className="print-row"><span className="lbl">Número do processo</span><span className="val">{s.numero_processo}</span></div>
            <div className="print-row"><span className="lbl">Data de abertura</span><span className="val">{formatarData(s.created_at, true)}</span></div>
            {despacho.numero_sei && (
              <div className="print-row"><span className="lbl">Processo SEI</span><span className="val">{despacho.numero_sei}</span></div>
            )}
          </>
        ) : null}

        <p className="print-section-title">Texto do despacho</p>
        {despacho.texto_despacho?.trim() ? (
          <div className="print-corpo">{despacho.texto_despacho}</div>
        ) : (
          <div className="print-corpo print-corpo-vazio">
            — Texto do despacho ainda não preenchido. O template oficial será inserido aqui assim que disponibilizado pelo TFD/SES. —
          </div>
        )}

        {despacho.observacoes?.trim() && (
          <>
            <p className="print-section-title">Observações</p>
            <div className="print-corpo">{despacho.observacoes}</div>
          </>
        )}

        {responsavel ? (
          <>
            <p className="print-section-title" style={{ marginTop: 28 }}>Responsável</p>
            <div className="print-row"><span className="lbl">Nome</span><span className="val">{responsavel.nome_completo}</span></div>
            <div className="print-row"><span className="lbl">Perfil</span><span className="val">{responsavel.perfil}</span></div>
            <div className="print-row"><span className="lbl">Emitido em</span><span className="val">{formatarData(despacho.created_at, true)}</span></div>
          </>
        ) : null}

        <hr style={{ marginTop: 32 }} />
        <p className="print-stamp">
          Documento emitido pelo sistema TFD em {emissao}. Identificador: {despacho.id}.
        </p>
      </div>
    </div>
  );
}
