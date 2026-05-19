# RPB Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "RPB" em `/relatorios` que exibe dados prontos para lançamento no BPA, separados em duas visões (Ajuda de Custo / Passagens), com checkbox persistente para controle do que já foi lançado.

**Architecture:** Componente React client-side seguindo o padrão dos relatórios existentes (`_RelatorioFaturamento.tsx`). Busca dados de `ajudas_custo` ou `viagens` via Supabase, faz joins com `pacientes`, `acompanhantes`, `solicitacoes` e `rotas_deslocamento`. Resolve códigos SIGTAP via helper puro (`sigtap-mapper.ts`). Persiste estado "lançado" em nova tabela `bpa_lancamentos`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase (Postgres + RLS), Tailwind, lucide-react

**Spec:** `docs/superpowers/specs/2026-05-19-rpb-report-design.md`

**Convenção do projeto:** Sem infra de testes automatizados (protótipo). Validação é manual via dev server + browser, com type-check obrigatório antes de commitar.

---

## File Structure

**Novos:**
- `supabase/migrations/00051_bpa_lancamentos.sql` — tabela de controle
- `src/app/relatorios/_shared/sigtap-mapper.ts` — funções puras de resolução de código SIGTAP
- `src/app/relatorios/_RelatorioRPB.tsx` — componente principal da aba

**Modificados:**
- `src/app/relatorios/page.tsx` — adicionar aba 'rpb' em `TABS`

**Reaproveitados (sem mudança):**
- `src/app/relatorios/_shared/ReportShell.tsx`
- `src/app/relatorios/_shared/ReportTable.tsx`
- `src/app/relatorios/_shared/format.ts`

---

## Task 1: Migration `bpa_lancamentos`

**Files:**
- Create: `supabase/migrations/00051_bpa_lancamentos.sql`

- [ ] **Step 1: Criar migration**

```sql
-- ============================================================
-- TFD — Migration 051: bpa_lancamentos
-- Controle interno do que já foi lançado no sistema BPA
-- ============================================================

CREATE TABLE bpa_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ajuda_custo', 'passagem')),
  origem_id UUID NOT NULL,
  trecho VARCHAR(10) CHECK (trecho IN ('ida', 'volta')),
  lancado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lancado_por UUID REFERENCES usuarios(id),
  CONSTRAINT bpa_lancamentos_unique UNIQUE NULLS NOT DISTINCT (tipo, origem_id, trecho)
);

CREATE INDEX idx_bpa_lancamentos_tipo_origem ON bpa_lancamentos (tipo, origem_id);

ALTER TABLE bpa_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read bpa_lancamentos"
  ON bpa_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write bpa_lancamentos"
  ON bpa_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon read bpa_lancamentos"
  ON bpa_lancamentos FOR SELECT TO anon USING (true);
CREATE POLICY "anon write bpa_lancamentos"
  ON bpa_lancamentos FOR ALL TO anon USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Aplicar migration localmente**

Run: `npx supabase db reset` (ou push via `npx supabase db push` se preferir não resetar)
Expected: Migration aplicada sem erro. Verificar com `\d bpa_lancamentos`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00051_bpa_lancamentos.sql
git commit -m "feat(rpb): tabela bpa_lancamentos para controle de lançamentos"
```

---

## Task 2: Helper `sigtap-mapper.ts`

**Files:**
- Create: `src/app/relatorios/_shared/sigtap-mapper.ts`

- [ ] **Step 1: Implementar helper completo**

