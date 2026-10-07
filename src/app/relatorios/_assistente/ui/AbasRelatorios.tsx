'use client';

import Link from 'next/link';
import { FileBarChart2, Sparkles } from 'lucide-react';
import { C } from '../../_construtor/ui/estilo';

const ABAS = [
  { id: 'meus', rotulo: 'Meus relatórios', href: '/relatorios', icone: FileBarChart2 },
  { id: 'assistente', rotulo: 'Assistente', href: '/relatorios?aba=assistente', icone: Sparkles },
] as const;

/** Abas da área Relatórios: os relatórios salvos e o assistente por pergunta. */
export default function AbasRelatorios({ ativa }: { ativa: 'meus' | 'assistente' }) {
  return (
    <nav aria-label="Seções de Relatórios" className="flex gap-2 mb-5 overflow-x-auto" style={{ borderBottom: `1px solid ${C.borda}` }}>
      {ABAS.map((a) => {
        const atual = a.id === ativa;
        const Icone = a.icone;
        return (
          <Link
            key={a.id}
            href={a.href}
            aria-current={atual ? 'page' : undefined}
            className="inline-flex items-center gap-2 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{
              padding: '0.9rem 1rem 1rem', fontSize: 14, fontWeight: 700, outlineColor: C.azul,
              color: atual ? C.azul : C.texto, borderBottom: `2px solid ${atual ? C.azul : 'transparent'}`, marginBottom: -1,
            }}
          >
            <Icone size={16} style={{ color: atual ? C.azul : C.apoio }} />
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
