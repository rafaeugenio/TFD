# AUDITORIA TFD — Limpeza de Schema e Dados Transacionais

**Data:** 2026-04-14  
**Projeto:** TFD (Tratamento Fora de Domicílio) — SES-MA  
**Stack:** Next.js + Supabase (PostgreSQL)  
**Objetivo:** Mapear, avaliar e preparar plano de limpeza de schema duplicado e dados transacionais

---

## SUMÁRIO EXECUTIVO

O projeto TFD passou por **36 migrations** (com 5 pares duplicados) acumulando **38 tabelas** no Postgres. 

**Principais achados:**

1. **Migrations duplicadas (5 pares):** 00008, 00018, 00019, 00021, 00028 — cada par é executado sequencialmente, ambos rodam sem conflito direto (não há DROP/CREATE conflitante)
2. **Tabela substituída:** `papel_telas` → `papel_tela_acoes` (m033, DROP confirmado)
3. **Regionais de Saúde — 3 versões:**
   - v1: `tabelas_auxiliares.categoria='regional'` (m025, 10→19 regiões)
   - v2: `regionais_saude` + `regionais_saude_municipios` (m032, tabela completa)
   - **Recomendação:** EXCLUIR tabelas_auxiliares com categoria='regional' após migrar para v2
4. **Dados transacionais:** solicitacoes, viagens, agendamentos, permanencias, ajudas_custo, pareceres, devolucoes, encerramentos + todas suas dependências
5. **Telas ativas:** 37 rotas implementadas em Next.js, consumindo 25 tabelas. 13 tabelas são auxiliares/sistema (preservar)

---

## A. MAPA COMPLETO DO SCHEMA

### A.1 Tabelas Criadas por Migration

