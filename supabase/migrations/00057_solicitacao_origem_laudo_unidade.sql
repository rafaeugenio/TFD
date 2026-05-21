-- Vincula a "origem do laudo" da solicitação a uma unidade de saúde cadastrada
-- (tabela `unidades_destino`, que apesar do nome legado é hoje o cadastro
-- canônico de unidades de saúde do sistema — tela `/unidades-saude`).
--
-- Motivação (Ata Ilunete, mai/2026):
--   A gestora precisa de relatórios por região mostrando de qual unidade de
--   saúde o paciente foi encaminhado (UPA do Araçagi, UBS X, hospital municipal
--   Y), com CID e descrição, para apoiar análise epidemiológica regional e
--   relatórios para a SES.
--
-- Mudanças:
--   1. Adiciona `origem_laudo_unidade_id` em `solicitacoes` (FK opcional para
--      `unidades_destino`).
--   2. A coluna texto antiga `origem_laudo` (atualmente 0 registros usados)
--      fica como legado e pode ser deprecada em migration futura. Mantida por
--      enquanto para não quebrar adapters que possam referenciar.
--   3. `data_laudo` (date) já existe em `solicitacoes` desde o schema inicial;
--      esta migration só formaliza o uso via comentário.
--
-- Após esta migration:
--   - O form de cadastro/edição da solicitação ganha um select "Origem do
--     laudo" que lista todas as unidades de saúde ativas e grava o id.
--   - O relatório "Controle" (próxima US) pode agrupar/filtrar por unidade,
--     regional e macroregião através do join unidades_destino → regionais_saude.

ALTER TABLE solicitacoes
    ADD COLUMN origem_laudo_unidade_id UUID REFERENCES unidades_destino(id) ON DELETE SET NULL;

CREATE INDEX idx_solicitacoes_origem_laudo_unidade ON solicitacoes (origem_laudo_unidade_id);

COMMENT ON COLUMN solicitacoes.origem_laudo_unidade_id IS
    'Unidade de saúde que emitiu o laudo médico que originou a solicitação. FK para unidades_destino (cadastro canônico de unidades — tela /unidades-saude).';

COMMENT ON COLUMN solicitacoes.data_laudo IS
    'Data do laudo médico emitido pela unidade de origem (origem_laudo_unidade_id).';
