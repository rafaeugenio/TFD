# Modulo Cadastros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create standalone registration screens for Unidades de Saude and Medicos, reorganize the sidebar with a "Cadastros" section, and add summary cards to detail pages.

**Architecture:** Replicates the existing Pacientes screen pattern (table + drawer + detail page). Evolves the existing `unidades_destino` table with new columns. Adds `medico_id` FK to `pareceres` to link doctors to their pareceres. All new pages are client components using Supabase directly via service layers.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (PostgreSQL), Tailwind CSS, lucide-react icons, TFD design tokens (CSS variables)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/00028_evolucao_unidades_destino.sql` | Add new columns to unidades_destino |
| Create | `supabase/migrations/00029_agendamentos_unidade_fk.sql` | Add unidade_destino_id FK to agendamentos |
| Create | `supabase/migrations/00030_pareceres_medico_fk.sql` | Add medico_id FK to pareceres |
| Create | `src/core/models/unidade-saude.model.ts` | UnidadeSaude TypeScript interface |
| Modify | `src/core/models/index.ts` | Export new model |
| Create | `src/services/unidades-saude.service.ts` | CRUD + listing for unidades_destino |
| Modify | `src/layout/sidebar/Sidebar.tsx` | Reorganize nav with CADASTROS section |
| Create | `src/app/unidades-saude/page.tsx` | Listing page with table + drawer + summary cards |
| Create | `src/app/unidades-saude/[id]/page.tsx` | Detail page with info + solicitacoes history |
| Create | `src/app/medicos/page.tsx` | Listing page with table + drawer + summary cards |
| Create | `src/app/medicos/[id]/page.tsx` | Detail page with info + solicitacoes history |
| Modify | `src/app/sistema/configuracoes/page.tsx` | Remove Medicos tab |
| Modify | `src/app/pacientes/[id]/page.tsx` | Add summary cards |
| Modify | `src/app/atendimento-destino/page.tsx` | Replace text inputs with unidade select |

---

### Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/00028_evolucao_unidades_destino.sql`
- Create: `supabase/migrations/00029_agendamentos_unidade_fk.sql`
- Create: `supabase/migrations/00030_pareceres_medico_fk.sql`

- [ ] **Step 1: Create migration 00028 — evolve unidades_destino**

```sql
-- ============================================================
-- TFD — Migration 028: Evolucao da tabela unidades_destino
-- Adiciona campos granulares de endereco, contato e regional
-- ============================================================

ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS regional_id UUID REFERENCES tabelas_auxiliares(id);
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS telefone TEXT;

CREATE INDEX IF NOT EXISTS idx_unidades_destino_regional ON unidades_destino(regional_id);
```

- [ ] **Step 2: Create migration 00029 — agendamentos FK**

```sql
-- ============================================================
-- TFD — Migration 029: FK unidade_destino_id em agendamentos
-- Permite vincular agendamentos a unidades pre-cadastradas
-- ============================================================

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS unidade_destino_id UUID REFERENCES unidades_destino(id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade_destino ON agendamentos(unidade_destino_id);
```

- [ ] **Step 3: Create migration 00030 — pareceres medico FK**

The `pareceres` table currently references `usuarios(id)` via `medico_auditor_id` (system user who logged the parecer). To link pareceres to registered doctors in the `medicos` table, we add a separate `medico_id` column.

```sql
-- ============================================================
-- TFD — Migration 030: FK medico_id em pareceres
-- Vincula pareceres a medicos cadastrados
-- ============================================================

ALTER TABLE pareceres ADD COLUMN IF NOT EXISTS medico_id UUID REFERENCES medicos(id);

CREATE INDEX IF NOT EXISTS idx_pareceres_medico_id ON pareceres(medico_id);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00028_evolucao_unidades_destino.sql supabase/migrations/00029_agendamentos_unidade_fk.sql supabase/migrations/00030_pareceres_medico_fk.sql
git commit -m "feat: migrations para evolucao de unidades_destino, FK em agendamentos e pareceres"
```

---

### Task 2: Model and Service for Unidades de Saude

**Files:**
- Create: `src/core/models/unidade-saude.model.ts`
- Modify: `src/core/models/index.ts`
- Create: `src/services/unidades-saude.service.ts`

- [ ] **Step 1: Create UnidadeSaude model**

Create `src/core/models/unidade-saude.model.ts`:

```typescript
export interface UnidadeSaude {
  id: string;
  nome: string;
  cnes: string;
  tipo?: string;
  regional_id?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  endereco?: string;
  contato?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}
```

Note: `cidade`, `endereco`, `contato` are legacy columns from the original `unidades_destino` table. New records use `logradouro`, `numero`, `bairro`, `municipio`, `telefone`, `email` instead.

- [ ] **Step 2: Export from models index**

Add to `src/core/models/index.ts`:

```typescript
export * from './unidade-saude.model';
```

- [ ] **Step 3: Create unidades-saude.service.ts**

Create `src/services/unidades-saude.service.ts` following the exact pattern of `src/services/medicos.service.ts`:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { UnidadeSaude } from '@/core/models';

function getSupabase() {
  return createClient();
}