| # | Migration | Tabelas | Status |
|---|-----------|---------|--------|
| 1 | 00001_initial_schema | municipios, usuarios, pacientes, acompanhantes, dados_bancarios, solicitacoes, documentos, pareceres, exigencias, rotas_regulacao, cobrancas_externas, validacoes_rpb, agendamentos, viagens, remarcacoes, tabela_diarias, ajudas_custo, permanencias, prorrogacoes, encerramentos, notificacoes, observacoes_processo, log_auditoria | ✓ Ativa |
| 2 | 00002_tabelas_auxiliares | tabelas_auxiliares, unidades_destino, companhias_transporte | ✓ Ativa |
| 3 | 00003_parametros_sistema | parametros_sistema | ✓ Ativa |
| 4 | 00004_modulo_sistema_rbac | telas_sistema, papeis, papel_telas, codigos_convite | ⚠ papel_telas substituída em m033 |
| 5 | 00005_rls_anon_access | — (só RLS policies) | ✓ |
| 6 | 00006_storage_documentos | — (Supabase Storage apenas) | ✓ |
| 7 | 00007_add_especialidade | — (ALTER TABLE usuarios) | ✓ |
| 8a | 00008_fix_rotas_regulacao | — (ALTER rotas_regulacao, solicitacoes) | ✓ Executada |
| 8b | 00008_parecer_auditor_nullable | — (ALTER pareceres) | ✓ Executada |
| 9 | 00009_tabela_devolucoes | devolucoes | ✓ Ativa |
| 10 | 00010_fix_solicitacoes_status_check | — (ALTER solicitacoes CHECK) | ✓ |
| 11 | 00011_tabela_termos_compromisso | termos_compromisso | ✓ Ativa |
| 12 | 00012_separar_pacientes_acompanhantes | solicitacao_acompanhantes | ✓ Ativa |
| 13 | 00013_status_gerencial_ajuda_custo | — (ALTER ajudas_custo) | ✓ |
| 14 | 00014_status_operacional_viagens | — (ALTER viagens CHECK) | ✓ |
| 15 | 00015_viagens_multiplas | — (ALTER viagens) | ✓ |
| 16 | 00016_ajuda_custo_multiplos_periodos | — (ALTER ajudas_custo) | ✓ |
| 17 | 00017_ajuda_custo_pago_parcial | — (ALTER ajudas_custo) | ✓ |
| 18a | 00018_permanencias_flexivel | — (ALTER permanencias, prorrogacoes) | ✓ Executada |
| 18b | 00018_url_sei_solicitacoes | — (ALTER solicitacoes) | ✓ Executada |
| 19a | 00019_novas_categorias_auxiliares | — (INSERT tabelas_auxiliares) | ✓ Executada |
| 19b | 00019_perfil_usuario | — (ALTER usuarios) | ✓ Executada |
| 20 | 00020_prorrogacao_viagem_vinculo | — (ALTER prorrogacoes) | ✓ |
| 21a | 00021_tabela_cid10 | cid10 | ✓ Ativa |
| 21b | 00021b_seed_cid10 | — (SEED para cid10) | ✓ |
| 22 | 00022_tabela_sigtap | sigtap_procedimentos | ✓ Ativa |
| 23 | 00023_tabela_medicos | medicos | ✓ Ativa |
| 24 | 00024_tabela_rotas_deslocamento | rotas_deslocamento | ✓ Ativa |
| 25 | 00025_regionais_saude_completas | — (UPDATE tabelas_auxiliares cat='regional') | ✓ Ativa |
| 26 | 00026_unidades_destino_cep | — (ALTER unidades_destino) | ✓ |
| 27 | 00027_seed_cid10_tabela_auxiliar | — (SEED para tabelas_auxiliares cat='cid10_auxiliar') | ✓ |
| 28a | 00028_evolucao_unidades_destino | — (ALTER unidades_destino) | ✓ Executada |
| 28b | 00028_parametros_transporte_sigtap | — (DELETE+INSERT parametros_sistema) | ✓ Executada |
| 29 | 00029_agendamentos_unidade_fk | — (ALTER agendamentos FK) | ✓ |
| 30 | 00030_pareceres_medico_fk | — (ALTER pareceres FK) | ✓ |
| 31 | 00031_tipo_unidade_saude | — (INSERT tabelas_auxiliares) | ✓ |
| 32 | 00032_regionais_saude_entidade | regionais_saude, regionais_saude_municipios | ✓ Ativa |
| 33 | 00033_permissoes_granulares | papel_tela_acoes (cria), papel_telas (DROP) | ✓ Ativa |
| 34 | 00034_solicitacoes_campos_diagnostico | — (ALTER solicitacoes) | ✓ |
| 35 | 00035_tabela_adicionais | adicionais | ✓ Ativa |
| 36 | 00036_modal_transfer | — (INSERT tabelas_auxiliares) | ✓ |

**Total: 38 tabelas ativas + 1 removida (papel_telas)**

---

### A.2 Estrutura das Tabelas

#### **CORE: Identidade e Autorização**
- `usuarios` — login, perfis, dados básicos | m001 | 10 colunas + triggers
- `pacientes` — dados civis, CNS, CPF | m001 | 15 colunas
- `acompanhantes` — vinculados a pacientes | m001 | 8 colunas
- `dados_bancarios` — conta bancária pacientes | m001 | 7 colunas
- `papeis` — grupos de permissão | m004 | 3 colunas
- `telas_sistema` — mapa de rotas/módulos | m004 | 7 colunas
- `papel_tela_acoes` (★novo) — permissões granulares por ação | m033 | 3 colunas (FK papel + tela + ação)
- `codigos_convite` — convites de novo usuário | m004 | 6 colunas
- `municipios` — referência de localidades | m001 | 7 colunas

#### **OPERACIONAL: Solicitações (Core)**
- `solicitacoes` — documento principal TFD | m001 | 35+ colunas (EM_ANALISE → CONCLUIDO)
- `documentos` — arquivos anexados | m001 | 5 colunas | FK solicitacoes
- `pareceres` — análise médica regulação | m001 | 7 colunas | FK solicitacoes
- `exigencias` — pendências de documentação | m001 | 6 colunas | FK solicitacoes
- `observacoes_processo` — anotações internas | m001 | 5 colunas | FK solicitacoes
- `notificacoes` — alertas de sistema | m001 | 8 colunas

