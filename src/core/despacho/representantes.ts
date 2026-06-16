/**
 * Representantes (assinantes) de um despacho financeiro.
 *
 * O Nome vem do usuário escolhido no multi-select. Cargo e ID ("ID funcional")
 * são preenchidos à mão no drawer enquanto não viram atributos do cadastro de
 * usuário — esses dois campos ainda serão validados com o cliente (cargos
 * internos do TFD). Quando isso acontecer, o multi-select passa a auto-preencher
 * Cargo/ID a partir do usuário, sem precisar mexer no documento.
 */
export interface RepresentanteDespacho {
  /** Usuário do sistema vinculado, quando escolhido pelo multi-select. */
  usuario_id: string | null;
  nome: string;
  cargo: string;
  /** "ID" exibido no documento (ex.: "ID 00303550-00"). */
  id_funcional: string;
}

/**
 * Assinantes oficiais do TFD/SES-MA — fonte: Despacho 2163/COORDTFD/SES.
 *
 * Usados como default ao gerar um despacho novo e como fallback ao renderizar
 * despachos antigos que ainda não têm `representantes` salvos.
 */
export const REPRESENTANTES_PADRAO: RepresentanteDespacho[] = [
  {
    usuario_id: null,
    nome: 'Nubia Maria Silva Rocha',
    cargo: 'Tratamento Fora do Domicílio',
    id_funcional: 'ID 00303550-00',
  },
  {
    usuario_id: null,
    nome: 'Hilneth Pereira Passos Buna',
    cargo: 'Chefe do Departamento do TFD',
    id_funcional: 'ID 00891427-00',
  },
  {
    usuario_id: null,
    nome: 'Thalita Pereira Veiga',
    cargo: 'Superintendente Estadual de Regulação SES/MA',
    id_funcional: 'ID 89352700',
  },
];
