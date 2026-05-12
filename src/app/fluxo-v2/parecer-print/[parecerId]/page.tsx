import { redirect } from 'next/navigation';

export default async function LegacyParecerPrintRedirect({
  params,
}: {
  params: Promise<{ parecerId: string }>;
}) {
  const { parecerId } = await params;
  redirect(`/parecer/${parecerId}`);
}