#### **OPERACIONAL: Viagem (Child de Solicitação)**
- `viagens` — deslocamento paciente | m001 | 20+ colunas | FK solicitacoes
- `remarcacoes` — adio viagem | m001 | 5 colunas | FK viagens
- `rotas_deslocamento` — trechos aéreo/terrestre/fluvial | m024 | 8 colunas | FK viagens
- `rotas_regulacao` — encaminhamento para órgãos externos (CNRAC, SETI, etc) | m001 | 8 colunas | FK solicitacoes
- `cobrancas_externas` — custos no CNRAC | m001 | 6 colunas | FK rotas_regulacao
- `validacoes_rpb` — validação de passagens | m001 | 5 colunas | FK viagens
- `companhias_transporte` — dados operadores aéreos/rodoviários | m002 | 5 colunas

#### **OPERACIONAL: Agendamento (Child de Solicitação)**
- `agendamentos` — consulta/internação na unidade destino | m001 | 10 colunas | FK solicitacoes, unidades_destino
- `termos_compromisso` — TCLE | m011 | 6 colunas | FK solicitacoes
- `solicitacao_acompanhantes` — acompanhantes selecionados | m012 | 5 colunas | FK solicitacoes, acompanhantes

#### **OPERACIONAL: Permanência (Child de Solicitação)**
- `permanencias` — internação estendida | m001 | 12 colunas | FK solicitacoes, viagens
- `prorrogacoes` — extensão internação | m001 | 8 colunas | FK permanencias

#### **OPERACIONAL: Ajuda de Custo (Child de Solicitação)**
- `ajudas_custo` — auxílio financeiro dia | m001 | 15 colunas | FK solicitacoes
- `tabela_diarias` — referência valor dia por região | m001 | 4 colunas

#### **OPERACIONAL: Encerramento (Child de Solicitação)**
- `encerramentos` — alta hospitalar | m001 | 8 colunas | FK solicitacoes
- `devolucoes` — devolução de documentos ao paciente | m009 | 5 colunas | FK solicitacoes

#### **REFERÊNCIA: Saúde**
- `unidades_destino` — hospitais/clinicas referenciados | m002 | 18 colunas (expandida m028)
- `regionais_saude` — (★novo) tabela completa 18 URS | m032 | 12 colunas
- `regionais_saude_municipios` — (★novo) junction regional ↔ municípios | m032 | 3 colunas
- `medicos` — cadastro médicos (CRM, especialidade, contatos) | m023 | 10 colunas
- `laudo_medicos` — tipo de laudo (tabela física não encontrada, provavelmente em tabelas_auxiliares)
- `cid10` — diagnósticos médicos completos (~14.400 linhas) | m021 | 8 colunas
- `sigtap_procedimentos` — procedimentos SUS | m022 | 6 colunas
- `adicionais` — acréscimos procedimento | m035 | 6 colunas
- `tabelas_auxiliares` — categorias genéricas (regional, cid10_auxiliar, carater_atendimento, tipo_documento, etc) | m002 | 7 colunas

#### **SISTEMA: Configuração**
- `parametros_sistema` — config app (base_calculo_aereo, valor_procedimento_terrestre, etc) | m003 | 8 colunas
- `log_auditoria` — trilha de quem fez o quê | m001 | 7 colunas

---

## B. MAPA DE ROTAS ATIVAS (Next.js App Router)

**37 rotas encontradas**, consumindo dados de **25 tabelas distintas**.

### Rotas de Solicitação (Core)
- `/solicitacoes` (list) → `solicitacoes`, `municipios`, `usuarios` | m001
- `/solicitacoes/[id]` (detail) → `solicitacoes`, `documentos`, `pareceres`, `observacoes_processo`

### Rotas de Workflow Operacional
- `/diagnostico-clinico` → `solicitacoes`, `documentos`, `cid10` | m021
- `/laudo-medico` → `solicitacoes`, `documentos`, `laudos_medicos` (?)
- `/parecer-medico` → `solicitacoes`, `pareceres`, `medicos` | m023
- `/regulacao` → `solicitacoes`, `rotas_regulacao`, `cobrancas_externas`, `validacoes_rpb`
- `/agendamentos` → `solicitacoes`, `agendamentos`, `unidades_destino`, `rotas_regulacao`
- `/viagens` → `solicitacoes`, `viagens`, `remarcacoes`, `log_auditoria` | m001
- `/ajuda-custo` → `solicitacoes`, `ajudas_custo`, `encerramentos` | m001
- `/permanencia` → `solicitacoes`, `permanencias`, `prorrogacoes`, `ajudas_custo`, `viagens`
- `/alta-encerramento` → `solicitacoes`, `encerramentos`
- `/atendimento-destino` → `solicitacoes`, `documentos`

