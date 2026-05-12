import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { getAppBaseUrl } from '@/lib/url';

function gerarSenhaAleatoria(): string {
  return randomBytes(16).toString('base64url');
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'ID do usuário ausente' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return Response.json({ error: 'Configuração de servidor incompleta (SUPABASE_SERVICE_ROLE_KEY ausente)' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: usuario, error: userErr } = await supabaseAdmin
      .from('usuarios')
      .select('id, email')
      .eq('id', id)
      .maybeSingle();

    if (userErr || !usuario) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const novaSenha = gerarSenhaAleatoria();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: novaSenha,
    });

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    const { error: flagError } = await supabaseAdmin
      .from('usuarios')
      .update({ primeiro_acesso: true } as never)
      .eq('id', id);

    if (flagError) {
      return Response.json({ error: flagError.message }, { status: 500 });
    }

    const appUrl = await getAppBaseUrl();
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(usuario.email, {
      redirectTo: `${appUrl}/redefinir-senha`,
    });

    return Response.json({
      success: true,
      emailEnviado: !resetError,
      emailError: resetError?.message,
    });
  } catch {
    return Response.json({ error: 'Erro inesperado. Tente novamente.' }, { status: 500 });
  }
}
