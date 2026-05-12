-- cid11: adiciona policies para o role `authenticated`.
-- A tabela tinha RLS ligado mas apenas policies para `anon`, fazendo com
-- que usuários logados (caso do painel de configurações > CID-11)
-- recebessem zero linhas no SELECT.

CREATE POLICY "Authenticated users can read cid11"
  ON public.cid11 FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cid11"
  ON public.cid11 FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update cid11"
  ON public.cid11 FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete cid11"
  ON public.cid11 FOR DELETE TO authenticated USING (true);
