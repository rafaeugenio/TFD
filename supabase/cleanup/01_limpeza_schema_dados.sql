-- =============================================================================
-- Script: 01_limpeza_schema_dados.sql
-- Data:   2026-04-14
-- Autor:  Auditoria TFD (docs/auditoria-limpeza-schema.md)
-- =============================================================================
--
-- OBJETIVO
-- 1. Remover dados duplicados de regionais (categoria antiga em tabelas_auxiliares)
-- 2. Limpar todos os dados transacionais (solicitações + dependentes)
-- 3. Limpar cadastros básicos (pacientes, médicos, unidades_destino)
--
-- PRESERVA
-- - usuarios, papeis, telas_sistema, papel_tela_acoes, codigos_convite
-- - municipios, regionais_saude, regionais_saude_municipios
-- - cid10, sigtap_procedimentos, adicionais, companhias_transporte
-- - rotas_deslocamento, tabela_diarias
-- - parametros_sistema
-- - tabelas_auxiliares (exceto categoria='regional')
--
-- =============================================================================
-- PRÉ-REQUISITOS OBRIGATÓRIOS
-- =============================================================================
-- 1. Fazer pg_dump ANTES de rodar:
--      supabase db dump --local > backup_pre_limpeza_$(date +%Y%m%d_%H%M).sql
--    ou via Dashboard: Database > Backups > Create backup
-- 2. Rodar primeiro em staging/local, nunca direto em produção
-- 3. Confirmar que nenhum job/cron está escrevendo nas tabelas alvo
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. SNAPSHOT PRÉ-LIMPEZA (apenas leitura — resultado fica no log)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== CONTAGEM PRÉ-LIMPEZA ===';
  FOR r IN
    SELECT 'solicitacoes'       AS tabela, COUNT(*)::text AS qtd FROM solicitacoes
    UNION ALL SELECT 'pacientes',           COUNT(*)::text FROM pacientes
    UNION ALL SELECT 'acompanhantes',       COUNT(*)::text FROM acompanhantes
    UNION ALL SELECT 'dados_bancarios',     COUNT(*)::text FROM dados_bancarios
    UNION ALL SELECT 'medicos',             COUNT(*)::text FROM medicos
    UNION ALL SELECT 'unidades_destino',    COUNT(*)::text FROM unidades_destino
    UNION ALL SELECT 'agendamentos',        COUNT(*)::text FROM agendamentos
    UNION ALL SELECT 'viagens',             COUNT(*)::text FROM viagens
    UNION ALL SELECT 'ajudas_custo',        COUNT(*)::text FROM ajudas_custo
    UNION ALL SELECT 'permanencias',        COUNT(*)::text FROM permanencias
    UNION ALL SELECT 'pareceres',           COUNT(*)::text FROM pareceres
    UNION ALL SELECT 'documentos',          COUNT(*)::text FROM documentos
    UNION ALL SELECT 'tabelas_auxiliares (regional)',
      COUNT(*)::text FROM tabelas_auxiliares WHERE categoria = 'regional'
  LOOP
    RAISE NOTICE '  % = %', r.tabela, r.qtd;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 1. REMOVER REGIONAIS DUPLICADAS (versão antiga em tabelas_auxiliares)
-- -----------------------------------------------------------------------------
-- Migration 00025 populou categoria='regional' em tabelas_auxiliares.
-- Migration 00032 criou a entidade oficial regionais_saude + regionais_saude_municipios.
-- As duas versões coexistem — removemos a antiga.
DELETE FROM tabelas_auxiliares
WHERE categoria = 'regional';

