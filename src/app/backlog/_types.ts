/**
 * Tipos da árvore do backlog renderizado em /backlog. Conteúdo fica inline
 * em `_data.ts` — esta página NÃO lê arquivos do disco. Toda atualização
 * de regra/banco/front no protótipo deve refletir em `_data.ts`.
 */

export interface UserStorySection {
  title: string;
  body: string;
}

export interface UserStory {
  id: string;
  title: string;
  story?: string;
  criterios: string[];
  regras: string[];
  dependencias: string[];
  sections: UserStorySection[];
}

export interface Feature {
  file: string;
  code: string;
  title: string;
  description?: string;
  meta: { key: string; value: string }[];
  userStories: UserStory[];
}

export interface Epic {
  folder: string;
  code: string;
  title: string;
  pendente: boolean;
  features: Feature[];
}

export interface BacklogTree {
  epics: Epic[];
  readme?: string;
  cronograma?: string;
  error?: string;
}
