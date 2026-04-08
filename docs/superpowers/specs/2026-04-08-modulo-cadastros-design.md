# Spec: Modulo Cadastros — Unidades de Saude, Medicos e Reorganizacao do Menu

**Data:** 2026-04-08
**Status:** Aprovado

---

## Contexto e Problema

O sistema TFD permite que usuarios digitem o nome de unidades de saude como texto livre (ex.: na tela de Agendamentos). Isso gera inconsistencias — a mesma unidade aparece com grafias diferentes ("Hospital Dutra", "Carlos Dutra", "dutra"), impedindo filtros e relatorios confiaveis.

A solucao: criar um cadastro previo de unidades de saude que sirva como fonte unica de verdade. Ao referenciar uma unidade em qualquer tela do sistema, o usuario seleciona de uma lista padronizada em vez de digitar texto livre.

Aproveitando essa reestruturacao, a tela de Medicos (hoje embutida em Configuracoes) tambem ganha tela propria, e o menu lateral e reorganizado com uma nova secao "Cadastros".

---

## 1. Reorganizacao do Menu Lateral

### Estrutura atual

```
Painel
FLUXO DO PROCESSO: Pacientes, Solicitacoes, Diagnostico Clinico, Parecer Medico, Regulacao, Agendamentos, Viagens, Ajuda de Custo, Permanencia, Alta/Encerramento
GESTAO: Relatorios, Configuracoes (com aba Medicos), Permissoes, Usuarios, Logs
```

### Nova estrutura

```
Painel

FLUXO DO PROCESSO
  Solicitacoes
  Diagnostico Clinico
  Parecer Medico
  Regulacao
  Agendamentos
  Viagens
  Ajuda de Custo
  Permanencia
  Alta / Encerramento

CADASTROS                  <- nova secao
  Pacientes                <- movido de "Fluxo do Processo"
  Medicos                  <- movido de Configuracoes, tela propria
  Unidades de Saude        <- novo

GESTAO
  Relatorios
  Configuracoes            <- perde a aba Medicos
  Permissoes
  Usuarios
  Logs
```

### Mudancas no codigo

- **Arquivo:** `src/layout/sidebar/Sidebar.tsx`
- Remover "Pacientes" da secao "FLUXO DO PROCESSO"
- Adicionar nova secao "CADASTROS" com Pacientes (`/pacientes`), Medicos (`/medicos`), Unidades de Saude (`/unidades-saude`)
- Icones: User (Pacientes), Stethoscope (Medicos), Building2 (Unidades de Saude)

---

## 2. Tela de Unidades de Saude

### 2.1. Listagem — `/unidades-saude`

**Rota:** `src/app/unidades-saude/page.tsx`

**Cards de resumo no topo** (grid horizontal, padrao `tfd-card`):
| Card | Dado | Icone |
|------|------|-------|
| Total de Unidades | count total | Building2 |
| Unidades Ativas | count onde ativo=true | CheckCircle2 |
| Regionais Cobertas | count distinct regional_id | MapPin |

**Toolbar:**
- Campo de busca (por nome ou CNES)
- Botao "Nova Unidade" (abre drawer)

**Tabela** (padrao `tfd-table`, 10 itens/pagina):
| Coluna | Campo |
|--------|-------|
| Nome | nome |
| CNES | cnes |
| Tipo | tipo |
| Regional | regional (join tabelas_auxiliares) |
| Municipio | municipio |
| Telefone | telefone |
| Acoes | Editar, Desativar |

**Paginacao:** mesma implementacao de `/pacientes` (range-based via Supabase).

### 2.2. Drawer de Cadastro/Edicao

**Componente:** inline no `page.tsx` (mesmo padrao de Pacientes)

**Campos:**

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| Nome da Unidade | text input | Sim | - |
| CNES | text input | Sim | numerico, 7 digitos, unico |
| Tipo | select | Nao | UBS, UPA, HOSPITAL, CLINICA, CAPS, OUTRO |
| Regional | select (useLookup) | Nao | categoria 'regional' |
| CEP | text input (mask) | Nao | formato CEP |
| Logradouro | text input | Nao | - |
| Numero | text input | Nao | - |
| Bairro | text input | Nao | - |
| Municipio | select (useMunicipios) | Nao | - |
| UF | text input | Nao | default 'MA' |
| Telefone | text input (mask) | Nao | formato telefone |
| Email | text input | Nao | formato email |
| Responsavel | text input | Nao | nome de contato |