```ts
// Mapeia combinações de beneficiário/modal/pernoite/CNRAC para os códigos
// SIGTAP do seed em supabase/migrations/00022_tabela_sigtap.sql.

export type Beneficiario = 'paciente' | 'acompanhante';
export type Modal = 'terrestre' | 'aereo' | 'fluvial';

interface SigtapCode {
  codigo: string;
  descricao: string;
}

// 6 códigos de ajuda de custo: paciente|acomp × com|sem pernoite × cnrac
const AJUDA_CUSTO_MAP: Record<string, SigtapCode> = {
  // paciente
  'paciente_com_false':       { codigo: '08.03.01.001-0', descricao: 'Ajuda de custo p/ alim./pernoite paciente' },
  'paciente_sem_false':       { codigo: '08.03.01.002-8', descricao: 'Ajuda de custo p/ alim. paciente s/ pernoite' },
  'paciente_com_true':        { codigo: '08.03.01.003-6', descricao: 'Ajuda de custo p/ alim./pernoite paciente (CNRAC)' },
  // acompanhante
  'acompanhante_com_false':   { codigo: '08.03.01.004-4', descricao: 'Ajuda de custo p/ alim./pernoite acompanhante' },
  'acompanhante_sem_false':   { codigo: '08.03.01.005-2', descricao: 'Ajuda de custo p/ alim. acompanhante s/ pernoite' },
  'acompanhante_com_true':    { codigo: '08.03.01.006-0', descricao: 'Ajuda de custo p/ alim./pernoite acompanhante (CNRAC)' },
};

export function resolveSigtapAjudaCusto(input: {
  beneficiario: Beneficiario;
  comPernoite: boolean;
  cnrac: boolean;
}): SigtapCode {
  const pernoiteKey = input.comPernoite ? 'com' : 'sem';
  // CNRAC só existe variante "com pernoite" no seed atual
  const cnracKey = input.cnrac && input.comPernoite ? 'true' : 'false';
  const key = `${input.beneficiario}_${pernoiteKey}_${cnracKey}`;
  return AJUDA_CUSTO_MAP[key] ?? AJUDA_CUSTO_MAP[`${input.beneficiario}_com_false`];
}

interface SigtapPassagem extends SigtapCode {
  unidadeDivisor: number; // ex: 50 (km), 200 (milhas), 27 (milhas náuticas)
  unidadeLabel: string;
}

// 8 códigos de deslocamento: paciente|acomp × terrestre|aereo|fluvial × cnrac(só aereo)
const PASSAGEM_MAP: Record<string, SigtapPassagem> = {
  'paciente_terrestre_false':     { codigo: '08.03.01.012-5', descricao: 'Deslocamento paciente terrestre', unidadeDivisor: 50, unidadeLabel: 'km' },
  'paciente_aereo_false':         { codigo: '08.03.01.008-7', descricao: 'Deslocamento paciente aéreo', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'paciente_aereo_true':          { codigo: '08.03.01.014-1', descricao: 'Deslocamento paciente aéreo (CNRAC)', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'paciente_fluvial_false':       { codigo: '08.03.01.011-7', descricao: 'Deslocamento paciente fluvial', unidadeDivisor: 27, unidadeLabel: 'mn' },
  'acompanhante_terrestre_false': { codigo: '08.03.01.010-9', descricao: 'Deslocamento acompanhante terrestre', unidadeDivisor: 50, unidadeLabel: 'km' },
  'acompanhante_aereo_false':     { codigo: '08.03.01.007-9', descricao: 'Deslocamento acompanhante aéreo', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'acompanhante_aereo_true':      { codigo: '08.03.01.013-3', descricao: 'Deslocamento acompanhante aéreo (CNRAC)', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'acompanhante_fluvial_false':   { codigo: '08.03.01.009-5', descricao: 'Deslocamento acompanhante fluvial', unidadeDivisor: 27, unidadeLabel: 'mn' },
};

export function resolveSigtapPassagem(input: {
  beneficiario: Beneficiario;
  modal: Modal;
  cnrac: boolean;
}): SigtapPassagem {
  const cnracKey = input.cnrac && input.modal === 'aereo' ? 'true' : 'false';
  const key = `${input.beneficiario}_${input.modal}_${cnracKey}`;
  return PASSAGEM_MAP[key] ?? PASSAGEM_MAP[`${input.beneficiario}_terrestre_false`];
}

/** Calcula a quantidade SIGTAP (arredonda pra cima) a partir da distância. */
export function calcularQuantidadePassagem(distancia: number | null, divisor: number): number | null {
  if (!distancia || distancia <= 0) return null;
  return Math.ceil(distancia / divisor);
}
```

- [ ] **Step 2: Verificar type-check**

Run: `npx tsc --noEmit`
Expected: Sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/relatorios/_shared/sigtap-mapper.ts
git commit -m "feat(rpb): helper de resolução de códigos SIGTAP"
```

---

## Task 3: Componente `_RelatorioRPB.tsx` — esqueleto e filtros

**Files:**
- Create: `src/app/relatorios/_RelatorioRPB.tsx`

- [ ] **Step 1: Criar arquivo com filtros e shell vazio**

```tsx
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
import { MES_LABEL, MES_LABEL_SHORT, fmtDataBR, anosDisponiveis } from './_shared/format';

type RPBTipo = 'ajuda_custo' | 'passagem';

