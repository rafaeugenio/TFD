import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, cpf, email, senha, papelId } = body;

    if (!nome?.trim() || !cpf || !email?.trim() || !senha) {
      return Response.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return Response.json({ error: 'CPF inválido' }, { status: 400 });
    }

    if (senha.length < 6) {
      return Response.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
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

    // Verificar CPF único antes de criar o auth user
    const { data: existingCpf } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('cpf', cpfLimpo)
      .maybeSingle();

    if (existingCpf) {
      return Response.json({ error: 'CPF já cadastrado no sistema' }, { status: 409 });
    }

    // Criar usuário no Supabase Auth (sem afetar a sessão do admin)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: senha,
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

    // Criar registro na tabela usuarios
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
      } as any);

    if (dbError) {
      // Rollback: remover o auth user criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      if (dbError.message.includes('cpf')) {
        return Response.json({ error: 'CPF já cadastrado no sistema' }, { status: 409 });
      }
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    return Response.json({ success: true, id: userId });
  } catch {
    return Response.json({ error: 'Erro inesperado. Tente novamente.' }, { status: 500 });
  }
}