### Rotas de Cadastro (CRUD)
- `/pacientes` → `pacientes`, `solicitacoes` | m001
- `/pacientes/[id]` → pacientes detail + `/pacientes/[id]/prontuario` (histórico de solicitações)
- `/medicos` → `medicos` | m023
- `/medicos/[id]` → medicos detail
- `/unidades-saude` → `unidades_destino`, `agendamentos` | m002
- `/unidades-saude/[id]` → unidades_destino detail
- `/regionais-saude` → `regionais_saude`, `regionais_saude_municipios` | m032 (★novo)
- `/regionais-saude/[id]` → regionais_saude detail

### Rotas de Sistema
- `/dashboard` → `usuarios`, leitura geral
- `/meu-perfil` → `usuarios` (read own profile)
- `/sistema/usuarios` → `usuarios`, `papeis`, `municipios`
- `/sistema/papeis` → `papeis`, `telas_sistema`, `papel_tela_acoes` | m033
- `/sistema/configuracoes` → `parametros_sistema` | m003
- `/sistema/logs` → `log_auditoria` | m001
- `/relatorios` → `relatorios_atendimento` (read-only analytics)
- `/recibo-pagamento` → `recibos_pagamento` (?)
- `/relatorio-atendimento` → `relatorios_atendimento`

### Rotas de Suporte
- `/login` → `usuarios` (auth)
- `/criar-conta` → `usuarios`, `codigos_convite` | m004
- `/recuperar-senha` → `usuarios`
- `/consulta` → `solicitacoes` (read-only search)
- `/consulta-documentos` → `documentos`
- `/autorizacoes` → (auth/permission logic)
- `/configuracoes` → `parametros_sistema`
- `/` (home/root)

---

## C. ANÁLISE: TABELAS DUPLICADAS, OBSOLETAS E CANDIDATAS A MERGE

### C.1 TABELAS CANDIDATAS A DROP

| Tabela | Motivo | Substituta | Migration | Impacto |
|--------|--------|-----------|-----------|---------|
| `papel_telas` | Modelo binário (access=true/false) substituído por granular | `papel_tela_acoes` | m033 | ✓ Já removida em prod (DROP m033) |

**Status:** Nenhuma tabela ainda viva candidata a DROP imediato. `papel_telas` já foi removida.

---

### C.2 TABELAS CANDIDATAS A TRUNCATE (Dados Transacionais)

**Ordem respeitando Foreign Keys (ou use CASCADE):**

