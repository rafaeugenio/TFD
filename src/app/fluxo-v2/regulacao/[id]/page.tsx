import { redirect } from 'next/navigation';

export default async function RegulacaoDetalheRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/fluxo-v2/solicitacoes/${id}?tab=regulacao`);
}
