'use client';

import { use, useEffect, useState } from 'react';
import { Loader2, FileText, Plane, Wallet, PlusCircle, Landmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ReportHero,
  TableCard,
  PrintButton,
  ReportPrintStyles,
} from '@/app/relatorios/_shared/ReportShell';
import { ReportTable, type ReportColumn } from '@/app/relatorios/_shared/ReportTable';
import { fmtBRL, fmtDataBR, valorPorExtenso } from '@/app/relatorios/_shared/format';
import { TITULAR_VINCULO_LABEL, type TitularVinculo } from '@/services/dados-bancarios.service';

interface PacienteRow {
  nome_completo: string;
  cpf: string;
  cns: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  telefone_celular: string | null;
  email: string | null;
  municipio: string | null;
  uf: string | null;
}
interface SolicitacaoRow {
  id: string;
  numero_processo: string;
  cid10_principal: string | null;
  created_at: string;
  paciente_id: string;
}
interface ViagemRow {
  id: string;
  tipo: string;
  modal: string;
  numero_bilhete: string | null;
  origem_cidade: string; origem_uf: string;
  destino_cidade: string; destino_uf: string;
  data_embarque_prevista: string | null;
  valor: number;
  valor_reembolso: number | null;
  ativa: boolean;
}
interface AjudaRow {
  id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string | null;
  dias_elegiveis: number | null;
  valor_total: number | null;
  valor_reembolso: number | null;
  ativa: boolean;
}
interface AdicionalRow {
  id: string;
  descricao: string;
  data: string | null;
  valor: number;
}
interface BancarioRow {
  banco: string; agencia: string; conta: string; tipo_conta: string | null;
  nome_titular: string; cpf_titular: string;
  titular_vinculo: TitularVinculo | null;
  pix_tipo: string | null; pix_chave: string | null;
}

