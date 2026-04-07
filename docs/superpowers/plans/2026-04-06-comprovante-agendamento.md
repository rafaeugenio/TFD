# Comprovante de Agendamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the comprovante upload flow so that agendamentos can only be confirmed with a proof document attached, and the document is viewable directly from the table.

**Architecture:** Use the existing `uploadDocumento()` service to upload files to Supabase Storage bucket `documentos-tfd`, then link the resulting `documentos.id` to `agendamentos.comprovante_doc_id`. The `listarAgendamentos` query joins the `documentos` table to expose the URL for inline viewing. The UI enforces: status=CONFIRMADO requires a comprovante.

**Tech Stack:** Next.js 16, React 19, Supabase (Storage + PostgreSQL), TypeScript 5

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/agendamentos.service.ts` | Modify | Add `documentos(url_arquivo, nome_arquivo)` join to `listarAgendamentos` query |
| `src/app/atendimento-destino/page.tsx` | Modify | Wire upload in submit, enforce status rule, make comprovante column clickable |

---

### Task 1: Add documentos join to listarAgendamentos query

**Files:**
- Modify: `src/services/agendamentos.service.ts:17-23`

- [ ] **Step 1: Update the select query to join documentos via comprovante_doc_id**

In `listarAgendamentos`, change the `.select()` string to also fetch the linked document's URL and filename:

```typescript
let query = supabase
  .from('agendamentos')
  .select(
    '*, solicitacoes(numero_processo, status, pacientes(nome_completo)), documentos:comprovante_doc_id(id, url_arquivo, nome_arquivo)',
    { count: 'exact' },
  )
  .order('data_hora_agendamento', { ascending: true });
```

This uses Supabase's foreign-key join syntax: `documentos:comprovante_doc_id(...)` joins the `documentos` table via the `comprovante_doc_id` FK and aliases it as `documentos`.

- [ ] **Step 2: Verify the app still compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds (the new join field is optional and existing code doesn't reference it yet).

- [ ] **Step 3: Commit**

```bash
git add src/services/agendamentos.service.ts
git commit -m "feat(agendamentos): join documentos table to expose comprovante URL"
```

---

### Task 2: Wire comprovante upload and status validation in the Drawer

**Files:**
- Modify: `src/app/atendimento-destino/page.tsx`

- [ ] **Step 1: Add the uploadDocumento import**

At the top of the file, add the import:

```typescript
import { uploadDocumento } from '@/services/documentos.service';
```

- [ ] **Step 2: Add state for existing comprovante info (edit mode)**

After the existing `comprovante` state (around line 131), add state to track an already-uploaded comprovante when editing:

```typescript
const [comprovanteExistente, setComprovanteExistente] = useState<{ url: string; nome: string } | null>(null);
```

Also add to `resetDrawerForm()`:

```typescript
setComprovanteExistente(null);
```

- [ ] **Step 3: Populate comprovanteExistente when opening for edit**

In `handleOpenEdit`, after setting other fields (around line 211), add:

```typescript
if (ag.documentos) {
  setComprovanteExistente({ url: ag.documentos.url_arquivo, nome: ag.documentos.nome_arquivo });
} else {
  setComprovanteExistente(null);
}
```

- [ ] **Step 4: Enforce status validation — CONFIRMADO requires comprovante**

In `handleSubmitAgendamento`, before building the payload (around line 283), add validation:

```typescript
if (statusAgendamento === 'CONFIRMADO' && !comprovante && !comprovanteExistente) {
  toast.error('Comprovante obrigatório', 'Anexe um comprovante para confirmar o agendamento.');
  return;
}
```

- [ ] **Step 5: Upload the file and link comprovante_doc_id in the payload**

Replace the `handleSubmitAgendamento` function body (from after validation to the end) with logic that uploads first, then saves:

```typescript
let comprovanteDocId: string | undefined = undefined;

// Upload new comprovante if provided
if (comprovante) {
  const uploadResult = await uploadDocumento(
    solicitacaoId,
    comprovante,
    'COMPROVANTE_AGENDAMENTO',
  );
  if (uploadResult.error) {
    toast.error('Erro no upload', (uploadResult.error as any).message ?? 'Falha ao enviar comprovante.');
    return;
  }
  comprovanteDocId = uploadResult.data?.id;
}

