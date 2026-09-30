-- PBIs 16409, 16406, 16408 (Serviço Social / Casas de Apoio) e 16400-16402 (Financeiro).
-- Telas e permissões próprias, perfil "Serviço Social" e permissões do perfil "Financeiro".
-- Aplicado no Supabase do protótipo em 30/09/2026 via REST (upsert idempotente).

insert into telas_sistema (id, nome, modulo, rota, ordem, acoes_disponiveis) values
  ('servico_social', 'Serviço Social', 'Operacional', '/fluxo-v2/servico-social', 6, array['visualizar']),
  ('casas_apoio', 'Casas de Apoio', 'Cadastros', '/casas-apoio', 8, array['visualizar','criar','editar','excluir'])
on conflict (id) do update set nome = excluded.nome, modulo = excluded.modulo, rota = excluded.rota;

-- A tela antiga "financeiro" (/fluxo-v2/financeiro) saiu do modelo; o id passa a ser o módulo novo.
update telas_sistema set nome = 'Financeiro', modulo = 'Gestão', rota = '/financeiro', ordem = 10,
  acoes_disponiveis = array['visualizar','criar_competencia','faturamento_adicionar_linhas','faturamento_fechar','faturamento_reabrir','bpa_adicionar_linhas','bpa_fechar','bpa_reabrir']
where id = 'financeiro';

insert into permissoes (id, familia, nome, descricao, grupo, ordem, tela_id, tambem_em, ordem_tela, rotulo_curto) values
  ('tela.servico_social.visualizar', 'tela', 'Serviço Social', 'Acessar a fila do Serviço Social.', 'Fluxo', 201, 'servico_social', '{}', 1, 'Visualizar'),
  ('acao.servico_social.atender', 'acao', 'Atender demanda social', 'Assumir demandas e usar as ações da equipe na fila e na aba Serviço Social.', 'Fluxo', 202, 'servico_social', '{solicitacoes}', 2, 'Atender'),
  ('instrumento_social.criar', 'item', 'Criar instrumento social', 'Criar Parecer Social, Encaminhamento para Casa de Apoio e Declaração TFD-MA.', 'Fluxo', 203, 'servico_social', '{solicitacoes}', 3, 'Criar instrumento'),
  ('acao.servico_social.sigilo', 'acao', 'Abrir instrumento sigiloso', 'Abrir e baixar instrumentos marcados como sigilosos. Administrador não abre.', 'Fluxo', 204, 'servico_social', '{solicitacoes}', 4, 'Sigilosos'),
  ('tela.casas_apoio.visualizar', 'tela', 'Casas de Apoio', 'Acessar o cadastro de casas de apoio.', 'Cadastros', 211, 'casas_apoio', '{}', 1, 'Visualizar'),
  ('casa_apoio.criar', 'item', 'Criar casa de apoio', 'Cadastrar casa de apoio.', 'Cadastros', 212, 'casas_apoio', '{}', 2, 'Criar'),
  ('casa_apoio.editar', 'item', 'Editar casa de apoio', 'Editar casa de apoio.', 'Cadastros', 213, 'casas_apoio', '{}', 3, 'Editar'),
  ('casa_apoio.excluir', 'item', 'Excluir casa de apoio', 'Excluir casa de apoio.', 'Cadastros', 214, 'casas_apoio', '{}', 4, 'Excluir'),
  ('tela.financeiro.visualizar', 'tela', 'Financeiro', 'Acessar as competências de Faturamento e BPA. Separada de Relatórios.', 'Gestão', 221, 'financeiro', '{}', 1, 'Visualizar'),
  ('competencia.criar', 'item', 'Criar competência', 'Abrir a competência do mês (Faturamento e BPA).', 'Gestão', 222, 'financeiro', '{}', 2, 'Criar competência'),
  ('competencia.faturamento.adicionar_linhas', 'item', 'Faturamento: adicionar linhas', 'Adicionar e remover linhas do Faturamento com a aba aberta.', 'Gestão', 223, 'financeiro', '{}', 3, 'Faturamento: linhas'),
  ('competencia.faturamento.fechar', 'item', 'Faturamento: fechar competência', 'Fechar o Faturamento da competência.', 'Gestão', 224, 'financeiro', '{}', 4, 'Faturamento: fechar'),
  ('competencia.faturamento.reabrir', 'item', 'Faturamento: reabrir competência', 'Reabrir o Faturamento com motivo registrado no histórico.', 'Gestão', 225, 'financeiro', '{}', 5, 'Faturamento: reabrir'),
  ('competencia.bpa.adicionar_linhas', 'item', 'BPA: adicionar linhas', 'Adicionar e remover linhas do BPA com a aba aberta.', 'Gestão', 226, 'financeiro', '{}', 6, 'BPA: linhas'),
  ('competencia.bpa.fechar', 'item', 'BPA: fechar competência', 'Fechar o BPA da competência.', 'Gestão', 227, 'financeiro', '{}', 7, 'BPA: fechar'),
  ('competencia.bpa.reabrir', 'item', 'BPA: reabrir competência', 'Reabrir o BPA com motivo registrado no histórico.', 'Gestão', 228, 'financeiro', '{}', 8, 'BPA: reabrir')
on conflict (id) do nothing;

-- Perfil "Serviço Social" (antes "Assistente Social", sem usuários e só com o Painel).
update papeis set nome = 'Serviço Social', descricao = 'Equipe do Serviço Social: fila, demandas, instrumentos e casas de apoio'
where id = '00000000-0000-0000-0000-000000000008';

insert into papel_permissoes (papel_id, permissao_id)
select '00000000-0000-0000-0000-000000000008', unnest(array[
  'tela.servico_social.visualizar','acao.servico_social.atender','instrumento_social.criar','acao.servico_social.sigilo',
  'tela.casas_apoio.visualizar','casa_apoio.criar','casa_apoio.editar','casa_apoio.excluir','tela.solicitacoes.visualizar'])
on conflict do nothing;

insert into papel_permissoes (papel_id, permissao_id)
select '00000000-0000-0000-0000-000000000007', unnest(array[
  'tela.financeiro.visualizar','competencia.criar',
  'competencia.faturamento.adicionar_linhas','competencia.faturamento.fechar','competencia.faturamento.reabrir',
  'competencia.bpa.adicionar_linhas','competencia.bpa.fechar','competencia.bpa.reabrir'])
on conflict do nothing;
