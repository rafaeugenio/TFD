import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import ParecerPrintToolbar from './ParecerPrintToolbar';
import './print.css';

interface PacienteRow {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  sexo: 'M' | 'F';
  municipio: string;
  uf: string;
  telefone_celular: string | null;
}

interface SolicitacaoRow {
  numero_processo: string;
  created_at: string;
  cid10_principal: string;
  cid10_secundario: string | null;
  especialidade: string | null;
  descricao_diagnostico: string;
  justificativa_tfd: string;
  paciente: PacienteRow | null;
}

interface MedicoRow {
  nome_completo: string;
  crm: string | null;
  crm_uf: string | null;
  especialidade_medica: string | null;
}

interface ParecerRow {
  id: string;
  decisao: string;
  justificativa: string | null;
  observacoes_medicas: string | null;
  data_hora_parecer: string;
  autoriza_acompanhante: boolean;
  solicitacao: SolicitacaoRow | null;
  medico: MedicoRow | null;
}

function formatarData(iso: string, comHora = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return comHora ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
}

export default async function ParecerPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('pareceres')
    .select(
      `id, decisao, justificativa, observacoes_medicas, data_hora_parecer, autoriza_acompanhante,
       solicitacao:solicitacoes(
         numero_processo, created_at, cid10_principal, cid10_secundario, especialidade, descricao_diagnostico, justificativa_tfd,
         paciente:pacientes(nome_completo, cpf, data_nascimento, sexo, municipio, uf, telefone_celular)
       ),
       medico:usuarios!pareceres_medico_auditor_id_fkey(nome_completo, crm, crm_uf, especialidade_medica)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();

  const parecer = data as unknown as ParecerRow;
  const s = parecer.solicitacao;
  const paciente = s?.paciente ?? null;
  const medico = parecer.medico;

  const decisao = String(parecer.decisao).toUpperCase();
  const isDeferido = decisao === 'DEFERIDO';
  const decisaoColor = isDeferido ? '#15803D' : '#B91C1C';
  const observacao = parecer.observacoes_medicas?.trim() || parecer.justificativa?.trim() || '— Sem observação registrada —';
  const emissao = new Date().toLocaleString('pt-BR');

  return (
    <div className="print-root">
      <ParecerPrintToolbar />

      <div className="print-page">
        <h1>PARECER MÉDICO — Tratamento Fora de Domicílio (TFD)</h1>
        <h2>Secretaria de Estado da Saúde — Maranhão</h2>
        <hr />

        {paciente ? (
          <>
            <p className="print-section-title">Dados do paciente</p>
            <div className="print-row"><span className="lbl">Nome</span><span className="val">{paciente.nome_completo}</span></div>
            <div className="print-row"><span className="lbl">CPF</span><span className="val">{paciente.cpf}</span></div>
            <div className="print-row"><span className="lbl">Data de nascimento</span><span className="val">{formatarData(paciente.data_nascimento)}</span></div>
            <div className="print-row"><span className="lbl">Sexo</span><span className="val">{paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}</span></div>
            <div className="print-row"><span className="lbl">Município</span><span className="val">{paciente.municipio}/{paciente.uf}</span></div>
            {paciente.telefone_celular && (
              <div className="print-row"><span className="lbl">Telefone</span><span className="val">{paciente.telefone_celular}</span></div>
            )}
          </>
        ) : null}

        {s ? (
          <>
            <p className="print-section-title">Dados da solicitação</p>
            <div className="print-row"><span className="lbl">Número</span><span className="val">{s.numero_processo}</span></div>
            <div className="print-row"><span className="lbl">Data de criação</span><span className="val">{formatarData(s.created_at, true)}</span></div>
            {s.especialidade && (
              <div className="print-row"><span className="lbl">Especialidade</span><span className="val">{s.especialidade}</span></div>
            )}
            <div className="print-row"><span className="lbl">Diagnóstico</span><span className="val">{s.descricao_diagnostico}</span></div>

            <p className="print-section-title">CIDs (CID-10)</p>
            <div className="print-row"><span className="lbl">Principal</span><span className="val">{s.cid10_principal}</span></div>
            {s.cid10_secundario && (
              <div className="print-row"><span className="lbl">Secundário</span><span className="val">{s.cid10_secundario}</span></div>
            )}
          </>
        ) : null}

        <p className="print-section-title">Decisão</p>
        <p style={{ margin: '6px 0 16px' }}>
          <span className="print-decisao" style={{ color: decisaoColor, borderColor: decisaoColor }}>{decisao}</span>
        </p>
        {parecer.autoriza_acompanhante && (
          <p style={{ fontSize: 12, color: '#475569', margin: '0 0 16px' }}>
            Autorizado acompanhante.
          </p>
        )}

        <p className="print-section-title">Observação / fundamentação</p>
        <div className="print-obs">{observacao}</div>

        {medico ? (
          <>
            <p className="print-section-title" style={{ marginTop: 28 }}>Médico parecerista</p>
            <div className="print-row"><span className="lbl">Nome</span><span className="val">{medico.nome_completo}</span></div>
            {medico.crm && (
              <div className="print-row"><span className="lbl">CRM</span><span className="val">{medico.crm}{medico.crm_uf ? `/${medico.crm_uf}` : ''}</span></div>
            )}
            {medico.especialidade_medica && (
              <div className="print-row"><span className="lbl">Especialidade</span><span className="val">{medico.especialidade_medica}</span></div>
            )}
            <div className="print-row"><span className="lbl">Data do parecer</span><span className="val">{formatarData(parecer.data_hora_parecer, true)}</span></div>
          </>
        ) : null}

        <hr style={{ marginTop: 32 }} />
        <p className="print-stamp">
          Documento emitido pelo sistema TFD em {emissao}. Identificador do parecer: {parecer.id}.
        </p>
      </div>
    </div>
  );
}
