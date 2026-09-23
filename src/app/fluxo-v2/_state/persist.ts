/**
 * Helpers de persistência fire-and-forget para o FluxoV2Provider.
 * Toda mutação otimista deve ser seguida de um destes para gravar no Supabase
 * sem bloquear a UI. Erros são logados como warnings — não interrompem o fluxo.
 */

import { createClient } from '@/lib/supabase/client';

const sb = () => createClient();

/** Insere uma linha e retorna o id real do banco (ou null em caso de erro).
 *  Se o banco ainda não tem uma coluna do payload (migration pendente),
 *  insere de novo sem ela, para o registro não se perder. */
export async function persistInsert(
  table: string,
  payload: object,
  tentativas = 5,
): Promise<string | null> {
  const { data, error } = await sb()
    .from(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select('id')
    .single();
  if (error) {
    const coluna = /Could not find the '([^']+)' column/.exec(String(error.message))?.[1];
    if (coluna && coluna in payload && tentativas > 0) {
      console.warn(`[FluxoV2] ${table}.${coluna} não existe no banco (migration pendente); inserindo sem ela.`);
      const resto = { ...(payload as Record<string, unknown>) };
      delete resto[coluna];
      return persistInsert(table, resto, tentativas - 1);
    }
    console.warn(`[FluxoV2] insert ${table} falhou:`, error.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.id as string) ?? null;
}

/** Update por id (fire-and-forget). Se o banco ainda não tem uma coluna do
 *  patch (migration pendente), grava de novo sem ela, para não perder o
 *  resto da alteração. Ex.: `processos_sei` antes da migration 00081. */
export function persistUpdate(
  table: string,
  id: string,
  patch: object,
  tentativas = 3,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (sb().from(table) as any)
    .update(patch)
    .eq('id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(({ error }: { error: any }) => {
      if (!error) return;
      const coluna = /Could not find the '([^']+)' column/.exec(String(error.message))?.[1];
      if (coluna && coluna in patch && tentativas > 0) {
        console.warn(`[FluxoV2] ${table}.${coluna} não existe no banco (migration pendente); gravando o restante sem ela.`);
        const resto = { ...(patch as Record<string, unknown>) };
        delete resto[coluna];
        if (Object.keys(resto).length) persistUpdate(table, id, resto, tentativas - 1);
        return;
      }
      console.warn(`[FluxoV2] update ${table} falhou:`, error.message);
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
