# Viagens — Rota Pré-Definida e Companhia Inline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os 4 campos livres de origem/destino no cadastro de viagens por um select de rota pré-definida (`rotas_deslocamento`), exibir visualmente a rota selecionada, e trocar o select simples de companhia por um componente com criação inline.

**Architecture:** Novo componente `RotaPreDefinidaSelect` (reescreve `RotaSelect.tsx`) carrega rotas da tabela auxiliar via hook; novo componente `CompanhiaSelect` segue o padrão `LookupSelect` (select + botão "+ Nova" com formulário inline). `viagens/page.tsx` troca 8 estados de UF/cidade por 2 estados `RotaDeslocamento | null` e usa os novos componentes.

**Tech Stack:** Next.js App Router, React hooks, Supabase client, TFD design tokens, TypeScript

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/shared/hooks/useLookup.ts` | Modificar | Adicionar `useRotas()` e tornar `useCompanhias()` refreshável |
| `src/shared/components/rota-select/RotaSelect.tsx` | Reescrever | Select de rotas pré-definidas + badge visual |
| `src/shared/components/companhia-select/CompanhiaSelect.tsx` | Criar | Select de companhia com criação inline (nome + tipo_modal) |
| `src/app/viagens/page.tsx` | Modificar | Trocar estados/UI, adaptar payload e validação |

---

## Task 1: Hook `useRotas` + `useCompanhias` refreshável

**Files:**
- Modify: `src/shared/hooks/useLookup.ts`

- [ ] **Step 1: Adicionar `useRotas` e expor `refresh` no `useCompanhias`**

Substituir a função `useCompanhias` e adicionar `useRotas` no final do arquivo `src/shared/hooks/useLookup.ts`:

```typescript
export function useCompanhias() {
  const [options, setOptions] = useState<(CompanhiaTransporte & { label: string; value: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    listarCompanhias().then(({ data, error }) => {
      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as CompanhiaTransporte[];
        setOptions(
          rows.map((c) => ({
            ...c,
            value: c.id,
            label: `${c.nome} (${c.tipo_modal})`,
          })),
        );
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return { options, loading, refresh: load };
}

export function useRotas() {
  const [rotas, setRotas] = useState<RotaDeslocamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from('rotas_deslocamento')
      .select('*')
      .eq('ativo', true)
      .order('cidade_origem', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setRotas([]);
        } else {
          setRotas(data as unknown as RotaDeslocamento[]);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { rotas, loading };
}
```

Adicionar os imports necessários no topo do arquivo (já existem `useState`, `useEffect`; adicionar `useCallback` se ainda não importado, e importar `RotaDeslocamento`):

```typescript
import { useState, useEffect, useCallback } from 'react';
import { listarPorCategoria, listarUnidadesDestino, listarCompanhias } from '@/services/tabelas-auxiliares.service';
import type { TabelaAuxiliar, UnidadeDestino, CompanhiaTransporte } from '@/services/tabelas-auxiliares.service';
import type { RotaDeslocamento } from '@/core/models/rota-deslocamento.model';
import { createClient } from '@/lib/supabase/client';
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/hooks/useLookup.ts
git commit -m "feat: add useRotas hook and make useCompanhias refreshable"
```

---

## Task 2: Reescrever `RotaSelect.tsx` — select de rota pré-definida

**Files:**
- Rewrite: `src/shared/components/rota-select/RotaSelect.tsx`

- [ ] **Step 1: Reescrever o componente**

Conteúdo completo de `src/shared/components/rota-select/RotaSelect.tsx`:

```typescript
'use client';

import { ArrowRight } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import { useRotas } from '@/shared/hooks/useLookup';
import type { RotaDeslocamento } from '@/core/models/rota-deslocamento.model';

interface RotaSelectProps {
  value: number | null;
  onChange: (rota: RotaDeslocamento | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function RotaSelect({
  value,
  onChange,
  label = 'Rota de deslocamento',
  required = false,
  disabled = false,
}: RotaSelectProps) {
  const { rotas, loading } = useRotas();

  const selected = rotas.find((r) => r.id === value) ?? null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    if (!id) { onChange(null); return; }
    const rota = rotas.find((r) => r.id === id) ?? null;
    onChange(rota);
  }

  return (
    <FormField label={label} required={required}>
      <select
        className="tfd-input"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Carregando rotas...' : 'Selecione a rota...'}</option>
        {rotas.map((r) => (
          <option key={r.id} value={r.id}>
            {r.cidade_origem}/{r.uf_origem} → {r.cidade_destino}/{r.uf_destino}
          </option>
        ))}
      </select>

      {selected && (
        <div
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--tfd-primary-50)',
            border: '1px solid var(--tfd-primary-200)',
            color: 'var(--tfd-primary-700)',
          }}
        >
          <span>{selected.cidade_origem} - {selected.uf_origem}</span>
          <ArrowRight size={14} style={{ color: 'var(--tfd-primary-400)', flexShrink: 0 }} />
          <span>{selected.cidade_destino} - {selected.uf_destino}</span>
        </div>
      )}
    </FormField>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/rota-select/RotaSelect.tsx
git commit -m "feat: rewrite RotaSelect as predefined route select with visual badge"
```

---

## Task 3: Criar `CompanhiaSelect.tsx` — select com criação inline

**Files:**
- Create: `src/shared/components/companhia-select/CompanhiaSelect.tsx`

- [ ] **Step 1: Criar o componente**

Criar o arquivo `src/shared/components/companhia-select/CompanhiaSelect.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import { criarCompanhia } from '@/services/tabelas-auxiliares.service';
import { useCompanhias } from '@/shared/hooks/useLookup';
import type { ModalTransporte } from '@/lib/supabase/database.types';

interface CompanhiaSelectProps {
  value: string;
  onChange: (nome: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CompanhiaSelect({
  value,
  onChange,
  label = 'Companhia',
  required = false,
  disabled = false,
}: CompanhiaSelectProps) {
  const { options, loading, refresh } = useCompanhias();
  const [adding, setAdding] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newModal, setNewModal] = useState<ModalTransporte>('AEREO');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const nome = newNome.trim();
    if (!nome) return;

    setSaving(true);
    try {
      const { data, error } = await criarCompanhia({
        nome,
        tipo_modal: newModal,
        cnpj: null,
        contato: null,
        ativo: true,
      });

      if (error || !data) return;

      await refresh();
      onChange((data as { nome: string }).nome);
      setAdding(false);
      setNewNome('');
      setNewModal('AEREO');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setAdding(false);
    setNewNome('');
    setNewModal('AEREO');
  }

  return (
    <FormField label={label} required={required}>
      <div className="flex gap-1.5">
        <select
          className="tfd-input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="">{loading ? 'Carregando...' : 'Selecione...'}</option>
          {options.map((o) => (
            <option key={o.id} value={o.nome}>
              {o.nome} ({o.tipo_modal})
            </option>
          ))}
        </select>

        {!disabled && (
          <button
            type="button"
            className="tfd-btn tfd-btn-secondary tfd-btn--icon-only shrink-0"
            title="Nova companhia"
            onClick={() => setAdding(true)}
            style={{ minWidth: '36px', height: '36px' }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {adding && (
        <div
          className="mt-2 p-3 rounded-lg space-y-2"
          style={{
            backgroundColor: 'var(--tfd-surface-secondary)',
            border: '1px solid var(--tfd-surface-border)',
          }}
        >
          <label className="tfd-label text-xs block" style={{ color: 'var(--tfd-text-secondary)' }}>
            Nova companhia
          </label>
          <input
            type="text"
            className="tfd-input tfd-input--sm"
            placeholder="Nome da companhia..."
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') handleCancel();
            }}
            autoFocus
            disabled={saving}
          />
          <div className="flex gap-1.5 items-center">
            <select
              className="tfd-input tfd-input--sm flex-1"
              value={newModal}
              onChange={(e) => setNewModal(e.target.value as ModalTransporte)}
              disabled={saving}
            >
              <option value="AEREO">Aéreo</option>
              <option value="TERRESTRE">Terrestre</option>
              <option value="FLUVIAL">Fluvial</option>
            </select>
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--icon-only tfd-btn--sm shrink-0"
              onClick={handleAdd}
              disabled={saving || !newNome.trim()}
              title="Salvar"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--icon-only tfd-btn--sm shrink-0"
              onClick={handleCancel}
              disabled={saving}
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </FormField>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/companhia-select/CompanhiaSelect.tsx
git commit -m "feat: add CompanhiaSelect with inline create (nome + tipo_modal)"
```

---

## Task 4: Atualizar `viagens/page.tsx`

**Files:**
- Modify: `src/app/viagens/page.tsx`

Esta é a task principal que conecta tudo. Fazer as mudanças em ordem:

### 4.1 — Imports

- [ ] **Step 1: Atualizar imports no topo do arquivo**

Remover:
```typescript
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useCompanhias } from '@/shared/hooks/useLookup';
```

Descomentar e ajustar o bloco TODO AGENTE-4 (linhas 59-64), substituindo por:
```typescript
import RotaSelect from '@/shared/components/rota-select/RotaSelect';
import CompanhiaSelect from '@/shared/components/companhia-select/CompanhiaSelect';
```

Remover também o import de `type { RotaDeslocamento }` se não existir, e adicionar:
```typescript
import type { RotaDeslocamento } from '@/core/models/rota-deslocamento.model';
```

### 4.2 — Estados do formulário

- [ ] **Step 2: Substituir os 8 estados UF/cidade por 2 estados de rota**

Remover estas linhas (aproximadamente linhas 172-175 e 185-188):
```typescript
const [idaOrigemUf, setIdaOrigemUf] = useState('MA');
const [idaOrigem, setIdaOrigem] = useState('');
const [idaDestinoUf, setIdaDestinoUf] = useState('');
const [idaDestino, setIdaDestino] = useState('');
// ...
const [voltaOrigemUf, setVoltaOrigemUf] = useState('');
const [voltaOrigem, setVoltaOrigem] = useState('');
const [voltaDestinoUf, setVoltaDestinoUf] = useState('MA');
const [voltaDestino, setVoltaDestino] = useState('');
```

Adicionar no lugar (dentro do bloco `/* ---- Form state: IDA ---- */`):
```typescript
const [idaRota, setIdaRota] = useState<RotaDeslocamento | null>(null);
```

E no bloco `/* ---- Form state: VOLTA ---- */`:
```typescript
const [voltaRota, setVoltaRota] = useState<RotaDeslocamento | null>(null);
```

Remover também a linha do lookup hook que não é mais necessária:
```typescript
const { options: companhias, loading: loadingComp } = useCompanhias();
```

### 4.3 — `resetForm`

- [ ] **Step 3: Atualizar `resetForm`**

Remover as referências aos estados antigos e adicionar os novos:

```typescript
function resetForm() {
  setSolicitacaoId(''); setNumProcesso(''); setPacienteNome('');
  setIdaRota(null); setIdaDataEmbarque(''); setIdaModalTransporte('');
  setIdaCompanhia(''); setIdaLocalizador(''); setIdaValor(''); setIdaMedif(false); setIdaObservacoes('');
  setVoltaRota(null); setVoltaDataEmbarque(''); setVoltaModalTransporte('');
  setVoltaCompanhia(''); setVoltaLocalizador(''); setVoltaValor(''); setVoltaMedif(false); setVoltaObservacoes('');
  setIdaPendingFile(null);
  setVoltaPendingFile(null);
  setEditingId(null);
  setViewViagem(null);
  setDrawerTab('ida');
  setInlineConfirm(null);
  setCancelMotivo('');
  setRemarcarOpen(false);
  setRemarcarNovaData('');
  setRemarcarMotivo('');
}
```

### 4.4 — Validação e payload em `handleSubmitIdaVolta`

- [ ] **Step 4: Atualizar validação**

Substituir o bloco de validação (linhas ~314-324):

```typescript
if (!idaRota || !idaDataEmbarque) {
  toast.warning('Dados incompletos', 'Selecione a rota e a data de embarque da IDA.');
  setDrawerTab('ida');
  return;
}

if (!voltaRota || !voltaDataEmbarque) {
  toast.warning('Dados incompletos', 'Selecione a rota e a data de embarque da VOLTA.');
  setDrawerTab('volta');
  return;
}
```

- [ ] **Step 5: Atualizar montagem do payload no bloco `editingId`**

Substituir as referências a `idaOrigem`, `idaOrigemUf`, `idaDestino`, `idaDestinoUf` (e seus equivalentes para volta) pelos campos da rota selecionada:

```typescript
// Payload IDA (dentro do if editingId, currentTab === 'ida'):
{
  solicitacao_id: solicitacaoId,
  tipo: 'IDA' as const,
  modal: (idaModalTransporte as any) || 'AEREO',
  origem_cidade: idaRota!.cidade_origem,
  origem_uf: idaRota!.uf_origem,
  destino_cidade: idaRota!.cidade_destino,
  destino_uf: idaRota!.uf_destino,
  com_pernoite: false,
  data_embarque_prevista: idaDataEmbarque,
  medif_necessario: idaMedif,
  valor: idaValor ? parseCurrency(idaValor) : undefined,
  companhia: idaCompanhia || undefined,
  numero_bilhete: idaLocalizador || undefined,
  observacoes: idaObservacoes || undefined,
}

// Payload VOLTA (dentro do if editingId, currentTab !== 'ida'):
{
  solicitacao_id: solicitacaoId,
  tipo: 'RETORNO' as const,
  modal: (voltaModalTransporte as any) || 'AEREO',
  origem_cidade: voltaRota!.cidade_origem,
  origem_uf: voltaRota!.uf_origem,
  destino_cidade: voltaRota!.cidade_destino,
  destino_uf: voltaRota!.uf_destino,
  com_pernoite: false,
  data_embarque_prevista: voltaDataEmbarque,
  medif_necessario: voltaMedif,
  valor: voltaValor ? parseCurrency(voltaValor) : undefined,
  companhia: voltaCompanhia || undefined,
  numero_bilhete: voltaLocalizador || undefined,
  observacoes: voltaObservacoes || undefined,
}
```

Fazer o mesmo para `idaPayload` e `voltaPayload` no bloco de criação (não-editingId).

### 4.5 — `autoFillVolta`

- [ ] **Step 6: Atualizar `autoFillVolta`**

Substituir o corpo da função por versão compatível com rotas:

```typescript
function autoFillVolta() {
  if (!voltaModalTransporte && idaModalTransporte) setVoltaModalTransporte(idaModalTransporte);
}
```

(A rota de volta é independente — o usuário a seleciona manualmente. Só propaga o modal de transporte.)

### 4.6 — `renderTravelFields`

- [ ] **Step 7: Atualizar assinatura e corpo de `renderTravelFields`**

Nova assinatura (remover os 8 parâmetros de UF/cidade, adicionar `rota`/`setRota`):

```typescript
function renderTravelFields(
  prefix: 'ida' | 'volta',
  rota: RotaDeslocamento | null,
  setRota: (r: RotaDeslocamento | null) => void,
  dataEmbarque: string, setDataEmbarque: (v: string) => void,
  modal: string, setModal: (v: string) => void,
  comp: string, setComp: (v: string) => void,
  loc: string, setLoc: (v: string) => void,
  valor: string, setValor: (v: string) => void,
  medif: boolean, setMedif: (v: boolean) => void,
  obs: string, setObs: (v: string) => void,
  pendingFile: File | null, setPendingFile: (f: File | null) => void,
) {
  return (
    <>
      <RotaSelect
        value={rota?.id ?? null}
        onChange={setRota}
        label="Rota de deslocamento"
        required
      />

      <FormField label="Data de embarque" required>
        <input type="date" className="tfd-input" value={dataEmbarque} onChange={(e) => setDataEmbarque(e.target.value)} />
      </FormField>

      <LookupSelect
        categoria="modal_transporte"
        label="Modal de transporte"
        value={modal}
        onChange={setModal}
      />

      <CompanhiaSelect
        value={comp}
        onChange={setComp}
      />

      <FormField label="Localizador / Bilhete">
        <input type="text" className="tfd-input" placeholder="Código do bilhete" value={loc} onChange={(e) => setLoc(e.target.value)} />
      </FormField>

      <FormField label="Valor da passagem">
        <input type="text" className="tfd-input" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(maskCurrency(e.target.value))} />
      </FormField>

      <div className="mb-4 flex items-center gap-2">
        <input type="checkbox" id={`${prefix}Medif`} checked={medif} onChange={(e) => setMedif(e.target.checked)} style={{ accentColor: 'var(--tfd-primary-500)' }} />
        <label htmlFor={`${prefix}Medif`} className="tfd-label" style={{ marginBottom: 0 }}>MEDIF necessário</label>
      </div>

      <FormField label="Observações">
        <textarea className="tfd-input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
      </FormField>

      {/* Seção de documento — manter exatamente como estava */}
      <hr className="tfd-divider" />
      {/* ... bloco de upload de arquivo (linhas 621-649 do original) — copiar sem alteração ... */}
    </>
  );
}
```

- [ ] **Step 8: Atualizar as chamadas de `renderTravelFields`**

Localizar os dois locais onde `renderTravelFields` é chamado (aba IDA e aba VOLTA) e atualizar os argumentos:

```typescript
// Aba IDA:
{renderTravelFields(
  'ida',
  idaRota, setIdaRota,
  idaDataEmbarque, setIdaDataEmbarque,
  idaModalTransporte, setIdaModalTransporte,
  idaCompanhia, setIdaCompanhia,
  idaLocalizador, setIdaLocalizador,
  idaValor, setIdaValor,
  idaMedif, setIdaMedif,
  idaObservacoes, setIdaObservacoes,
  idaPendingFile, setIdaPendingFile,
)}

// Aba VOLTA:
{renderTravelFields(
  'volta',
  voltaRota, setVoltaRota,
  voltaDataEmbarque, setVoltaDataEmbarque,
  voltaModalTransporte, setVoltaModalTransporte,
  voltaCompanhia, setVoltaCompanhia,
  voltaLocalizador, setVoltaLocalizador,
  voltaValor, setVoltaValor,
  voltaMedif, setVoltaMedif,
  voltaObservacoes, setVoltaObservacoes,
  voltaPendingFile, setVoltaPendingFile,
)}
```

- [ ] **Step 9: Verificar compilação sem erros TypeScript**

```bash
cd /Users/rafaeleugenio/Documents/Cursor/Repositórios/TFD
npx tsc --noEmit 2>&1 | head -40
```

Esperado: 0 erros relacionados às mudanças feitas. Se houver erros residuais de UF/cidade não substituídos, localizá-los e corrigir.

- [ ] **Step 10: Commit final**

```bash
git add src/app/viagens/page.tsx
git commit -m "feat: replace origin/destination fields with predefined RotaSelect and CompanhiaSelect in viagens form"
```
