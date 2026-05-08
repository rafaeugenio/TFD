'use client';

import {
  FilePlus2, FileHeart, Stethoscope, ClipboardCheck, PhoneCall,
  CalendarCheck, ShieldCheck, Plane, Wallet, Receipt, LogOut,
  CheckCircle2, XCircle, ArrowRight, Undo2,
} from 'lucide-react';
import { useState } from 'react';
import { fmtDataHora, tempoRelativo, type TipoEvento } from '../_utils/derivarLinhaDoTempo';

interface EventoLinhaTempoProps {
  tipo: TipoEvento;
  data: string;
  titulo: string;
  descricao?: string;
  autor?: string;
  observacao?: string;
  badge?: string;
  destaque?: boolean;       // último evento — bullet pulsante
  ultimo?: boolean;         // se é o último item, oculta linha
}

/**
 * Categorias neutras (substituem 13 cores anteriores):
 *  - estado:        cinza (criação, laudo, edição, observação)
 *  - decisao_pos:   verde discreto (parecer deferido, agendamento, segundo def)
 *  - decisao_neg:   vermelho discreto (parecer indeferido, encerramento)
 *  - tramitacao:    amber discreto (envio, devolução)
 *  - regulacao:     azul Citiesoft (carimbo, encaminhamento administrativo)
 */
type Categoria = 'estado' | 'decisao_pos' | 'decisao_neg' | 'tramitacao' | 'regulacao';

const CATEGORIA_COR: Record<Categoria, string> = {
  estado:      '#94A3B8',
  decisao_pos: '#16A34A',
  decisao_neg: '#DC2626',
  tramitacao:  '#D97706',
  regulacao:   '#146BFA',
};

interface VisualConfig {
  categoria: Categoria;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  rotulo: string;
}

const VISUAL: Record<TipoEvento, VisualConfig> = {
  criacao:                   { categoria: 'estado',      Icon: FilePlus2,    rotulo: 'Criação' },
  laudo:                     { categoria: 'estado',      Icon: FileHeart,    rotulo: 'Laudo' },
  parecer_deferido:          { categoria: 'decisao_pos', Icon: CheckCircle2, rotulo: 'Parecer · deferido' },
  parecer_indeferido:        { categoria: 'decisao_neg', Icon: XCircle,      rotulo: 'Parecer · indeferido' },
  carimbo:                   { categoria: 'regulacao',   Icon: ClipboardCheck, rotulo: 'Regulação' },
  tentativa:                 { categoria: 'estado',      Icon: PhoneCall,    rotulo: 'Tentativa' },
  agendamento:               { categoria: 'decisao_pos', Icon: CalendarCheck, rotulo: 'Agendamento' },
  segundo_deferimento:       { categoria: 'decisao_pos', Icon: ShieldCheck,  rotulo: '2º deferimento' },
  passagem:                  { categoria: 'estado',      Icon: Plane,        rotulo: 'Passagem' },
  ajuda:                     { categoria: 'estado',      Icon: Wallet,       rotulo: 'Ajuda de custo' },
  adicional:                 { categoria: 'estado',      Icon: Receipt,      rotulo: 'Adicional' },
  encaminhamento_financeiro: { categoria: 'tramitacao',  Icon: ArrowRight,   rotulo: 'Encaminhada ao Financeiro' },
  envio_regulacao:           { categoria: 'tramitacao',  Icon: ArrowRight,   rotulo: 'Enviada à Regulação' },
  envio_financeiro:          { categoria: 'tramitacao',  Icon: ArrowRight,   rotulo: 'Enviada ao Financeiro' },
  devolucao_regulacao:       { categoria: 'tramitacao',  Icon: Undo2,        rotulo: 'Devolvida do Financeiro' },
  devolucao_dados_basicos:   { categoria: 'tramitacao',  Icon: Undo2,        rotulo: 'Devolvida aos Dados Básicos' },
  encerramento:              { categoria: 'decisao_neg', Icon: LogOut,       rotulo: 'Encerramento' },
};

export default function EventoLinhaTempo({
  tipo, data, titulo, descricao, autor, observacao, badge, destaque, ultimo,
}: EventoLinhaTempoProps) {
  const v = VISUAL[tipo];
  const Icon = v.Icon;
  const cor = CATEGORIA_COR[v.categoria];
  const obsLonga = (observacao ?? '').length > 140;
  const [aberto, setAberto] = useState(false);
  const obsExibido = !aberto && obsLonga ? `${observacao!.slice(0, 140).trim()}…` : observacao;

  return (
    <li className="relative pl-12 pr-1" style={{ minHeight: 80 }}>
      {/* Linha conectora vertical */}
      {!ultimo && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 17,
            top: 30,
            bottom: -16,
            width: 1,
            background: '#E2E8F0',
          }}
        />
      )}

      {/* Bullet — neutro com ponto colorido pequeno dentro */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 6,
          top: 6,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: 'white',
          border: '1px solid #E2E8F0',
          color: cor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: destaque
            ? `0 0 0 3px white, 0 0 0 5px ${cor}33`
            : undefined,
          animation: destaque ? 'tfd-pulse 2.4s ease-in-out infinite' : undefined,
        }}
      >
        <Icon size={12} strokeWidth={2.2} color={cor} />
      </span>

      {/* Card neutro */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '14px 16px',
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {/* Cabeçalho: data + tipo */}
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span
            className="font-mono text-[12px]"
            style={{ color: '#64748B' }}
          >
            {fmtDataHora(data)}
          </span>
          <span style={{ color: '#E2E8F0' }}>·</span>
          <span className="text-[12px]" style={{ color: '#94A3B8' }}>{tempoRelativo(data)}</span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase"
            style={{
              color: '#64748B',
              letterSpacing: '0.06em',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: cor }} aria-hidden />
            {v.rotulo}
          </span>
        </div>

        {/* Título */}
        <p
          className="text-[15px] font-semibold leading-snug"
          style={{ color: '#1E293B' }}
        >
          {titulo}
        </p>

        {/* Descrição + badge */}
        {(descricao || badge) && (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {descricao && (
              <p className="text-[13.5px]" style={{ color: '#475569', lineHeight: 1.5 }}>
                {descricao}
              </p>
            )}
            {badge && (
              <span
                className="inline-flex items-center text-[11px] font-medium px-2 py-[2px]"
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                }}
              >
                {badge}
              </span>
            )}
          </div>
        )}

        {/* Observação */}
        {observacao && (
          <p
            className="text-[13px] mt-2.5 leading-relaxed"
            style={{
              color: '#334155',
              background: '#F8FAFC',
              padding: '10px 12px',
              borderLeft: `2px solid #CBD5E1`,
              borderRadius: '0 6px 6px 0',
            }}
          >
            {obsExibido}
            {obsLonga && (
              <button
                type="button"
                onClick={() => setAberto((a) => !a)}
                className="ml-1 text-[12px] font-medium"
                style={{ color: '#146BFA' }}
              >
                {aberto ? 'ver menos' : 'ver mais'}
              </button>
            )}
          </p>
        )}

        {/* Autor */}
        {autor && (
          <p className="text-[12px] mt-2" style={{ color: '#94A3B8' }}>
            por <span style={{ color: '#475569', fontWeight: 500 }}>{autor}</span>
          </p>
        )}
      </div>
    </li>
  );
}
