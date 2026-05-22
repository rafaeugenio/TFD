'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ClipboardList, Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ReportToolbar,
  FilterField,
  PillButton,
  PrintButton,
  ReportHero,
  StatsRow,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { ReportTable, TipoBeneficiarioBadge, type ReportColumn } from './_shared/ReportTable';
import { MES_LABEL, MES_LABEL_SHORT, anosDisponiveis, fmtDataBR } from './_shared/format';
import {
  resolveSigtapAjudaCusto,
  resolveSigtapPassagem,
  calcularQuantidadePassagem,
  type Beneficiario,
  type Modal,
} from './_shared/sigtap-mapper';

function ModalBadge({ modal }: { modal: Modal }) {
  const MAP: Record<Modal, { label: string; bg: string; fg: string }> = {
    terrestre: { label: 'Terrestre', bg: '#DCFCE7', fg: '#166534' },
    aereo:     { label: 'Aéreo',     bg: '#DBEAFE', fg: '#1E40AF' },
    fluvial:   { label: 'Fluvial',   bg: '#CFFAFE', fg: '#0E7490' },
  };
  const v = MAP[modal];
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-1.5"
      style={{ background: v.bg, color: v.fg, borderRadius: 3, whiteSpace: 'nowrap', lineHeight: '16px' }}
    >
      {v.label}
    </span>
  );
}

type RPBTipo = 'ajuda_custo' | 'passagem';

interface RPBRow {
  id: string;
  origem_id: string;
  trecho: 'ida' | 'volta' | null;
  dt_atendimento: string;
  cpf_cns: string;
  nome: string;
  beneficiario_tipo: Beneficiario;
  sexo: string | null;
  data_nascimento: string | null;
  cep: string | null;
  municipio: string | null;
  endereco: string | null;
  bairro: string | null;
  telefone: string | null;
  email: string | null;
  codigo_sigtap: string;
  sigtap_descricao: string;
  quantidade: number | null;
  cid: string | null;
  // específicas de passagens
  modal?: Modal;
  trecho_label?: string;
  rota_pendente?: boolean;
  distancia_valor?: number | null;
  distancia_unidade?: string | null;
  unidade_divisor?: number;
  unidade_label?: string;
}