export default function RelatorioRPB() {
  const hoje = new Date();
  const [tipo, setTipo] = useState<RPBTipo>('ajuda_custo');
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1); // 0 = ano inteiro
  const [loading, setLoading] = useState(false);

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

      <TableCard title="Itens para lançamento" count={0}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : (
          <div className="text-center text-[13px] py-10" style={{ color: '#94A3B8' }}>
            Carregamento de dados implementado na próxima task.
          </div>
        )}
      </TableCard>
    </div>
  );
}
```

- [ ] **Step 2: Registrar aba em `page.tsx`**

Modify `src/app/relatorios/page.tsx`:

Adicionar import:

```tsx
import RelatorioRPB from './_RelatorioRPB';
```

Alterar tipo e TABS:

```tsx
type TabKey = 'financeiro' | 'faturamento' | 'recibos' | 'rpb';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'financeiro', label: 'Financeiro', icon: <BarChart3 size={15} />, desc: 'Acompanhamento quadrimestral consolidado' },
  { key: 'faturamento', label: 'Faturamento', icon: <Receipt size={15} />, desc: 'Relatório mensal de passagens' },
  { key: 'recibos', label: 'Ajuda de Custo', icon: <Wallet size={15} />, desc: 'Recibos individuais por beneficiário' },
  { key: 'rpb', label: 'RPB', icon: <ClipboardList size={15} />, desc: 'Dados para lançamento no BPA' },
];
```

Adicionar `ClipboardList` no import do `lucide-react`:

```tsx
import { BarChart3, Receipt, Wallet, ClipboardList } from 'lucide-react';
```

Adicionar render no switch de abas:

```tsx
{activeTab === 'rpb' && <RelatorioRPB />}
```

- [ ] **Step 3: Type-check e dev server**

Run: `npx tsc --noEmit && npm run dev`
Expected: Sem erros. Abrir `http://localhost:3000/relatorios?aba=rpb`, ver filtros funcionando (sem dados ainda).

- [ ] **Step 4: Commit**

```bash
git add src/app/relatorios/_RelatorioRPB.tsx src/app/relatorios/page.tsx
git commit -m "feat(rpb): aba RPB com filtros (tipo, ano, mês)"
```

---

## Task 4: Carregar dados de Ajuda de Custo

**Files:**
- Modify: `src/app/relatorios/_RelatorioRPB.tsx`

- [ ] **Step 1: Definir tipos e adicionar fetch de ajuda de custo**

Adicione no topo do arquivo (após imports):

```tsx
import { resolveSigtapAjudaCusto, resolveSigtapPassagem, calcularQuantidadePassagem, type Beneficiario, type Modal } from './_shared/sigtap-mapper';

interface RPBRow {
  id: string;                    // chave única (id_origem ou id_origem+trecho)
  origem_id: string;             // id da ajuda_custo ou viagem
  trecho: 'ida' | 'volta' | null;
  dt_atendimento: string;        // ISO
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
```

Substitua o estado e adicione o effect de carregamento (apenas ajuda de custo nessa task; passagens vem na próxima):

```tsx
const [rows, setRows] = useState<RPBRow[]>([]);
const [lancados, setLancados] = useState<Set<string>>(new Set());

useEffect(() => {
  let cancel = false;
  setLoading(true);
  (async () => {
    const supabase = createClient();
    if (tipo === 'ajuda_custo') {
      const { data, error } = await supabase
        .from('ajudas_custo')
        .select(
          'id, tipo, data_inicio, data_fim, dias_elegiveis, ' +
          'solicitacoes!inner(cid_principal, pacientes(cpf, cns, nome_completo, sexo, data_nascimento, telefone_celular, email, logradouro, numero, bairro, cep, municipio)), ' +
          'acompanhantes:solicitacao_id(...)'  // ver Step 2
        )
        .gte('data_inicio', periodo.inicio)
        .lte('data_inicio', periodo.fim)
        .order('data_inicio', { ascending: true });

      if (cancel) return;
      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      const mapped: RPBRow[] = (data as unknown as Array<Record<string, unknown>>).map((r) => {
        const sol = r.solicitacoes as Record<string, unknown> | null;
        const pac = sol?.pacientes as Record<string, unknown> | null;
        const beneficiario: Beneficiario = (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente';
        const dias = Number(r.dias_elegiveis ?? 0);
        const comPernoite = dias > 0;
        const sig = resolveSigtapAjudaCusto({ beneficiario, comPernoite, cnrac: false });

        const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');
        return {
          id: String(r.id),
          origem_id: String(r.id),
          trecho: null,
          dt_atendimento: String(r.data_inicio),
          cpf_cns: (pac?.cpf as string) ?? (pac?.cns as string) ?? '—',
          nome: (pac?.nome_completo as string) ?? '—',
          sexo: (pac?.sexo as string) ?? null,
          data_nascimento: (pac?.data_nascimento as string) ?? null,
          cep: (pac?.cep as string) ?? null,
          municipio: (pac?.municipio as string) ?? null,
          endereco: enderecoFull || null,
          bairro: (pac?.bairro as string) ?? null,
          telefone: (pac?.telefone_celular as string) ?? null,
          email: (pac?.email as string) ?? null,
          codigo_sigtap: sig.codigo,
          quantidade: comPernoite ? dias : 1,
          cid: (sol?.cid_principal as string) ?? null,
        };
      });
      setRows(mapped);
    } else {
      setRows([]); // implementado na Task 5
    }

    // Carrega "lançados" para esse conjunto
    const ids = (rows.map((r) => `${r.origem_id}:${r.trecho ?? ''}`));
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
    void ids;
  })();
  return () => { cancel = true; };
}, [tipo, periodo]);
```

