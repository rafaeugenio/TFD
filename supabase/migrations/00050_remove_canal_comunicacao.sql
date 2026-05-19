-- A categoria auxiliar `canal_comunicacao` foi descontinuada — substituída
-- pelos campos livres de telefone e e-mail diretamente na tela de tentativa.
-- Remove os valores semeados e desativa qualquer registro remanescente.

UPDATE tabelas_auxiliares
   SET ativo = false
 WHERE categoria = 'canal_comunicacao';
