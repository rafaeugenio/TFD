import { loadBacklog } from './_lib/parser';
import BacklogClient from './_BacklogClient';

// Sempre relê os MDs do disco — não cacheia.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BacklogPage() {
  const tree = await loadBacklog();
  return <BacklogClient tree={tree} />;
}