> Nota: acompanhantes não têm campos próprios de endereço/sexo/email. Para linhas de ajuda de custo do tipo ACOMPANHANTE, usamos os dados do paciente vinculado (mesmo endereço) e substituímos `nome`/`cpf_cns` pelos do acompanhante. Refine na Step 2.

- [ ] **Step 2: Ajustar query para incluir acompanhante quando `tipo = ACOMPANHANTE`**

Refatore a query e o mapeamento — em vez de tentar fazer join lateral com acompanhantes (não há FK direta de ajudas_custo → acompanhante), aplica esta abordagem em duas queries:

Substitua o bloco `if (tipo === 'ajuda_custo')`:

```tsx
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
    setRows([]); setLancados(new Set()); setLoading(false); return;
  }

  // Para tipos ACOMPANHANTE, buscar o primeiro acompanhante ativo do paciente
  const pacienteIds = Array.from(new Set(
    (data as unknown as Array<Record<string, unknown>>)
      .filter((r) => (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE')
      .map((r) => ((r.solicitacoes as Record<string, unknown>)?.paciente_id as string))
      .filter(Boolean)
  ));
  let acompMap = new Map<string, { nome: string; cpf: string; cns: string | null }>();
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
    const beneficiario: Beneficiario = (r.tipo as string)?.toUpperCase() === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente';
    const dias = Number(r.dias_elegiveis ?? 0);
    const comPernoite = dias > 0;
    const sig = resolveSigtapAjudaCusto({ beneficiario, comPernoite, cnrac: false });

    const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');
    const acomp = beneficiario === 'acompanhante' && sol?.paciente_id
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
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/relatorios/_RelatorioRPB.tsx
git commit -m "feat(rpb): carregamento de dados de ajuda de custo"
```

---

## Task 5: Carregar dados de Passagens

**Files:**
- Modify: `src/app/relatorios/_RelatorioRPB.tsx`

- [ ] **Step 1: Adicionar branch de passagens no useEffect**

Substitua o bloco `} else { setRows([]); }` no useEffect por:

