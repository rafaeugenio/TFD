-- ============================================================
-- TFD — Migration 028: Parâmetros de Transporte baseados no SIGTAP
-- Substitui os 3 antigos (distância mínima, MEDIF, remarcação)
-- por 6 novos: base de cálculo + valor por procedimento para
-- cada modal (aéreo, terrestre, fluvial)
-- Ref.: Portaria SAS/MS n. 55/1999
-- ============================================================

DELETE FROM parametros_sistema WHERE grupo = 'transporte';

INSERT INTO parametros_sistema (grupo, chave, valor, tipo, label, descricao, editavel, ordem) VALUES
('transporte', 'base_calculo_aereo', '200', 'numero', 'Base de cálculo — Aéreo', 'Distância em milhas para cada procedimento aéreo (Portaria SAS/MS 55/1999)', true, 1),
('transporte', 'base_calculo_terrestre', '50', 'numero', 'Base de cálculo — Terrestre', 'Distância em milhas para cada procedimento terrestre (Portaria SAS/MS 55/1999)', true, 2),
('transporte', 'base_calculo_fluvial', '27', 'numero', 'Base de cálculo — Fluvial', 'Distância em milhas náuticas para cada procedimento fluvial (Portaria SAS/MS 55/1999)', true, 3),
('transporte', 'valor_procedimento_aereo', '181.50', 'numero', 'Valor por procedimento — Aéreo', 'Valor pago por cada 200 milhas de deslocamento aéreo (R$)', true, 4),
('transporte', 'valor_procedimento_terrestre', '4.95', 'numero', 'Valor por procedimento — Terrestre', 'Valor pago por cada 50 milhas de deslocamento terrestre (R$)', true, 5),
('transporte', 'valor_procedimento_fluvial', '3.70', 'numero', 'Valor por procedimento — Fluvial', 'Valor pago por cada 27 milhas náuticas de deslocamento fluvial (R$)', true, 6);
