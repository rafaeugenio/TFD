import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Hard delete de usuário.
 * Apenas admins (is_admin = true) podem executar. Remove a linha de
 * public.usuarios e a conta correspondente em auth.users via service role.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'ID do usuário ausente' }, { status: 400 });
    }

    // 1) Autorização: caller precisa estar autenticado e ser admin.
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (user.id === id) {
      return Response.json({ error: 'Você não pode excluir a própria conta.' }, { status: 400 });
    }

    const { data: callerRow } = await supabase
      .from('usuarios')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!callerRow?.is_admin) {
      return Response.json({ error: 'Apenas administradores podem excluir usuários.' }, { status: 403 });
    }

    // 2) Service role para contornar RLS e remover do Auth.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json(
        { error: 'Configuração de servidor incompleta (SUPABASE_SERVICE_ROLE_KEY ausente)' },
        { status: 500 },
      );
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 3) Remove a linha de public.usuarios.
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', id);
    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    // 4) Remove a conta em auth.users. Se não existir mais (ex: já removida
    //    manualmente), considerar sucesso.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError && !/not.?found|user_not_found/i.test(authError.message)) {
      return Response.json(
        { error: `Usuário removido do sistema mas o Auth falhou: ${authError.message}` },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro inesperado.' },
      { status: 500 },
    );
  }
}