```sql
-- Fase 1: Dependências de solicitacoes
DELETE FROM papel_tela_acoes;              -- (limpeza de permissões granulares, se necessário)
DELETE FROM log_auditoria;                 -- trilha de operações
DELETE FROM observacoes_processo;          -- anotações em solicitacoes
DELETE FROM notificacoes;                  -- alertas
DELETE FROM documentos;                    -- arquivos anexados (também em storage)
DELETE FROM termos_compromisso;            -- TCLE por solicitação
DELETE FROM solicitacao_acompanhantes;     -- acompanhantes selecionados

-- Fase 2: Workflow operacional (FK → solicitacoes)
DELETE FROM devolucoes;                    -- devolução docs (FK solicitacoes)
DELETE FROM exigencias;                    -- exigências (FK solicitacoes)
DELETE FROM pareceres;                     -- pareceres (FK solicitacoes)
DELETE FROM rotas_regulacao;               -- encaminhamentos CNRAC/SETI (FK solicitacoes)
DELETE FROM cobrancas_externas;            -- custos (FK rotas_regulacao → solicitacoes)

-- Fase 3: Viagem (FK → solicitacoes)
DELETE FROM validacoes_rpb;                -- validação passagens (FK viagens)
DELETE FROM rotas_deslocamento;            -- trechos viagem (FK viagens)
DELETE FROM remarcacoes;                   -- adios (FK viagens)
DELETE FROM viagens;                       -- deslocamento (FK solicitacoes)

-- Fase 4: Agendamento (FK → solicitacoes)
DELETE FROM agendamentos;                  -- agendamentos (FK solicitacoes, unidades_destino)

-- Fase 5: Permanência (FK → solicitacoes, viagens)
DELETE FROM prorrogacoes;                  -- prorrogações (FK permanencias)
DELETE FROM permanencias;                  -- internações (FK solicitacoes, viagens)

-- Fase 6: Ajuda de Custo (FK → solicitacoes)
DELETE FROM ajudas_custo;                  -- auxílio (FK solicitacoes)

-- Fase 7: Encerramento (FK → solicitacoes)
DELETE FROM encerramentos;                 -- alta (FK solicitacoes)

-- Fase 8: MAIN — solicitacoes
DELETE FROM solicitacoes;                  -- documento principal

-- Fase 9: Dados pessoais (sem FK direto, mas relacionados)
DELETE FROM acompanhantes;                 -- acompanhantes (FK pacientes)
DELETE FROM dados_bancarios;               -- conta bancária (FK pacientes)
DELETE FROM pacientes;                     -- pacientes (sem FK inversa em solicitacoes, mas logicamente relacionado)

-- Fase 10: Tábuas de custo/procedimento (opcional)
DELETE FROM tabela_diarias;                -- valores referência (sem FK)
DELETE FROM tetos_financeiros;             -- tetos por regional (opcional)
DELETE FROM alertas_teto;                  -- alertas de teto (FK tetos_financeiros)
DELETE FROM recibos_pagamento;             -- recibos gerados (sem FK para solicitacoes, mas logicamente relacionado)
DELETE FROM relatorios_atendimento;        -- relatórios de atendimento (sem FK para solicitacoes)
```

**Tabelas a MANTER intactas (FK ou dados auxiliares críticos):**
- `usuarios` — controle de acesso (RLS, logs de auditoria dependem)
- `municipios` — referência geográfica (FK em usuarios, pacientes, unidades_destino)
- `unidades_destino` — rede de saúde (referência em agendamentos, mesmo sem solicitação ativa)
- `medicos` — cadastro de profissionais (nenhuma FK transacional, mas crítico para CRM)
- `regionais_saude` + `regionais_saude_municipios` — estrutura organizacional (preservar)
- `papeis` + `telas_sistema` + `papel_tela_acoes` — RBAC (não transacional)
- `codigos_convite` — gestão de convites (opcional manter vazio)
- `parametros_sistema` — configuração global (preservar)
- `cid10` — diagnósticos (referência, ~14k linhas, preservar)
- `sigtap_procedimentos` — procedimentos SUS (referência, preservar)
- `adicionais` — acréscimos procedimento (referência, preservar)
- `rotas_deslocamento` — tabela de rotas (referência, preservar)
- `companhias_transporte` — operadores (referência, preservar)
- `tabelas_auxiliares` (exceto categoria='regional') — categorias auxiliares (preservar)
- `log_auditoria` — trilha histórica (★) — TRUNCATE ou manter? (vide seção C.3)

**NOTAS CRÍTICAS:**
1. **`recibos_pagamento` e `relatorios_atendimento`:** Parecem tabelas de output/cache (não constam em migrations CREATE TABLE padrão). Verificar se existem em schema antes de TRUNCATE.
2. **`alertas_teto` e `tetos_financeiros`:** Não encontradas em CREATE TABLE. Possível que sejam virtuais/views ou não implementadas.
3. **`laudos_medicos`:** Não encontrada em CREATE TABLE na migration. Pode ser que o sistema use `tabelas_auxiliares` ou seja só documentos.

---

### C.3 ESTRATÉGIA DE TRUNCATE

**Recomendação:** Usar `TRUNCATE ... CASCADE` para garantir ordem automática de FKs.