```tsx
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
    setRows([]); setLancados(new Set()); setLoading(false); return;
  }

  // Carregar rotas em lote
  const pares = new Set<string>();
  (data as unknown as Array<Record<string, unknown>>).forEach((v) => {
    pares.add(`${v.origem_cidade}|${v.origem_uf}|${v.destino_cidade}|${v.destino_uf}`);
    pares.add(`${v.destino_cidade}|${v.destino_uf}|${v.origem_cidade}|${v.origem_uf}`);
  });
  const rotaMap = new Map<string, { km: number | null; mi: number | null; mn: number | null }>();
  if (pares.size > 0) {
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
  }

  // Buscar acompanhantes referenciados
  const acompIds = Array.from(new Set(
    (data as unknown as Array<Record<string, unknown>>)
      .filter((v) => (v.beneficiario_tipo as string)?.toLowerCase() === 'acompanhante')
      .map((v) => v.beneficiario_id as string)
      .filter(Boolean)
  ));
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

  const mapped: RPBRow[] = [];
  const inPeriodo = (d: string | null | undefined) =>
    !!d && d >= periodo.inicio && d <= periodo.fim;

  (data as unknown as Array<Record<string, unknown>>).forEach((v) => {
    const sol = v.solicitacoes as Record<string, unknown> | null;
    const pac = sol?.pacientes as Record<string, unknown> | null;
    const beneficiario: Beneficiario = (v.beneficiario_tipo as string)?.toLowerCase() === 'acompanhante' ? 'acompanhante' : 'paciente';
    const modal: Modal = ((v.modal as string)?.toLowerCase() as Modal) ?? 'terrestre';
    const acomp = beneficiario === 'acompanhante' ? acompMap.get(v.beneficiario_id as string) : null;

    const nome = (acomp?.nome_completo as string) ?? (pac?.nome_completo as string) ?? '—';
    const cpfCns = (acomp?.cpf as string) ?? (pac?.cpf as string) ?? (pac?.cns as string) ?? '—';
    const enderecoFull = [pac?.logradouro, pac?.numero].filter(Boolean).join(', ');

    const sig = resolveSigtapPassagem({ beneficiario, modal, cnrac: false });

    // Trecho IDA
    if (inPeriodo(v.data_embarque_prevista as string | null)) {
      const rotaKey = `${v.origem_cidade}|${v.origem_uf}|${v.destino_cidade}|${v.destino_uf}`;
      const rota = rotaMap.get(rotaKey);
      const distancia = modal === 'terrestre' ? rota?.km : modal === 'aereo' ? rota?.mi : rota?.mn;
      const qtd = calcularQuantidadePassagem(distancia ?? null, sig.unidadeDivisor);
      mapped.push({
        id: `${v.id}:ida`,
        origem_id: String(v.id),
        trecho: 'ida',
        dt_atendimento: String(v.data_embarque_prevista),
        cpf_cns: cpfCns, nome,
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

    // Trecho VOLTA (apenas IDA_E_VOLTA com data_retorno_prevista no período)
    if ((v.tipo as string) === 'IDA_E_VOLTA' && inPeriodo(v.data_retorno_prevista as string | null)) {
      const rotaKey = `${v.destino_cidade}|${v.destino_uf}|${v.origem_cidade}|${v.origem_uf}`;
      const rota = rotaMap.get(rotaKey);
      const distancia = modal === 'terrestre' ? rota?.km : modal === 'aereo' ? rota?.mi : rota?.mn;
      const qtd = calcularQuantidadePassagem(distancia ?? null, sig.unidadeDivisor);
      mapped.push({
        id: `${v.id}:volta`,
        origem_id: String(v.id),
        trecho: 'volta',
        dt_atendimento: String(v.data_retorno_prevista),
        cpf_cns: cpfCns, nome,
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/relatorios/_RelatorioRPB.tsx
git commit -m "feat(rpb): carregamento de passagens com cálculo de quantidade SIGTAP"
```

---

## Task 6: Renderizar tabela e checkbox de "Lançado no BPA"

**Files:**
- Modify: `src/app/relatorios/_RelatorioRPB.tsx`

- [ ] **Step 1: Implementar colunas e ações**

Adicione antes do `return`:

```tsx
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
    await supabase.from('bpa_lancamentos').insert({
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
      tipo, origem_id: r.origem_id, trecho: r.trecho,
    }));
    setLancados(new Set(rows.map((r) => `${r.origem_id}:${r.trecho ?? ''}`)));
    if (toInsert.length > 0) {
      await supabase.from('bpa_lancamentos').insert(toInsert);
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
    ) as unknown as string,
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
  { key: 'dt',  header: 'Dt. Atend.', width: '92px', render: (r) => fmtDataBR(r.dt_atendimento) },
  { key: 'cpf', header: 'CPF/CNS', width: '120px', mono: true, render: (r) => r.cpf_cns },
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
  { key: 'bairro', header: 'Bairro', width: '110px', render: (r) => r.bairro ?? '—' },
  { key: 'tel',    header: 'Telefone', width: '110px', render: (r) => r.telefone ?? '—' },
  { key: 'email',  header: 'E-mail', render: (r) => r.email ?? '—' },
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
```

- [ ] **Step 2: Trocar o `TableCard` placeholder pela renderização real**

Substitua o bloco `<TableCard title="Itens para lançamento" count={0}>...</TableCard>` por:

```tsx
<StatsRow
  items={[
    { label: 'Total de linhas', value: String(rows.length), icon: <ClipboardList size={11} /> },
    { label: 'Lançadas no BPA', value: String(totalLancados), tone: 'success', icon: <CheckCircle2 size={11} /> },
    { label: 'Pendentes', value: String(totalPendentes), tone: 'warn', icon: <AlertCircle size={11} /> },
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
```

