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
import { ReportTable, type ReportColumn } from './_shared/ReportTable';
import { MES_LABEL, MES_LABEL_SHORT, anosDisponiveis, fmtDataBR } from './_shared/format';
import {
  resolveSigtapAjudaCusto,
  resolveSigtapPassagem,
  calcularQuantidadePassagem,
  type Beneficiario,
  type Modal,
} from './_shared/sigtap-mapper';

type RPBTipo = 'ajuda_custo' | 'passagem';

interface RPBRow {
  id: string;
  origem_id: string;
  trecho: 'ida' | 'volta' | null;
  dt_atendimento: string;
  cpf_cns: string;
  nome: string;
  sexo: string | null;
  data_nascimento: string | null;
  cep: string | null;
  municipio: string | null;
  endereco: string | null;
  bairro: string | null;
  telefone: string | null;
  email: string | null;
  codigo_sigtap: string;
  quantidade: number | null;
  cid: string | null;
  // específicas de passagens
  modal?: Modal;
  trecho_label?: string;
  rota_pendente?: boolean;
}

export default function RelatorioRPB() {
  const hoje = new Date();
  const [tipo, setTipo] = useState<RPBTipo>('ajuda_custo');
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1); // 0 = ano inteiro
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RPBRow[]>([]);
  const [lancados, setLancados] = useState<Set<string>>(new Set());

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

      if (tipo === 'ajuda_custo') {
        const { data, error } = await supabase
          .from('ajudas_custo')
          .select(
            'id, tipo, data_inicio, data_fim, dias_elegiveis, solicitacao_id, ' +
            'solicitacoes!inner(cid_principal, paciente_id, ' +
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

        // Para tipos ACOMPANHANTE, buscar acompanhantes do paciente
        const pacienteIds = Array.from(
          new Set(
            (data as unknown as Array<Record<string, unknown>>)
              .filter((r) => (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE')
              .map((r) => ((r.solicitacoes as Record<string, unknown>)?.paciente_id as string))
              .filter(Boolean)
          )
        );
        const acompMap = new Map<string, { nome: string; cpf: string; cns: string | null }>();
        if (pacienteIds.length > 0) {
          const { data: acomps } = await supabase
            .from('acompanhantes')
            .select('paciente_id, nome_completo, cpf, cns')
            .in('paciente_id', pacienteIds);
          (acomps ?? []).forEach((a: Record<string, unknown>) => {
            const pid = a.paciente_id as string;
            if (!acompMap.has(pid)) {
              acompMap.set(pid, {
                nome: a.nome_completo as string,
                cpf: a.cpf as string,
                cns: (a.cns as string) ?? null,
              });
            }
          });
        }

        const mapped: RPBRow[] = (data as unknown as Array<Record<string, unknown>>).map((r) => {
          const sol = r.solicitacoes as Record<string, unknown> | null;
          const pac = sol?.pacientes as Record<string, unknown> | null;
          const beneficiario: Beneficiario =
            (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente';
          const dias = Number(r.dias_elegiveis ?? 0);
          const comPernoite = dias > 0;
          const sig = resolveSigtapAjudaCusto({ beneficiario, comPernoite, cnrac: false });

          const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');
          const acomp =
            beneficiario === 'acompanhante' && sol?.paciente_id
              ? acompMap.get(sol.paciente_id as string) ?? null
              : null;

          const nome = acomp?.nome ?? (pac?.nome_completo as string) ?? '—';
          const cpfCns = acomp?.cpf ?? (pac?.cpf as string) ?? (pac?.cns as string) ?? '—';

          return {
            id: String(r.id),
            origem_id: String(r.id),
            trecho: null,
            dt_atendimento: String(r.data_inicio),
            cpf_cns: cpfCns,
            nome,
            sexo: acomp ? null : ((pac?.sexo as string) ?? null),
            data_nascimento: acomp ? null : ((pac?.data_nascimento as string) ?? null),
            cep: (pac?.cep as string) ?? null,
            municipio: (pac?.municipio as string) ?? null,
            endereco: enderecoFull || null,
            bairro: (pac?.bairro as string) ?? null,
            telefone: (pac?.telefone_celular as string) ?? null,
            email: acomp ? null : ((pac?.email as string) ?? null),
            codigo_sigtap: sig.codigo,
            quantidade: comPernoite ? dias : 1,
            cid: (sol?.cid_principal as string) ?? null,
          };
        });
        setRows(mapped);
      } else {
        // PASSAGENS — busca viagens cujo embarque ou retorno caia no período
        const { data, error } = await supabase
          .from('viagens')
          .select(
            'id, tipo, modal, beneficiario_tipo, beneficiario_id, ' +
            'data_embarque_prevista, data_retorno_prevista, ' +
            'origem_cidade, origem_uf, destino_cidade, destino_uf, ativa, ' +
            'solicitacoes!inner(cid_principal, paciente_id, ' +
            '  pacientes(cpf, cns, nome_completo, sexo, data_nascimento, telefone_celular, email, logradouro, numero, bairro, cep, municipio))'
          )
          .eq('ativa', true)
          .or(
            `and(data_embarque_prevista.gte.${periodo.inicio},data_embarque_prevista.lte.${periodo.fim}),` +
            `and(data_retorno_prevista.gte.${periodo.inicio},data_retorno_prevista.lte.${periodo.fim})`
          )
          .order('data_embarque_prevista', { ascending: true });

        if (cancel) return;
        if (error || !data) {
          setRows([]);
          setLancados(new Set());
          setLoading(false);
          return;
        }

        // Carregar TODAS as rotas (pequeno dataset) — lookup local
        const rotaMap = new Map<string, { km: number | null; mi: number | null; mn: number | null }>();
        const { data: rotas } = await supabase
          .from('rotas_deslocamento')
          .select('cidade_origem, uf_origem, cidade_destino, uf_destino, distancia_km, distancia_milhas, distancia_milhas_nauticas');
        (rotas ?? []).forEach((r: Record<string, unknown>) => {
          const key = `${r.cidade_origem}|${r.uf_origem}|${r.cidade_destino}|${r.uf_destino}`;
          rotaMap.set(key, {
            km: r.distancia_km as number | null,
            mi: r.distancia_milhas as number | null,
            mn: r.distancia_milhas_nauticas as number | null,
          });
        });

        // Buscar acompanhantes por id (beneficiario_id quando beneficiario_tipo='acompanhante')
        const acompIds = Array.from(
          new Set(
            (data as unknown as Array<Record<string, unknown>>)
              .filter((v) => (v.beneficiario_tipo as string)?.toLowerCase() === 'acompanhante')
              .map((v) => v.beneficiario_id as string)
              .filter(Boolean)
          )
        );
        const acompMap = new Map<string, Record<string, unknown>>();
        if (acompIds.length > 0) {
          const { data: acomps } = await supabase
            .from('acompanhantes')
            .select('id, nome_completo, cpf, cns')
            .in('id', acompIds);
          (acomps ?? []).forEach((a: Record<string, unknown>) => {
            acompMap.set(a.id as string, a);
          });
        }

        const inPeriodo = (d: string | null | undefined) =>
          !!d && d >= periodo.inicio && d <= periodo.fim;

        const mapped: RPBRow[] = [];

        (data as unknown as Array<Record<string, unknown>>).forEach((v) => {
          const sol = v.solicitacoes as Record<string, unknown> | null;
          const pac = sol?.pacientes as Record<string, unknown> | null;
          const beneficiario: Beneficiario =
            (v.beneficiario_tipo as string)?.toLowerCase() === 'acompanhante' ? 'acompanhante' : 'paciente';
          const modalRaw = (v.modal as string)?.toLowerCase();
          const modal: Modal =
            modalRaw === 'aereo' ? 'aereo' : modalRaw === 'fluvial' ? 'fluvial' : 'terrestre';
          const acomp = beneficiario === 'acompanhante' ? acompMap.get(v.beneficiario_id as string) : null;

          const nome = (acomp?.nome_completo as string) ?? (pac?.nome_completo as string) ?? '—';
          const cpfCns = (acomp?.cpf as string) ?? (pac?.cpf as string) ?? (pac?.cns as string) ?? '—';
          const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');

          const sig = resolveSigtapPassagem({ beneficiario, modal, cnrac: false });

          // Trecho IDA
          if (inPeriodo(v.data_embarque_prevista as string | null)) {
            const rotaKey = `${v.origem_cidade}|${v.origem_uf}|${v.destino_cidade}|${v.destino_uf}`;
            const rota = rotaMap.get(rotaKey);
            const distancia =
              modal === 'terrestre' ? rota?.km ?? null :
              modal === 'aereo' ? rota?.mi ?? null :
              rota?.mn ?? null;
            const qtd = calcularQuantidadePassagem(distancia, sig.unidadeDivisor);
            mapped.push({
              id: `${v.id}:ida`,
              origem_id: String(v.id),
              trecho: 'ida',
              dt_atendimento: String(v.data_embarque_prevista),
              cpf_cns: cpfCns,
              nome,
              sexo: acomp ? null : ((pac?.sexo as string) ?? null),
              data_nascimento: acomp ? null : ((pac?.data_nascimento as string) ?? null),
              cep: (pac?.cep as string) ?? null,
              municipio: (pac?.municipio as string) ?? null,
              endereco: enderecoFull || null,
              bairro: (pac?.bairro as string) ?? null,
              telefone: (pac?.telefone_celular as string) ?? null,
              email: acomp ? null : ((pac?.email as string) ?? null),
              codigo_sigtap: sig.codigo,
              quantidade: qtd,
              cid: (sol?.cid_principal as string) ?? null,
              modal,
              trecho_label: `${v.origem_uf}/${v.origem_cidade} → ${v.destino_uf}/${v.destino_cidade}`,
              rota_pendente: qtd === null,
            });
          }

          // Trecho VOLTA (apenas IDA_E_VOLTA com data_retorno no período)
          if ((v.tipo as string) === 'IDA_E_VOLTA' && inPeriodo(v.data_retorno_prevista as string | null)) {
            const rotaKey = `${v.destino_cidade}|${v.destino_uf}|${v.origem_cidade}|${v.origem_uf}`;
            const rota = rotaMap.get(rotaKey);
            const distancia =
              modal === 'terrestre' ? rota?.km ?? null :
              modal === 'aereo' ? rota?.mi ?? null :
              rota?.mn ?? null;
            const qtd = calcularQuantidadePassagem(distancia, sig.unidadeDivisor);
            mapped.push({
              id: `${v.id}:volta`,
              origem_id: String(v.id),
              trecho: 'volta',
              dt_atendimento: String(v.data_retorno_prevista),
              cpf_cns: cpfCns,
              nome,
              sexo: acomp ? null : ((pac?.sexo as string) ?? null),
              data_nascimento: acomp ? null : ((pac?.data_nascimento as string) ?? null),
              cep: (pac?.cep as string) ?? null,
              municipio: (pac?.municipio as string) ?? null,
              endereco: enderecoFull || null,
              bairro: (pac?.bairro as string) ?? null,
              telefone: (pac?.telefone_celular as string) ?? null,
              email: acomp ? null : ((pac?.email as string) ?? null),
              codigo_sigtap: sig.codigo,
              quantidade: qtd,
              cid: (sol?.cid_principal as string) ?? null,
              modal,
              trecho_label: `${v.destino_uf}/${v.destino_cidade} → ${v.origem_uf}/${v.origem_cidade}`,
              rota_pendente: qtd === null,
            });
          }
        });

        mapped.sort((a, b) => a.dt_atendimento.localeCompare(b.dt_atendimento));
        setRows(mapped);
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

  const columnsCommon: ReportColumn<RPBRow>[] = [
    {
      key: 'check',
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
    { key: 'idx',  header: '#', width: '36px', mono: true, render: (_r, i) => String(i + 1).padStart(3, '0') },
    { key: 'dt',   header: 'Dt. Atend.', width: '92px', render: (r) => fmtDataBR(r.dt_atendimento) },
    { key: 'cpf',  header: 'CPF/CNS', width: '120px', mono: true, render: (r) => r.cpf_cns },
    { key: 'nome', header: 'Nome', render: (r) => <span style={{ fontWeight: 500 }}>{r.nome}</span> },
    { key: 'sexo', header: 'Sexo', width: '56px', render: (r) => r.sexo ? r.sexo[0] : '—' },
    { key: 'nasc', header: 'Nasc.', width: '92px', render: (r) => fmtDataBR(r.data_nascimento ?? '') || '—' },
    { key: 'cep',  header: 'CEP', width: '88px', render: (r) => r.cep ?? '—' },
    { key: 'mun',  header: 'Município', width: '120px', render: (r) => r.municipio ?? '—' },
    {
      key: 'end',
      header: 'Endereço',
      render: (r) => (
        <span title={r.endereco ?? ''} style={{ display: 'inline-block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.endereco ?? '—'}
        </span>
      ),
    },
    { key: 'bairro', header: 'Bairro',   width: '110px', render: (r) => r.bairro ?? '—' },
    { key: 'tel',    header: 'Telefone', width: '110px', render: (r) => r.telefone ?? '—' },
    { key: 'email',  header: 'E-mail',   render: (r) => r.email ?? '—' },
  ];

  const columnsAjuda: ReportColumn<RPBRow>[] = [
    { key: 'cod', header: 'Cód. SIGTAP', width: '120px', mono: true, render: (r) => r.codigo_sigtap },
    { key: 'qtd', header: 'Qtd. (diárias)', width: '100px', align: 'right', render: (r) => r.quantidade ?? '—' },
    { key: 'cid', header: 'CID', width: '70px', mono: true, render: (r) => r.cid ?? '—' },
  ];

  const columnsPassagem: ReportColumn<RPBRow>[] = [
    { key: 'modal',  header: 'Modal',  width: '90px', render: (r) => r.modal ?? '—' },
    { key: 'trecho', header: 'Trecho', render: (r) => r.trecho_label ?? '—' },
    { key: 'cod',    header: 'Cód. SIGTAP', width: '120px', mono: true, render: (r) => r.codigo_sigtap },
    {
      key: 'qtd',
      header: 'Qtd.',
      width: '110px',
      align: 'right',
      render: (r) => r.rota_pendente
        ? <span style={{ color: '#C2410C', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> rota pendente</span>
        : (r.quantidade ?? '—'),
    },
    { key: 'cid', header: 'CID', width: '70px', mono: true, render: (r) => r.cid ?? '—' },
  ];

  const columns = tipo === 'ajuda_custo'
    ? [...columnsCommon, ...columnsAjuda]
    : [...columnsCommon, ...columnsPassagem];

  const totalLancados = rows.filter(isLancado).length;
  const totalPendentes = rows.length - totalLancados;
  const totalQtd = rows.reduce((s, r) => s + (r.quantidade ?? 0), 0);

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
        titulo={`Relatório RPB — ${tipo === 'ajuda_custo' ? 'Ajuda de Custo' : 'Passagens'}`}
        periodoLabel={periodo.label}
      />

      <StatsRow
        items={[
          { label: 'Total de linhas', value: String(rows.length), icon: <ClipboardList size={11} /> },
          { label: 'Lançadas no BPA', value: String(totalLancados), tone: 'success', icon: <CheckCircle2 size={11} /> },
          { label: 'Pendentes', value: String(totalPendentes), tone: 'warning', icon: <AlertCircle size={11} /> },
          { label: tipo === 'ajuda_custo' ? 'Total de diárias' : 'Total de unidades', value: String(totalQtd) },
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
    </div>
  );
}
