/**
 * Dados fictícios dos últimos 3 meses para testar o fluxo e o assistente de IA.
 *
 * Uso (na raiz do repo):
 *   npx tsx --env-file=.env.local scripts/seed-demo/seed-ultimos-3-meses.mts --sql      # só gera a migration
 *   npx tsx --env-file=.env.local scripts/seed-demo/seed-ultimos-3-meses.mts --aplicar  # limpa a demo anterior e insere
 *   npx tsx --env-file=.env.local scripts/seed-demo/seed-ultimos-3-meses.mts --limpar   # remove a demo (solicitações só saem depois de corrigir o gatilho de auditoria, ver ATUALIZAR_NO_LUGAR)
 *
 * Tudo é gerado de forma determinística (mesma semente, mesmos dados). Os ids
 * ficam na faixa `d3a0xxxx-...` e os processos na faixa TFD-*-2026/9xxxxx, o
 * que permite remover a demo sem tocar no resto do banco. Nomes, CPFs e CNS
 * são inventados (CPF e CNS com dígito verificador válido só para a tela
 * aceitar). Nada aqui é dado real.
 */
import { writeFileSync } from 'node:fs';

/* ------------------------------------------------------------------ */
/*  Base: aleatório determinístico, datas e ids                        */
/* ------------------------------------------------------------------ */

