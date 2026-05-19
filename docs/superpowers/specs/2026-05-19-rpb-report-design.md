# RPB — Relatório para lançamento no BPA

**Data:** 2026-05-19
**Status:** Design aprovado, aguardando implementação
**Origem:** Conversa com operadora que lança dados no BPA (sistema SES → governo federal)

---

## Contexto

A operadora do TFD lança manualmente, no sistema **BPA** (Boletim de Produção Ambulatorial), os dados de cada paciente atendido pelo programa para reportar à SES e ao governo brasileiro. Hoje ela extrai esses dados manualmente do sistema, o que é lento e suscetível a erros.

O BPA tem duas telas principais que ela precisa preencher por procedimento:

1. **Identificação do Paciente** — CPF/CNS, Nome, Sexo, Nascimento, endereço completo, contato
2. **Procedimento Realizado** — Dt. Atendimento, Código SIGTAP, Quantidade, CID

Outros campos do BPA (Nacionalidade, Raça/Cor, Etnia, CNPJ, Serviço, Classificação, Caráter Atendimento, Nº Autorização) **não são preenchidos** pela operadora hoje, então não entram no relatório.

## Objetivo

Adicionar uma nova aba **RPB** em `/relatorios` que apresente, ordenado cronologicamente, todos os dados que ela precisa digitar no BPA — facilitando a transcrição e oferecendo um checkbox de controle para marcar o que já foi lançado.

## Não-objetivos (YAGNI)

- Integração direta com o BPA (apenas relatório de leitura/marcação)
- Exportação para o formato `.bpa` proprietário
- Edição de dados clínicos pelo relatório
- Histórico/auditoria de quem lançou o quê além de `lancado_por`/`lancado_em`

---

## UX / Estrutura da aba

Nova aba **"RPB"** em `src/app/relatorios/page.tsx`, ao lado das 3 existentes (Financeiro, Faturamento, Ajuda de Custo). Ícone sugerido: `ClipboardList` ou `FileSpreadsheet`. Subtítulo: "Dados para lançamento no BPA".

### Toolbar

- **Tipo de relatório** (select): `Ajuda de Custo` (default) / `Passagens` — diferencia as duas tabelas RPB
- **Ano** (select)
- **Mês** (botões pílula): `Ano inteiro` + Jan..Dez
- **Período customizado** (expansível): datepickers `de` / `até`; quando preenchido, sobrescreve ano/mês
- **Botão "Atual"**: volta ao mês corrente
- **Imprimir** (já existe via `ReportShell`)

### Hero / Stats

- **Hero**: título "Relatório RPB — {tipo}", período legível, e à direita: `X lançadas / Y total`
- **StatsRow** (4 cards):
  1. Total de linhas
  2. Lançadas no BPA
  3. Pendentes (não lançadas)
  4. Total de quantidade (soma das diárias ou unidades, conforme tipo)

### Tabela

**Colunas comuns aos dois tipos:**

| ☑ | # | Dt. Atend. | CPF/CNS | Nome | Sexo | Nasc. | CEP | Município | Endereço | Bairro | Telefone | E-mail |

**Específicas — Ajuda de Custo:**

| Cód. SIGTAP | Qtd. (diárias) | CID |

**Específicas — Passagens:**

| Modal | Trecho | Cód. SIGTAP | Qtd. (unidades) | CID |

**Detalhes:**

- Checkbox da 1ª coluna = "Lançado no BPA" (persistente — ver seção Persistência)
- Linhas marcadas ficam com `opacity: 0.6` e badge visual `BPA ✓`
- Checkbox no header da coluna = marca/desmarca todas da página filtrada (bulk action)
- Endereço truncado com tooltip pro nome completo (rua + número + complemento)
- Ordenação default: `Dt. Atendimento ASC` (cronológica)
- Coluna do checkbox é oculta na impressão

---

## Regras de extração

### Ajuda de Custo

**Fonte:** tabela `ajudas_custo`.

- 1 linha por benefício
- A linha aparece no mês da `data_inicio` (mesmo se estender para o mês seguinte — ex: início 30/abr, fim 5/mai → aparece em abril com qtd = 6 dias)
- **Quantidade** = número total de diárias do benefício (já calculado em `ajudas_custo`)
- **Beneficiário** = paciente ou acompanhante (gera linha própria com dados de identificação do acompanhante)
- **Código SIGTAP** decidido por:
  - Beneficiário (paciente/acompanhante)
  - Com pernoite / sem pernoite
  - CNRAC (sim/não)
  - 6 códigos possíveis (`08.03.01.001-0` a `006-0`)
- **CID** = `solicitacoes.cid_principal`

### Passagens

**Fonte:** tabela `viagens` (filtra `ativa = true`).

- Ida e volta viram **linhas separadas**, cada uma no mês da própria data
- Para uma viagem `IDA_E_VOLTA` com datas em meses distintos: 2 linhas em meses distintos
- **Quantidade** = `ceil(distancia ÷ unidade_sigtap)`:
  - Terrestre: `ceil(distancia_km ÷ 50)`
  - Aéreo: `ceil(distancia_milhas ÷ 200)`
  - Fluvial: `ceil(distancia_milhas_nauticas ÷ 27)`
