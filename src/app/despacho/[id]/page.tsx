import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  REPRESENTANTES_PADRAO,
  type RepresentanteDespacho,
} from '@/core/despacho/representantes';
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
  representantes: RepresentanteDespacho[] | null;
  created_at: string;
  solicitacao: SolicitacaoRow | null;
  responsavel: ResponsavelRow | null;
}

function formatarProcessoCurto(numero: string | undefined): string {
  if (!numero) return '____/____';
  // "2026.110222.15889" → "15889/2026"; senão devolve o original
  const partes = numero.split('.');
  if (partes.length >= 3) return `${partes[partes.length - 1]}/${partes[0]}`;
  return numero;
}

function derivarNumeroDespacho(id: string): string {
  // Sem coluna dedicada — derivamos um número estável a partir do UUID.
  const hex = id.replace(/[^0-9a-f]/gi, '').slice(0, 6);
  const num = parseInt(hex, 16) % 9000 + 1000;
  return String(num);
}

export default async function DespachoFinanceiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('despachos_financeiros')
    .select(
      `id, numero_sei, texto_despacho, observacoes, representantes, created_at,
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

  const numeroProcesso = despacho.numero_sei ?? s?.numero_processo ?? '';
  const processoCurto = formatarProcessoCurto(numeroProcesso);
  const numeroDespacho = derivarNumeroDespacho(despacho.id);
  const codigoVerificador = despacho.id.replace(/-/g, '').slice(0, 9).toUpperCase();
  const nomePaciente = paciente?.nome_completo?.toUpperCase() ?? '[NOME DO PACIENTE]';
  const assunto = `DE PASSAGEM E AJUDA DE CUSTO PARA ${nomePaciente}`;

  const corpoTexto = despacho.texto_despacho?.trim();

  // Representantes salvos no despacho; cai nos padrões em documentos antigos.
  const reps =
    despacho.representantes && despacho.representantes.length
      ? despacho.representantes
      : REPRESENTANTES_PADRAO;
  // Último representante entra como bloco "De acordo," quando há mais de um.
  const repsPrincipais = reps.length > 1 ? reps.slice(0, -1) : reps;
  const repDeAcordo = reps.length > 1 ? reps[reps.length - 1] : null;

  return (
    <div className="print-root">
      <DespachoToolbar despachoId={despacho.id} />

      <div className="print-page sei-page">
        {/* ── Cabeçalho oficial ─────────────────────────── */}
        <header className="sei-header">
          <img
            src="/brand/ses-ma-horizontal.png"
            alt="Governo do Estado do Maranhão — Secretaria de Estado da Saúde"
            className="sei-brasao"
          />
          <p className="sei-orgao">GOVERNO DO ESTADO DO MARANHÃO</p>
          <p className="sei-subOrgao">SECRETARIA DE ESTADO DA SAÚDE</p>
        </header>

        {/* ── Metadados do processo ─────────────────────── */}
        <div className="sei-meta">
          <p>
            <strong>Processo nº:</strong> {numeroProcesso || '—'}
          </p>
          <p>
            <strong>Assunto:</strong> {assunto}
          </p>
        </div>

        {/* ── Título e destinatário ─────────────────────── */}
        <h1 className="sei-titulo">DESPACHO Nº {numeroDespacho} - COORDTFD/SES</h1>
        <p className="sei-destinatario">À SECRETARIA-ADJUNTA DE ASSISTÊNCIA A SAÚDE (SAAS/SES)</p>

        {/* ── Corpo ─────────────────────────────────────── */}
        <section className="sei-corpo">
          {corpoTexto ? (
            corpoTexto.split(/\n\s*\n/).map((par, i) => <p key={i}>{par}</p>)
          ) : (
            <>
              <p>
                Encaminhamos a V. Sª o processo <strong>{processoCurto},</strong>{' '}
                <em>de solicitação</em> de ajuda de custo do{' '}
                <strong>paciente {nomePaciente},</strong> cadastrado no Programa do
                Tratamento Fora do Domicílio – TFD.
              </p>
              <p>
                Segue anexo o Recibo de Pagamento a Beneficiário – RPB, discriminando o
                tempo de permanência do paciente fora do domicílio conforme comprovantes.
              </p>
              <p>
                O valor a ser pago é de <strong>R$ ______ (___________________).</strong>
              </p>
              <p>
                Expostas as informações pertinentes, encaminham-se os autos ao ordenador
                de despesas da Secretaria Adjunta de Assistência à Saúde – SAAS para as
                providências cabíveis.
              </p>
            </>
          )}
        </section>

        {/* ── Assinaturas ───────────────────────────────── */}
        <section className="sei-assinaturas">
          <p className="sei-saudacao">
            <strong>Atenciosamente,</strong>
          </p>

          {repsPrincipais.map((r, i) => (
            <div className="sei-bloco-assinatura" key={`${r.usuario_id ?? 'manual'}-${i}`}>
              <p className="sei-nome">
                <strong>{r.nome}</strong>
              </p>
              {r.cargo && <p>{r.cargo}</p>}
              {r.id_funcional && <p>{r.id_funcional}</p>}
            </div>
          ))}

          {repDeAcordo && (
            <>
              <p className="sei-saudacao">
                <strong>De acordo,</strong>
              </p>
              <div className="sei-bloco-assinatura">
                <p className="sei-nome">
                  <strong>{repDeAcordo.nome}</strong>
                </p>
                {repDeAcordo.cargo && <p>{repDeAcordo.cargo}</p>}
                {repDeAcordo.id_funcional && <p>{repDeAcordo.id_funcional}</p>}
              </div>
            </>
          )}
        </section>

        {/* ── Rodapé institucional ──────────────────────── */}
        <footer className="sei-footer">
          <p>Av. Professor Carlos Cunha, S/N - Bairro Jaracaty. São Luís - MA - CEP 65076-820</p>
          <p>- https://www.saude.ma.gov.br/</p>
        </footer>

        <p className="sei-pagina">
          Despacho {numeroDespacho} ({codigoVerificador}) &nbsp;&nbsp;&nbsp;&nbsp; SEI{' '}
          {numeroProcesso || '—'} / pg. 1
        </p>
      </div>

      {/* Observações internas — não fazem parte do documento oficial */}
      {despacho.observacoes?.trim() && (
        <div className="print-page sei-page no-print-aux">
          <p className="print-section-title">Observações internas</p>
          <div className="print-corpo">{despacho.observacoes}</div>
        </div>
      )}
    </div>
  );
}
