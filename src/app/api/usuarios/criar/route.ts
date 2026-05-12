import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const PERFIS_VALIDOS = new Set([
  'ATENDENTE_MUNICIPAL',
  'ATENDENTE_REGIONAL',
  'COORDENACAO_ESTADUAL',
  'MEDICO_AUDITOR',
  'SETOR_REGULACAO',
  'SETOR_PASSAGENS',
  'FINANCEIRO',
  'ASSISTENTE_SOCIAL',
  'CONTROLE_INTERNO',
  'ADMINISTRADOR',
]);

function gerarSenhaAleatoria(): string {
  return randomBytes(24).toString('base64url');
}

export async function POST(req: NextRequest) {
  try {
    // 1) Autorização: caller precisa estar autenticado e ser admin.
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { data: callerRow } = await supabase
      .from('usuarios')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!callerRow?.is_admin) {
      return Response.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 });
    }

    // 2) Validação do body.
    const body = await req.json();
    const { nome, cpf, email, papelId, perfil } = body;

    if (!nome?.trim() || !cpf || !email?.trim()) {
      return Response.json({ error: 'Campos obrigatórios não preenchidos' }, { status: 400 });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return Response.json({ error: 'CPF inválido' }, { status: 400 });
    }

    const perfilFinal = (perfil && PERFIS_VALIDOS.has(perfil)) ? perfil : 'ATENDENTE_MUNICIPAL';

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

    // 3) CPF único.
    const { data: existingCpf } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('cpf', cpfLimpo)
      .maybeSingle();
    if (existingCpf) {
      return Response.json({ error: 'CPF já cadastrado no sistema' }, { status: 409 });
    }

    // 4) Cria conta no Auth com senha aleatória descartável; o link de
    //    redefinição que dispararemos a seguir obriga o usuário a definir
    //    a própria senha no primeiro acesso.
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

    // 5) Insere a linha em public.usuarios. Service-role contorna RLS,
    //    mas a policy mantém a regra de "admin-only INSERT" para clientes
    //    autenticados normais.
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: userId,
        nome_completo: nome.trim(),
        cpf: cpfLimpo,
        email: email.trim(),
        perfil: perfilFinal,
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

    // 6) Dispara email para o usuário definir a senha.
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
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro inesperado.' },
      { status: 500 },
    );
  }
}
