# Migrations — TFD

Schema versionado do banco Supabase (Postgres) do protótipo TFD.

## Numeração duplicada — histórico

Durante a evolução do protótipo, 5 pares de migrations foram commitados com o mesmo prefixo numérico. **Todos os pares foram aplicados sem conflito** (não há CREATE/DROP conflitantes entre os arquivos de cada par). Mantidos como estão para preservar a integridade do tracking do Supabase CLI.

| Nº | Arquivo A | Arquivo B | O que cada um faz |
|----|-----------|-----------|-------------------|
| 00008 | `00008_fix_rotas_regulacao.sql` | `00008_parecer_auditor_nullable.sql` | A: ALTER em `rotas_regulacao` e `solicitacoes` · B: ALTER em `pareceres` (auditor nullable) |
| 00018 | `00018_permanencias_flexivel.sql` | `00018_url_sei_solicitacoes.sql` | A: ALTER em `permanencias` e `prorrogacoes` · B: ALTER em `solicitacoes` (URL SEI) |
| 00019 | `00019_novas_categorias_auxiliares.sql` | `00019_perfil_usuario.sql` | A: INSERT em `tabelas_auxiliares` · B: ALTER em `usuarios` (perfil) |
| 00021 | `00021_tabela_cid10.sql` | `00021b_seed_cid10.sql` | A: CREATE TABLE `cid10` · B: SEED de ~14k registros CID-10 |
| 00028 | `00028_evolucao_unidades_destino.sql` | `00028_parametros_transporte_sigtap.sql` | A: ALTER em `unidades_destino` · B: DELETE+INSERT em `parametros_sistema` |

## Convenção daqui para frente

- Numeração sequencial sem colisão (`00037_*`, `00038_*`, ...)
- Nome descritivo em snake_case após o número
- Uma única responsabilidade por arquivo
- Nunca editar migrations já aplicadas — criar nova migration para corrigir

## Tabelas ainda não versionadas

Os services abaixo referenciam tabelas **que ainda não existem em migration**. Foram identificadas como features pedidas na Ata 07/2026 (10/04/2026) e precisam virar migrations:

| Service | Tabela(s) | Origem do pedido |
|---------|-----------|------------------|
| `src/services/teto-financeiro.service.ts` | `tetos_financeiros`, `alertas_teto` | Ata 07 §4.5.3 / Próximos Passos DA4 — indicador de consumo do contrato R$14M |
| `src/services/relatorio-atendimento.service.ts` | `relatorios_atendimento` | Ata 07 §4.1 e §4.3.7 / CF3 — relatório de faturamento mensal |
| `src/services/recibo-pagamento.service.ts` | `recibos_pagamento` | Ata 07 §4.4.8 / AC4 — registro de pagamento com valor real e saldo |

## Documentação relacionada

- `../../docs/auditoria-limpeza-schema.md` — auditoria completa do schema (2026-04-14)
- `../cleanup/01_limpeza_schema_dados.sql` — script de limpeza de dados transacionais
