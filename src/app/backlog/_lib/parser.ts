/**
 * Parser dos arquivos .md do backlog (vault Obsidian) → árvore de
 * Épicos → Features → User Stories.
 *
 * Roda no servidor (chamado pelo Server Component da `/backlog/page.tsx`)
 * e relê os MDs a cada requisição (página com `revalidate = 0`), então
 * sempre que o conteúdo da pasta mudar, o backlog renderizado reflete
 * automaticamente — sem precisar buildar/recompilar.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const DEFAULT_VAULT_PATH = path.join(
  os.homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Documents',
  'Cursor',
  'Obsidian Vault',
  'Projetos',
  'Citiesoft',
  'SES',
  'TFD',
  'Backlog',
);

/** Caminho da pasta-raiz do backlog. Pode ser sobrescrito por env. */
export const BACKLOG_ROOT = process.env.TFD_BACKLOG_ROOT ?? DEFAULT_VAULT_PATH;

export interface UserStorySection {
  /** Nome da seção como aparece no MD (ex.: "Componentes do protótipo"). */
  title: string;
  /** Conteúdo bruto da seção (pode conter listas, tabelas, parágrafos). */
  body: string;
}

export interface UserStory {
  /** Ex: "US-PAC-01" */
  id: string;
  /** Ex: "Listar pacientes" */
  title: string;
  /** Texto da user story (parágrafo "Como ... quero ... para que ..."). */
  story?: string;
  /** Linhas dos critérios de aceite (atalho mantido por compat). */
  criterios: string[];
  /** Linhas das regras de negócio (atalho). */
  regras: string[];
  /** Linhas de dependências (atalho). */
  dependencias: string[];
  /** Todas as seções da US em ordem (inclui as 3 acima + qualquer outra). */
  sections: UserStorySection[];
}

export interface Feature {
  /** Nome do arquivo sem extensão. Ex: "F01-Pacientes" */
  file: string;
  /** Ex: "F01" */
  code: string;
  /** Ex: "Pacientes" */
  title: string;
  /** Descrição do topo do MD (primeiro blockquote). */
  description?: string;
  /** Pares "Chave: valor" extraídos do topo (Tela, Drawer, Status). */
  meta: { key: string; value: string }[];
  userStories: UserStory[];
}

export interface Epic {
  /** Nome da pasta. Ex: "EPIC-01-Cadastros-Fundamentais" */
  folder: string;
  /** Ex: "EPIC-01" */
  code: string;
  /** Ex: "Cadastros Fundamentais" */
  title: string;
  /** True quando a pasta contém "-PENDENTE" no nome. */
  pendente: boolean;
  features: Feature[];
}

export interface BacklogTree {
  epics: Epic[];
  /** README.md da raiz (Markdown bruto, para a aba "Visão geral"). */
  readme?: string;
  /** Cronograma de sprints. */
  cronograma?: string;
  /** Erro de leitura, se houver — exibido na UI em vez de uma tela em branco. */
  error?: string;
}

/* ───────────────────────────────────────────────────────
   Parser de um único arquivo de feature
   ─────────────────────────────────────────────────────── */

