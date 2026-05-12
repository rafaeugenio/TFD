-- rotas_deslocamento + devolucoes: policies para o role `authenticated`.
-- Antes só `anon` podia escrever/deletar, então usuários logados não
-- conseguiam cadastrar rota nova no drawer de passagem.

CREATE POLICY "Authenticated users can insert rotas_deslocamento"
  ON public.rotas_deslocamento FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rotas_deslocamento"
  ON public.rotas_deslocamento FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rotas_deslocamento"
  ON public.rotas_deslocamento FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read devolucoes"
  ON public.devolucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert devolucoes"
  ON public.devolucoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update devolucoes"
  ON public.devolucoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete devolucoes"
  ON public.devolucoes FOR DELETE TO authenticated USING (true);
