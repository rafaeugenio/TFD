import { redirect } from 'next/navigation';

export default async function FinanceiroDetalheRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/fluxo-v2/solicitacoes/${id}?tab=financeiro`);
}
