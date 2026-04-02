-- ============================================================
-- TFD — Migration 005: Permitir acesso anon (pré-autenticação)
-- Temporário: até implementar login com Supabase Auth.
-- Após implementar auth, remover as policies "anon" e manter
-- apenas as "authenticated".
-- ============================================================

-- Tabelas auxiliares
CREATE POLICY "anon read tabelas_auxiliares" ON tabelas_auxiliares FOR SELECT TO anon USING (true);
CREATE POLICY "anon write tabelas_auxiliares" ON tabelas_auxiliares FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update tabelas_auxiliares" ON tabelas_auxiliares FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete tabelas_auxiliares" ON tabelas_auxiliares FOR DELETE TO anon USING (true);

-- Unidades de destino
CREATE POLICY "anon read unidades_destino" ON unidades_destino FOR SELECT TO anon USING (true);
CREATE POLICY "anon write unidades_destino" ON unidades_destino FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update unidades_destino" ON unidades_destino FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete unidades_destino" ON unidades_destino FOR DELETE TO anon USING (true);

-- Companhias de transporte
CREATE POLICY "anon read companhias_transporte" ON companhias_transporte FOR SELECT TO anon USING (true);
CREATE POLICY "anon write companhias_transporte" ON companhias_transporte FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update companhias_transporte" ON companhias_transporte FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete companhias_transporte" ON companhias_transporte FOR DELETE TO anon USING (true);

-- Parâmetros do sistema
CREATE POLICY "anon read parametros_sistema" ON parametros_sistema FOR SELECT TO anon USING (true);
CREATE POLICY "anon write parametros_sistema" ON parametros_sistema FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update parametros_sistema" ON parametros_sistema FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete parametros_sistema" ON parametros_sistema FOR DELETE TO anon USING (true);

-- Municípios
CREATE POLICY "anon read municipios" ON municipios FOR SELECT TO anon USING (true);
CREATE POLICY "anon write municipios" ON municipios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update municipios" ON municipios FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete municipios" ON municipios FOR DELETE TO anon USING (true);

-- Tabela de diárias
CREATE POLICY "anon read tabela_diarias" ON tabela_diarias FOR SELECT TO anon USING (true);
CREATE POLICY "anon write tabela_diarias" ON tabela_diarias FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update tabela_diarias" ON tabela_diarias FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete tabela_diarias" ON tabela_diarias FOR DELETE TO anon USING (true);

-- Usuários
CREATE POLICY "anon read usuarios" ON usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "anon write usuarios" ON usuarios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update usuarios" ON usuarios FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete usuarios" ON usuarios FOR DELETE TO anon USING (true);

-- Papéis (RBAC)
CREATE POLICY "anon read papeis" ON papeis FOR SELECT TO anon USING (true);
CREATE POLICY "anon write papeis" ON papeis FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update papeis" ON papeis FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete papeis" ON papeis FOR DELETE TO anon USING (true);

-- Papel ↔ Telas
CREATE POLICY "anon read papel_telas" ON papel_telas FOR SELECT TO anon USING (true);
CREATE POLICY "anon write papel_telas" ON papel_telas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update papel_telas" ON papel_telas FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete papel_telas" ON papel_telas FOR DELETE TO anon USING (true);

-- Telas do sistema
CREATE POLICY "anon read telas_sistema" ON telas_sistema FOR SELECT TO anon USING (true);

-- Códigos de convite
CREATE POLICY "anon read codigos_convite" ON codigos_convite FOR SELECT TO anon USING (true);
CREATE POLICY "anon write codigos_convite" ON codigos_convite FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update codigos_convite" ON codigos_convite FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Solicitações e entidades operacionais
CREATE POLICY "anon all solicitacoes" ON solicitacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all pacientes" ON pacientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all acompanhantes" ON acompanhantes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all documentos" ON documentos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all pareceres" ON pareceres FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all exigencias" ON exigencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all rotas_regulacao" ON rotas_regulacao FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all cobrancas_externas" ON cobrancas_externas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all validacoes_rpb" ON validacoes_rpb FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all agendamentos" ON agendamentos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all viagens" ON viagens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all remarcacoes" ON remarcacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all dados_bancarios" ON dados_bancarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all ajudas_custo" ON ajudas_custo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all permanencias" ON permanencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all prorrogacoes" ON prorrogacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all encerramentos" ON encerramentos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all notificacoes" ON notificacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all observacoes_processo" ON observacoes_processo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all log_auditoria" ON log_auditoria FOR ALL TO anon USING (true) WITH CHECK (true);
