/**
 * Tabela de descrições amigáveis dos códigos CID usados no mock do
 * Fluxo v2/v3. Usado em tooltips na tabela de Regulação (T2.V) e em vários
 * outros lugares — operador passa o mouse no código e vê a descrição sem
 * precisar consultar tabela externa.
 *
 * T2.AI — Suporte a CID-10 (default) e CID-11. A versão é informada
 * pelo parecer médico via `ParecerMock.versaoCID`. Use `descricaoCID()`
 * para resolver descrições em qualquer ponto da UI.
 */
export const CID10_LABELS: Record<string, string> = {
  // Em uso no seed atual:
  'C25.9': 'Neoplasia maligna do pâncreas, não especificada',
  'C34.9': 'Neoplasia maligna dos brônquios e dos pulmões, não especificada',
  'C50.9': 'Neoplasia maligna da mama, não especificada',
  'C71.9': 'Neoplasia maligna do encéfalo, não especificada',
  'I25.1': 'Doença aterosclerótica do coração',
  'M16.5': 'Outras coxartroses pós-traumáticas',
  'N18.6': 'Doença renal crônica em estágio terminal',

  // Reservas (catálogo extra para uso futuro):
  'F32.2': 'Episódio depressivo grave sem sintomas psicóticos',
  'C61':   'Neoplasia maligna da próstata',
  'N18.5': 'Doença renal crônica, estágio 5',
  'E11':   'Diabetes mellitus tipo 2',
  'J44.9': 'Doença pulmonar obstrutiva crônica',
  'G40':   'Epilepsia',
  'K70':   'Doença alcoólica do fígado',
  'M54.5': 'Dor lombar baixa',
  'H25':   'Catarata senil',
  'I50':   'Insuficiência cardíaca',
  'C18':   'Neoplasia maligna do cólon',
  'F20':   'Esquizofrenia',
};

/**
 * Mapa parcial CID-11. Apenas alguns exemplos cadastrados — a SES adota
 * CID-10 oficialmente; CID-11 está em transição. Quando código não está
 * mapeado, `descricaoCID` retorna mensagem padronizada.
 */
export const CID11_LABELS: Record<string, string> = {
  '2C61.0': 'Adenocarcinoma da próstata, primário',
  '2C25.0': 'Adenocarcinoma ductal do pâncreas',
  'BA00':   'Cardiopatia isquêmica',
  'CA22':   'Doença pulmonar obstrutiva crônica',
  '5A11':   'Diabetes mellitus tipo 2',
  '6A70':   'Episódio depressivo único',
};

/**
 * Resolve a descrição de um código CID na versão informada (default: '10').
 * Quando não há mapeamento, retorna mensagem padronizada que indica versão.
 */
export function descricaoCID(codigo: string, versao: '10' | '11' = '10'): string {
  if (!codigo) return '';
  const map = versao === '11' ? CID11_LABELS : CID10_LABELS;
  return map[codigo] ?? `Descrição não cadastrada para CID-${versao} ${codigo}`;
}

/** Helper retrocompat: retorna o label CID-10, ou o próprio código se não houver mapeamento. */
export function cidLabel(cid: string | undefined | null): string {
  if (!cid) return '';
  return CID10_LABELS[cid] ?? cid;
}
