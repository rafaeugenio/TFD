import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';

function gerarSenhaAleatoria(): string {
  // 16 bytes base64url ≈ 22 chars, garante alfanumérico + símbolos do alphabet
  return randomBytes(16).toString('base64url');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, cpf, email, papelId } = body;

    if (!nome?.trim() || !cpf || !email?.trim()) {
      return Response.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return Response.json({ error: 'CPF inválido' }, { status: 400 });
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

    const { data: existingCpf } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('cpf', cpfLimpo)
      .maybeSingle();

    if (existingCpf) {
      return Response.json({ error: 'CPF já cadastrado no sistema' }, { status: 409 });
    }

    const senhaTemporaria = gerarSenhaAleatoria();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome_completo: nome.trim() },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes('already') || msg.includes('email')) {
        return Response.json({ error: 'E-mail já está em uso' }, { status: 409 });
      }
      return Response.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: userId,
        nome_completo: nome.trim(),
        cpf: cpfLimpo,
        email: email.trim(),
        senha_hash: 'managed_by_supabase_auth',
        perfil: 'ATENDENTE_MUNICIPAL',
        ativo: true,
        primeiro_acesso: true,
        papel_id: papelId || null,
      } as never);

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      if (dbError.message.includes('cpf')) {
        return Response.json({ error: 'CPF já cadastrado no sistema' }, { status: 409 });
      }
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    // Dispara email de recovery para o usuário definir a própria senha no primeiro acesso.
    // Best-effort: se SMTP não estiver configurado no Supabase, o admin precisa configurar.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${appUrl}/redefinir-senha`,
    });

    return Response.json({
      success: true,
      id: userId,
      emailEnviado: !resetError,
      emailError: resetError?.message,
    });
  } catch {
    return Response.json({ error: 'Erro inesperado. Tente novamente.' }, { status: 500 });
  }
}