```sql
BEGIN;
  -- Opção 1: TRUNCATE ... CASCADE (automático, mais simples)
  TRUNCATE TABLE solicitacoes CASCADE;
  TRUNCATE TABLE pacientes CASCADE;
  TRUNCATE TABLE acompanhantes CASCADE;
  
  -- Opção 2: DELETE com ordem manual (mais controle, necessário DELETE FROM)
  -- [vide fase acima]
COMMIT;
```

**Impacto de `log_auditoria`:** Se mantido, registro completo de quem deletou o quê. Se limpado, perder trilha histórica. **Recomendação:** PRESERVAR histórico (não TRUNCATE).

---

### C.4 TABELAS CANDIDATAS A MERGE

**Nenhuma merge recomendada neste momento.** Todas as tabelas servem propósitos distintos:

- `permanencias` + `ajudas_custo` ≠ merge (estrutura, timelines diferentes)
- `viagens` + `agendamentos` ≠ merge (viagem é deslocamento; agendamento é consulta/internação)
- `rotas_deslocamento` + `viagens` ≠ merge (viagem é agregador; rotas_deslocamento são componentes)
- `pareceres` + `exigencias` ≠ merge (análise vs. documentação faltante)

**Porém, revisar:**
- `regionais_saude` vs `tabelas_auxiliares.categoria='regional'` → ambas coexistem. Investigar qual deve ser "truth source" (vide C.5)

---

### C.5 ANÁLISE: REGIONAIS_SAUDE — 3 Versões

**Evolução detectada:**

1. **v1 (m025):** INSERT/DELETE em `tabelas_auxiliares` (categoria='regional') — 10→19 regiões
   - Armazenada em tabelas genéricas (categoria, codigo, nome, descricao)
   - Usado em sistema antigo

2. **v2 (m032):** CREATE TABLE `regionais_saude` + `regionais_saude_municipios` — tabela dedicada
   - 18 URS com dados oficiais SES-MA (contatos, endereços, etc.)
   - Dados mais ricos (telefone, email, logradouro, etc.)
   - Junction table para múltiplos municípios por regional
   - **Atual:** Rotas ativas (`/regionais-saude`) usam v2

3. **v3 (Implícita):** `tabelas_auxiliares.regional_id` FK em `unidades_destino` (m025, m028, m032)
   - Mix de v1 (tabelas_auxiliares) e v2 (regionais_saude) em colunas

**Recomendação:**
- **EXCLUIR** inserções de 'regional' em `tabelas_auxiliares` (DELETE WHERE categoria='regional')
- **MANTER** `regionais_saude` + `regionais_saude_municipios` como fonte única
- **REFATORAR** `unidades_destino.regional_id` para referenciar `regionais_saude.id` (se não feito)
- **VALIDAR** que `/regionais-saude` rota usa `regionais_saude` table (confirmado em regionais-saude.service.ts)

**SQL:**
```sql
DELETE FROM tabelas_auxiliares WHERE categoria = 'regional';
-- Validar FKs que apontam para tabelas_auxiliares.regional_id em unidades_destino
ALTER TABLE unidades_destino 
  DROP CONSTRAINT IF EXISTS unidades_destino_regional_id_fkey,
  ADD CONSTRAINT unidades_destino_regional_saude_id_fkey 
    FOREIGN KEY (regional_id) REFERENCES regionais_saude(id) ON DELETE SET NULL;
```

---

## D. MIGRATIONS DUPLICADAS — Detalhamento

