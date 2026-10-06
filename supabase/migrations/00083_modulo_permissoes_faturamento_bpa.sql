-- Módulo de permissões "Faturamento e BPA" (decisão do PO em 06/10/2026), separado de Relatórios.
-- Três telas no catálogo: Competências, Faturamento e BPA. Aplicado no Supabase do protótipo via REST.

update telas_sistema set nome = 'Competências', modulo = 'Faturamento e BPA', ordem = 1,
  acoes_disponiveis = array['visualizar','criar','excluir']
where id = 'financeiro';

insert into telas_sistema (id, nome, modulo, rota, ordem, acoes_disponiveis) values
  ('competencia_faturamento', 'Faturamento', 'Faturamento e BPA', '/financeiro', 2, array['adicionar_linhas','fechar','reabrir','exportar']),
  ('competencia_bpa', 'BPA', 'Faturamento e BPA', '/financeiro', 3, array['adicionar_linhas','marcar_lancada','fechar','reabrir','exportar'])
on conflict (id) do update set nome = excluded.nome, modulo = excluded.modulo, acoes_disponiveis = excluded.acoes_disponiveis;

update permissoes set grupo = 'Faturamento e BPA' where tela_id = 'financeiro';
update permissoes set tela_id = 'competencia_faturamento', ordem_tela = ordem_tela - 2 where id like 'competencia.faturamento.%';
update permissoes set tela_id = 'competencia_bpa' where id like 'competencia.bpa.%';
update permissoes set ordem_tela = 1 where id = 'competencia.bpa.adicionar_linhas';
update permissoes set ordem_tela = 3 where id = 'competencia.bpa.fechar';
update permissoes set ordem_tela = 4 where id = 'competencia.bpa.reabrir';

insert into permissoes (id, familia, nome, descricao, grupo, ordem, tela_id, tambem_em, ordem_tela, rotulo_curto) values
  ('competencia.excluir', 'item', 'Excluir competência', 'Excluir uma competência que ainda não teve nenhuma aba fechada.', 'Faturamento e BPA', 229, 'financeiro', '{}', 3, 'Excluir competência'),
  ('competencia.faturamento.exportar', 'item', 'Faturamento: exportar', 'Exportar o Faturamento da competência em PDF, CSV e Excel.', 'Faturamento e BPA', 230, 'competencia_faturamento', '{}', 4, 'Exportar'),
  ('competencia.bpa.marcar_lancada', 'item', 'BPA: marcar lançada', 'Marcar e desmarcar "Lançada no BPA" com a aba aberta.', 'Faturamento e BPA', 231, 'competencia_bpa', '{}', 2, 'Marcar lançada'),
  ('competencia.bpa.exportar', 'item', 'BPA: exportar', 'Exportar o BPA da competência em PDF, CSV e Excel.', 'Faturamento e BPA', 232, 'competencia_bpa', '{}', 5, 'Exportar')
on conflict (id) do nothing;

insert into papel_permissoes (papel_id, permissao_id)
select '00000000-0000-0000-0000-000000000007', unnest(array[
  'competencia.excluir','competencia.faturamento.exportar','competencia.bpa.marcar_lancada','competencia.bpa.exportar'])
on conflict do nothing;
