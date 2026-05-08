'use client';

import { usePathname } from 'next/navigation';
import { FluxoV2Provider } from './_state/FluxoV2Provider';

export default function FluxoV2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrint = pathname.startsWith('/fluxo-v2/parecer-print');

  if (isPrint) {
    return <FluxoV2Provider>{children}</FluxoV2Provider>;
  }

  return (
    <FluxoV2Provider>
      <div>{children}</div>
    </FluxoV2Provider>
  );
}
