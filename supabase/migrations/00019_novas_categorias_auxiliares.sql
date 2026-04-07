-- ============================================================
-- Migration: Novas categorias auxiliares para white-label
-- ============================================================

-- ─── ORIGENS DE LAUDO ───────────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('origem_laudo', 'ESTADUAL', 'Estadual', 1),
  ('origem_laudo', 'MUNICIPAL', 'Municipal', 2);

-- ─── CARÁTER DE ATENDIMENTO ─────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('carater_atendimento', 'HOSPITALAR', 'Hospitalar', 1),
  ('carater_atendimento', 'AMBULATORIAL', 'Ambulatorial', 2);

-- ─── TIPOS DE DOCUMENTO ────────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('tipo_documento', 'LAUDO_MEDICO', 'Laudo Médico', 1),
  ('tipo_documento', 'EXAME_COMPLEMENTAR', 'Exame Complementar', 2),
  ('tipo_documento', 'RELATORIO_TRATAMENTO_ANTERIOR', 'Relatório de Tratamento Anterior', 3),
  ('tipo_documento', 'DOCUMENTO_ENCAMINHAMENTO', 'Documento de Encaminhamento', 4),
  ('tipo_documento', 'RELATORIO_MEDICO_ACOMPANHAMENTO', 'Relatório Médico de Acompanhamento', 5),
  ('tipo_documento', 'DOCUMENTO_PESSOAL', 'Documento Pessoal', 6),
  ('tipo_documento', 'CARTAO_SUS', 'Cartão SUS', 7),
  ('tipo_documento', 'COMPROVANTE_RESIDENCIA', 'Comprovante de Residência', 8),
  ('tipo_documento', 'OUTROS', 'Outros', 99);

-- ─── DESTINATÁRIOS DE ROTA (REGULAÇÃO) ──────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, descricao, ordem) VALUES
  ('destinatario_rota', 'CNRAC', 'CNRAC', 'Central Nacional de Regulação de Alta Complexidade', 1),
  ('destinatario_rota', 'SETI', 'SETI', 'Sistema Estadual de Transplantes e Implantes', 2),
  ('destinatario_rota', 'RESPOSTA_EXTERNA', 'SAAS / Hospital Dutra', 'Solicitação de resposta externa', 3),
  ('destinatario_rota', 'SERVICO_SOCIAL', 'Serviço Social', 'Encaminhamento para Serviço Social', 4),
  ('destinatario_rota', 'CONTATO_DIRETO', 'Contato Direto', 'Contato direto com a unidade', 5);

-- ─── COMUNICADO POR (PERMANÊNCIA) ───────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('comunicado_por', 'PACIENTE', 'Paciente', 1),
  ('comunicado_por', 'RESPONSAVEL', 'Responsável', 2),
  ('comunicado_por', 'UNIDADE_DESTINO', 'Unidade de Destino', 3),
  ('comunicado_por', 'REGIONAL', 'Regional', 4);