**Secoes no drawer:**
1. Dados da Unidade (nome, CNES, tipo, regional)
2. Endereco (CEP, logradouro, numero, bairro, municipio, UF)
3. Contato (telefone, email, responsavel)

### 2.3. Detalhes — `/unidades-saude/[id]`

**Rota:** `src/app/unidades-saude/[id]/page.tsx`

**Layout:** igual a `/pacientes/[id]` — grid de 2 colunas (1 + 2).

**Cards de resumo no topo** (antes do grid):
| Card | Dado |
|------|------|
| Total de Solicitacoes | count solicitacoes vinculadas |
| Em Andamento | count com status em progresso |
| Concluidas | count com status finalizado |

**Coluna esquerda (1fr):**
- Card com dados da unidade: nome, CNES, tipo, regional, endereco completo, telefone, email, responsavel
- Botao "Editar Unidade" (redireciona para `/unidades-saude?editar={id}`)

**Coluna direita (2fr):**
- Historico de Solicitacoes vinculadas a unidade
- Mesmo padrao visual dos cards clicaveis do paciente (ciclo, numero processo, CID, status, data)
- Link para `/solicitacoes/{id}`

---

## 3. Tela de Medicos

### 3.1. Listagem — `/medicos`

**Rota:** `src/app/medicos/page.tsx`

**Cards de resumo no topo:**
| Card | Dado | Icone |
|------|------|-------|
| Total de Medicos | count total | Stethoscope |
| Medicos Ativos | count ativo=true | CheckCircle2 |
| Especialidades | count distinct especialidade | Award |

**Toolbar:**
- Campo de busca (por nome ou CRM)
- Botao "Novo Medico" (abre drawer)

**Tabela** (10 itens/pagina):
| Coluna | Campo |
|--------|-------|
| Nome | nome_completo |
| CRM | crm + crm_uf |
| Especialidade | especialidade |
| Acoes | Editar, Desativar |

**Drawer de cadastro/edicao** — mesmos campos atuais do MedicosPanel:
- Nome Completo (obrigatorio)
- CRM (obrigatorio)
- CRM UF (obrigatorio, select de estados)
- CPF (opcional)
- Especialidade (select, useLookup('especialidade'))

### 3.2. Detalhes — `/medicos/[id]`

**Rota:** `src/app/medicos/[id]/page.tsx`

**Cards de resumo no topo:**
| Card | Dado |
|------|------|
| Total de Solicitacoes | count solicitacoes com parecer desse medico |
| Pareceres Favoraveis | count parecer = favoravel |
| Pareceres Desfavoraveis | count parecer = desfavoravel |

**Coluna esquerda:**
- Card com dados do medico: nome, CRM + UF, CPF, especialidade
- Botao "Editar Medico"

**Coluna direita:**
- Lista de solicitacoes em que o medico deu parecer
- Mesmo padrao visual dos cards clicaveis

### 3.3. Remocao do MedicosPanel de Configuracoes

- **Arquivo:** `src/app/sistema/configuracoes/page.tsx`
- Remover a aba "Medicos" do array TABS
- Remover import do `MedicosPanel`
- O arquivo `MedicosPanel.tsx` pode ser deletado apos a migracao

---

## 4. Cards de Resumo nos Detalhes do Paciente

**Arquivo:** `src/app/pacientes/[id]/page.tsx`

Adicionar cards de resumo no topo (antes do grid de colunas):
| Card | Dado |
|------|------|
| Total de Solicitacoes | count solicitacoes do paciente |
| Em Andamento | count com status em progresso |
| Concluidas | count com status finalizado |

Padrao visual identico aos cards das telas de listagem (icone + label + numero em `tfd-card`).

---

## 5. Camada de Dados

### 5.1. Evolucao da tabela `unidades_destino`

Nova migration adicionando colunas:

```sql
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS regional_id UUID REFERENCES tabelas_auxiliares(id);
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS telefone TEXT;
```