function parseFeatureFile(fileName: string, raw: string): Feature {
  // Tira o front-matter YAML do topo, se houver.
  let body = raw.replace(/^---[\s\S]*?---\s*/m, '').trim();

  // Título do MD = primeiro `# ...`
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const fullTitle = titleMatch?.[1]?.trim() ?? fileName;
  // Padrão "F01 — Pacientes" → code "F01", title "Pacientes"
  const m = fullTitle.match(/^(F\d+)\s*[—-]\s*(.+)$/);
  const code = m?.[1] ?? fileName.split('-')[0];
  const title = (m?.[2] ?? fullTitle).trim();

  // Descrição = primeiro blockquote depois do título
  const descMatch = body.match(/^>\s*(.+(?:\n>.*)*)$/m);
  const description = descMatch?.[1]
    ?.split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join(' ')
    .trim();

  // Meta do topo (Tela: ... / Drawer: ... / Status: ...)
  const meta: { key: string; value: string }[] = [];
  const headBlock = body.split(/^##\s/m)[0];
  const metaMatches = headBlock.matchAll(/^\*\*([^*]+)\*\*\s*([^\n]+)$/gm);
  for (const mm of metaMatches) {
    const key = mm[1].replace(/[:：]$/, '').trim();
    const value = mm[2].trim();
    if (key && value) meta.push({ key, value });
  }

  // Quebra em blocos por `## ` — primeiro é o head, depois cada US e o
  // possível "Índice".
  body = body.replace(/^#\s+.+$/m, '').trim();
  const blocks = body.split(/^##\s+/m).slice(1);

  const userStories: UserStory[] = [];
  for (const block of blocks) {
    const firstLine = block.split('\n', 1)[0].trim();
    // Ignora bloco "Índice"
    if (/^Índice/i.test(firstLine)) continue;
    // Tem que começar com "US-XXX-NN: Título"
    const usMatch = firstLine.match(/^(US-[A-Z]+-\d+)\s*[:：]\s*(.+)$/);
    if (!usMatch) continue;
    const id = usMatch[1];
    const usTitle = usMatch[2].trim();
    const usBody = block.slice(firstLine.length).trim();
    userStories.push(parseUserStory(id, usTitle, usBody));
  }

  return {
    file: fileName.replace(/\.md$/, ''),
    code,
    title,
    description,
    meta,
    userStories,
  };
}

function parseUserStory(id: string, title: string, body: string): UserStory {
  // Story = primeiro parágrafo com "**Como** ... **Quero** ... **Para que** ..."
  const storyMatch = body.match(
    /\*\*Como\*\*[\s\S]+?\*\*Para que\*\*[\s\S]+?\.(?=\s*$|\s*\n)/m,
  );
  const story = storyMatch?.[0]?.replace(/\n+/g, ' ').trim();

  // Pega TODAS as seções `**Título:**` seguidas de conteúdo até a próxima
  // seção ou o fim do corpo. Captura body bruto (suporta listas, tabelas, parágrafos).
  const sections: UserStorySection[] = [];
  const headerRe = /^\*\*([^*\n]+?)\*\*\s*$/gm;
  const headers: Array<{ title: string; index: number; lineEnd: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(body)) !== null) {
    headers.push({
      title: m[1].replace(/[:：]$/, '').trim(),
      index: m.index,
      lineEnd: m.index + m[0].length,
    });
  }
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = headers[i + 1];
    const bodyStart = h.lineEnd;
    const bodyEnd = next ? next.index : body.length;
    const secBody = body.slice(bodyStart, bodyEnd).trim();
    sections.push({ title: h.title, body: secBody });
  }

  // Atalhos para 3 seções clássicas: aceite o trecho conhecido
  const grabBullets = (label: string): string[] => {
    const sec = sections.find((s) => s.title.toLowerCase().startsWith(label.toLowerCase()));
    if (!sec) return [];
    return sec.body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-'))
      .map((l) => l.replace(/^-\s*\[\s*\]\s*/, '').replace(/^-\s*/, '').trim())
      .filter(Boolean);
  };

  return {
    id,
    title,
    story,
    sections,
    criterios: grabBullets('Critérios de aceite'),
    regras: grabBullets('Regras de negócio'),
    dependencias: grabBullets('Dependências'),
  };
}

/* ───────────────────────────────────────────────────────
   Leitura completa
   ─────────────────────────────────────────────────────── */

async function readEpicFolder(root: string, folder: string): Promise<Epic> {
  const dir = path.join(root, folder);
  const files = await fs.readdir(dir);
  const featureFiles = files
    .filter((f) => /^F\d+.*\.md$/.test(f))
    .sort();

  const features: Feature[] = [];
  for (const fName of featureFiles) {
    try {
      const raw = await fs.readFile(path.join(dir, fName), 'utf-8');
      features.push(parseFeatureFile(fName, raw));
    } catch {
      /* arquivo ilegível — pula */
    }
  }

  // "EPIC-01-Cadastros-Fundamentais" → code "EPIC-01" + título humanizado
  const m = folder.match(/^(EPIC-\d+)-(.+?)(-PENDENTE)?$/);
  const code = m?.[1] ?? folder;
  const titleRaw = m?.[2] ?? folder;
  const title = titleRaw.replace(/-/g, ' ');
  const pendente = !!m?.[3];

  return { folder, code, title, pendente, features };
}

export async function loadBacklog(): Promise<BacklogTree> {
  try {
    const entries = await fs.readdir(BACKLOG_ROOT, { withFileTypes: true });
    const epicDirs = entries
      .filter((e) => e.isDirectory() && /^EPIC-\d+/.test(e.name))
      .map((e) => e.name)
      .sort();

    const epics: Epic[] = [];
    for (const folder of epicDirs) {
      epics.push(await readEpicFolder(BACKLOG_ROOT, folder));
    }

    let readme: string | undefined;
    let cronograma: string | undefined;
    try {
      readme = await fs.readFile(path.join(BACKLOG_ROOT, 'README.md'), 'utf-8');
    } catch {}
    try {
      cronograma = await fs.readFile(path.join(BACKLOG_ROOT, 'cronograma-sprints.md'), 'utf-8');
    } catch {}

    return { epics, readme, cronograma };
  } catch (err) {
    return {
      epics: [],
      error:
        err instanceof Error
          ? `${err.message} — caminho esperado: ${BACKLOG_ROOT}`
          : `Erro desconhecido ao ler ${BACKLOG_ROOT}`,
    };
  }
}
