import BacklogClient from './_BacklogClient';
import { BACKLOG } from './_data';

/**
 * Backlog do TFD — conteúdo inline em `_data.ts` (igual ao /design-system).
 * Toda mudança no protótipo (regras, banco, front) deve refletir em
 * `_data.ts` para manter os devs sincronizados.
 */
export default function BacklogPage() {
  return <BacklogClient tree={BACKLOG} />;
}
