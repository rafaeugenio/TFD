-- ============================================================
-- TFD — Migration 081: histórico de processos SEI da solicitação
-- ============================================================
-- Pedido do Rafael (26/08/2026) — hoje a solicitação guarda um único
-- processo SEI (`numero_protocolo`/`url_sei`). Na prática, um paciente em
-- tratamento longo gera processo novo a cada mês, e o setor precisa manter
-- todos registrados, não só o mais recente.
--
-- Guardamos o histórico completo em JSONB em vez de uma tabela própria:
-- não há necessidade de consultar processos SEI isoladamente (sempre são
-- lidos junto com a solicitação), e uma coluna aditiva simples não exige
-- embed no select compartilhado (`selectShape.ts`) nem corre o risco de
-- derrubar a query inteira enquanto a migration não é aplicada — só essa
-- coluna específica vem `undefined` até lá.
--
-- Formato de cada item: { id, numero, url, data }. O último item do array
-- é sempre o processo vigente. `numero_protocolo`/`url_sei` continuam
-- existindo e passam a espelhar sempre o vigente, para compatibilidade com
-- o restante do sistema que ainda lê essas colunas diretamente.
-- ============================================================

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS processos_sei JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN solicitacoes.processos_sei IS
  'Histórico de processos SEI da solicitação: array de { id, numero, url, data }, do mais antigo ao mais recente. O último item é o vigente — espelhado em numero_protocolo/url_sei para compatibilidade.';