- **Modal** vem de `viagens.modal` (a confirmar no schema durante implementação; fallback: inferir por tipo de unidade de destino)
- **Distância** vem de `rotas_deslocamento` (lookup `origem_cidade+uf → destino_cidade+uf`)
- **Se a rota não existir em `rotas_deslocamento`**: linha aparece com `Qtd. = —` e um badge laranja "rota pendente". Não bloqueia o relatório.
- **Código SIGTAP** decidido por modal × beneficiário × CNRAC — 8 códigos (`007-9` a `014-1`)
- **CID** = `solicitacoes.cid_principal`
- Acompanhantes geram linhas próprias

### Helper compartilhado

Novo arquivo `src/app/relatorios/_shared/sigtap-mapper.ts` exporta:

```ts
function resolveSigtapAjudaCusto(input: {
  beneficiario: 'paciente' | 'acompanhante';
  comPernoite: boolean;
  cnrac: boolean;
}): { codigo: string; descricao: string }

function resolveSigtapPassagem(input: {
  beneficiario: 'paciente' | 'acompanhante';
  modal: 'terrestre' | 'aereo' | 'fluvial';
  cnrac: boolean;
}): { codigo: string; descricao: string; unidadeDivisor: number }
```

Mapas baseados no seed da migration `00022_tabela_sigtap.sql`.

---

## Persistência do checkbox "Lançado no BPA"

Nova migration `00051_bpa_lancamentos.sql`:

```sql
CREATE TABLE bpa_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ajuda_custo', 'passagem')),
  origem_id UUID NOT NULL,
  trecho VARCHAR(10) CHECK (trecho IN ('ida', 'volta') OR trecho IS NULL),
  lancado_em TIMESTAMPTZ DEFAULT NOW(),
  lancado_por UUID REFERENCES usuarios(id),
  UNIQUE (tipo, origem_id, trecho)
);

-- RLS authenticated full access (mesmo padrão dos demais relatórios)
ALTER TABLE bpa_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read"   ON bpa_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write"  ON bpa_lancamentos FOR ALL    TO authenticated USING (true) WITH CHECK (true);
```

- **Marcar checkbox** = INSERT
- **Desmarcar** = DELETE pelo `UNIQUE`
- **Visibilidade**: estado é do município (não por usuário) — qualquer usuário vê e edita o mesmo estado
- **Bulk**: checkbox do header faz INSERT/DELETE em batch para todas as linhas visíveis após filtros

---

## Arquivos afetados

**Novos:**
- `src/app/relatorios/_RelatorioRPB.tsx` — componente principal da aba
- `src/app/relatorios/_shared/sigtap-mapper.ts` — resolução de códigos SIGTAP
- `supabase/migrations/00051_bpa_lancamentos.sql` — tabela de controle

**Editados:**
- `src/app/relatorios/page.tsx` — adiciona entrada `'rpb'` em `TABS` e roteamento

**Reaproveitados (sem alteração):**
- `_shared/ReportShell.tsx` (Toolbar, Hero, Stats, TableCard, PrintStyles)
- `_shared/ReportTable.tsx`
- `_shared/format.ts` (MES_LABEL, fmtDataBR, anosDisponiveis)

---

## Critérios de aceite

1. Aba "RPB" aparece em `/relatorios` e responde ao parâmetro `?aba=rpb`
2. Select de tipo alterna entre Ajuda de Custo e Passagens preservando os filtros
3. Filtros Ano + Mês + período customizado funcionam de forma consistente com os outros relatórios
4. Cada linha exibe todos os campos comuns + os específicos do tipo, com dados extraídos corretamente
5. Para passagens, rota sem distância cadastrada não quebra a tabela — exibe badge de pendência
6. Código SIGTAP é resolvido corretamente para as 14 combinações possíveis
7. Checkbox "Lançado no BPA" persiste após reload e é compartilhado entre usuários
8. Bulk select (header) marca/desmarca apenas as linhas atualmente filtradas
9. Linhas marcadas ficam esmaecidas e ganham badge `BPA ✓`
10. Impressão omite a coluna de checkbox
11. Performance: relatório de 1 mês carrega em < 2s para até 500 linhas

## Riscos / pontos abertos

- **Campo `modal` em `viagens`**: confirmar nome exato no schema durante a implementação. Se não existir, pode ser necessário derivar de `unidades_destino` ou da rota.
- **Pernoite em `ajudas_custo`**: confirmar se já existe flag/campo indicando pernoite. Se não, pode ser derivado de `data_fim > data_inicio`.
- **CNRAC**: confirmar se temos a flag no fluxo (provavelmente flag na solicitação ou no destino).
- **Arredondamento de quantidade de passagens**: `ceil` é um chute baseado na lógica SIGTAP comum. Validar com a operadora antes de fechar.
