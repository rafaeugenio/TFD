/**
 * Helpers de persistência fire-and-forget para o FluxoV2Provider.
 * Toda mutação otimista deve ser seguida de um destes para gravar no Supabase
 * sem bloquear a UI. Erros são logados como warnings — não interrompem o fluxo.
 */

import { createClient } from '@/lib/supabase/client';

const sb = () => createClient();

/** Insere uma linha e retorna o id real do banco (ou null em caso de erro). */
export async function persistInsert(
  table: string,
  payload: object,
): Promise<string | null> {
  const { data, error } = await sb()
    .from(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select('id')
    .single();
  if (error) {
    console.warn(`[FluxoV2] insert ${table} falhou:`, error.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.id as string) ?? null;
}

/** Update por id (fire-and-forget). */
export function persistUpdate(
  table: string,
  id: string,
  patch: object,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (sb().from(table) as any)
    .update(patch)
    .eq('id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(({ error }: { error: any }) => {
      if (error) console.warn(`[FluxoV2] update ${table} falhou:`, error.message);
    });
}

/** Delete por id (fire-and-forget). */
export function persistDelete(table: string, id: string): void {
  sb()
    .from(table)
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn(`[FluxoV2] delete ${table} falhou:`, error.message);
    });
}

/** Retorna o id do usuário autenticado (ou null). */
export async function currentUserId(): Promise<string | null> {
  const { data } = await sb().auth.getUser();
  return data.user?.id ?? null;
}