| Par | Arquivo A | Arquivo B | Conteúdo A | Conteúdo B | Conflito? | Status |
|-----|-----------|-----------|-----------|-----------|----------|--------|
| 8 | `00008_fix_rotas_regulacao.sql` | `00008_parecer_auditor_nullable.sql` | ALTER rotas_regulacao + solicitacoes CHECK | ALTER pareceres (medico_auditor_id NOT NULL) | ✗ Não | ✓ Ambas rodadas (sequencial) |
| 18 | `00018_permanencias_flexivel.sql` | `00018_url_sei_solicitacoes.sql` | ALTER permanencias + prorrogacoes | ALTER solicitacoes (url_sei) | ✗ Não | ✓ Ambas rodadas |
| 19 | `00019_novas_categorias_auxiliares.sql` | `00019_perfil_usuario.sql` | INSERT tabelas_auxiliares | ALTER usuarios (campos perfil) | ✗ Não | ✓ Ambas rodadas |
| 21 | `00021_tabela_cid10.sql` | `00021b_seed_cid10.mjs`/`.sql` | CREATE TABLE cid10 + RLS | SEED INSERT cid10 (~14.4k linhas) | ✗ Não | ✓ Ambas rodadas (b vem depois) |
| 28 | `00028_evolucao_unidades_destino.sql` | `00028_parametros_transporte_sigtap.sql` | ALTER unidades_destino | DELETE+INSERT parametros_sistema | ✗ Não | ✓ Ambas rodadas |

**Conclusão:** Nenhuma incompatibilidade. Supabase migrations roda sequencialmente em ordem filename. Ambas coexistem sem conflito.

**Recomendação:** Não alterar order, mas considerar renomear para evitar confusão futura (e.g., `00008a_...` e `00008b_...`).

---

## E. TABELAS A PRESERVAR (FINAL)

### E.1 Sistema de Autorização e Controle
- `usuarios` — identidade, login, perfis
- `papeis` — grupos de permissão (ADMINISTRADOR, MEDICO_AUDITOR, etc.)
- `telas_sistema` — mapa de rotas
- `papel_tela_acoes` — permissões granulares por ação
- `codigos_convite` — convites novos usuários
- `log_auditoria` — trilha de quem fez o quê (★ preservar histórico)

### E.2 Referência Geográfica e Organizacional
- `municipios` — cidades do Maranhão (FK em usuarios, pacientes, unidades_destino)
- `regionais_saude` — 18 URS oficiais SES-MA (★ versão final, m032)
- `regionais_saude_municipios` — junction regional ↔ municipios

### E.3 Referência Assistencial
- `unidades_destino` — hospitais/clínicas (referência, FK em agendamentos)
- `medicos` — cadastro médicos com CRM/especialidade
- `cid10` — ~14.4k diagnósticos (referência, FK em solicitacoes)
- `sigtap_procedimentos` — procedimentos SUS
- `adicionais` — acréscimos procedimento
- `companhias_transporte` — operadores aéreo/rodoviário
- `rotas_deslocamento` — (refência de rotas existentes, mas verificar uso)

### E.4 Configuração e Parâmetros
- `parametros_sistema` — config global (base_calculo_aereo, valor_procedimento_terrestre, etc.)
- `tabelas_auxiliares` (exceto categoria='regional') — categorias genéricas (origem_laudo, carater_atendimento, tipo_documento, etc.)

### E.5 Observações
- **Remover:** INSERT WHERE categoria='regional' em tabelas_auxiliares (usar regionais_saude v2)
- **Revisar:** `recibos_pagamento`, `relatorios_atendimento`, `alertas_teto`, `tetos_financeiros` — não encontradas em migrations, possível que não existam ou sejam views

---

## F. RESUMO: LISTAS EXECUTIVAS

### LISTA 1 — Tabelas Duplicadas/Obsoletas para DROP

**Nenhuma tabela ativa candidata a DROP imediato.**

- ✓ `papel_telas` — já removida em m033 (DROP confirmado)

---

### LISTA 2 — Tabelas Candidatas a MERGE

**Nenhuma merge recomendada.** Estrutura relacional é bem normalizada.

---

### LISTA 3 — Tabelas Transacionais para TRUNCATE (em ordem de FK)

**Copia-cola de C.2 acima. Ordem respeitando dependencies:**

```
log_auditoria
observacoes_processo
notificacoes
documentos
termos_compromisso
solicitacao_acompanhantes
devolucoes
exigencias
pareceres
rotas_regulacao
cobrancas_externas
validacoes_rpb
rotas_deslocamento
remarcacoes
viagens
agendamentos
prorrogacoes
permanencias
ajudas_custo
encerramentos
solicitacoes
acompanhantes
dados_bancarios
pacientes
tabela_diarias
(opcional) recibos_pagamento
(opcional) relatorios_atendimento
(opcional) alertas_teto
(opcional) tetos_financeiros
```