export default function RelatorioRPB() {
  const hoje = new Date();
  const [tipo, setTipo] = useState<RPBTipo>('ajuda_custo');
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1); // 0 = ano inteiro
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RPBRow[]>([]);
  const [lancados, setLancados] = useState<Set<string>>(new Set());
  const [valoresSigtap, setValoresSigtap] = useState<Record<string, number>>({});

  const periodo = useMemo(() => {
    if (mes === 0) {
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, label: `Ano de ${ano}` };
    }
    const lastDay = new Date(ano, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    return {
      inicio: `${ano}-${mm}-01`,
      fim: `${ano}-${mm}-${String(lastDay).padStart(2, '0')}`,
      label: `${MES_LABEL[mes - 1]} de ${ano}`,
    };
  }, [ano, mes]);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      let rowsLocal: RPBRow[] = [];

      if (tipo === 'ajuda_custo') {
        const { data, error } = await supabase
          .from('ajudas_custo')
          .select(
            'id, tipo, data_inicio, data_fim, dias_elegiveis, solicitacao_id, ' +
            'solicitacoes!inner(cid10_principal, paciente_id, ' +
            '  pacientes(cpf, cns, nome_completo, sexo, data_nascimento, telefone_celular, email, logradouro, numero, bairro, cep, municipio))'
          )
          .gte('data_inicio', periodo.inicio)
          .lte('data_inicio', periodo.fim)
          .order('data_inicio', { ascending: true });

        if (cancel) return;
        if (error || !data) {
          setRows([]);
          setLancados(new Set());
          setLoading(false);
          return;
        }

        // Para tipos ACOMPANHANTE, buscar o vínculo desta solicitação
        // (solicitacao_acompanhantes — aqui está o flag `doador` por solicitação).
        const solicitacaoIds = Array.from(
          new Set(
            (data as unknown as Array<Record<string, unknown>>)
              .filter((r) => (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE')
              .map((r) => r.solicitacao_id as string)
              .filter(Boolean)
          )
        );
        // Indexado por solicitacao_id — pega o primeiro vínculo (na prática
        // costuma haver 1 acompanhante por solicitação no fluxo BPA).
        const acompMap = new Map<string, { nome: string; cpf: string; cns: string | null; sexo: string | null; email: string | null; data_nascimento: string | null; telefone: string | null; doador: boolean }>();
        if (solicitacaoIds.length > 0) {
          const { data: vinculos } = await supabase
            .from('solicitacao_acompanhantes')
            .select(
              'solicitacao_id, doador, ' +
              'acompanhantes(nome_completo, cpf, cns, sexo, email, data_nascimento, telefone)'
            )
            .in('solicitacao_id', solicitacaoIds);
          (vinculos as unknown as Array<Record<string, unknown>> ?? []).forEach((v) => {
            const sid = v.solicitacao_id as string;
            const a = v.acompanhantes as Record<string, unknown> | null;
            if (!a || acompMap.has(sid)) return;
            acompMap.set(sid, {
              nome: a.nome_completo as string,
              cpf: a.cpf as string,
              cns: (a.cns as string) ?? null,
              sexo: (a.sexo as string) ?? null,
              email: (a.email as string) ?? null,
              data_nascimento: (a.data_nascimento as string) ?? null,
              telefone: (a.telefone as string) ?? null,
              doador: Boolean(v.doador),
            });
          });
        }

        const mapped: RPBRow[] = (data as unknown as Array<Record<string, unknown>>).map((r) => {
          const sol = r.solicitacoes as Record<string, unknown> | null;
          const pac = sol?.pacientes as Record<string, unknown> | null;
          const beneficiarioOriginal: Beneficiario =
            (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente';
          const dias = Number(r.dias_elegiveis ?? 0);
          const comPernoite = dias > 0;

          const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');
          const acomp =
            beneficiarioOriginal === 'acompanhante' && r.solicitacao_id
              ? acompMap.get(r.solicitacao_id as string) ?? null
              : null;

          // Acompanhante doador conta como PACIENTE para o SIGTAP/BPA.
          const beneficiario: Beneficiario =
            acomp?.doador ? 'paciente' : beneficiarioOriginal;
          const sig = resolveSigtapAjudaCusto({ beneficiario, comPernoite, cnrac: false });

          const nome = acomp?.nome ?? (pac?.nome_completo as string) ?? '—';
          const cpfCns = acomp?.cpf ?? (pac?.cpf as string) ?? (pac?.cns as string) ?? '—';

          return {
            id: String(r.id),
            origem_id: String(r.id),
            trecho: null,
            dt_atendimento: String(r.data_inicio),
            cpf_cns: cpfCns,
            nome,
            beneficiario_tipo: beneficiario,
            sexo: acomp ? acomp.sexo : ((pac?.sexo as string) ?? null),
            data_nascimento: acomp ? acomp.data_nascimento : ((pac?.data_nascimento as string) ?? null),
            cep: (pac?.cep as string) ?? null,
            municipio: (pac?.municipio as string) ?? null,
            endereco: enderecoFull || null,
            bairro: (pac?.bairro as string) ?? null,
            telefone: acomp ? acomp.telefone : ((pac?.telefone_celular as string) ?? null),
            email: acomp ? acomp.email : ((pac?.email as string) ?? null),
            codigo_sigtap: sig.codigo,
            sigtap_descricao: sig.descricao,
            quantidade: comPernoite ? dias : 1,
            cid: (sol?.cid10_principal as string) ?? null,
          };
        });
        rowsLocal = mapped;
        setRows(mapped);
      } else {
        // PASSAGENS — cada viagem já é um trecho único (IDA ou RETORNO).
        // Distância e unidade vêm direto da viagem (distancia_valor/distancia_unidade).
        const { data, error } = await supabase
          .from('viagens')
          .select(
            'id, tipo, modal, solicitacao_id, ' +
            'data_embarque_prevista, ' +
            'origem_cidade, origem_uf, destino_cidade, destino_uf, ativa, ' +
            'distancia_valor, distancia_unidade, ' +
            'solicitacoes!inner(cid10_principal, paciente_id, tipo_solicitacao, ' +
            '  pacientes(cpf, cns, nome_completo, sexo, data_nascimento, telefone_celular, email, logradouro, numero, bairro, cep, municipio))'
          )
          .eq('ativa', true)
          .gte('data_embarque_prevista', periodo.inicio)
          .lte('data_embarque_prevista', periodo.fim)
          .order('data_embarque_prevista', { ascending: true });

        if (cancel) return;
        if (error || !data) {
          setRows([]);
          setLancados(new Set());
          setLoading(false);
          return;
        }

        // Acompanhante e flag doador vêm da junção `solicitacao_acompanhantes`
        // (doador é por solicitação, não por pessoa).
        const solicitacaoIdsViagem = Array.from(
          new Set(
            (data as unknown as Array<Record<string, unknown>>)
              .map((v) => v.solicitacao_id as string)
              .filter(Boolean)
          )
        );
        const acompPorSolicitacao = new Map<string, Record<string, unknown>>();
        if (solicitacaoIdsViagem.length > 0) {
          const { data: vinculos } = await supabase
            .from('solicitacao_acompanhantes')
            .select(
              'solicitacao_id, doador, ' +
              'acompanhantes(nome_completo, cpf, cns, sexo, email, data_nascimento, telefone)'
            )
            .in('solicitacao_id', solicitacaoIdsViagem);
          (vinculos as unknown as Array<Record<string, unknown>> ?? []).forEach((v) => {
            const sid = v.solicitacao_id as string;
            const a = v.acompanhantes as Record<string, unknown> | null;
            if (!a || acompPorSolicitacao.has(sid)) return;
            acompPorSolicitacao.set(sid, { ...a, doador: Boolean(v.doador) });
          });
        }

        const mapped: RPBRow[] = (data as unknown as Array<Record<string, unknown>>).map((v) => {
          const sol = v.solicitacoes as Record<string, unknown> | null;
          const pac = sol?.pacientes as Record<string, unknown> | null;
          const modalRaw = (v.modal as string)?.toLowerCase();
          const modal: Modal =
            modalRaw === 'aereo' ? 'aereo' : modalRaw === 'fluvial' ? 'fluvial' : 'terrestre';

          // Considera "acompanhante" quando a solicitação é para acompanhante
          const tipoSol = (sol?.tipo_solicitacao as string)?.toUpperCase();
          const beneficiarioOriginal: Beneficiario = tipoSol === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente';
          const acomp = beneficiarioOriginal === 'acompanhante' && v.solicitacao_id
            ? acompPorSolicitacao.get(v.solicitacao_id as string) ?? null
            : null;

          const nome = (acomp?.nome_completo as string) ?? (pac?.nome_completo as string) ?? '—';
          const cpfCns = (acomp?.cpf as string) ?? (pac?.cpf as string) ?? (pac?.cns as string) ?? '—';
          const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');

          // Acompanhante doador conta como PACIENTE para o SIGTAP/BPA.
          const beneficiario: Beneficiario =
            (acomp as Record<string, unknown> | null)?.doador ? 'paciente' : beneficiarioOriginal;
          const sig = resolveSigtapPassagem({ beneficiario, modal, cnrac: false });

          const distancia = v.distancia_valor as number | null;
          const qtd = calcularQuantidadePassagem(distancia, sig.unidadeDivisor);

          const tipoTrecho = (v.tipo as string)?.toUpperCase();
          const isRetorno = tipoTrecho === 'RETORNO' || tipoTrecho === 'VOLTA';
          const trecho: 'ida' | 'volta' = isRetorno ? 'volta' : 'ida';
          const trechoLabel = isRetorno
            ? `${v.destino_uf}/${v.destino_cidade} → ${v.origem_uf}/${v.origem_cidade}`
            : `${v.origem_uf}/${v.origem_cidade} → ${v.destino_uf}/${v.destino_cidade}`;

          return {
            id: String(v.id),
            origem_id: String(v.id),
            trecho,
            dt_atendimento: String(v.data_embarque_prevista),
            cpf_cns: cpfCns,
            nome,
            beneficiario_tipo: beneficiario,
            sexo: (acomp?.sexo as string) ?? (pac?.sexo as string) ?? null,
            data_nascimento: (acomp?.data_nascimento as string) ?? (pac?.data_nascimento as string) ?? null,
            cep: (pac?.cep as string) ?? null,
            municipio: (pac?.municipio as string) ?? null,
            endereco: enderecoFull || null,
            bairro: (pac?.bairro as string) ?? null,
            telefone: (acomp?.telefone as string) ?? (pac?.telefone_celular as string) ?? null,
            email: (acomp?.email as string) ?? (pac?.email as string) ?? null,
            codigo_sigtap: sig.codigo,
            sigtap_descricao: sig.descricao,
            quantidade: qtd,
            cid: (sol?.cid10_principal as string) ?? null,
            modal,
            trecho_label: trechoLabel,
            rota_pendente: qtd === null,
            distancia_valor: distancia,
            distancia_unidade: (v.distancia_unidade as string) ?? sig.unidadeLabel,
            unidade_divisor: sig.unidadeDivisor,
            unidade_label: sig.unidadeLabel,
          };
        });

        rowsLocal = mapped;
        setRows(mapped);
      }

      // Carrega valores SIGTAP dos códigos presentes
      const codigosUnicos = Array.from(
        new Set(rowsLocal.map((r) => r.codigo_sigtap).filter(Boolean))
      );
      if (codigosUnicos.length > 0) {
        const { data: sigtaps } = await supabase
          .from('sigtap_procedimentos')
          .select('codigo, valor_unitario')
          .in('codigo', codigosUnicos);
        if (!cancel) {
          const map: Record<string, number> = {};
          (sigtaps ?? []).forEach((s: Record<string, unknown>) => {
            map[s.codigo as string] = Number(s.valor_unitario) || 0;
          });
          setValoresSigtap(map);
        }
      } else if (!cancel) {
        setValoresSigtap({});
      }

      // Carrega "lançados" do tipo atual
      const { data: lanc } = await supabase
        .from('bpa_lancamentos')
        .select('tipo, origem_id, trecho')
        .eq('tipo', tipo);
      if (!cancel) {
        const s = new Set<string>();
        (lanc ?? []).forEach((l: Record<string, unknown>) => {
          s.add(`${l.origem_id}:${l.trecho ?? ''}`);
        });
        setLancados(s);
      }
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [tipo, periodo]);

  const isLancado = (r: RPBRow) => lancados.has(`${r.origem_id}:${r.trecho ?? ''}`);

  const toggleLancado = async (r: RPBRow, on: boolean) => {
    const supabase = createClient();
    const key = `${r.origem_id}:${r.trecho ?? ''}`;
    // Optimistic update
    setLancados((prev) => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
    if (on) {
      await (supabase.from('bpa_lancamentos') as unknown as { insert: (v: Record<string, unknown>) => Promise<unknown> }).insert({
        tipo,
        origem_id: r.origem_id,
        trecho: r.trecho,
      });
    } else {
      let q = supabase.from('bpa_lancamentos').delete().eq('tipo', tipo).eq('origem_id', r.origem_id);
      q = r.trecho ? q.eq('trecho', r.trecho) : q.is('trecho', null);
      await q;
    }
  };

  const allChecked = rows.length > 0 && rows.every(isLancado);
  const someChecked = rows.some(isLancado) && !allChecked;

  const toggleAll = async () => {
    const supabase = createClient();
    const target = !allChecked;
    if (target) {
      const toInsert = rows.filter((r) => !isLancado(r)).map((r) => ({
        tipo,
        origem_id: r.origem_id,
        trecho: r.trecho,
      }));
      setLancados(new Set(rows.map((r) => `${r.origem_id}:${r.trecho ?? ''}`)));
      if (toInsert.length > 0) {
        await (supabase.from('bpa_lancamentos') as unknown as { insert: (v: Record<string, unknown>[]) => Promise<unknown> }).insert(toInsert);
      }
    } else {
      setLancados(new Set());
      const ids = rows.map((r) => r.origem_id);
      if (ids.length > 0) {
        await supabase.from('bpa_lancamentos').delete().eq('tipo', tipo).in('origem_id', ids);
      }
    }
  };

  const formatTelefone = (t: string | null) => {
    if (!t) return null;
    const d = t.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return t;
  };
  const formatCep = (c: string | null) => {
    if (!c) return null;
    const d = c.replace(/\D/g, '');
    return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : c;
  };

  const columnsCommon: ReportColumn<RPBRow>[] = [
    {
      key: 'check',
      printHide: true,
      header: (
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => { if (el) el.indeterminate = someChecked; }}
          onChange={toggleAll}
          aria-label="Marcar/desmarcar todas"
        />
      ),
      width: '36px',
      align: 'center',
      render: (r) => (
        <input
          type="checkbox"
          checked={isLancado(r)}
          onChange={(e) => toggleLancado(r, e.target.checked)}
          aria-label="Lançado no BPA"
        />
      ),
    },
    { key: 'idx', header: '#', width: '36px', mono: true, render: (_r, i) => String(i + 1).padStart(3, '0') },
    {
      key: 'pessoa',
      header: 'Pessoa',
      width: '260px',
      render: (r) => {
        const sexo = r.sexo ? r.sexo[0].toUpperCase() : null;
        const nasc = fmtDataBR(r.data_nascimento ?? '') || null;
        const subline = [r.cpf_cns, sexo, nasc].filter(Boolean).join(' · ');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div className="flex items-center gap-1.5" style={{ whiteSpace: 'nowrap' }}>
              {tipo === 'ajuda_custo' && <TipoBeneficiarioBadge tipo={r.beneficiario_tipo} />}
              <span style={{ fontWeight: 600, color: '#0F172A' }}>{r.nome}</span>
            </div>
            <span style={{ fontFamily: 'var(--tfd-font-mono)', fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
              {subline || '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'contato',
      header: 'Contato',
      width: '200px',
      render: (r) => {
        const tel = formatTelefone(r.telefone);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.35 }}>
            <span style={{ fontFamily: tel ? 'var(--tfd-font-mono)' : undefined, fontSize: 12, whiteSpace: 'nowrap' }}>
              {tel ?? <span style={{ color: '#94A3B8' }}>—</span>}
            </span>
            <span style={{ fontSize: 11, color: '#64748B', overflowWrap: 'anywhere' }}>
              {r.email ?? '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'endereco',
      header: 'Endereço',
      render: (r) => {
        const linha1 = r.endereco || null;
        const bairroCep = [r.bairro, formatCep(r.cep)].filter(Boolean).join(' · ');
        const linha3 = r.municipio || null;
        const hasAny = linha1 || bairroCep || linha3;
        if (!hasAny) return <span style={{ color: '#94A3B8' }}>—</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.35, fontSize: 12 }}>
            {linha1 && <span style={{ color: '#0F172A' }}>{linha1}</span>}
            {bairroCep && <span style={{ color: '#64748B', fontSize: 11 }}>{bairroCep}</span>}
            {linha3 && <span style={{ color: '#64748B', fontSize: 11 }}>{linha3}</span>}
          </div>
        );
      },
    },
    { key: 'dt', header: 'Dt. Atend.', width: '92px', mono: true, render: (r) => fmtDataBR(r.dt_atendimento) },
  ];

  const sigtapCell = (r: RPBRow) => (
    <div title={r.sigtap_descricao} style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.3 }}>
      <span style={{ fontFamily: 'var(--tfd-font-mono)', fontSize: 12, color: '#0F172A', whiteSpace: 'nowrap' }}>
        {r.codigo_sigtap}
      </span>
      <span style={{ fontSize: 10.5, color: '#64748B', whiteSpace: 'normal' }}>
        {r.sigtap_descricao}
      </span>
    </div>
  );

  const fmtMoney = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const valorLinha = (r: RPBRow): number | null => {
    const v = valoresSigtap[r.codigo_sigtap];
    if (v == null || r.quantidade == null) return null;
    return v * r.quantidade;
  };

  const valorCell = (r: RPBRow) => {
    const total = valorLinha(r);
    if (total == null) return <span style={{ color: '#94A3B8' }}>—</span>;
    const unit = valoresSigtap[r.codigo_sigtap];
    const tooltip = unit != null && r.quantidade != null
      ? `${fmtMoney(unit)} × ${r.quantidade} = ${fmtMoney(total)}`
      : undefined;
    return (
      <span title={tooltip} style={{ fontFamily: 'var(--tfd-font-mono)', whiteSpace: 'nowrap' }}>
        {fmtMoney(total)}
      </span>
    );
  };

  const columnsAjuda: ReportColumn<RPBRow>[] = [
    { key: 'cod', header: 'SIGTAP', width: '210px', render: sigtapCell },
    { key: 'qtd', header: 'Diárias', width: '70px', align: 'right', render: (r) => r.quantidade ?? '—' },
    { key: 'cid', header: 'CID', width: '64px', mono: true, render: (r) => r.cid ?? '—' },
    { key: 'valor', header: 'Valor SIGTAP', width: '110px', align: 'right', render: valorCell },
  ];

  const columnsPassagem: ReportColumn<RPBRow>[] = [
    {
      key: 'rota',
      header: 'Rota',
      width: '240px',
      render: (r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
          <span style={{ fontSize: 12, color: '#0F172A', whiteSpace: 'nowrap' }}>{r.trecho_label ?? '—'}</span>
          <span className="inline-flex items-center gap-1.5" style={{ fontSize: 11 }}>
            {r.modal && <ModalBadge modal={r.modal} />}
            <span style={{ color: '#64748B', fontFamily: 'var(--tfd-font-mono)' }}>
              {r.distancia_valor != null
                ? `${r.distancia_valor.toLocaleString('pt-BR')} ${r.distancia_unidade ?? r.unidade_label ?? ''}`.trim()
                : <span style={{ color: '#C2410C' }}>sem distância</span>}
            </span>
          </span>
        </div>
      ),
    },
    { key: 'cod', header: 'SIGTAP', width: '210px', render: sigtapCell },
    {
      key: 'qtd',
      header: 'Qtd.',
      width: '88px',
      align: 'right',
      render: (r) => {
        if (r.rota_pendente) {
          return (
            <span style={{ color: '#C2410C', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <AlertCircle size={12} /> pendente
            </span>
          );
        }
        if (r.quantidade == null) return '—';
        const tooltip = r.distancia_valor != null && r.unidade_divisor
          ? `${r.distancia_valor.toLocaleString('pt-BR')} ${r.unidade_label} ÷ ${r.unidade_divisor} ${r.unidade_label} = ${r.quantidade}`
          : undefined;
        return <span title={tooltip}>{r.quantidade}</span>;
      },
    },
    { key: 'cid', header: 'CID', width: '64px', mono: true, render: (r) => r.cid ?? '—' },
    { key: 'valor', header: 'Valor SIGTAP', width: '110px', align: 'right', render: valorCell },
  ];

  const columns = tipo === 'ajuda_custo'
    ? [...columnsCommon, ...columnsAjuda]
    : [...columnsCommon, ...columnsPassagem];

  const totalLancados = rows.filter(isLancado).length;
  const totalPendentes = rows.length - totalLancados;
  const totalQtd = rows.reduce((s, r) => s + (r.quantidade ?? 0), 0);
  const totalValor = rows.reduce((s, r) => s + (valorLinha(r) ?? 0), 0);

  return (
    <div className="space-y-4">
      <ReportPrintStyles />

      <ReportToolbar
        filters={
          <>
            <FilterField label="Tipo" icon={<ClipboardList size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 160 }}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as RPBTipo)}
              >
                <option value="ajuda_custo">Ajuda de Custo</option>
                <option value="passagem">Passagens</option>
              </select>
            </FilterField>

            <FilterField label="Ano" icon={<Calendar size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 100 }}
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10))}
              >
                {anosDisponiveis().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Mês">
              <div className="flex items-center gap-1 flex-wrap">
                <PillButton active={mes === 0} onClick={() => setMes(0)}>Ano inteiro</PillButton>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <PillButton key={m} active={mes === m} onClick={() => setMes(m)}>
                    {MES_LABEL_SHORT[m - 1]}
                  </PillButton>
                ))}
              </div>
            </FilterField>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost"
              onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); }}
              title="Voltar para o mês atual"
            >
              <RefreshCw size={13} /> Mês atual
            </button>
            <PrintButton />
          </>
        }
      />

      <ReportHero
        titulo={`Relatório BPA — ${tipo === 'ajuda_custo' ? 'Ajuda de Custo' : 'Passagens'}`}
        periodoLabel={periodo.label}
      />

      <StatsRow
        items={[
          { label: 'Total de linhas', value: String(rows.length), icon: <ClipboardList size={11} /> },
          { label: 'Lançadas no BPA', value: String(totalLancados), tone: 'success', icon: <CheckCircle2 size={11} /> },
          { label: 'Pendentes', value: String(totalPendentes), tone: 'warning', icon: <AlertCircle size={11} /> },
          { label: tipo === 'ajuda_custo' ? 'Total de diárias' : 'Total de unidades', value: String(totalQtd) },
          { label: 'Valor total SIGTAP', value: fmtMoney(totalValor) },
        ]}
      />

      <TableCard
        title="Itens para lançamento"
        subtitle={loading ? 'Carregando...' : undefined}
        count={rows.length}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : (
          <ReportTable
            columns={columns}
            rows={rows}
            rowStyle={(r) => isLancado(r) ? { opacity: 0.55 } : undefined}
            emptyLabel={`Nenhum item em ${periodo.label.toLowerCase()}.`}
          />
        )}
      </TableCard>

      <p className="text-[11px]" style={{ color: '#64748B', lineHeight: 1.5 }}>
        O código SIGTAP é derivado automaticamente do contexto da solicitação
        {tipo === 'ajuda_custo' ? ' (beneficiário, com/sem pernoite, CNRAC)' : ' (beneficiário, modal terrestre/aéreo/fluvial, CNRAC)'},
        com base na tabela auxiliar. A unidade de cálculo (km, milhas, milhas náuticas ou diárias) acompanha o código.
      </p>
    </div>
  );
}
