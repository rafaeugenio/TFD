'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ReportToolbar,
  FilterField,
  PillButton,
  PrintButton,
  ReportHero,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { MES_LABEL, MES_LABEL_SHORT, anosDisponiveis } from './_shared/format';
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

      <TableCard title="Itens para lançamento" count={rows.length}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : (
          <div className="text-center text-[13px] py-10" style={{ color: '#94A3B8' }}>
            {rows.length} linha(s) carregada(s). Renderização da tabela na próxima task.
            {lancados.size > 0 && ` · ${lancados.size} já lançada(s) no BPA`}
          </div>
        )}
      </TableCard>
    </div>
  );
}