> Se `ReportTable` não suportar `rowStyle`, substituir por `getRowClassName` ou similar (verificar interface antes de implementar; ajustar uma das duas).

- [ ] **Step 3: Verificar interface de `ReportTable`**

Read: `src/app/relatorios/_shared/ReportTable.tsx`

Se aceitar prop de estilo por linha, usar. Caso contrário, envolver cada célula com a condicional de opacity, ou adicionar a prop (preferível — propagar até a tr).

- [ ] **Step 4: Type-check + smoke test no browser**

Run: `npx tsc --noEmit && npm run dev`
Abrir `/relatorios?aba=rpb`. Validar:
- Alterar tipo entre Ajuda de Custo / Passagens recarrega dados
- Marcar/desmarcar checkbox persiste após reload da página
- Checkbox do header marca/desmarca todos
- Linha marcada fica esmaecida
- Filtros de ano/mês funcionam

- [ ] **Step 5: Commit**

```bash
git add src/app/relatorios/_RelatorioRPB.tsx src/app/relatorios/_shared/ReportTable.tsx
git commit -m "feat(rpb): tabela RPB com colunas, checkbox persistente e stats"
```

---

## Task 7: Ajustes finais — impressão e CSV (opcional)

**Files:**
- Modify: `src/app/relatorios/_RelatorioRPB.tsx`

- [ ] **Step 1: Ocultar coluna de checkbox na impressão**

Adicione classe `no-print` no `<th>`/`<td>` da coluna `check`. Para fazer isso via `ReportColumn`, pode-se aceitar uma prop `printHide?: boolean`. Se `ReportTable` ainda não suportar, adicionar (passar a classe no `th`/`td`).

```tsx
{ key: 'check', /* ... */ printHide: true, /* ... */ },
```

E em `ReportTable.tsx`, propagar:

```tsx
<th className={col.printHide ? 'no-print' : undefined} ...>
<td className={col.printHide ? 'no-print' : undefined} ...>
```

- [ ] **Step 2: Verificar print preview**

Browser → Cmd+P em `/relatorios?aba=rpb`. Coluna do checkbox não deve aparecer.

- [ ] **Step 3: Type-check final**

Run: `npx tsc --noEmit && npm run lint`
Expected: Sem erros / warnings novos.

- [ ] **Step 4: Commit final**

```bash
git add src/app/relatorios/_RelatorioRPB.tsx src/app/relatorios/_shared/ReportTable.tsx
git commit -m "feat(rpb): oculta coluna de checkbox na impressão"
```

---

## Critérios de aceite (final)

Antes de declarar pronto, valide manualmente:

- [ ] Aba "RPB" aparece em `/relatorios` e responde a `?aba=rpb`
- [ ] Select de tipo alterna Ajuda de Custo / Passagens preservando ano/mês
- [ ] Ajuda de Custo: linhas no mês de `data_inicio`, quantidade = `dias_elegiveis`
- [ ] Passagens: linha por trecho (ida/volta separados), cada uma no mês da própria data
- [ ] Quantidade de passagens calculada via `ceil(distancia ÷ unidade_sigtap)`
- [ ] Rota sem distância cadastrada: badge "rota pendente" sem quebrar a tabela
- [ ] Códigos SIGTAP corretos para todas combinações testadas (paciente/acompanhante × pernoite/modal)
- [ ] Checkbox persiste após reload e bulk select marca/desmarca todas as filtradas
- [ ] Impressão omite a coluna do checkbox
- [ ] `npx tsc --noEmit` passa
- [ ] `npm run lint` sem erros novos

## Pontos abertos (validar com a operadora durante testes)

1. **CNRAC default `false`**: nenhum campo no schema atual indica CNRAC. Linhas usam variante não-CNRAC. Se ela precisar marcar CNRAC, considerar adicionar flag em `solicitacoes` em ciclo futuro.
2. **Pernoite em ajuda de custo**: derivado de `dias_elegiveis > 0`. Validar se a regra captura corretamente os benefícios sem pernoite (códigos `002-8` e `005-2`).
3. **Acompanhante sem dados próprios**: linhas de acompanhante usam endereço/sexo/email do paciente. Validar se isso é o que ela precisa digitar no BPA ou se precisamos coletar mais dados na ficha do acompanhante.
4. **Arredondamento `ceil`**: confirmar com a operadora se SIGTAP arredonda pra cima ou pra mais próximo.