const payload = {
  solicitacao_id: solicitacaoId,
  unidade_executante: nomeUnidade,
  cnes: cnes || undefined,
  cidade_destino: cidade,
  uf_destino: uf,
  contato_unidade: (tipoContato && contatoUnidade) ? `${tipoContato}: ${contatoUnidade}` : contatoUnidade || undefined,
  tipo_atendimento: (tipoAtendimento as TipoAtendimento) || undefined,
  data_hora_agendamento: dataAgendamento ? new Date(dataAgendamento).toISOString() : new Date().toISOString(),
  origem_agendamento: (origemAgendamento as OrigemAgendamento) || undefined,
  numero_cnrac: numCnrac || undefined,
  status: statusAgendamento as StatusAgendamento,
  ...(comprovanteDocId && { comprovante_doc_id: comprovanteDocId }),
};
```

The rest of the try/catch block (calling `criarAgendamento` or `atualizarAgendamento`) stays the same.

- [ ] **Step 6: Update the Drawer UI — status select enforces the rule visually**

Replace the status `<select>` section (around lines 864-873) with:

```tsx
<FormField label="Status do agendamento">
  <select
    className="tfd-input"
    value={statusAgendamento}
    onChange={(e) => setStatusAgendamento(e.target.value)}
  >
    <option value="AGUARDANDO_CONFIRMACAO">Aguardando Confirmacao</option>
    <option value="CONFIRMADO">Confirmado</option>
  </select>
  {statusAgendamento === 'CONFIRMADO' && !comprovante && !comprovanteExistente && (
    <p className="text-xs mt-1" style={{ color: 'var(--tfd-status-danger)' }}>
      Anexe um comprovante para confirmar o agendamento.
    </p>
  )}
</FormField>
```

- [ ] **Step 7: Update the comprovante upload section to show existing file**

Replace the comprovante upload `<FormField>` (around lines 879-896) with:

```tsx
<FormField label="Comprovante">
  {comprovanteExistente && !comprovante ? (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
      <CheckCircle2 size={16} style={{ color: 'var(--tfd-status-success)' }} />
      <a
        href={comprovanteExistente.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium truncate hover:underline"
        style={{ color: 'var(--tfd-primary-500)' }}
      >
        {comprovanteExistente.nome}
      </a>
      <button
        type="button"
        className="ml-auto text-xs"
        style={{ color: 'var(--tfd-text-muted)' }}
        onClick={() => setComprovanteExistente(null)}
      >
        Substituir
      </button>
    </div>
  ) : (
    <input
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      className="tfd-input pt-1.5"
      onChange={(e) => setComprovante(e.target.files?.[0] ?? null)}
    />
  )}
</FormField>
```

- [ ] **Step 8: Verify build compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/app/atendimento-destino/page.tsx
git commit -m "feat(agendamentos): wire comprovante upload, enforce CONFIRMADO requires proof"
```

---

### Task 3: Make the comprovante column clickable in the table

**Files:**
- Modify: `src/app/atendimento-destino/page.tsx`

- [ ] **Step 1: Add ExternalLink icon import**

Add `ExternalLink` to the lucide-react imports at the top of the file:

```typescript
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Info,
  CalendarClock,
  FileCheck,
  Trash2,
  SendHorizonal,
  ExternalLink,
} from 'lucide-react';
```

- [ ] **Step 2: Replace the comprovante column cell**

Replace the comprovante `<td>` block (around lines 601-609) with:

```tsx
<td className="text-center">
  {row._type === 'DISPONIVEL' ? (
    <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
  ) : ag?.documentos ? (
    <a
      href={ag.documentos.url_arquivo}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
      style={{ color: 'var(--tfd-primary-500)', pointerEvents: 'auto' }}
      title={ag.documentos.nome_arquivo}
      onClick={(e) => e.stopPropagation()}
    >
      <CheckCircle2 size={15} style={{ color: 'var(--tfd-status-success)' }} />
      Ver
      <ExternalLink size={12} />
    </a>
  ) : (
    <span title="Aguardando comprovante">
      <Clock size={18} style={{ color: 'var(--tfd-status-warning)' }} />
    </span>
  )}
</td>
```

This replaces the old `temComprovante` boolean check with the actual `documentos` join data. The `temComprovante` variable (line ~508) can be removed.

- [ ] **Step 3: Remove the unused temComprovante variable**

Delete this line (around line 508):

```typescript
const temComprovante = ag?.comprovante_doc_id != null;
```

- [ ] **Step 4: Verify build compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/atendimento-destino/page.tsx
git commit -m "feat(agendamentos): make comprovante column clickable with doc link"
```
