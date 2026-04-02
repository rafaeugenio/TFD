import { createClient } from '@/lib/supabase/client';
import type { TipoDocumento } from '@/lib/supabase/database.types';

const BUCKET = 'documentos-tfd';

function getSupabase() {
  return createClient();
}

/**
 * Uploads a file to Supabase Storage and inserts a record in the documentos table.
 * The bucket 'documentos-tfd' must be created via migration (00006_storage_documentos.sql).
 */
export async function uploadDocumento(
  solicitacaoId: string,
  file: File,
  tipo: TipoDocumento,
) {
  const supabase = getSupabase();

  // Generate a unique path: solicitacao_id/timestamp_filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${solicitacaoId}/${timestamp}_${safeName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Get the public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Insert document record (upload_por is nullable — no auth yet)
  return supabase.from('documentos').insert({
    solicitacao_id: solicitacaoId,
    tipo,
    nome_arquivo: file.name,
    url_arquivo: urlData.publicUrl,
    status: 'ENVIADO',
  } as any).select().single();
}

/**
 * Lists all documents for a given solicitação.
 */
export async function listarDocumentos(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('documentos')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false });
}

/**
 * Deletes a document from storage and the database.
 */
export async function excluirDocumento(id: string, urlArquivo: string) {
  const supabase = getSupabase();

  // Extract the storage path from the URL
  const bucketUrl = `${BUCKET}/`;
  const pathIndex = urlArquivo.indexOf(bucketUrl);
  if (pathIndex !== -1) {
    const storagePath = urlArquivo.slice(pathIndex + bucketUrl.length);
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  return supabase.from('documentos').delete().eq('id', id);
}