Obs: a tabela ja tem `nome`, `cnes`, `cidade`, `uf`, `tipo`, `endereco`, `contato`, `ativo`, `created_at`, `updated_at`, `cep`.

Os campos `endereco` (texto unico) e `contato` (texto unico) ficam como legado. Os novos campos (`logradouro`, `numero`, `bairro`, `municipio`) substituem `endereco` para novos cadastros. O campo `telefone` e `email` substituem `contato`.

### 5.2. Migracao da tela de Agendamentos

**Tabela `agendamentos`:** adicionar coluna:

```sql
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS unidade_destino_id UUID REFERENCES unidades_destino(id);
```

**Tela `atendimento-destino/page.tsx`:**
- Substituir campos texto livre (`nomeUnidade`, `cnes`, `cidade`, `uf`, `contatoUnidade`) por um select com busca
- Componente de select busca por nome ou CNES na tabela `unidades_destino`
- Ao selecionar, autopreenche todos os campos (cidade, UF, contato, etc.)
- Salva `unidade_destino_id` no payload
- Campos texto antigos mantidos como fallback para registros existentes (dados anteriores a migracao continuam visiveis)

### 5.3. Service: `unidades-saude.service.ts`

Segue padrao de `medicos.service.ts`, operando sobre `unidades_destino`:

- `listarUnidadesSaude(filters?)` — lista ativas, busca por nome/CNES, paginacao
- `buscarUnidadeSaude(id)` — busca por ID com join em tabelas_auxiliares (regional)
- `criarUnidadeSaude(data)` — insert
- `atualizarUnidadeSaude(id, data)` — update
- `desativarUnidadeSaude(id)` — soft delete (ativo = false)
- `buscarPorCnes(cnes)` — busca por CNES (validacao de unicidade)

### 5.4. Model: `unidade-saude.model.ts`

```typescript
export interface UnidadeSaude {
  id: string;
  nome: string;
  cnes: string;
  tipo?: string;
  regional_id?: string;
  regional_nome?: string; // join
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
```

### 5.5. Vinculo Solicitacoes <-> Unidade de Saude

Para a tela de detalhes da unidade exibir solicitacoes vinculadas, a query usa a tabela `agendamentos`:

```
solicitacoes JOIN agendamentos ON agendamentos.solicitacao_id = solicitacoes.id
WHERE agendamentos.unidade_destino_id = {unidade_id}
```

Para registros antigos (sem `unidade_destino_id`), fallback por match textual em `unidade_executante`.

### 5.6. Vinculo Solicitacoes <-> Medico

Para a tela de detalhes do medico, a query usa a tabela de pareceres:

```
solicitacoes JOIN pareceres ON pareceres.solicitacao_id = solicitacoes.id
WHERE pareceres.medico_id = {medico_id}
```

---

## 6. Arquivos Impactados

| Acao | Arquivo |
|------|---------|
| Editar | `src/layout/sidebar/Sidebar.tsx` |
| Criar | `src/app/unidades-saude/page.tsx` |
| Criar | `src/app/unidades-saude/[id]/page.tsx` |
| Criar | `src/app/medicos/page.tsx` |
| Criar | `src/app/medicos/[id]/page.tsx` |
| Criar | `src/services/unidades-saude.service.ts` |
| Criar | `src/core/models/unidade-saude.model.ts` |
| Editar | `src/app/pacientes/[id]/page.tsx` (adicionar cards resumo) |
| Editar | `src/app/sistema/configuracoes/page.tsx` (remover aba Medicos) |
| Editar | `src/app/atendimento-destino/page.tsx` (select de unidade) |
| Criar | `supabase/migrations/00028_evolucao_unidades_destino.sql` |
| Criar | `supabase/migrations/00029_agendamentos_unidade_fk.sql` |
| Deletar | `src/app/sistema/configuracoes/MedicosPanel.tsx` (apos migracao) |

---

## 7. Fora de Escopo

- Migracao de dados antigos (converter texto livre existente em FKs)
- Busca por CEP automatica (ViaCEP)
- Permissoes granulares por tela de cadastro
- Importacao em massa de unidades de saude