export default function RelatorioTfdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [sol, setSol] = useState<SolicitacaoRow | null>(null);
  const [paciente, setPaciente] = useState<PacienteRow | null>(null);
  const [viagens, setViagens] = useState<ViagemRow[]>([]);
  const [ajudas, setAjudas] = useState<AjudaRow[]>([]);
  const [adicionais, setAdicionais] = useState<AdicionalRow[]>([]);
  const [banc, setBanc] = useState<BancarioRow | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: solData } = await supabase
        .from('solicitacoes')
        .select('id, numero_processo, cid10_principal, created_at, paciente_id, pacientes(nome_completo, cpf, cns, data_nascimento, sexo, telefone_celular, email, municipio, uf)')
        .eq('id', id)
        .maybeSingle();
      if (cancel) return;
      if (solData) {
        const s = solData as unknown as SolicitacaoRow & { pacientes: PacienteRow };
        setSol(s);
        setPaciente(s.pacientes);
      }

      const [{ data: v }, { data: a }, { data: ad }, { data: b }] = await Promise.all([
        supabase.from('viagens').select('id, tipo, modal, numero_bilhete, origem_cidade, origem_uf, destino_cidade, destino_uf, data_embarque_prevista, valor, valor_reembolso, ativa').eq('solicitacao_id', id).order('data_embarque_prevista', { ascending: true }),
        supabase.from('ajudas_custo').select('id, tipo, data_inicio, data_fim, dias_elegiveis, valor_total, valor_reembolso, ativa').eq('solicitacao_id', id).order('data_inicio', { ascending: true }),
        supabase.from('adicionais').select('id, descricao, data, valor').eq('solicitacao_id', id),
        supabase.from('dados_bancarios').select('banco, agencia, conta, tipo_conta, nome_titular, cpf_titular, titular_vinculo, pix_tipo, pix_chave').eq('solicitacao_id', id).maybeSingle(),
      ]);
      if (cancel) return;
      setViagens((v as unknown as ViagemRow[]) ?? []);
      setAjudas((a as unknown as AjudaRow[]) ?? []);
      setAdicionais((ad as unknown as AdicionalRow[]) ?? []);
      setBanc((b as unknown as BancarioRow) ?? null);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  if (loading || !sol || !paciente) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
      </div>
    );
  }

  const idade = paciente.data_nascimento
    ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const totalViagens = viagens.filter((v) => v.ativa).reduce((acc, v) => acc + (Number(v.valor) - (Number(v.valor_reembolso) || 0)), 0);
  const totalAjudas = ajudas.filter((a) => a.ativa).reduce((acc, a) => acc + ((Number(a.valor_total) || 0) - (Number(a.valor_reembolso) || 0)), 0);
  const totalAdicionais = adicionais.reduce((acc, a) => acc + Number(a.valor || 0), 0);
  const total = totalViagens + totalAjudas + totalAdicionais;

  const colsViagens: ReportColumn<ViagemRow>[] = [
    { key: 'tipo', header: 'Tipo', width: '70px', render: (r) => r.tipo === 'RETORNO' ? 'Volta' : 'Ida' },
    { key: 'modal', header: 'Modal', width: '80px', render: (r) => r.modal },
    { key: 'data', header: 'Data', width: '100px', render: (r) => fmtDataBR(r.data_embarque_prevista) },
    { key: 'trecho', header: 'Trecho', render: (r) => `${r.origem_uf}/${r.origem_cidade} → ${r.destino_uf}/${r.destino_cidade}` },
    { key: 'doc', header: 'Bilhete', width: '110px', mono: true, render: (r) => r.numero_bilhete ?? '—' },
    { key: 'valor', header: 'Valor', align: 'right', width: '110px', render: (r) => <span style={{ textDecoration: r.ativa ? undefined : 'line-through', color: r.ativa ? undefined : '#94A3B8' }}>{fmtBRL(Number(r.valor) - (Number(r.valor_reembolso) || 0))}</span> },
  ];

  const colsAjudas: ReportColumn<AjudaRow>[] = [
    { key: 'tipo', header: 'Benef.', width: '110px', render: (r) => r.tipo === 'ACOMPANHANTE' ? 'Acompanhante' : 'Paciente' },
    { key: 'inicio', header: 'Início', width: '100px', render: (r) => fmtDataBR(r.data_inicio) },
    { key: 'fim', header: 'Fim', width: '100px', render: (r) => fmtDataBR(r.data_fim) },
    { key: 'dias', header: 'Dias', align: 'right', width: '70px', render: (r) => r.dias_elegiveis ?? '—' },
    { key: 'valor', header: 'Valor', align: 'right', width: '120px', render: (r) => <span style={{ textDecoration: r.ativa ? undefined : 'line-through', color: r.ativa ? undefined : '#94A3B8' }}>{fmtBRL((Number(r.valor_total) || 0) - (Number(r.valor_reembolso) || 0))}</span> },
  ];

  const colsAdic: ReportColumn<AdicionalRow>[] = [
    { key: 'data', header: 'Data', width: '100px', render: (r) => fmtDataBR(r.data) },
    { key: 'desc', header: 'Descrição', render: (r) => r.descricao },
    { key: 'valor', header: 'Valor', align: 'right', width: '120px', render: (r) => fmtBRL(Number(r.valor)) },
  ];

  return (
    <div className="space-y-4" style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 24px 60px' }}>
      <ReportPrintStyles />

      <div className="flex justify-between items-center no-print">
        <h1 className="text-[18px] font-semibold inline-flex items-center gap-2" style={{ color: '#0F172A' }}>
          <FileText size={18} style={{ color: 'var(--tfd-primary-500)' }} />
          Relatório TFD — {sol.numero_processo}
        </h1>
        <PrintButton />
      </div>

      <ReportHero
        titulo={`Relatório TFD — ${sol.numero_processo}`}
        periodoLabel={`Emitido em ${fmtDataBR(new Date().toISOString().slice(0, 10))}`}
        rightSlot={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Total</p>
            <p className="text-[20px] font-bold font-mono">{fmtBRL(total)}</p>
          </div>
        }
      />

      {/* Cabeçalho com dados do paciente */}
      <section className="px-5 py-4" style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 10 }}>
        <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#475569', letterSpacing: '0.06em' }}>
          Identificação do paciente
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-[12.5px]">
          <Field label="Nome">{paciente.nome_completo}</Field>
          <Field label="CPF" mono>{paciente.cpf}</Field>
          <Field label="CNS" mono>{paciente.cns ?? '—'}</Field>
          <Field label="Sexo">{paciente.sexo ?? '—'}</Field>
          <Field label="Nascimento">{fmtDataBR(paciente.data_nascimento)}{idade != null ? ` · ${idade} anos` : ''}</Field>
          <Field label="Telefone" mono>{paciente.telefone_celular ?? '—'}</Field>
          <Field label="Município">{paciente.municipio ?? '—'}{paciente.uf ? ` / ${paciente.uf}` : ''}</Field>
          <Field label="E-mail">{paciente.email ?? '—'}</Field>
          <Field label="CID-10" mono>{sol.cid10_principal ?? '—'}</Field>
        </div>
      </section>

      <TableCard title="Passagens" subtitle={`${viagens.length} trecho(s)`} count={viagens.length} icon={<Plane size={13} />}>
        <ReportTable
          columns={colsViagens}
          rows={viagens}
          emptyLabel="Nenhuma passagem registrada."
          footerRow={viagens.length > 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right' }}>Subtotal</td>
              <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtBRL(totalViagens)}</td>
            </tr>
          ) : undefined}
        />
      </TableCard>

      <TableCard title="Ajuda de Custo" subtitle={`${ajudas.length} período(s)`} count={ajudas.length} icon={<Wallet size={13} />}>
        <ReportTable
          columns={colsAjudas}
          rows={ajudas}
          emptyLabel="Nenhuma ajuda de custo registrada."
          footerRow={ajudas.length > 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right' }}>Subtotal</td>
              <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right' }} colSpan={2}>{fmtBRL(totalAjudas)}</td>
            </tr>
          ) : undefined}
        />
      </TableCard>

      {adicionais.length > 0 && (
        <TableCard title="Adicionais" subtitle="Bagagem, transfer, oxigênio etc." count={adicionais.length} icon={<PlusCircle size={13} />}>
          <ReportTable
            columns={colsAdic}
            rows={adicionais}
            footerRow={(
              <tr>
                <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right' }}>Subtotal</td>
                <td className="font-mono" style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtBRL(totalAdicionais)}</td>
              </tr>
            )}
          />
        </TableCard>
      )}

      {/* Dados bancários */}
      <section className="px-5 py-4" style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 10 }}>
        <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3 inline-flex items-center gap-2" style={{ color: '#475569', letterSpacing: '0.06em' }}>
          <Landmark size={13} /> Conta para recebimento da ajuda de custo
        </h2>
        {banc ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6 text-[12.5px]">
            <Field label="Banco">{banc.banco}</Field>
            <Field label="Agência" mono>{banc.agencia}</Field>
            <Field label="Conta" mono>{banc.conta} {banc.tipo_conta && `(${banc.tipo_conta === 'POUPANCA' ? 'Poupança' : 'Corrente'})`}</Field>
            <Field label="Titular">{banc.nome_titular}</Field>
            <Field label="CPF do titular" mono>{banc.cpf_titular}</Field>
            <Field label="Vínculo">{banc.titular_vinculo ? TITULAR_VINCULO_LABEL[banc.titular_vinculo] : '—'}</Field>
            {banc.pix_chave && (
              <Field label={`PIX (${banc.pix_tipo})`} mono>{banc.pix_chave}</Field>
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: '#94A3B8' }}>Nenhum dado bancário cadastrado.</p>
        )}
      </section>

      {/* Total final */}
      <div
        className="px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 60%)',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#15803D', letterSpacing: '0.08em' }}>
              Total a pagar / faturar
            </p>
            <p className="text-[12.5px] italic" style={{ color: '#475569' }}>
              {valorPorExtenso(total)}.
            </p>
          </div>
          <p className="text-[26px] font-bold font-mono" style={{ color: '#15803D', letterSpacing: '-0.01em' }}>
            {fmtBRL(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8', letterSpacing: '0.04em' }}>{label}</div>
      <div className={mono ? 'font-mono' : ''} style={{ color: '#0F172A' }}>{children}</div>
    </div>
  );
}