**Alternativa Simples:** `TRUNCATE solicitacoes CASCADE;` — remove dependentes automaticamente.

---

### LISTA 4 — Tabelas a PRESERVAR

```
// RBAC e Sistema
usuarios
papeis
telas_sistema
papel_tela_acoes
codigos_convite

// Referência Geográfica
municipios
regionais_saude
regionais_saude_municipios

// Referência Assistencial
unidades_destino
medicos
cid10
sigtap_procedimentos
adicionais
companhias_transporte
rotas_deslocamento

// Configuração
parametros_sistema
tabelas_auxiliares (exceto categoria='regional')

// Histórico (opcional)
log_auditoria
```

---

## G. RECOMENDAÇÕES DE AÇÃO

### G.1 Imediato (Sem Risco)
1. **Renomear migrations duplicadas** para maior clareza:
   - `00008_fix_rotas_regulacao.sql` → `00008a_fix_rotas_regulacao.sql`
   - `00008_parecer_auditor_nullable.sql` → `00008b_parecer_auditor_nullable.sql`
   - Idem para 18, 19, 21, 28

2. **Validar schema de tabelas auxiliares:**
   ```sql
   SELECT DISTINCT categoria FROM tabelas_auxiliares ORDER BY categoria;
   ```
   Confirmar que 'regional' aparece e migrar integralmente para `regionais_saude`.

3. **Confirmar existência de tabelas em prod:**
   - `recibos_pagamento` — encontrada em rotas?
   - `relatorios_atendimento` — encontrada em rotas?
   - `alertas_teto`, `tetos_financeiros` — existem ou são views?

### G.2 Pré-Truncate (Validação)
1. Executar script de **backup** completo (Supabase pg_dump)
2. Executar **audit** em staging:
   ```sql
   -- Contar registros por tabela antes
   SELECT schemaname, tablename, 
          (SELECT COUNT(*) FROM pg_stats WHERE tablename=t.tablename) as row_count
   FROM pg_tables t WHERE schemaname='public';
   ```
3. Validar que nenhuma rota/service consome dados de tabelas a truncar
4. Confirmar que jobs/crons que consultam essas tabelas foram desativados

### G.3 Truncate (Execução)
1. Desabilitar RLS temporariamente (se necessário)
2. Executar TRUNCATE em transaction:
   ```sql
   BEGIN;
   TRUNCATE TABLE solicitacoes CASCADE;
   TRUNCATE TABLE pacientes CASCADE;
   TRUNCATE TABLE acompanhantes CASCADE;
   COMMIT;
   ```
3. Resetar sequence IDs (se necessário):
   ```sql
   ALTER SEQUENCE tabela_id_seq RESTART WITH 1;
   ```
4. Validar integridade referencial pós-truncate
5. Reabilitar RLS

### G.4 Limpeza de Storage (Documentos)
- **Bucket:** `documentos` (Supabase Storage)
- **Ação:** Deletar arquivos órfãos (FK em documents table já removida)
- **Script:** Listar arquivos em `documentos/solicitacoes/*`, comparar com IDs em `documentos` table (pós-truncate = todos órfãos)

---

## CHECKLIST FINAL

- [ ] Backup completo do banco (pg_dump via Supabase)
- [ ] Renomear migrations duplicadas (00008a/b, etc.)
- [ ] Validar estrutura de regionais_saude vs tabelas_auxiliares.regional
- [ ] Confirmar rotas ativas vs. tabelas transacionais
- [ ] Testar TRUNCATE em staging (não prod)
- [ ] Desativar jobs/webhooks que consultam solicitacoes, viagens, etc.
- [ ] Executar TRUNCATE CASCADE em transaction
- [ ] Validar RLS e FKs pós-truncate
- [ ] Limpar documentos orphan no Storage
- [ ] Re-seed dados de teste (se necessário)
- [ ] Validar que app continua funcionando (login, dashboard, etc.)
- [ ] Atualizar documentação de banco

---

**Fim do relatório. Salvo em:**  
`/docs/auditoria-limpeza-schema.md`