-- -----------------------------------------------------------------------------
-- 2. LIMPAR DADOS TRANSACIONAIS (TRUNCATE CASCADE)
-- -----------------------------------------------------------------------------
-- TRUNCATE CASCADE propaga via FKs. Ao truncar as 6 tabelas raiz abaixo,
-- todas as filhas são zeradas automaticamente:
--   solicitacoes       → documentos, pareceres, exigencias, observacoes_processo,
--                        devolucoes, termos_compromisso, solicitacao_acompanhantes,
--                        rotas_regulacao, cobrancas_externas, validacoes_rpb,
--                        agendamentos, viagens, remarcacoes, prorrogacoes,
--                        permanencias, ajudas_custo, encerramentos, notificacoes
--   pacientes          → acompanhantes, dados_bancarios (FKs diretas)
--   medicos            → pareceres (m030 FK)
--   unidades_destino   → agendamentos (m029 FK)
--
-- RESTART IDENTITY zera as sequences (IDs começam em 1 de novo).
TRUNCATE TABLE
  solicitacoes,
  pacientes,
  acompanhantes,
  dados_bancarios,
  medicos,
  unidades_destino
RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 3. LIMPEZA OPCIONAL DE LOG DE AUDITORIA
-- -----------------------------------------------------------------------------
-- Se quiser zerar a trilha de auditoria junto (banco totalmente limpo),
-- descomente a linha abaixo. Caso contrário, o log histórico será mantido.
--
-- TRUNCATE TABLE log_auditoria RESTART IDENTITY;

-- -----------------------------------------------------------------------------
-- 4. NOTIFICAÇÕES ÓRFÃS (tabela sem FK direta para solicitacoes)
-- -----------------------------------------------------------------------------
-- notificacoes pode ter registros sem FK em cascata. Zeramos para consistência.
TRUNCATE TABLE notificacoes RESTART IDENTITY;

-- -----------------------------------------------------------------------------
-- 5. SNAPSHOT PÓS-LIMPEZA
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== CONTAGEM PÓS-LIMPEZA ===';
  FOR r IN
    SELECT 'solicitacoes'       AS tabela, COUNT(*)::text AS qtd FROM solicitacoes
    UNION ALL SELECT 'pacientes',           COUNT(*)::text FROM pacientes
    UNION ALL SELECT 'acompanhantes',       COUNT(*)::text FROM acompanhantes
    UNION ALL SELECT 'dados_bancarios',     COUNT(*)::text FROM dados_bancarios
    UNION ALL SELECT 'medicos',             COUNT(*)::text FROM medicos
    UNION ALL SELECT 'unidades_destino',    COUNT(*)::text FROM unidades_destino
    UNION ALL SELECT 'agendamentos',        COUNT(*)::text FROM agendamentos
    UNION ALL SELECT 'viagens',             COUNT(*)::text FROM viagens
    UNION ALL SELECT 'ajudas_custo',        COUNT(*)::text FROM ajudas_custo
    UNION ALL SELECT 'permanencias',        COUNT(*)::text FROM permanencias
    UNION ALL SELECT 'pareceres',           COUNT(*)::text FROM pareceres
    UNION ALL SELECT 'documentos',          COUNT(*)::text FROM documentos
    UNION ALL SELECT 'regionais_saude (preservada)',
      COUNT(*)::text FROM regionais_saude
    UNION ALL SELECT 'tabelas_auxiliares (preservada sem regional)',
      COUNT(*)::text FROM tabelas_auxiliares
  LOOP
    RAISE NOTICE '  % = %', r.tabela, r.qtd;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- ATENÇÃO: Revise os valores pós-limpeza ANTES do COMMIT.
-- Se estiver inesperado, execute ROLLBACK; (linha abaixo) em vez de COMMIT.
-- -----------------------------------------------------------------------------

COMMIT;
-- ROLLBACK;  -- use esta linha no lugar de COMMIT se algo estiver errado

-- =============================================================================
-- PÓS-EXECUÇÃO (manual)
-- =============================================================================
-- 1. Limpar documentos órfãos no Supabase Storage:
--    Bucket 'documentos' → path 'solicitacoes/*' (todos os arquivos são órfãos
--    após o TRUNCATE, pois a tabela documentos foi zerada via CASCADE)
--
-- 2. Validar telas do sistema (login, dashboard, cadastros novos) para confirmar
--    que nada quebrou.
-- =============================================================================