let semente = 20261007;
const rnd = () => { semente = (semente + 0x6d2b79f5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(l: readonly T[]): T => l[Math.floor(rnd() * l.length)];
const chance = (p: number) => rnd() < p;
const reais = (a: number, b: number, passo = 5) => Math.round(int(a, b) / passo) * passo;

const HOJE = new Date('2026-10-07T12:00:00-03:00');
const dia = (d: Date) => d.toISOString().slice(0, 10);
const somar = (d: Date, dias: number) => new Date(d.getTime() + dias * 86_400_000);
const ts = (d: Date, hora = int(8, 17), min = int(0, 59)) => `${dia(d)}T${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}:00-03:00`;
const ateHoje = (d: Date) => (d > HOJE ? HOJE : d);

const TABELA = {
  paciente: 1, acompanhante: 2, unidade: 3, solicitacao: 4, vinculo: 5, parecer: 6, rota: 7, tentativa: 8,
  agendamento: 9, viagem: 10, ajuda: 11, adicional: 12, encerramento: 13,
} as const;
const contadores: Record<string, number> = {};
const uid = (t: keyof typeof TABELA) => {
  contadores[t] = (contadores[t] ?? 0) + 1;
  return `d3a0${TABELA[t].toString(16).padStart(4, '0')}-0000-4000-8000-${contadores[t].toString(16).padStart(12, '0')}`;
};
const ID_MIN = 'd3a00000-0000-0000-0000-000000000000';
const ID_MAX = 'd3a10000-0000-0000-0000-000000000000';

/* ------------------------------------------------------------------ */
/*  Documentos fictícios com dígito verificador válido                 */
/* ------------------------------------------------------------------ */

const cpfsUsados = new Set<string>();
function cpf(): string {
  for (;;) {
    const n = Array.from({ length: 9 }, () => int(0, 9));
    if (new Set(n).size === 1) continue;
    const dv = (base: number[]) => { const s = base.reduce((t, d, i) => t + d * (base.length + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    n.push(dv(n)); n.push(dv(n));
    const c = n.join('');
    if (!cpfsUsados.has(c)) { cpfsUsados.add(c); return c; }
  }
}
/** CNS provisório (começa com 7, 8 ou 9): soma ponderada 15..1 múltipla de 11. */
function cns(): string {
  for (;;) {
    const n = [pick([7, 8, 9]), ...Array.from({ length: 13 }, () => int(0, 9))];
    const s = n.reduce((t, d, i) => t + d * (15 - i), 0);
    for (let ultimo = 0; ultimo <= 9; ultimo++) if ((s + ultimo) % 11 === 0) return [...n, ultimo].join('');
  }
}

/* ------------------------------------------------------------------ */
/*  Listas de apoio                                                     */
/* ------------------------------------------------------------------ */

const NOMES_F = ['Ana', 'Maria', 'Francisca', 'Antônia', 'Raimunda', 'Luzia', 'Joana', 'Tereza', 'Rita', 'Conceição', 'Josefa', 'Lúcia', 'Rosa', 'Helena', 'Clara', 'Beatriz', 'Larissa', 'Camila', 'Juliana', 'Fernanda', 'Patrícia', 'Sandra', 'Débora', 'Eliane', 'Vitória'];
const NOMES_M = ['José', 'João', 'Antônio', 'Francisco', 'Raimundo', 'Manoel', 'Pedro', 'Paulo', 'Carlos', 'Luís', 'Marcos', 'Benedito', 'Sebastião', 'Domingos', 'Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Thiago', 'Davi', 'Henrique', 'Valdir', 'Edson', 'Wesley', 'Cícero'];
const SOBRENOMES = ['Silva', 'Santos', 'Sousa', 'Oliveira', 'Pereira', 'Lima', 'Costa', 'Carvalho', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Araújo', 'Ribeiro', 'Barros', 'Mendes', 'Castro', 'Moraes', 'Pinheiro', 'Coelho', 'Batista', 'Freitas', 'Rocha', 'Vieira', 'Martins'];
const nome = (sexo: 'F' | 'M') => `${pick(sexo === 'F' ? NOMES_F : NOMES_M)} ${pick(SOBRENOMES)} ${pick(SOBRENOMES)}`;
const BAIRROS = ['Centro', 'Cohab', 'Vila Nova', 'São Francisco', 'Anil', 'Bequimão', 'Cohatrac', 'Santa Rita', 'Bacuri', 'Parque Amazonas'];

/** Municípios do banco (id fixo) com nome acentuado para viagens. */
const MUNICIPIOS = [
  { id: 'be71874f-69d1-4651-a12c-76da8af86bbe', nome: 'São Luís' },
  { id: '1a590f3d-d216-49cf-b4a7-87aab5ba31b3', nome: 'Imperatriz' },
  { id: '51bfdc15-217d-45f2-9009-5bbfce3250b5', nome: 'Caxias' },
  { id: 'e5503940-53f9-4562-bd11-41ae98af1c69', nome: 'Timon' },
  { id: 'bb776128-efa3-402a-85c0-88493633c408', nome: 'Codó' },
  { id: '96be33fd-8d7f-41a4-b1b7-65b075c7263b', nome: 'Açailândia' },
  { id: '4dff6feb-1fc7-4400-a4fc-5ca476108874', nome: 'Bacabal' },
  { id: 'ea6d7f56-c44e-4cfb-b923-2420d4728988', nome: 'Balsas' },
  { id: 'aaaaaaaa-0001-0001-0001-000000000009', nome: 'Santa Inês' },
  { id: 'aaaaaaaa-0001-0001-0001-000000000010', nome: 'Chapadinha' },
  { id: 'aaaaaaaa-0001-0001-0001-000000000011', nome: 'Pinheiro' },
  { id: 'aaaaaaaa-0001-0001-0001-000000000012', nome: 'Paço do Lumiar' },
  { id: 'aaaaaaaa-0001-0001-0001-000000000013', nome: 'São José de Ribamar' },
  { id: 'aaaaaaaa-0001-0001-0001-000000000014', nome: 'Viana' },
] as const;

/** Especialidade, CID, procedimento e onde costuma ser atendida. */
const ESPECIALIDADES = [
  { esp: 'Oncologia', cid: 'C50.9', diag: 'Neoplasia maligna da mama', proc: 'TRATAMENTO', ufs: ['SP', 'RJ', 'CE', 'PI'] },
  { esp: 'Oncologia', cid: 'C61', diag: 'Neoplasia maligna da próstata', proc: 'CIRURGIA', ufs: ['SP', 'CE', 'PE'] },
  { esp: 'Cardiologia', cid: 'I25.1', diag: 'Doença aterosclerótica do coração', proc: 'CIRURGIA', ufs: ['SP', 'CE', 'DF'] },
  { esp: 'Nefrologia', cid: 'N18.5', diag: 'Doença renal crônica estágio 5', proc: 'TRATAMENTO', ufs: ['MA', 'PE', 'CE'] },
  { esp: 'Neurocirurgia', cid: 'D33.2', diag: 'Neoplasia benigna do encéfalo', proc: 'CIRURGIA', ufs: ['SP', 'DF', 'PA'] },
  { esp: 'Ortopedia', cid: 'M16.1', diag: 'Coxartrose primária', proc: 'CIRURGIA', ufs: ['DF', 'MA', 'GO'] },
  { esp: 'Neurologia', cid: 'G40.9', diag: 'Epilepsia não especificada', proc: 'CONSULTA', ufs: ['MA', 'DF', 'SP'] },
  { esp: 'Pneumologia', cid: 'J84.1', diag: 'Fibrose pulmonar', proc: 'EXAME', ufs: ['SP', 'CE'] },
  { esp: 'Oftalmologia', cid: 'H33.0', diag: 'Descolamento de retina', proc: 'CIRURGIA', ufs: ['GO', 'MA', 'PI'] },
  { esp: 'Cardiologia Pediátrica', cid: 'Q21.0', diag: 'Comunicação interventricular', proc: 'CIRURGIA', ufs: ['SP', 'PE'] },
] as const;

/** Unidades de saúde novas (fictícias), além das que já existem no banco. */
const UNIDADES_NOVAS = [
  { nome: 'Hospital de Oncologia de Teresina', cidade: 'Teresina', uf: 'PI', tipo: 'HOSPITAL' },
  { nome: 'Instituto Cardiológico do Ceará', cidade: 'Fortaleza', uf: 'CE', tipo: 'HOSPITAL' },
  { nome: 'Centro de Nefrologia do Recife', cidade: 'Recife', uf: 'PE', tipo: 'CLINICA' },
  { nome: 'Hospital Infantil de Pernambuco', cidade: 'Recife', uf: 'PE', tipo: 'HOSPITAL' },
  { nome: 'Hospital Neurológico de Belém', cidade: 'Belém', uf: 'PA', tipo: 'HOSPITAL' },
  { nome: 'Hospital Ortopédico do Centro-Oeste', cidade: 'Goiânia', uf: 'GO', tipo: 'HOSPITAL' },
  { nome: 'Centro de Olhos de Goiânia', cidade: 'Goiânia', uf: 'GO', tipo: 'CLINICA' },
  { nome: 'Clínica de Retina do Piauí', cidade: 'Teresina', uf: 'PI', tipo: 'CLINICA' },
  { nome: 'Hospital de Transplantes do Nordeste', cidade: 'Fortaleza', uf: 'CE', tipo: 'HOSPITAL' },
  { nome: 'Centro de Diálise de Imperatriz', cidade: 'Imperatriz', uf: 'MA', tipo: 'CLINICA' },
  { nome: 'Hospital de Pneumologia de São Paulo', cidade: 'São Paulo', uf: 'SP', tipo: 'HOSPITAL' },
  { nome: 'Instituto de Neurocirurgia de Brasília', cidade: 'Brasília', uf: 'DF', tipo: 'HOSPITAL' },
] as const;

const COMPANHIAS_AEREAS = ['LATAM Airlines', 'GOL Linhas Aéreas', 'Azul Linhas Aéreas'];
const COMPANHIAS_ONIBUS = ['Viação São Luís', 'Expresso Guanabara', 'Real Maia', 'Expresso Viana'];
const MEDICOS = ['Dra. Helena Maranhão', 'Dr. Otávio Ribamar', 'Dra. Sílvia Cutrim', 'Dr. Jorge Bandeira', 'Dra. Paula Serra'];

/* ------------------------------------------------------------------ */
/*  Saída                                                               */
/* ------------------------------------------------------------------ */

type Linha = Record<string, unknown>;
const out: Record<string, Linha[]> = {
  unidades_destino: [], pacientes: [], acompanhantes: [], solicitacoes: [], solicitacao_acompanhantes: [], pareceres: [],
  rotas_regulacao: [], tentativas_agendamento: [], agendamentos: [], viagens: [], ajudas_custo: [], adicionais: [], encerramentos: [],
};
/** Ordem de inserção (respeita as chaves estrangeiras); a limpeza usa a ordem inversa. */
const ORDEM = Object.keys(out);

/* Unidades: novas + existentes fora do domicílio, lidas do banco. */
type Unidade = { id: string; nome: string; cidade: string; uf: string; cnes: string | null };
const unidades: Unidade[] = [];
for (const u of UNIDADES_NOVAS) {
  const id = uid('unidade');
  const cnes = `9${String(int(0, 999999)).padStart(6, '0')}`;
  out.unidades_destino.push({
    id, nome: u.nome, cidade: u.cidade, municipio: u.cidade, uf: u.uf, tipo: u.tipo, cnes, ativo: true,
    telefone: `(${u.uf === 'MA' ? '99' : '86'}) 3${int(100, 999)}-${int(1000, 9999)}`, responsavel: nome(chance(0.5) ? 'F' : 'M'),
    contato_nome: 'Central de Regulação', contato_email: `regulacao.demo${contadores.unidade}@exemplo.org`,
    logradouro: `Av. ${pick(SOBRENOMES)}`, numero: String(int(10, 2000)), bairro: pick(BAIRROS),
  });
  unidades.push({ id, nome: u.nome, cidade: u.cidade, uf: u.uf, cnes });
}

/* Pacientes (alguns com mais de uma solicitação) e acompanhantes. */
type Paciente = { id: string; nome: string; cpf: string; municipio: (typeof MUNICIPIOS)[number]; idade: number; acompanhantes: string[] };
const pacientes: Paciente[] = [];
function novoPaciente(): Paciente {
  const sexo = chance(0.52) ? 'F' : 'M';
  const idade = chance(0.12) ? int(1, 14) : chance(0.3) ? int(60, 86) : int(18, 59);
  const nasc = new Date(Date.UTC(2026 - idade, int(0, 11), int(1, 28)));
  const m = pick(MUNICIPIOS);
  const p: Paciente = { id: uid('paciente'), nome: nome(sexo), cpf: cpf(), municipio: m, idade, acompanhantes: [] };
  out.pacientes.push({
    id: p.id, nome_completo: p.nome, cpf: p.cpf, cns: cns(), sexo: sexo === 'F' ? 'FEMININO' : 'MASCULINO', data_nascimento: dia(nasc),
    nome_mae: nome('F'), telefone_celular: `(98) 9${int(8000, 9999)}-${int(1000, 9999)}`, logradouro: `Rua ${pick(SOBRENOMES)}`,
    numero: String(int(1, 999)), bairro: pick(BAIRROS), cep: `65${int(0, 999).toString().padStart(3, '0')}-000`,
    municipio: m.nome, uf: 'MA', municipio_residencia_id: m.id, zona_regional: pick(['Norte', 'Sul', 'Leste', 'Oeste', 'Centro']),
    ativo: true, created_at: ts(somar(HOJE, -int(95, 400))),
  });
  // Menores e idosos quase sempre têm acompanhante.
  if (idade < 18 || idade >= 60 || chance(0.45)) {
    const sexoA = chance(0.6) ? 'F' : 'M';
    const id = uid('acompanhante');
    out.acompanhantes.push({
      id, paciente_id: p.id, nome_completo: nome(sexoA), cpf: cpf(), sexo: sexoA === 'F' ? 'FEMININO' : 'MASCULINO',
      vinculo: idade < 18 ? 'PAI_MAE' : pick(['CONJUGE', 'FILHO', 'OUTRO', 'RESPONSAVEL_LEGAL']),
      telefone: `(98) 9${int(8000, 9999)}-${int(1000, 9999)}`, data_nascimento: dia(new Date(Date.UTC(int(1960, 2000), int(0, 11), int(1, 28)))),
    });
    p.acompanhantes.push(id);
  }
  pacientes.push(p);
  return p;
}

/* ------------------------------------------------------------------ */
/*  Cenários do fluxo (5 solicitações de cada)                          */
/* ------------------------------------------------------------------ */

type Etapa = 'aberta' | 'regulada' | 'agendada' | 'emitida' | 'viajou' | 'retornou' | 'concluida';
interface Cenario {
  chave: string;
  status: string;
  setor: string;
  etapa: Etapa;
  /** Janela da data de abertura, em dias atrás. */
  abertura: [number, number];
  decisao?: 'DEFERIDO' | 'INDEFERIDO';
  rota?: string;
  tipoParecer?: string;
  tentativa?: 'AGUARDANDO' | 'ACEITOU' | 'AGENDAMENTO_CONFIRMADO';
  passagem?: boolean;
  ajuda?: 'EMITIDO' | 'CONCLUIDO';
  adicionais?: boolean;
  remarcada?: boolean;
  ajudaApenas?: boolean;
  encerramento?: 'ALTA_MEDICA' | 'DESISTENCIA' | 'OBITO' | 'TRANSFERENCIA';
  origemAprovacao?: string;
}

const CENARIOS: Cenario[] = [
  { chave: 'recem_aberta', status: 'NOVO', setor: 'dados_basicos', etapa: 'aberta', abertura: [0, 6] },
  { chave: 'em_exigencia', status: 'EXIGENCIA', setor: 'dados_basicos', etapa: 'aberta', abertura: [8, 30] },
  { chave: 'aguardando_regulacao', status: 'AGUARDANDO_REGULACAO', setor: 'regulacao', etapa: 'aberta', abertura: [3, 25] },
  { chave: 'aguardando_cnrac', status: 'AGUARDANDO_CNRAC', setor: 'regulacao', etapa: 'regulada', abertura: [15, 45], decisao: 'DEFERIDO', rota: 'CNRAC', tentativa: 'AGUARDANDO' },
  { chave: 'aguardando_agendamento', status: 'AGUARDANDO_AGENDAMENTO', setor: 'regulacao', etapa: 'regulada', abertura: [12, 40], decisao: 'DEFERIDO', rota: 'SETI', tentativa: 'ACEITOU' },
  { chave: 'servico_social', status: 'ENCAMINHADO_SERVICO_SOCIAL', setor: 'regulacao', etapa: 'regulada', abertura: [10, 50], decisao: 'DEFERIDO', rota: 'SERVICO_SOCIAL' },
  { chave: 'aguardando_emissao_sem_passagem', status: 'AGUARDANDO_EMISSAO', setor: 'passagens', etapa: 'agendada', abertura: [20, 55], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO' },
  { chave: 'passagem_emitida', status: 'EMITIDA', setor: 'passagens', etapa: 'emitida', abertura: [25, 60], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true },
  { chave: 'passagem_com_adicionais', status: 'EMITIDA', setor: 'passagens', etapa: 'emitida', abertura: [25, 65], decisao: 'DEFERIDO', rota: 'CNRAC', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, adicionais: true },
  { chave: 'remarcacao', status: 'REMARCACAO', setor: 'passagens', etapa: 'emitida', abertura: [30, 70], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, remarcada: true },
  { chave: 'em_viagem', status: 'EM_VIAGEM', setor: 'acompanhamento', etapa: 'viajou', abertura: [35, 75], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, ajuda: 'EMITIDO' },
  { chave: 'em_permanencia', status: 'EM_PERMANENCIA', setor: 'acompanhamento', etapa: 'viajou', abertura: [40, 80], decisao: 'DEFERIDO', rota: 'CNRAC', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, ajuda: 'EMITIDO', adicionais: true },
  { chave: 'ajuda_em_pagamento', status: 'EM_PAGAMENTO', setor: 'ajuda_custo', etapa: 'retornou', abertura: [45, 85], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, ajuda: 'EMITIDO' },
  { chave: 'so_ajuda_de_custo', status: 'EM_PAGAMENTO', setor: 'ajuda_custo', etapa: 'retornou', abertura: [30, 80], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tipoParecer: 'apenas_ajuda', tentativa: 'AGENDAMENTO_CONFIRMADO', ajuda: 'EMITIDO', ajudaApenas: true },
  { chave: 'em_aprovacao', status: 'EM_APROVACAO', setor: 'aprovacao', etapa: 'agendada', abertura: [20, 60], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO' },
  { chave: 'concluida', status: 'CONCLUIDO', setor: 'encerramento', etapa: 'concluida', abertura: [60, 90], decisao: 'DEFERIDO', rota: 'APROVADO_DIRETO', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, ajuda: 'CONCLUIDO', encerramento: 'ALTA_MEDICA' },
  { chave: 'concluida_com_adicionais', status: 'CONCLUIDO', setor: 'encerramento', etapa: 'concluida', abertura: [60, 90], decisao: 'DEFERIDO', rota: 'CNRAC', tentativa: 'AGENDAMENTO_CONFIRMADO', passagem: true, ajuda: 'CONCLUIDO', adicionais: true, encerramento: 'ALTA_MEDICA' },
  { chave: 'indeferida', status: 'INDEFERIDO', setor: 'encerramento', etapa: 'regulada', abertura: [15, 80], decisao: 'INDEFERIDO' },
  { chave: 'cancelada', status: 'CANCELADO', setor: 'encerramento', etapa: 'aberta', abertura: [20, 85], encerramento: 'DESISTENCIA' },
];

const ORIGENS_APROVACAO = ['regulacao', 'passagens', 'ajuda_custo', 'dados_basicos', 'acompanhamento'];
let seqProcesso = 900100;
const resumoCenarios: { chave: string; processos: string[] }[] = [];

for (const c of CENARIOS) {
  const processos: string[] = [];
  for (let i = 0; i < 5; i++) {
    // ~1 em 5 reaproveita paciente existente da demo (paciente com mais de um TFD).
    const pac = pacientes.length > 8 && chance(0.18) ? pick(pacientes) : novoPaciente();
    const e = pick(ESPECIALIDADES);
    const ufDestino = pick(e.ufs);
    const candidatas = unidades.filter((u) => u.uf === ufDestino);
    const unidade = candidatas.length ? pick(candidatas) : pick(unidades);
    const interestadual = unidade.uf !== 'MA';
    const urgente = chance(0.22);
    const comAcomp = pac.acompanhantes.length > 0;
    const abertura = somar(HOJE, -int(c.abertura[0], c.abertura[1]));
    const id = uid('solicitacao');
    const numero = `TFD-${c.ajudaApenas ? 'AC' : 'N'}-2026/${seqProcesso++}`;
    processos.push(numero);

    const sol: Linha = {
      id, numero_processo: numero, paciente_id: pac.id, municipio_origem_id: pac.municipio.id,
      modalidade: interestadual ? 'INTERESTADUAL' : 'INTRAESTADUAL', status: c.status, setor_atual: c.setor,
      prioridade: urgente ? 'URGENTE' : 'NORMAL', tipo_solicitacao: c.ajudaApenas ? 'AJUDA_CUSTO' : 'NORMAL',
      especialidade: e.esp, tipo_procedimento: e.proc, cid10_principal: e.cid, descricao_diagnostico: e.diag,
      justificativa_tfd: `Procedimento de ${e.esp.toLowerCase()} sem oferta no município de residência. [DEMO]`,
      necessidade_acompanhante: comAcomp, tipo_transporte_sugerido: interestadual ? 'AEREO' : 'TERRESTRE',
      carater_atendimento: pick(['AMBULATORIAL', 'HOSPITALAR']), medico_solicitante_nome: pick(MEDICOS),
      medico_solicitante_crm: String(int(1000, 9999)), medico_solicitante_uf: 'MA', passagens_concluidas: c.etapa === 'concluida',
      created_at: ts(abertura),
    };
    if (c.etapa !== 'aberta' || c.status === 'AGUARDANDO_REGULACAO') sol.numero_protocolo = `SEI-23046.9${String(seqProcesso).slice(-5)}/2026-${int(10, 99)}`;
    if (c.status === 'EM_APROVACAO') {
      sol.setor_origem_aprovacao = pick(ORIGENS_APROVACAO);
      sol.observacao_aprovacao = 'Solicitação de aprovação de passagem fora da tabela. [DEMO]';
    }
    out.solicitacoes.push(sol);

    if (comAcomp) out.solicitacao_acompanhantes.push({ id: uid('vinculo'), solicitacao_id: id, acompanhante_id: pac.acompanhantes[0], principal: true, doador: false });

    // Regulação: parecer e rota (carimbo).
    let t = somar(abertura, int(2, 7));
    if (c.decisao) {
      t = ateHoje(t);
      out.pareceres.push({
        id: uid('parecer'), solicitacao_id: id, decisao: c.decisao, tipo: c.tipoParecer ?? 'tfd_completo', cid_principal: e.cid, versao_cid: '10',
        autoriza_acompanhante: comAcomp && c.decisao === 'DEFERIDO',
        justificativa: c.decisao === 'DEFERIDO' ? 'Critérios de elegibilidade atendidos. [DEMO]' : 'Procedimento disponível na rede estadual. [DEMO]',
        created_at: ts(t),
      });
      if (c.rota) out.rotas_regulacao.push({ id: uid('rota'), solicitacao_id: id, tipo_rota: c.rota, justificativa: '[DEMO]', created_at: ts(t) });
    }

    // Agendamento: tentativa de contato (tela) e agendamento (relatórios).
    let atendimento = somar(t, int(8, 20));
    if (c.tentativa) {
      const contato = ateHoje(somar(t, int(1, 5)));
      const confirmado = c.tentativa === 'AGENDAMENTO_CONFIRMADO';
      // Etapas já vividas têm atendimento no passado; as em curso podem ter atendimento à frente.
      if (['viajou', 'retornou', 'concluida'].includes(c.etapa)) atendimento = ateHoje(somar(contato, int(6, 15)));
      out.tentativas_agendamento.push({
        id: uid('tentativa'), solicitacao_id: id, unidade_id: unidade.id, unidade_nome: unidade.nome, data_contato: dia(contato),
        resultado: c.tentativa, tipo_procedimento: e.proc === 'TRATAMENTO' ? 'TRATAMENTO' : e.proc,
        data_agendamento: confirmado ? dia(atendimento) : null, hora_agendamento: confirmado ? `${String(int(7, 15)).padStart(2, '0')}:00` : null,
        contato_unidade: 'Central de agendamento', observacao: '[DEMO]', created_at: ts(contato),
      });
      if (confirmado) {
        out.agendamentos.push({
          id: uid('agendamento'), solicitacao_id: id, unidade_executante: unidade.nome, cnes: unidade.cnes, cidade_destino: unidade.cidade,
          uf_destino: unidade.uf, tipo_atendimento: e.proc === 'TRATAMENTO' ? 'TRATAMENTO_CONTINUO' : e.proc, status: 'CONFIRMADO',
          origem_agendamento: c.rota === 'CNRAC' ? 'CNRAC' : 'CONTATO_DIRETO', data_hora_agendamento: ts(atendimento, int(7, 15), 0),
          unidade_destino_id: unidade.id, created_at: ts(contato),
        });
      }
    }

    // Passagens: ida e volta em duas linhas, valor dividido.
    const embarque = somar(atendimento, -int(1, 2));
    const retorno = somar(atendimento, int(2, 12));
    if (c.passagem) {
      const modal = interestadual ? (['CE', 'PI'].includes(unidade.uf) && chance(0.35) ? 'TERRESTRE' : 'AEREO') : pick(['TERRESTRE', 'TERRESTRE', 'FLUVIAL']);
      const total = modal === 'AEREO' ? reais(900, 3200) : modal === 'FLUVIAL' ? reais(80, 260) : reais(120, 480);
      const emissao = ateHoje(somar(embarque, -int(4, 10)));
      const companhia = modal === 'AEREO' ? pick(COMPANHIAS_AEREAS) : modal === 'FLUVIAL' ? 'Navegação São Francisco' : pick(COMPANHIAS_ONIBUS);
      const passou = (d: Date) => d <= HOJE && ['viajou', 'retornou', 'concluida'].includes(c.etapa);
      const viagem = (tipo: 'IDA' | 'RETORNO', data: Date, valor: number): Linha => {
        const usada = tipo === 'IDA' ? passou(data) : passou(data) && c.etapa !== 'viajou';
        return {
          id: uid('viagem'), solicitacao_id: id, tipo, modal, com_pernoite: modal !== 'AEREO', ativa: true,
          origem_cidade: tipo === 'IDA' ? pac.municipio.nome : unidade.cidade, origem_uf: tipo === 'IDA' ? 'MA' : unidade.uf,
          destino_cidade: tipo === 'IDA' ? unidade.cidade : pac.municipio.nome, destino_uf: tipo === 'IDA' ? unidade.uf : 'MA',
          data_embarque_prevista: dia(data), data_embarque_real: usada ? dia(data) : null, embarcou: usada,
          situacao: usada ? 'UTILIZADA' : 'EMITIDA', valor, taxas: modal === 'AEREO' ? reais(30, 90) : 0, companhia,
          numero_bilhete: `DEMO${int(100000, 999999)}`, emitido_em: ts(emissao), created_at: ts(emissao),
          distancia_valor: modal === 'AEREO' ? int(300, 1500) : modal === 'FLUVIAL' ? int(20, 160) : int(120, 1100),
          distancia_unidade: modal === 'AEREO' ? 'milhas' : modal === 'FLUVIAL' ? 'milhas_nauticas' : 'km',
        };
      };
      const metade = Math.round((total / 2) * 100) / 100;
      const ida = viagem('IDA', embarque, metade);
      if (c.remarcada) {
        // Passagem original remarcada + nova emissão vinculada.
        ida.situacao = 'REMARCADA';
        out.viagens.push(ida);
        const novaData = somar(embarque, int(5, 15));
        const nova = viagem('IDA', novaData, metade + reais(80, 300));
        nova.viagem_anterior_id = ida.id;
        nova.observacoes = 'Remarcada a pedido da unidade executante. [DEMO]';
        out.viagens.push(nova, viagem('RETORNO', somar(retorno, int(5, 15)), metade));
      } else {
        out.viagens.push(ida, viagem('RETORNO', retorno, metade));
      }
      // Transfer em parte das viagens aéreas.
      if (modal === 'AEREO' && chance(0.35)) {
        out.viagens.push({
          id: uid('viagem'), solicitacao_id: id, tipo: 'IDA', modal: 'TRANSFER', ativa: true, com_pernoite: false,
          origem_cidade: unidade.cidade, origem_uf: unidade.uf, destino_cidade: unidade.cidade, destino_uf: unidade.uf,
          data_embarque_prevista: dia(embarque), situacao: passou(embarque) ? 'UTILIZADA' : 'EMITIDA', embarcou: passou(embarque),
          valor: reais(60, 220), taxas: 0, codigo_transfer: `TRF-${int(1000, 9999)}`, emitido_em: ts(emissao), created_at: ts(emissao),
          observacoes: 'Aeroporto até a unidade de saúde. [DEMO]',
        });
      }
    }

    // Ajuda de custo (paciente e, se houver, acompanhante).
    if (c.ajuda) {
      const ini = c.ajudaApenas ? somar(atendimento, -1) : embarque;
      const fim = c.ajudaApenas ? somar(atendimento, int(1, 6)) : c.etapa === 'viajou' ? somar(HOJE, int(3, 12)) : retorno;
      const dias = Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1);
      const valor = Math.round(((dias - 1) * 24.75 + 8.4) * 100) / 100;
      const concluida = c.ajuda === 'CONCLUIDO';
      for (const tipo of comAcomp ? ['PACIENTE', 'ACOMPANHANTE'] : ['PACIENTE']) {
        out.ajudas_custo.push({
          id: uid('ajuda'), solicitacao_id: id, tipo, data_inicio: dia(ini), data_fim: dia(fim), dias_internacao: 0, valor_diaria: 24.75,
          valor_total: valor, status: c.ajuda, ativa: true, concluido_em: concluida ? dia(ateHoje(somar(fim, int(2, 8)))) : null,
          valor_pago: concluida ? valor : null, numero_sei: `SEI-23046.8${int(10000, 99999)}/2026-${int(10, 99)}`,
          observacoes: '[DEMO]', created_at: ts(ateHoje(somar(ini, -int(1, 4)))),
        });
      }
    }

    // Adicionais com situações variadas.
    if (c.adicionais) {
      const opcoes = [
        { categoria: 'BAGAGEM', descricao: 'Bagagem extra com cadeira de rodas', faixa: [80, 280] },
        { categoria: 'TRANSFER', descricao: 'Transfer extra entre hospitais', faixa: [60, 220] },
        { categoria: 'PASSAGEM_EXTRA', descricao: 'Passagem extra para troca de acompanhante', faixa: [350, 1400] },
        { categoria: 'OUTRO', descricao: 'Hospedagem emergencial por atraso de voo', faixa: [120, 600] },
      ];
      const qtd = int(1, 3);
      for (let k = 0; k < qtd; k++) {
        const o = pick(opcoes);
        const status = c.etapa === 'concluida' ? pick(['PAGO', 'APROVADO', 'INDEFERIDO']) : pick(['PENDENTE_APROVACAO', 'APROVADO', 'PENDENTE_APROVACAO']);
        out.adicionais.push({
          id: uid('adicional'), solicitacao_id: id, categoria: o.categoria, descricao: `${o.descricao}. [DEMO]`, valor: reais(o.faixa[0], o.faixa[1]),
          data_ocorrencia: dia(ateHoje(somar(embarque, int(0, 6)))), status, beneficiario_tipo: 'PACIENTE',
          justificativa_solicitacao: 'Necessidade identificada durante a viagem. [DEMO]', created_at: ts(ateHoje(somar(embarque, int(0, 6)))),
        });
      }
    }

    // Encerramento.
    if (c.encerramento) {
      const fimProcesso = c.etapa === 'concluida' ? ateHoje(somar(retorno, int(5, 15))) : ateHoje(somar(abertura, int(3, 20)));
      out.encerramentos.push({ id: uid('encerramento'), solicitacao_id: id, motivo: c.encerramento, data_encerramento: dia(fimProcesso), observacoes: '[DEMO]', created_at: ts(fimProcesso) });
      sol.data_encerramento = dia(fimProcesso);
      sol.motivo_encerramento = c.encerramento;
    }
  }
  resumoCenarios.push({ chave: c.chave, processos });
}

/* ------------------------------------------------------------------ */
/*  SQL (registro da migration) e aplicação via REST                    */
/* ------------------------------------------------------------------ */

const sqlValor = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
function gerarSql(): string {
  const linhas = [
    '-- Dados fictícios dos últimos 3 meses (07/07 a 07/10/2026) para testar o fluxo e o assistente de IA.',
    '-- Gerado por scripts/seed-demo/seed-ultimos-3-meses.mts. Ids na faixa d3a0xxxx, processos TFD-*-2026/9xxxxx.',
    '-- Nada aqui é dado real. Para remover: rode o script com --limpar ou o bloco de DELETE no fim deste arquivo (comentado).',
    'begin;',
  ];
  for (const t of ORDEM) {
    for (const r of out[t]) {
      const cols = Object.keys(r).filter((k) => r[k] !== undefined);
      linhas.push(`insert into ${t} (${cols.join(', ')}) values (${cols.map((k) => sqlValor(r[k])).join(', ')}) on conflict (id) do nothing;`);
    }
  }
  linhas.push('commit;', '', '-- Remoção da demo:');
  for (const t of [...ORDEM].reverse()) linhas.push(`-- delete from ${t} where id >= '${ID_MIN}' and id < '${ID_MAX}';`);
  return linhas.join('\n') + '\n';
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^"|"$/g, '');
async function rest(metodo: string, caminho: string, corpo?: unknown, prefer?: string) {
  if (!URL || !CHAVE) throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env.local');
  const r = await fetch(`${URL}/rest/v1/${caminho}`, {
    method: metodo,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!r.ok) throw new Error(`${metodo} ${caminho.split('?')[0]}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r;
}
async function limpar() {
  for (const t of [...ORDEM].reverse()) {
    // O gatilho de auditoria grava um log para cada insert/delete da demo. Esses
    // logs apontam para as solicitações da demo e precisam sair antes delas.
    if (t === 'solicitacoes') {
      await rest('DELETE', `log_auditoria?solicitacao_id=gte.${ID_MIN}&solicitacao_id=lt.${ID_MAX}`);
    }
    await rest('DELETE', `${t}?id=gte.${ID_MIN}&id=lt.${ID_MAX}`);
  }
  // Logs da própria demo que ficaram sem solicitação (entidade da faixa d3a0).
  await rest('DELETE', `log_auditoria?entidade_id=gte.${ID_MIN}&entidade_id=lt.${ID_MAX}`).catch(() => undefined);
}
/**
 * Tabelas que só são atualizadas no lugar (upsert): o gatilho de auditoria do
 * banco grava log ao excluir solicitação apontando para a linha já excluída e
 * a chave estrangeira recusa, então solicitação não pode ser excluída. As
 * demais tabelas da demo são apagadas e recriadas.
 */
const ATUALIZAR_NO_LUGAR = new Set(['unidades_destino', 'pacientes', 'solicitacoes']);

async function aplicar() {
  // CPFs não podem colidir com pacientes que já existem.
  const cpfs = out.pacientes.map((p) => p.cpf as string);
  const r = await rest('GET', `pacientes?select=cpf&cpf=in.(${cpfs.join(',')})&id=lt.${ID_MIN}`);
  const colisoes = (await r.json()) as { cpf: string }[];
  if (colisoes.length) throw new Error(`${colisoes.length} CPF(s) gerados já existem no banco; mude a semente.`);
  for (const t of [...ORDEM].reverse()) {
    if (!ATUALIZAR_NO_LUGAR.has(t)) await rest('DELETE', `${t}?id=gte.${ID_MIN}&id=lt.${ID_MAX}`);
  }
  for (const t of ORDEM) {
    for (let i = 0; i < out[t].length; i += 200) {
      // Todas as linhas de um lote precisam ter as mesmas chaves no PostgREST.
      const lote = out[t].slice(i, i + 200);
      const chaves = [...new Set(lote.flatMap((l) => Object.keys(l)))];
      const prefer = ATUALIZAR_NO_LUGAR.has(t) ? 'return=minimal,resolution=merge-duplicates' : 'return=minimal';
      await rest('POST', t, lote.map((l) => Object.fromEntries(chaves.map((k) => [k, l[k] ?? null]))), prefer);
    }
    console.log(`  ${t}: ${out[t].length}`);
  }
}

const modo = process.argv[2];
const caminhoSql = new globalThis.URL('../../supabase/migrations/00084_seed_demo_ultimos_3_meses.sql', import.meta.url);
writeFileSync(caminhoSql, gerarSql());
console.log(`Migration gravada: supabase/migrations/00084_seed_demo_ultimos_3_meses.sql`);
console.log(Object.entries(out).map(([t, l]) => `${t}=${l.length}`).join(' '));
if (modo === '--aplicar') { await aplicar(); console.log('Aplicado.'); }
if (modo === '--limpar') { await limpar(); console.log('Demo removida.'); }
if (modo === '--resumo') console.log(JSON.stringify(resumoCenarios, null, 2));
