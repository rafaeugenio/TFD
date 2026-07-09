import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  ClipboardList,
  FileText,
  Settings2,
  Stethoscope,
  Wallet,
} from 'lucide-react';

/** Ícone de cada capítulo — alinhado aos ícones do menu do sistema. */
export const CHAPTER_ICONS: Record<string, LucideIcon> = {
  introducao: BookOpen,
  cadastros: ClipboardList,
  solicitacoes: FileText,
  regulacao: Stethoscope,
  financeiro: Wallet,
  gestao: Settings2,
};