/** Lista unidades ativas com busca por nome ou CNES */
export async function listarUnidadesSaude(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)', { count: 'exact' })
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,cnes.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/** Lista todas (admin, inclusive inativas) */
export async function listarUnidadesSaudeAdmin(filters?: { search?: string }) {
  let query = getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)', { count: 'exact' })
    .order('nome', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,cnes.ilike.%${filters.search}%`,
    );
  }

  return query;
}

/** Busca unidade por ID */
export async function buscarUnidadeSaude(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)')
    .eq('id', id)
    .single();
}

/** Busca por CNES (validacao de unicidade) */
export async function buscarPorCnes(cnes: string) {
  return getSupabase()
    .from('unidades_destino')
    .select('*')
    .eq('cnes', cnes)
    .maybeSingle();
}

/** Cria nova unidade */
export async function criarUnidadeSaude(data: Omit<UnidadeSaude, 'id' | 'ativo' | 'created_at' | 'updated_at'>) {
  return getSupabase()
    .from('unidades_destino')
    .insert(data)
    .select()
    .single();
}

/** Atualiza unidade */
export async function atualizarUnidadeSaude(id: string, data: Partial<UnidadeSaude>) {
  return getSupabase()
    .from('unidades_destino')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa unidade (soft delete) */
export async function desativarUnidadeSaude(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}

/** Lista solicitacoes vinculadas a uma unidade via agendamentos */
export async function listarSolicitacoesPorUnidade(unidadeId: string) {
  return getSupabase()
    .from('agendamentos')
    .select('solicitacao_id, solicitacoes(*, pacientes(nome_completo))')
    .eq('unidade_destino_id', unidadeId)
    .order('created_at', { ascending: false });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/core/models/unidade-saude.model.ts src/core/models/index.ts src/services/unidades-saude.service.ts
git commit -m "feat: model e service para unidades de saude"
```

---

### Task 3: Reorganize Sidebar Navigation

**Files:**
- Modify: `src/layout/sidebar/Sidebar.tsx`

- [ ] **Step 1: Update imports — add Building2 icon**

In `src/layout/sidebar/Sidebar.tsx`, add `Building2` to the lucide-react import:

```typescript
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  MapPin,
  Plane,
  Wallet,
  CalendarClock,
  LogOut,
  BarChart3,
  Settings,
  Shield,
  Users,
  Contact,
  ScrollText,
  X,
  Stethoscope,
  ChevronsLeft,
  ChevronsRight,
  Microscope,
  Building2,
  type LucideIcon,
} from 'lucide-react';
```

- [ ] **Step 2: Reorganize navSections**

Replace the `navSections` array with:

```typescript
const navSections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Painel', href: '/dashboard' },
    ],
  },
  {
    title: 'FLUXO DO PROCESSO',
    items: [
      { icon: FileText, label: 'Solicitações', href: '/solicitacoes' },
      { icon: Microscope, label: 'Diagnóstico Clínico', href: '/diagnostico-clinico' },
      { icon: Stethoscope, label: 'Parecer Médico', href: '/parecer-medico' },
      { icon: ClipboardCheck, label: 'Regulação', href: '/regulacao' },
      { icon: MapPin, label: 'Agendamentos', href: '/atendimento-destino' },
      { icon: Plane, label: 'Viagens', href: '/viagens' },
      { icon: Wallet, label: 'Ajuda de Custo', href: '/ajuda-custo' },
      { icon: CalendarClock, label: 'Permanência', href: '/permanencia' },
      { icon: LogOut, label: 'Alta / Encerramento', href: '/alta-encerramento' },
    ],
  },
  {
    title: 'CADASTROS',
    items: [
      { icon: Contact, label: 'Pacientes', href: '/pacientes' },
      { icon: Stethoscope, label: 'Médicos', href: '/medicos' },
      { icon: Building2, label: 'Unidades de Saúde', href: '/unidades-saude' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
      { icon: Settings, label: 'Configurações', href: '/sistema/configuracoes' },
      { icon: Shield, label: 'Permissões', href: '/sistema/papeis' },
      { icon: Users, label: 'Usuários', href: '/sistema/usuarios' },
      { icon: ScrollText, label: 'Logs', href: '/sistema/logs' },
    ],
  },
];
```

Key changes:
- Pacientes removed from "FLUXO DO PROCESSO"
- New "CADASTROS" section with Pacientes, Médicos, Unidades de Saúde
- Médicos points to `/medicos` (new standalone route)

- [ ] **Step 3: Commit**

```bash
git add src/layout/sidebar/Sidebar.tsx
git commit -m "feat: reorganizar sidebar com secao Cadastros"
```

---

### Task 4: Unidades de Saude — Listing Page

**Files:**
- Create: `src/app/unidades-saude/page.tsx`

- [ ] **Step 1: Create the listing page**

Create `src/app/unidades-saude/page.tsx`. This page follows the exact pattern of `src/app/pacientes/page.tsx`: PageHeader + summary cards + toolbar with search + table + pagination + Drawer for create/edit + delete confirmation modal.

```typescript
'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Plus,
  Search,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useMunicipios } from '@/shared/hooks/useLookup';
import { useLookup } from '@/shared/hooks/useLookup';
import { maskPhone, maskCEP } from '@/shared/pipes/formatters';

import {
  listarUnidadesSaude,
  buscarUnidadeSaude,
  criarUnidadeSaude,
  atualizarUnidadeSaude,
  desativarUnidadeSaude,
} from '@/services/unidades-saude.service';
import type { UnidadeSaude } from '@/core/models';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const ITEMS_PER_PAGE = 10;

const TIPO_OPTIONS = [
  { value: 'UBS', label: 'UBS' },
  { value: 'UPA', label: 'UPA' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'CLINICA', label: 'Clínica' },
  { value: 'CAPS', label: 'CAPS' },
  { value: 'OUTRO', label: 'Outro' },
];

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UnidadesSaudePageWrapper() {
  return (
    <Suspense>
      <UnidadesSaudePage />
    </Suspense>
  );
}

function UnidadesSaudePage() {
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [fNome, setFNome] = useState('');
  const [fCnes, setFCnes] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fRegional, setFRegional] = useState('');
  const [fCep, setFCep] = useState('');
  const [fLogradouro, setFLogradouro] = useState('');
  const [fNumero, setFNumero] = useState('');
  const [fBairro, setFBairro] = useState('');
  const [fMunicipio, setFMunicipio] = useState('');
  const [fUf, setFUf] = useState('MA');
  const [fTelefone, setFTelefone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fResponsavel, setFResponsavel] = useState('');

  /* ---- Lookups ---- */
  const { options: regionais } = useLookup('regional');
  const { options: municipios } = useMunicipios();

  /* ---- Data fetching ---- */
  const { data: unidades, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarUnidadesSaude({ search, page: currentPage, pageSize: ITEMS_PER_PAGE }),
    [search, currentPage],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativas: 0, regionais: 0 });

  const refreshCounts = useCallback(() => {
    listarUnidadesSaude({ pageSize: 1 }).then(({ count }) => {
      setCounts((prev) => ({ ...prev, total: count ?? 0, ativas: count ?? 0 }));
    });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  /* ---- Open drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading) {
      editarHandled.current = editarParam;
      buscarUnidadeSaude(editarParam).then(({ data }) => {
        if (data) handleOpenEdit(data as unknown as UnidadeSaude);
      });
      router.replace('/unidades-saude', { scroll: false });
    }
  }, [editarParam, loading]);

  /* ---- Form reset & handlers ---- */

  function resetForm() {
    setFNome(''); setFCnes(''); setFTipo(''); setFRegional('');
    setFCep(''); setFLogradouro(''); setFNumero(''); setFBairro('');
    setFMunicipio(''); setFUf('MA'); setFTelefone(''); setFEmail('');
    setFResponsavel('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  function handleOpenEdit(item: UnidadeSaude) {
    setEditingId(item.id);
    setFNome(item.nome ?? '');
    setFCnes(item.cnes ?? '');
    setFTipo(item.tipo ?? '');
    setFRegional(item.regional_id ?? '');
    setFCep(maskCEP(item.cep ?? ''));
    setFLogradouro(item.logradouro ?? '');
    setFNumero(item.numero ?? '');
    setFBairro(item.bairro ?? '');
    setFMunicipio(item.municipio ?? '');
    setFUf(item.uf ?? 'MA');
    setFTelefone(maskPhone(item.telefone ?? ''));
    setFEmail(item.email ?? '');
    setFResponsavel(item.responsavel ?? '');
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!fNome || !fCnes) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      nome: fNome,
      cnes: fCnes.replace(/\D/g, ''),
      tipo: fTipo || undefined,
      regional_id: fRegional || undefined,
      cep: fCep.replace(/\D/g, '') || undefined,
      logradouro: fLogradouro || undefined,
      numero: fNumero || undefined,
      bairro: fBairro || undefined,
      municipio: fMunicipio || undefined,
      uf: fUf,
      telefone: fTelefone || undefined,
      email: fEmail || undefined,
      responsavel: fResponsavel || undefined,
      cidade: fMunicipio || undefined,
    };

    if (editingId) {
      const { error } = await atualizarUnidadeSaude(editingId, payload as Partial<UnidadeSaude>);
      if (error) { toast.error('Erro ao salvar', (error as any).message); setSaving(false); return; }
      toast.success('Unidade atualizada!');
    } else {
      const { error } = await criarUnidadeSaude(payload as any);
      if (error) { toast.error('Erro ao criar', (error as any).message); setSaving(false); return; }
      toast.success('Unidade cadastrada!');
    }

    setSaving(false);
    handleCloseDrawer();
    refresh();
    refreshCounts();
  }

  async function handleDeactivate(item: UnidadeSaude) {
    if (!window.confirm(`Desativar a unidade "${item.nome}"?`)) return;
    const { error } = await desativarUnidadeSaude(item.id);
    if (error) { toast.error('Erro', (error as any).message); return; }
    toast.success('Unidade desativada!');
    refresh();
    refreshCounts();
  }

  /* ---- Helpers ---- */
  const getRegionalNome = (item: any) => item.tabelas_auxiliares?.nome ?? '—';

  return (
    <>
      <PageHeader
        title="Unidades de Saúde"
        subtitle="Cadastro de unidades de saúde de referência"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => { resetForm(); setDrawerOpen(true); }}>
            <Plus size={16} /> Nova Unidade
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Unidades</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{counts.total}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Unidades Ativas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.ativas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-info-bg, #EBF5FF)', color: 'var(--tfd-info, #3B82F6)' }}
          >
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Regionais Cobertas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-info, #3B82F6)' }}>{counts.regionais}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tfd-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tfd-text-muted)' }} />
            <input
              type="text"
              className="tfd-input pl-9"
              placeholder="Buscar por nome ou CNES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); } }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
          </div>
        ) : unidades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <Package size={28} style={{ color: 'var(--tfd-primary-400)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>Nenhuma unidade cadastrada</p>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Cadastre unidades de saúde para padronizar os agendamentos.</p>
            </div>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={() => { resetForm(); setDrawerOpen(true); }}>
              <Plus size={14} /> Cadastrar primeira unidade
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tfd-table w-full">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CNES</th>
                    <th className="hidden md:table-cell">Tipo</th>
                    <th className="hidden lg:table-cell">Regional</th>
                    <th className="hidden lg:table-cell">Município</th>
                    <th className="hidden xl:table-cell">Telefone</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(unidades as any[]).map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/unidades-saude/${item.id}`)}
                    >
                      <td>
                        <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                          {item.nome}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--tfd-font-mono)' }}>{item.cnes || '—'}</td>
                      <td className="hidden md:table-cell">{item.tipo || '—'}</td>
                      <td className="hidden lg:table-cell">{getRegionalNome(item)}</td>
                      <td className="hidden lg:table-cell">{item.municipio || item.cidade || '—'}</td>
                      <td className="hidden xl:table-cell">{item.telefone || '—'}</td>
                      <td>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Editar"
                            style={{ color: 'var(--tfd-primary-500)' }}
                            onClick={() => handleOpenEdit(item as UnidadeSaude)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Desativar"
                            style={{ color: 'var(--tfd-status-danger)' }}
                            onClick={() => handleDeactivate(item as UnidadeSaude)}
                          >
                            <Power size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                {totalCount} unidade{totalCount !== 1 ? 's' : ''} encontrada{totalCount !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs px-2" style={{ color: 'var(--tfd-text-secondary)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer: Nova/Editar Unidade */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Unidade' : 'Nova Unidade de Saúde'}
        subtitle={editingId ? `CNES ${fCnes}` : 'Cadastrar unidade de saúde'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving || !fNome || !fCnes}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : (editingId ? 'Salvar Alterações' : 'Cadastrar Unidade')}
            </button>
          </>
        }
      >
        {/* Section: Dados da Unidade */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Dados da Unidade</h3>

        <FormField label="Nome da Unidade" required>
          <input type="text" className="tfd-input" placeholder="Ex: Hospital Sírio-Libanês" value={fNome} onChange={(e) => setFNome(e.target.value)} />
        </FormField>

        <FormField label="CNES" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="0000000"
            maxLength={7}
            value={fCnes}
            onChange={(e) => setFCnes(e.target.value.replace(/\D/g, '').slice(0, 7))}
            style={{ fontFamily: 'var(--tfd-font-mono)' }}
          />
        </FormField>

        <FormField label="Tipo">
          <select className="tfd-input" value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
            <option value="">Selecione...</option>
            {TIPO_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Regional">
          <select className="tfd-input" value={fRegional} onChange={(e) => setFRegional(e.target.value)}>
            <option value="">Selecione...</option>
            {regionais.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </FormField>

        <hr className="tfd-divider my-4" />

        {/* Section: Endereco */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Endereço</h3>

        <FormField label="CEP">
          <input type="text" className="tfd-input" placeholder="00000-000" value={fCep} onChange={(e) => setFCep(maskCEP(e.target.value))} />
        </FormField>

        <FormField label="Logradouro">
          <input type="text" className="tfd-input" placeholder="Rua, Avenida..." value={fLogradouro} onChange={(e) => setFLogradouro(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <FormField label="Bairro">
            <input type="text" className="tfd-input" value={fBairro} onChange={(e) => setFBairro(e.target.value)} />
          </FormField>
          <FormField label="Número">
            <input type="text" className="tfd-input" value={fNumero} onChange={(e) => setFNumero(e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-3">
          <FormField label="Município">
            <select className="tfd-input" value={fMunicipio} onChange={(e) => setFMunicipio(e.target.value)}>
              <option value="">Selecione...</option>
              {municipios.map((m) => (
                <option key={m.value} value={m.label}>{m.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="UF">
            <select className="tfd-input" value={fUf} onChange={(e) => setFUf(e.target.value)}>
              {UF_OPTIONS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FormField>
        </div>

        <hr className="tfd-divider my-4" />

        {/* Section: Contato */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Contato</h3>

        <FormField label="Telefone">
          <input type="text" className="tfd-input" placeholder="(00) 00000-0000" value={fTelefone} onChange={(e) => setFTelefone(maskPhone(e.target.value))} />
        </FormField>

        <FormField label="E-mail">
          <input type="email" className="tfd-input" placeholder="contato@unidade.com.br" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
        </FormField>

        <FormField label="Responsável">
          <input type="text" className="tfd-input" placeholder="Nome do responsável/contato" value={fResponsavel} onChange={(e) => setFResponsavel(e.target.value)} />
        </FormField>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run: `cd /Users/rafaeleugenio/Documents/Cursor/Repositórios/TFD && npm run dev`

Navigate to `http://localhost:3000/unidades-saude` and verify:
- Page loads without errors
- Summary cards display
- Empty state shows with "Cadastrar primeira unidade" button
- Drawer opens and closes
- Can create a new unidade

- [ ] **Step 3: Commit**

```bash
git add src/app/unidades-saude/page.tsx
git commit -m "feat: tela de listagem de unidades de saude com drawer de cadastro"
```

---

### Task 5: Unidades de Saude — Detail Page

**Files:**
- Create: `src/app/unidades-saude/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

Create `src/app/unidades-saude/[id]/page.tsx` following the pattern of `src/app/pacientes/[id]/page.tsx`:

```typescript
'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Loader2,
  XCircle,
  Pencil,
  User,
  ExternalLink,
  CheckCircle2,
  Activity,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarUnidadeSaude, listarSolicitacoesPorUnidade } from '@/services/unidades-saude.service';
import { formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UnidadeSaudeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [unidade, setUnidade] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarUnidadeSaude(id);
      if (data) setUnidade(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const solResult = await listarSolicitacoesPorUnidade(id);
      if (solResult.data) {
        const sols = (solResult.data as any[])
          .map((ag) => ag.solicitacoes)
          .filter(Boolean);
        setSolicitacoes(sols);
      }
      setLoadingSol(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
      </div>
    );
  }

  if (!unidade) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Unidade não encontrada</p>
        <Link href="/unidades-saude" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = unidade.nome as string;
  const cnes = unidade.cnes as string;
  const tipo = unidade.tipo as string;
  const regionalNome = (unidade.tabelas_auxiliares as any)?.nome as string;
  const logradouro = unidade.logradouro as string;
  const numero = unidade.numero as string;
  const bairro = unidade.bairro as string;
  const municipio = (unidade.municipio as string) || (unidade.cidade as string);
  const uf = (unidade.uf as string) || 'MA';
  const cep = unidade.cep as string;
  const telefone = unidade.telefone as string;
  const email = unidade.email as string;
  const responsavel = unidade.responsavel as string;

  const enderecoCompleto = [
    logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
    bairro,
  ].filter(Boolean).join(' — ');

  const cidadeFull = municipio ? `${municipio} — ${uf}` : null;

  // Summary counts
  const totalSol = solicitacoes.length;
  const emAndamento = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st && !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
  }).length;
  const concluidas = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st === 'CONCLUIDO' || st === 'ENCERRADO';
  }).length;

  return (
    <>
      <PageHeader
        title={nome}
        subtitle="Detalhes da unidade de saúde"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => router.push(`/unidades-saude?editar=${id}`)}
            >
              <Pencil size={16} />
              Editar Unidade
            </button>
            <Link href="/unidades-saude" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Solicitações</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{loadingSol ? '...' : totalSol}</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-warning-bg)', color: 'var(--tfd-status-warning)' }}>
            <Activity size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Em Andamento</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{loadingSol ? '...' : emAndamento}</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{loadingSol ? '...' : concluidas}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Unit data */}
        <div className="lg:col-span-1 space-y-6">
          <div className="tfd-card">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: 'var(--tfd-primary-500)' }}
              >
                <Building2 size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                  {nome}
                </h2>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  {tipo || 'Unidade de Saúde'}
                  {cnes && ` · CNES ${cnes}`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {cnes && <InfoRow icon={<FileText size={14} />} label="CNES" value={cnes} />}
              {tipo && <InfoRow icon={<Building2 size={14} />} label="Tipo" value={tipo} />}
              {regionalNome && <InfoRow icon={<MapPin size={14} />} label="Regional" value={regionalNome} />}
              {responsavel && <InfoRow icon={<User size={14} />} label="Responsável" value={responsavel} />}
              {telefone && <InfoRow icon={<Phone size={14} />} label="Telefone" value={telefone} />}
              {email && <InfoRow icon={<Mail size={14} />} label="E-mail" value={email} />}
            </div>

            {(logradouro || municipio) && (
              <>
                <hr className="tfd-divider my-4" />
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide" style={{ color: 'var(--tfd-text-muted)' }}>
                  <MapPin size={12} />
                  Endereço
                </h3>
                <div className="space-y-1">
                  {enderecoCompleto && (
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{enderecoCompleto}</p>
                  )}
                  {cidadeFull && (
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{cidadeFull}</p>
                  )}
                  {cep && (
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CEP: {cep}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right column: Solicitacoes history */}
        <div className="lg:col-span-2">
          <div className="tfd-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
                <FileText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                Solicitações Vinculadas
                {!loadingSol && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                  >
                    {solicitacoes.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingSol ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando solicitações...</span>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhuma solicitação vinculada a esta unidade
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitacoes.map((sol, idx) => {
                  const status = sol.status as StatusSolicitacao;
                  const numProcesso = sol.numero_processo as string;
                  const dataCriacao = sol.created_at as string;
                  const cid = sol.cid10_principal as string;
                  const pacienteNome = (sol.pacientes as any)?.nome_completo as string;

                  return (
                    <Link
                      key={sol.id as string}
                      href={`/solicitacoes/${sol.id}`}
                      className="block rounded-lg p-4 transition-all duration-150 group"
                      style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tfd-primary-200)'; e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--tfd-surface-border)'; e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)'; }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            {pacienteNome && (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                                <User size={11} /> {pacienteNome}
                              </span>
                            )}
                            {cid && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>CID: {cid}</span>
                            )}
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              <Clock size={11} /> {formatDate(dataCriacao)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusTag status={status} />
                          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--tfd-primary-500)' }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── InfoRow helper ── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--tfd-text-muted)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{label}:</span>
      <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/unidades-saude/\[id\]/page.tsx
git commit -m "feat: tela de detalhes da unidade de saude"
```

---

### Task 6: Medicos — Standalone Listing Page

**Files:**
- Create: `src/app/medicos/page.tsx`

- [ ] **Step 1: Create the listing page**

Create `src/app/medicos/page.tsx`. This extracts the functionality from `MedicosPanel.tsx` into a standalone page with the same pattern as Pacientes/Unidades (PageHeader + summary cards + table + drawer + pagination).

```typescript
'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Stethoscope,
  CheckCircle2,
  Award,
  Plus,
  Search,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  UserRound,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useLookup } from '@/shared/hooks/useLookup';
import { maskCPF } from '@/shared/pipes/formatters';

import {
  listarMedicos,
  buscarMedico,
  criarMedico,
  atualizarMedico,
  desativarMedico,
} from '@/services/medicos.service';
import type { Medico } from '@/core/models';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const ITEMS_PER_PAGE = 10;

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function MedicosPageWrapper() {
  return (
    <Suspense>
      <MedicosPage />
    </Suspense>
  );
}

function MedicosPage() {
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [fNome, setFNome] = useState('');
  const [fCrm, setFCrm] = useState('');
  const [fCrmUf, setFCrmUf] = useState('MA');
  const [fCpf, setFCpf] = useState('');
  const [fEspecialidade, setFEspecialidade] = useState('');

  /* ---- Lookups ---- */
  const { options: especialidades } = useLookup('especialidade');

  /* ---- Data fetching ---- */
  const { data: medicos, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarMedicos({ search, page: currentPage, pageSize: ITEMS_PER_PAGE }),
    [search, currentPage],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativos: 0, especialidades: 0 });

  const refreshCounts = useCallback(() => {
    listarMedicos({ pageSize: 1 }).then(({ count }) => {
      setCounts((prev) => ({ ...prev, total: count ?? 0, ativos: count ?? 0 }));
    });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  /* ---- Open drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading) {
      editarHandled.current = editarParam;
      buscarMedico(editarParam).then(({ data }) => {
        if (data) handleOpenEdit(data as Medico);
      });
      router.replace('/medicos', { scroll: false });
    }
  }, [editarParam, loading]);

  /* ---- Form reset & handlers ---- */

  function resetForm() {
    setFNome(''); setFCrm(''); setFCrmUf('MA'); setFCpf(''); setFEspecialidade('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  function handleOpenEdit(item: Medico) {
    setEditingId(item.id);
    setFNome(item.nome_completo);
    setFCrm(item.crm);
    setFCrmUf(item.crm_uf);
    setFCpf(item.cpf ?? '');
    setFEspecialidade(item.especialidade ?? '');
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!fNome || !fCrm || !fCrmUf) return;
    setSaving(true);

    const payload = {
      nome_completo: fNome,
      crm: fCrm,
      crm_uf: fCrmUf,
      cpf: fCpf || undefined,
      especialidade: fEspecialidade || undefined,
    };

    if (editingId) {
      const { error } = await atualizarMedico(editingId, payload);
      if (error) { toast.error('Erro ao salvar', error.message); setSaving(false); return; }
      toast.success('Médico atualizado!');
    } else {
      const { error } = await criarMedico(payload);
      if (error) { toast.error('Erro ao criar', error.message); setSaving(false); return; }
      toast.success('Médico cadastrado!');
    }

    setSaving(false);
    handleCloseDrawer();
    refresh();
    refreshCounts();
  }

  async function handleDeactivate(item: Medico) {
    if (!window.confirm(`Desativar o médico "${item.nome_completo}"?`)) return;
    const { error } = await desativarMedico(item.id);
    if (error) { toast.error('Erro', error.message); return; }
    toast.success('Médico desativado!');
    refresh();
    refreshCounts();
  }

  return (
    <>
      <PageHeader
        title="Médicos"
        subtitle="Cadastro de profissionais médicos"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => { resetForm(); setDrawerOpen(true); }}>
            <Plus size={16} /> Novo Médico
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Médicos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{counts.total}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Médicos Ativos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.ativos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-info-bg, #EBF5FF)', color: 'var(--tfd-info, #3B82F6)' }}>
            <Award size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Especialidades</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-info, #3B82F6)' }}>{counts.especialidades}</p>
          </div>
        </div>
      </div>

      {/* Toolbar + Table */}
      <div className="tfd-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tfd-text-muted)' }} />
            <input
              type="text"
              className="tfd-input pl-9"
              placeholder="Buscar por nome ou CRM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); } }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
          </div>
        ) : (medicos as Medico[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <Package size={28} style={{ color: 'var(--tfd-primary-400)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>Nenhum médico cadastrado</p>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Cadastre médicos conforme forem aparecendo nos pareceres.</p>
            </div>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={() => { resetForm(); setDrawerOpen(true); }}>
              <Plus size={14} /> Cadastrar primeiro médico
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tfd-table w-full">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CRM</th>
                    <th className="hidden md:table-cell">Especialidade</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(medicos as Medico[]).map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/medicos/${item.id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                            <UserRound size={14} />
                          </div>
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{item.nome_completo}</span>
                        </div>
                      </td>
                      <td>CRM {item.crm}/{item.crm_uf}</td>
                      <td className="hidden md:table-cell">{item.especialidade || '—'}</td>
                      <td>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Editar" style={{ color: 'var(--tfd-primary-500)' }} onClick={() => handleOpenEdit(item)}>
                            <Pencil size={14} />
                          </button>
                          <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Desativar" style={{ color: 'var(--tfd-status-danger)' }} onClick={() => handleDeactivate(item)}>
                            <Power size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                {totalCount} médico{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs px-2" style={{ color: 'var(--tfd-text-secondary)' }}>{currentPage} / {totalPages}</span>
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Médico' : 'Novo Médico'}
        subtitle={editingId ? `CRM ${fCrm}/${fCrmUf}` : 'Cadastrar profissional médico'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving || !fNome || !fCrm || !fCrmUf}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : (editingId ? 'Salvar Alterações' : 'Cadastrar Médico')}
            </button>
          </>
        }
      >
        <FormField label="Nome Completo" required>
          <input type="text" className="tfd-input" placeholder="Nome completo do médico" value={fNome} onChange={(e) => setFNome(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <FormField label="CRM" required>
            <input type="text" className="tfd-input" placeholder="Número do CRM" value={fCrm} onChange={(e) => setFCrm(e.target.value)} />
          </FormField>
          <FormField label="UF" required>
            <select className="tfd-input" value={fCrmUf} onChange={(e) => setFCrmUf(e.target.value)}>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="CPF">
          <input type="text" className="tfd-input" placeholder="000.000.000-00" value={fCpf} onChange={(e) => setFCpf(maskCPF(e.target.value))} />
        </FormField>

        <FormField label="Especialidade">
          <select className="tfd-input" value={fEspecialidade} onChange={(e) => setFEspecialidade(e.target.value)}>
            <option value="">Selecione...</option>
            {especialidades.map((esp) => (
              <option key={esp.value} value={esp.label}>{esp.label}</option>
            ))}
          </select>
        </FormField>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/medicos/page.tsx
git commit -m "feat: tela standalone de listagem de medicos com drawer de cadastro"
```

---

### Task 7: Medicos — Detail Page

**Files:**
- Create: `src/app/medicos/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

Create `src/app/medicos/[id]/page.tsx`. Shows doctor info + solicitacoes where this doctor gave a parecer. Uses the new `medico_id` FK in `pareceres` (will be empty for existing data until parecer flow is updated).

```typescript
'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Stethoscope,
  FileText,
  Clock,
  Loader2,
  XCircle,
  Pencil,
  User,
  ExternalLink,
  CheckCircle2,
  XOctagon,
  CreditCard,
  Award,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarMedico } from '@/services/medicos.service';
import { formatCPF, formatDate } from '@/shared/pipes/formatters';
import { createClient } from '@/lib/supabase/client';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Helper: fetch solicitacoes by medico_id            */
/* -------------------------------------------------- */

async function listarSolicitacoesPorMedico(medicoId: string) {
  return createClient()
    .from('pareceres')
    .select('solicitacao_id, decisao, solicitacoes(*, pacientes(nome_completo))')
    .eq('medico_id', medicoId)
    .order('created_at', { ascending: false });
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function MedicoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [medico, setMedico] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, unknown>[]>([]);
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarMedico(id);
      if (data) setMedico(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const solResult = await listarSolicitacoesPorMedico(id);
      if (solResult.data) {
        const items = solResult.data as any[];
        const sols = items.map((p) => p.solicitacoes).filter(Boolean);
        const decMap: Record<string, string> = {};
        items.forEach((p) => {
          if (p.solicitacoes?.id) decMap[p.solicitacoes.id] = p.decisao;
        });
        setSolicitacoes(sols);
        setDecisoes(decMap);
      }
      setLoadingSol(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
      </div>
    );
  }

  if (!medico) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Médico não encontrado</p>
        <Link href="/medicos" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = medico.nome_completo as string;
  const crm = medico.crm as string;
  const crmUf = medico.crm_uf as string;
  const cpf = medico.cpf as string;
  const especialidade = medico.especialidade as string;

  // Summary counts
  const totalSol = solicitacoes.length;
  const favoraveis = Object.values(decisoes).filter((d) => d === 'DEFERIDO').length;
  const desfavoraveis = Object.values(decisoes).filter((d) => d === 'INDEFERIDO').length;

  return (
    <>
      <PageHeader
        title={nome}
        subtitle="Detalhes do médico"
        actions={
          <div className="flex items-center gap-2">
            <button className="tfd-btn tfd-btn-primary" onClick={() => router.push(`/medicos?editar=${id}`)}>
              <Pencil size={16} /> Editar Médico
            </button>
            <Link href="/medicos" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} /> Voltar
            </Link>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Solicitações</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{loadingSol ? '...' : totalSol}</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pareceres Favoráveis</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{loadingSol ? '...' : favoraveis}</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-error-bg)', color: 'var(--tfd-status-error)' }}>
            <XOctagon size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pareceres Desfavoráveis</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-error)' }}>{loadingSol ? '...' : desfavoraveis}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1">
          <div className="tfd-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full text-white text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--tfd-primary-500)' }}>
                {nome.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>{nome}</h2>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CRM {crm}/{crmUf}</p>
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow icon={<Stethoscope size={14} />} label="CRM" value={`${crm}/${crmUf}`} />
              {cpf && <InfoRow icon={<CreditCard size={14} />} label="CPF" value={formatCPF(cpf)} />}
              {especialidade && <InfoRow icon={<Award size={14} />} label="Especialidade" value={especialidade} />}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <div className="tfd-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
                <FileText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                Solicitações com Parecer
                {!loadingSol && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                    {solicitacoes.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingSol ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando solicitações...</span>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhuma solicitação vinculada a este médico
                </p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  Solicitações aparecerão aqui quando pareceres forem vinculados a este médico.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitacoes.map((sol) => {
                  const status = sol.status as StatusSolicitacao;
                  const numProcesso = sol.numero_processo as string;
                  const dataCriacao = sol.created_at as string;
                  const cid = sol.cid10_principal as string;
                  const pacienteNome = (sol.pacientes as any)?.nome_completo as string;

                  return (
                    <Link
                      key={sol.id as string}
                      href={`/solicitacoes/${sol.id}`}
                      className="block rounded-lg p-4 transition-all duration-150 group"
                      style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tfd-primary-200)'; e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--tfd-surface-border)'; e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)'; }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            {pacienteNome && (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                                <User size={11} /> {pacienteNome}
                              </span>
                            )}
                            {cid && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>CID: {cid}</span>}
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              <Clock size={11} /> {formatDate(dataCriacao)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusTag status={status} />
                          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--tfd-primary-500)' }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--tfd-text-muted)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{label}:</span>
      <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/medicos/\[id\]/page.tsx
git commit -m "feat: tela de detalhes do medico com historico de solicitacoes"
```

---

### Task 8: Remove Medicos Tab from Configuracoes

**Files:**
- Modify: `src/app/sistema/configuracoes/page.tsx`

- [ ] **Step 1: Remove MedicosPanel import and tab**

In `src/app/sistema/configuracoes/page.tsx`:

1. Remove the import line:
```typescript
// DELETE: import MedicosPanel from './MedicosPanel';
```

2. Remove `'medicos'` from the `TabKey` union type:
```typescript
type TabKey = 'tabelas' | 'parametros' | 'cid10' | 'sigtap' | 'rotas';
```

3. Remove the medicos entry from the `TABS` array:
```typescript
// DELETE: { key: 'medicos', label: 'Médicos', icon: <UserRound size={16} /> },
```

4. Remove the medicos render line:
```typescript
// DELETE: {activeTab === 'medicos' && <MedicosPanel />}
```

5. Remove `UserRound` from the lucide-react import if no longer used elsewhere in the file.

- [ ] **Step 2: Verify configuracoes page still works**

Navigate to `http://localhost:3000/sistema/configuracoes` and verify:
- Page loads without errors
- Médicos tab is gone
- Other tabs (Tabelas Auxiliares, Parâmetros, CID-10, SIGTAP, Rotas) still work

- [ ] **Step 3: Commit**

```bash
git add src/app/sistema/configuracoes/page.tsx
git commit -m "refactor: remover aba Medicos de Configuracoes (movido para /medicos)"
```

---

### Task 9: Summary Cards on Paciente Detail Page

**Files:**
- Modify: `src/app/pacientes/[id]/page.tsx`

- [ ] **Step 1: Add summary card imports**

In `src/app/pacientes/[id]/page.tsx`, add to the lucide-react import:

```typescript
import {
  // ... existing imports ...
  Activity,
  CheckCircle2,
} from 'lucide-react';
```

- [ ] **Step 2: Add summary cards before the grid**

After the `<PageHeader>` closing tag and before `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`, insert:

```tsx
      {/* Summary cards */}
      {(() => {
        const totalSol = solicitacoes.length;
        const emAndamento = solicitacoes.filter((s) => {
          const st = s.status as string;
          return st && !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
        }).length;
        const concluidas = solicitacoes.filter((s) => {
          const st = s.status as string;
          return st === 'CONCLUIDO' || st === 'ENCERRADO';
        }).length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="tfd-card flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Solicitações</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>{loadingSol ? '...' : totalSol}</p>
              </div>
            </div>
            <div className="tfd-card flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-warning-bg)', color: 'var(--tfd-status-warning)' }}>
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Em Andamento</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{loadingSol ? '...' : emAndamento}</p>
              </div>
            </div>
            <div className="tfd-card flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídas</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{loadingSol ? '...' : concluidas}</p>
              </div>
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/pacientes/\[id\]/page.tsx
git commit -m "feat: cards de resumo nos detalhes do paciente"
```

---

### Task 10: Migrate Agendamentos to Use Unidade Select

**Files:**
- Modify: `src/app/atendimento-destino/page.tsx`

- [ ] **Step 1: Add unidade select state and import**

In `src/app/atendimento-destino/page.tsx`:

1. Add import:
```typescript
import { useUnidadesDestino } from '@/shared/hooks/useLookup';
```

2. Add state for selected unidade (near the existing form state):
```typescript
const [selectedUnidadeId, setSelectedUnidadeId] = useState('');
const [unidadeSearch, setUnidadeSearch] = useState('');
```

3. Add the hook:
```typescript
const { options: unidadesOptions } = useUnidadesDestino();
```

- [ ] **Step 2: Replace text inputs with select + autocomplete**

Replace the "Unidade de Destino" section in the drawer (the `FormField` elements for `nomeUnidade`, `cnes`, `cidade`, `uf`) with a single searchable select:

```tsx
{/* Section: Unidade de Destino */}
<h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Unidade de Destino</h3>
<FormField label="Unidade de Saúde" required>
  <select
    className="tfd-input"
    value={selectedUnidadeId}
    onChange={(e) => {
      const uid = e.target.value;
      setSelectedUnidadeId(uid);
      const found = unidadesOptions.find((u) => u.value === uid);
      if (found) {
        setNomeUnidade(found.nome);
        setCnes(found.cnes ?? '');
        setCidade(found.cidade ?? '');
        setUf(found.uf ?? '');
        setContatoUnidade(found.contato ?? found.telefone ?? '');
      } else {
        setNomeUnidade(''); setCnes(''); setCidade(''); setUf(''); setContatoUnidade('');
      }
    }}
  >
    <option value="">Selecione uma unidade...</option>
    {unidadesOptions.map((u) => (
      <option key={u.value} value={u.value}>{u.label}</option>
    ))}
  </select>
</FormField>
```

Keep the `cidade`/`uf` fields as read-only display below the select, showing the auto-populated values.

- [ ] **Step 3: Update save payload**

In the `handleSave` function, add `unidade_destino_id` to the payload:

```typescript
const payload = {
  solicitacao_id: solicitacaoId,
  unidade_executante: nomeUnidade,
  cnes: cnes || undefined,
  cidade_destino: cidade,
  uf_destino: uf,
  contato_unidade: (tipoContato && contatoUnidade) ? `${tipoContato}: ${contatoUnidade}` : contatoUnidade || undefined,
  tipo_atendimento: (tipoAtendimento as TipoAtendimento) || undefined,
  data_hora_agendamento: dataAgendamento ? new Date(dataAgendamento).toISOString() : new Date().toISOString(),
  unidade_destino_id: selectedUnidadeId || undefined,  // NEW
};
```

- [ ] **Step 4: Update edit handler to restore selectedUnidadeId**

In `handleEditAgendamento`, add restoration of the unidade select:

```typescript
// After existing field restorations:
setSelectedUnidadeId(ag.unidade_destino_id ?? '');
```

- [ ] **Step 5: Update reset to clear selectedUnidadeId**

In the reset function, add:
```typescript
setSelectedUnidadeId('');
```

- [ ] **Step 6: Commit**

```bash
git add src/app/atendimento-destino/page.tsx
git commit -m "feat: substituir campos texto livre por select de unidade de saude nos agendamentos"
```

---

## Notes

- **Existing data compatibility:** Old agendamentos without `unidade_destino_id` continue to display normally using the text fields (`unidade_executante`, `cnes`, etc.). Only new/edited agendamentos get the FK link.
- **Pareceres linkage:** The `medico_id` FK in pareceres is new. Existing pareceres won't have this link — the médico detail page will show empty history until the parecer creation flow is updated to select a registered médico. This is a separate future task.
- **MedicosPanel.tsx:** The file is NOT deleted in this plan — only its tab is removed from Configurações. It can be safely deleted in a future cleanup since it's no longer imported.
