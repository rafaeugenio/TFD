/**
 * Conteúdo estruturado do Guia do Usuário TFD.
 *
 * Cada tópico segue o mesmo esqueleto (para que serve, quando usar,
 * passo a passo, campos, cuidados, vídeo, relacionados) para que a
 * página renderize tudo a partir de dados, sem texto hardcoded no JSX.
 *
 * Fonte da verdade: telas reais do protótipo (branch fluxo-v2-mvp).
 */

/** Agrupamento interno legado; a navegação real é por capítulo (WIKI_CHAPTERS). */
export type WikiCategoryId = 'primeiros-passos' | 'cadastros' | 'fluxo' | 'gestao';

export interface WikiVideo {
  src: string;
  titulo: string;
  descricao: string;
}

export interface WikiCampo {
  nome: string;
  detalhe: string;
}

export interface WikiTopic {
  id: string;
  categoria: WikiCategoryId;
  titulo: string;
  descricao: string;
  keywords: string[];
  paraQueServe: string;
  quandoUsar: string;
  passos: string[];
  campos?: WikiCampo[];
  /** O que é possível fazer: dicas, atalhos e funcionalidades úteis. */
  dicas?: string[];
  cuidados?: string[];
  video?: WikiVideo;
  /** Print direcional de uma funcionalidade específica do tópico. */
  imagem?: { src: string; alt: string; legenda?: string };
  relacionados?: string[];
}

/** Capítulo = módulo do sistema. A home da wiki lista os capítulos;
 *  cada capítulo tem sua própria página em /wiki/[capitulo]. */
export interface WikiChapter {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  /** Tag curta exibida como badge no card do capítulo (ex.: "Básico"). */
  tag: string;
  /** Print real do sistema exibido no card do capítulo na home. */
  imagem: { src: string; alt: string };
  /** Ids dos tópicos, na ordem de leitura. */
  topicos: string[];
}

export const WIKI_CHAPTERS: WikiChapter[] = [
  {
    id: 'introducao',
    imagem: { src: '/wiki/media/capitulos/cap-01-introducao.jpg', alt: 'Tela de login do sistema TFD' },
    numero: 1,
    titulo: 'Introdução ao sistema',
    descricao: 'Uma visão geral do TFD, como entrar, navegar e se orientar nas telas.',
    tag: 'Básico',
    topicos: ['login', 'visao-geral', 'navegacao', 'busca-filtros'],
  },
  {
    id: 'cadastros',
    imagem: { src: '/wiki/media/capitulos/cap-02-cadastros.jpg', alt: 'Listagem de pacientes com busca e ações' },
    numero: 2,
    titulo: 'Cadastros',
    descricao: 'Pacientes, dados bancários, unidades de saúde e regionais: a base de toda solicitação.',
    tag: 'Cadastros',
    topicos: ['pacientes', 'dados-bancarios', 'unidades-saude', 'regionais'],
  },
  {
    id: 'solicitacoes',
    imagem: { src: '/wiki/media/capitulos/cap-03-solicitacoes.jpg', alt: 'Lista de solicitações com status consolidado' },
    numero: 3,
    titulo: 'Solicitações',
    descricao: 'Como abrir, acompanhar, tramitar e encerrar uma solicitação de TFD.',
    tag: 'Principal',
    topicos: ['solicitacoes', 'nova-solicitacao', 'detalhe-solicitacao', 'enviar-para-setor', 'encerramento'],
  },
  {
    id: 'regulacao',
    imagem: { src: '/wiki/media/capitulos/cap-04-regulacao.jpg', alt: 'Fila de regulação com carimbos e pareceres' },
    numero: 4,
    titulo: 'Regulação',
    descricao: 'Parecer médico, carimbo de regulação e agendamento: a análise do caso.',
    tag: 'Análise',
    topicos: ['regulacao', 'parecer-medico', 'carimbo-regulacao', 'agendamento-tentativas'],
  },
  {
    id: 'financeiro',
    imagem: { src: '/wiki/media/capitulos/cap-05-financeiro.jpg', alt: 'Fila do financeiro com passagens e ajudas de custo' },
    numero: 5,
    titulo: 'Financeiro',
    descricao: 'Passagens, ajuda de custo, adicionais e o checklist de fechamento.',
    tag: 'Execução',
    topicos: ['financeiro', 'passagens', 'ajuda-de-custo', 'adicionais'],
  },
  {
    id: 'gestao',
    imagem: { src: '/wiki/media/capitulos/cap-06-gestao.jpg', alt: 'Painel com indicadores por setor' },
    numero: 6,
    titulo: 'Gestão e Configurações',
    descricao: 'Painel, relatórios, usuários, permissões, tabelas auxiliares e auditoria.',
    tag: 'Administração',
    topicos: ['dashboard', 'relatorios', 'usuarios', 'papeis-permissoes', 'configuracoes', 'logs'],
  },
];

export const WIKI_TOPICS: WikiTopic[] = [
  // ─────────────────────────── PRIMEIROS PASSOS ───────────────────────────
  {
    id: 'login',
    categoria: 'primeiros-passos',
    titulo: 'Entrar no sistema',
    descricao: 'Entre com CPF e senha, faça o primeiro acesso e recupere sua senha.',
    keywords: ['login', 'senha', 'cpf', 'entrar', 'primeiro acesso', 'recuperar senha', 'esqueci'],
    paraQueServe:
      'A tela de login identifica quem está usando o sistema. O que cada pessoa pode ver e fazer depende do papel de acesso do seu usuário.',
    quandoUsar: 'Sempre que abrir o sistema ou quando a sessão expirar.',
    dicas: [
      "Use o ícone de olho no campo de senha para conferir o que digitou antes de entrar.",
      "No primeiro acesso, o link recebido por e-mail já abre a tela de criação de senha: você não precisa de senha provisória.",
      "Salvou o CPF errado? O campo aplica a máscara sozinho, digite apenas os números.",
    ],
    passos: [
      'Acesse a página de login do sistema.',
      'Informe seu CPF no formato 000.000.000-00 (o campo aplica a máscara automaticamente).',
      'Digite sua senha. Use o ícone de olho ("Mostrar senha") para conferir o que digitou.',
      'Clique em "Entrar". Você será levado ao Painel.',
    ],
    campos: [
      { nome: 'CPF', detalhe: 'Identificação do usuário. Precisa ter os 11 dígitos válidos.' },
      { nome: 'Senha', detalhe: 'Definida por você no primeiro acesso. Mínimo de 8 caracteres.' },
    ],
    cuidados: [
      'Se aparecer "CPF não encontrado ou usuário inativo", confirme com o administrador se seu usuário foi criado e está ativo.',
      'No primeiro acesso, use o link recebido por e-mail e crie a senha na tela "Bem-vindo ao TFD". Se o link expirar, peça ao administrador para reenviar.',
      'Esqueceu a senha? Use "Esqueceu a senha?" e informe o e-mail cadastrado para receber o link de recuperação.',
    ],
    video: {
      src: '/wiki/media/wiki-03-login.mp4',
      titulo: 'Login no sistema',
      descricao: 'Entrada com CPF e senha até chegar ao Painel.',
    },
    relacionados: ['visao-geral', 'usuarios'],
  },
  {
    id: 'visao-geral',
    categoria: 'primeiros-passos',
    titulo: 'Visão geral do sistema',
    descricao: 'Entenda o que é o TFD, os quatro setores do fluxo e o ciclo de vida de uma solicitação.',
    keywords: ['tfd', 'visão geral', 'setores', 'status', 'fluxo', 'como funciona', 'dados básicos'],
    paraQueServe:
      'O sistema TFD organiza o Tratamento Fora do Domicílio da SES-MA: cadastro de pacientes, abertura de solicitações, análise médica (regulação), execução financeira (passagens e diárias) e encerramento.',
    quandoUsar: 'Leia este tópico antes de operar o sistema pela primeira vez.',
    dicas: [
      "O badge de status colorido nas listas informa em qual setor a solicitação está sem precisar abrir o caso.",
      "A aba \"Linha do tempo\" reconstrói toda a história da solicitação em ordem cronológica: é o jeito mais rápido de entender um caso antigo.",
      "Solicitações do tipo \"Ajuda de custo\" têm numeração própria (TFD-AC) e pulam a parte de viagens.",
    ],
    passos: [
      'Toda solicitação nasce no setor "Dados Básicos", onde os dados do paciente, agendamento e laudo são registrados.',
      'Ela é enviada para "Regulação", onde o médico regulador emite o parecer e a equipe define o carimbo (encaminhamento).',
      'Aprovada, segue para "Financeiro", onde são emitidas passagens, ajudas de custo e adicionais.',
      'Concluído o atendimento, a solicitação é encerrada com um motivo (alta médica, transferência, óbito, abandono ou desistência).',
    ],
    campos: [
      { nome: 'Status "Dados Básicos"', detalhe: 'Solicitação em preparação no setor de atendimento.' },
      { nome: 'Status "Regulação"', detalhe: 'Aguardando parecer médico, carimbo ou agendamento.' },
      { nome: 'Status "Financeiro"', detalhe: 'Em execução: passagens, diárias e adicionais.' },
      { nome: 'Status "Encerrada"', detalhe: 'Fluxo concluído. Nenhuma edição é permitida até reabrir.' },
    ],
    cuidados: [
      'A solicitação só pode ser editada pelo setor onde ela está. Nos demais setores ela aparece em modo somente leitura.',
      'Ninguém "puxa" a solicitação: quem está com ela envia para o próximo setor pela ação "Enviar para setor".',
    ],
    relacionados: ['navegacao', 'solicitacoes', 'enviar-para-setor'],
  },
  {
    id: 'navegacao',
    categoria: 'primeiros-passos',
    titulo: 'Navegação principal',
    descricao: 'Conheça o menu lateral e encontre cada funcionalidade do sistema.',
    keywords: ['menu', 'navegação', 'sidebar', 'onde encontro', 'telas', 'módulos'],
    paraQueServe:
      'O menu lateral esquerdo dá acesso a todas as áreas do sistema, agrupadas por finalidade. Os itens exibidos dependem das permissões do seu papel.',
    quandoUsar: 'Use como mapa quando não souber onde uma funcionalidade fica.',
    dicas: [
      "O menu lateral pode ser recolhido pelo botão \"«\" no rodapé, deixando só os ícones e liberando espaço em telas menores.",
      "Clicar no seu nome no rodapé do menu abre \"Meu Perfil\", onde ficam seus dados de contato e, para médicos, o CRM.",
      "Em telas estreitas o menu vira um botão no topo: tudo continua acessível no celular.",
    ],
    passos: [
      '"Painel": visão geral com indicadores dos três setores e atividades recentes.',
      'Seção "Fluxo do processo": "Solicitações" (todas as solicitações), "Regulação" (fila de análise médica) e "Financeiro" (fila de execução).',
      'Seção "Cadastros": "Pacientes", "Unidades de Saúde" e "Regionais".',
      'Seção "Gestão": "Relatórios", "Configurações" (tabelas auxiliares e catálogos) e "Administrativo" (usuários, permissões e logs).',
      'No rodapé do menu ficam o seu perfil (leva a "Meu Perfil") e o botão "Sair do sistema".',
    ],
    cuidados: [
      'Se um item do menu não aparece para você, seu papel não tem a permissão de visualizar aquela tela. Fale com o administrador.',
      'Mantenha seu CRM preenchido em "Meu Perfil" se você emite pareceres médicos: sem CRM o sistema bloqueia a emissão.',
    ],
    relacionados: ['visao-geral', 'papeis-permissoes', 'busca-filtros'],
  },
  {
    id: 'busca-filtros',
    categoria: 'primeiros-passos',
    titulo: 'Busca, filtros e tabelas',
    descricao: 'Localize registros nas listagens usando busca, filtros, ordenação e paginação.',
    keywords: ['busca', 'filtro', 'tabela', 'ordenar', 'paginação', 'localizar', 'pesquisar'],
    paraQueServe:
      'Todas as listagens do sistema (pacientes, solicitações, unidades etc.) seguem o mesmo padrão: cartões de resumo no topo, campo de busca, filtros e tabela com ordenação.',
    quandoUsar: 'Sempre que precisar localizar um registro específico em uma lista grande.',
    imagem: {
      src: '/wiki/media/funcionalidades/busca-toolbar.png',
      alt: "Campo de busca e filtro de status de uma listagem",
      legenda: "Toda listagem tem um campo de busca ao lado do filtro de status.",
    },
    dicas: [
      "Os cartões de resumo no topo das listas são clicáveis: um clique em \"Em Regulação\" filtra a tabela na hora.",
      "A busca aceita fragmentos: digitar só parte do nome ou do número já encontra o registro.",
      "Combine busca com filtro de status para recortes precisos, por exemplo \"Maria\" + \"Em Financeiro\".",
      "A ordenação por coluna se mantém enquanto você pagina os resultados.",
    ],
    passos: [
      'Use o campo de busca da tela. Cada lista indica o que aceita: por exemplo, "Buscar por nome, CPF ou número..." nas solicitações.',
      'Combine com os filtros ao lado da busca (status, carimbo, papel, município, conforme a tela).',
      'Clique no cabeçalho de uma coluna para ordenar. Clique de novo para inverter a ordem.',
      'Nos cartões de resumo clicáveis (como "Em Regulação" na lista de solicitações), o clique aplica o filtro correspondente.',
      'Use a paginação no rodapé da tabela para navegar entre as páginas.',
    ],
    cuidados: [
      'A busca filtra apenas os campos indicados no placeholder do campo. Se não encontrar por telefone, por exemplo, busque pelo nome.',
      'Lembre de limpar a busca e os filtros antes de concluir que um registro não existe.',
    ],
    relacionados: ['navegacao', 'solicitacoes', 'pacientes'],
  },

  // ─────────────────────────────── CADASTROS ───────────────────────────────
  {
    id: 'pacientes',
    categoria: 'cadastros',
    titulo: 'Pacientes',
    descricao: 'Cadastre o paciente completo: dados pessoais, endereço, documentos e acompanhantes.',
    keywords: ['paciente', 'cadastro', 'cpf', 'cns', 'cartão sus', 'acompanhante', 'endereço', 'novo paciente'],
    paraQueServe:
      'O cadastro do paciente é a base de toda solicitação. Ele concentra identificação, contato, endereço (que deriva a regional automaticamente), documentos e acompanhantes.',
    quandoUsar: 'Antes de abrir a primeira solicitação de um paciente, ou para atualizar dados de contato e documentos.',
    dicas: [
      "Digite o CEP e o sistema preenche logradouro e bairro automaticamente.",
      "A Regional e a Região do paciente são derivadas do município de residência: você não precisa saber de qual URS ele é.",
      "Dá para anexar vários documentos de uma vez, classificando cada arquivo (RG, CPF, Cartão SUS, comprovante).",
      "A busca da lista encontra por nome, CPF ou CNS.",
    ],
    passos: [
      'No menu, acesse "Pacientes" e clique em "Novo Paciente".',
      'Em "Dados Pessoais", preencha CPF, nome completo, data de nascimento e ao menos um telefone. Cartão SUS (CNS) é opcional.',
      'Em "Endereço", informe o CEP (o sistema preenche logradouro e bairro) e o município de residência. A "Regional" e a "Região" são derivadas do município automaticamente.',
      'Em "Documentos Pessoais", anexe RG, CPF, Cartão SUS ou comprovante de residência (PDF, PNG, JPG, WEBP ou DOC, até 50 MB cada).',
      'Em "Acompanhantes", clique em "Adicionar" e preencha nome, CPF, data de nascimento, vínculo e telefone.',
      'Clique em "Cadastrar Paciente" e confirme o resumo exibido.',
    ],
    campos: [
      { nome: 'CPF', detalhe: 'Campo principal de identificação. O sistema valida o dígito verificador.' },
      { nome: 'Cartão SUS (CNS)', detalhe: 'Opcional, com validação do dígito. Formato 000 0000 0000 0000.' },
      { nome: 'Telefones', detalhe: 'Ao menos um (celular ou fixo) é obrigatório para contato.' },
      { nome: 'Município de Residência', detalhe: 'Define automaticamente a Regional e a Região do paciente.' },
      { nome: 'Vínculo do acompanhante', detalhe: 'Cônjuge, filho(a), pai/mãe, responsável legal ou outro.' },
    ],
    cuidados: [
      'Acompanhante com menos de 20 ou mais de 65 anos fica fora da faixa padrão e exige autorização da coordenação. O sistema exibe o aviso no cadastro.',
      'Excluir um paciente é uma inativação (ele some das listas, mas o histórico permanece). A ação pede confirmação e não pode ser desfeita pela tela.',
      'Dados bancários não são preenchidos neste formulário: eles ficam na página de detalhe do paciente.',
    ],
    video: {
      src: '/wiki/media/wiki-01-cadastro-paciente.mp4',
      titulo: 'Cadastro de paciente',
      descricao: 'Preenchimento completo do formulário de novo paciente, do CPF aos acompanhantes.',
    },
    relacionados: ['dados-bancarios', 'nova-solicitacao', 'regionais'],
  },
  {
    id: 'dados-bancarios',
    categoria: 'cadastros',
    titulo: 'Dados bancários do paciente',
    descricao: 'Registre contas e chaves PIX para pagar ajudas de custo e reembolsos.',
    keywords: ['dados bancários', 'conta', 'pix', 'banco', 'agência', 'titular', 'pagamento'],
    paraQueServe:
      'Cada paciente tem um conjunto de contas bancárias e chaves PIX. Na etapa financeira, a solicitação seleciona uma delas para receber diárias e reembolsos.',
    quandoUsar: 'Ao preparar a solicitação para o fechamento financeiro, ou quando o paciente trocar de conta.',
    dicas: [
      "A forma de recebimento \"Ambos\" registra conta bancária e chave PIX no mesmo cadastro.",
      "O vínculo do titular já vem pré-selecionado como \"Próprio paciente\", o caso mais comum.",
      "Contas inativadas continuam visíveis no histórico do paciente, só deixam de aparecer em novas solicitações.",
    ],
    passos: [
      'Abra o paciente na lista "Pacientes" (clique na linha).',
      'Na seção "Dados Bancários", clique em "Adicionar conta".',
      'Escolha a "Forma de recebimento": "Conta bancária", "PIX" ou "Ambos".',
      'Preencha o titular (vínculo com o paciente, nome e CPF) e os dados da conta ou da chave PIX.',
      'Clique em "Salvar".',
    ],
    campos: [
      { nome: 'Vínculo com o paciente', detalhe: 'Normalmente "Próprio paciente". Pode ser um responsável.' },
      { nome: 'Banco / Agência / Conta', detalhe: 'Para recebimento por conta corrente ou poupança.' },
      { nome: 'Tipo de chave PIX', detalhe: 'CPF, CNPJ, e-mail, telefone ou chave aleatória.' },
    ],
    cuidados: [
      'Se o CPF do titular for diferente do CPF do paciente, o sistema avisa: anexe o Termo de Autorização à solicitação.',
      'Use "Inativar" em vez de excluir: a conta deixa de aparecer em novas solicitações, mas o histórico de pagamentos fica preservado.',
      'Sem dados bancários vinculados à solicitação, o checklist de fechamento do Financeiro não libera o despacho.',
    ],
    relacionados: ['pacientes', 'ajuda-de-custo', 'financeiro'],
  },
  {
    id: 'unidades-saude',
    categoria: 'cadastros',
    titulo: 'Unidades de Saúde',
    descricao: 'Cadastre unidades de destino com preenchimento automático pelo CNES.',
    keywords: ['unidade', 'unidade de saúde', 'cnes', 'hospital', 'destino', 'cadastro de unidade'],
    paraQueServe:
      'As unidades de saúde são os destinos dos pacientes: onde os procedimentos são agendados e realizados. O cadastro alimenta o agendamento das solicitações.',
    quandoUsar: 'Quando uma solicitação apontar para uma unidade que ainda não existe no sistema.',
    imagem: {
      src: '/wiki/media/funcionalidades/cnes.png',
      alt: "Campo CNES do cadastro de unidade",
      legenda: "Ao digitar os 7 dígitos do CNES, o sistema preenche os dados da unidade automaticamente.",
    },
    dicas: [
      "Digite os 7 dígitos do CNES e o sistema busca a unidade na base oficial, preenchendo nome, endereço, telefone, responsável e tipo sozinho.",
      "A busca da lista funciona por nome ou por código CNES.",
      "O CEP também tem preenchimento automático no endereço da unidade.",
    ],
    passos: [
      'No menu, acesse "Unidades de Saúde" e clique no botão de nova unidade.',
      'Digite o código CNES de 7 dígitos. O sistema consulta a base oficial e preenche nome, endereço, telefone, e-mail, responsável e tipo automaticamente (aviso "CNES encontrado").',
      'Revise os dados preenchidos e complete o que faltar (tipo da unidade, contato).',
      'Clique em "Cadastrar Unidade" e confirme.',
    ],
    campos: [
      { nome: 'CNES', detalhe: 'Código nacional da unidade, exatamente 7 dígitos. Dispara o preenchimento automático.' },
      { nome: 'Tipo', detalhe: 'Classificação da unidade (hospital, clínica etc.), vinda das tabelas auxiliares.' },
      { nome: 'Responsável', detalhe: 'Pessoa de contato da unidade para tentativas de agendamento.' },
    ],
    cuidados: [
      'Se aparecer "CNES não encontrado", confira o código antes de preencher manualmente.',
      'Mantenha telefone e responsável atualizados: a Regulação usa esses contatos nas tentativas de agendamento.',
    ],
    video: {
      src: '/wiki/media/wiki-02-cadastro-unidade.mp4',
      titulo: 'Cadastro de unidade de saúde',
      descricao: 'Cadastro de unidade com busca automática pelo código CNES.',
    },
    relacionados: ['nova-solicitacao', 'agendamento-tentativas', 'regionais'],
  },
  {
    id: 'regionais',
    categoria: 'cadastros',
    titulo: 'Regionais de Saúde',
    descricao: 'Gerencie as URS e o vínculo dos municípios com cada regional.',
    keywords: ['regional', 'urs', 'região', 'município', 'são luís', 'vínculo', 'agrupamento'],
    paraQueServe:
      'As regionais (URS) agrupam os municípios do Maranhão. O vínculo município x regional é o que permite ao sistema derivar automaticamente a regional de cada paciente a partir do endereço.',
    quandoUsar: 'Na implantação do sistema ou quando a divisão territorial mudar.',
    dicas: [
      "Use o campo \"Filtrar municípios...\" dentro do formulário para achar rapidamente um município na lista do Maranhão inteira.",
      "O contador de selecionados mostra na hora quantos municípios a regional cobre.",
      "As Regiões (agrupamentos de regionais) são configuráveis em Configurações, na tabela auxiliar \"Região\".",
    ],
    passos: [
      'No menu, acesse "Regionais" e clique no botão de nova regional.',
      'Em "Identificação", informe o código (ex.: URS I), o nome, o município sede e a região (agrupamento geográfico).',
      'Preencha endereço do escritório e contatos institucionais.',
      'Em "Municípios da Regional", use o filtro para localizar e marque os municípios que pertencem a esta regional. O contador mostra quantos foram selecionados.',
      'Clique em "Cadastrar Regional".',
    ],
    campos: [
      { nome: 'Código', detalhe: 'Identificador curto da URS (ex.: "URS I"). Gravado em maiúsculas.' },
      { nome: 'Região', detalhe: 'Agrupamento geográfico, configurável em Sistema > Configurações.' },
      { nome: 'Municípios da Regional', detalhe: 'Checkboxes com todos os municípios do MA. Alimenta a derivação automática nos pacientes.' },
    ],
    cuidados: [
      'Um município fora de qualquer regional deixa pacientes daquele município sem regional derivada. Revise a cobertura ao editar.',
      'Alterar o vínculo de municípios afeta relatórios e o campo "Regional" de novos cadastros de pacientes.',
    ],
    video: {
      src: '/wiki/media/wiki-04-regional-sao-luis.mp4',
      titulo: 'Cadastro de regional',
      descricao: 'Criação de uma regional com seleção dos municípios vinculados.',
    },
    relacionados: ['pacientes', 'unidades-saude'],
  },

  // ──────────────────────────── FLUXO DA SOLICITAÇÃO ────────────────────────
  {
    id: 'solicitacoes',
    categoria: 'fluxo',
    titulo: 'Lista de solicitações',
    descricao: 'Acompanhe todas as solicitações com status consolidado e ações rápidas.',
    keywords: ['solicitações', 'lista', 'status', 'número', 'tfd-n', 'acompanhar', 'fila'],
    paraQueServe:
      'A tela "Solicitações" mostra todas as solicitações do TFD, em qualquer setor, com busca, filtros por status e indicadores de volume.',
    quandoUsar: 'Para acompanhar o andamento geral, localizar uma solicitação específica ou iniciar uma nova.',
    imagem: {
      src: '/wiki/media/funcionalidades/solicitacoes-stats.png',
      alt: "Cartões de resumo da lista de solicitações",
      legenda: "Os cartões de resumo do topo são clicáveis e filtram a lista pelo status correspondente.",
    },
    dicas: [
      "Os cartões do topo filtram a lista com um clique, inclusive \"Encerradas no mês\".",
      "O número da solicitação já diz o tipo: TFD-N é fluxo normal, TFD-AC é só ajuda de custo.",
      "As ações de editar, encerrar e tramitar ficam disponíveis direto na linha, sem abrir o caso.",
    ],
    passos: [
      'No menu, acesse "Solicitações" dentro de "Fluxo do processo".',
      'Use os cartões do topo ("Total", "Em Dados Básicos", "Em Regulação", "Em Financeiro", "Encerradas no mês") para filtrar por status com um clique.',
      'Busque por nome, CPF ou número da solicitação.',
      'Clique em uma linha para abrir o detalhe da solicitação.',
      'Use as ações da linha: "Editar solicitação", "Encerrar solicitação" ou "Enviar para outro setor" (disponível conforme o setor e suas permissões).',
    ],
    campos: [
      { nome: 'Número', detalhe: 'Gerado automaticamente: TFD-N-ano/sequência (normal) ou TFD-AC-ano/sequência (ajuda de custo).' },
      { nome: 'Status', detalhe: 'Setor atual: Dados Básicos, Regulação, Financeiro ou Encerrada.' },
      { nome: 'Taxa de aprovação', detalhe: 'Percentual de pareceres deferidos sobre o total analisado.' },
    ],
    cuidados: [
      'O botão de edição fica bloqueado quando a solicitação está em outro setor (modo somente leitura).',
      'Encerrar pela lista tem o mesmo efeito de encerrar pelo detalhe: exige motivo e trava a solicitação.',
    ],
    relacionados: ['nova-solicitacao', 'detalhe-solicitacao', 'enviar-para-setor'],
  },
  {
    id: 'nova-solicitacao',
    categoria: 'fluxo',
    titulo: 'Nova solicitação',
    descricao: 'Abra uma solicitação: tipo, paciente, acompanhantes, agendamento, laudo e anexos.',
    keywords: ['nova solicitação', 'abrir', 'criar', 'agendamento', 'laudo', 'sei', 'acompanhante', 'ajuda de custo'],
    paraQueServe:
      'O formulário "Nova solicitação" registra o caso completo a partir de um paciente já cadastrado: tipo do processo, acompanhantes, agendamento inicial, laudo médico, processo SEI e documentos.',
    quandoUsar: 'Quando chegar um novo pedido de TFD com laudo médico do paciente.',
    imagem: {
      src: '/wiki/media/funcionalidades/tipo-solicitacao.png',
      alt: "Escolha do tipo da solicitação: Normal ou Ajuda de custo",
      legenda: "O primeiro passo da nova solicitação define o fluxo: Normal (completo) ou Ajuda de custo (só diárias).",
    },
    dicas: [
      "\"Cadastrar novo paciente\" abre em outra aba: você não perde o que já preencheu na solicitação.",
      "Ao selecionar o paciente, o sistema mostra um resumo do cadastro com link \"Editar cadastro\" para correções rápidas.",
      "O toggle \"Marcar como doador\" faz o acompanhante contar como paciente no cálculo do BPA.",
      "Dá para adicionar vários procedimentos agendados na mesma solicitação, cada um com sua data.",
    ],
    passos: [
      'Em "Solicitações", clique em "Nova solicitação".',
      'Escolha o "Tipo da solicitação": "Normal" (fluxo completo, com viagens) ou "Ajuda de custo" (paciente já está no destino e recebe apenas diárias).',
      'Selecione o paciente. Se ainda não existir, use "Cadastrar novo paciente" (abre em nova aba).',
      'Marque os acompanhantes que participam desta solicitação. Se necessário, cadastre um novo com "Novo acompanhante".',
      'Em "Agendamento", selecione a unidade de destino e adicione os procedimentos agendados com data. Se a unidade e a data ainda não existem, marque "Solicitação sem agendamento (caso de exceção)": a Regulação registrará depois (CNRAC, CET ou Outros).',
      'Informe a origem e a data do "Laudo médico".',
      'Opcionalmente, vincule o "Processo SEI" (número e URL) e anexe documentos com o tipo correto.',
      'Clique em "Salvar e abrir". O sistema gera o número e abre o detalhe da solicitação.',
    ],
    campos: [
      { nome: 'Tipo da solicitação', detalhe: '"Normal" tem viagens, adicionais e ajuda de custo. "Ajuda de custo" só tem diárias.' },
      { nome: 'Acompanhantes', detalhe: 'Selecionados por solicitação. O toggle "Marcar como doador" conta o acompanhante como paciente no cálculo do BPA.' },
      { nome: 'Procedimentos agendados', detalhe: 'Tipo do procedimento + data, por unidade de destino.' },
      { nome: 'Número SEI', detalhe: 'Formato 00000.000000/aaaa-00, com URL do processo (precisa começar com http:// ou https://).' },
    ],
    cuidados: [
      'Paciente menor de 18 anos exige ao menos um acompanhante adulto (18 anos ou mais). O sistema bloqueia o salvamento sem isso.',
      'Marque "sem agendamento" apenas em casos de exceção reais: o caso ficará aguardando a Regulação definir unidade e data.',
      'Confira o laudo antes de salvar: a data e a origem do laudo aparecem na linha do tempo e no parecer médico.',
    ],
    video: {
      src: '/wiki/media/wiki-05-nova-solicitacao.mp4',
      titulo: 'Nova solicitação',
      descricao: 'Abertura completa de uma solicitação, do tipo do processo ao "Salvar e abrir".',
    },
    relacionados: ['pacientes', 'detalhe-solicitacao', 'enviar-para-setor'],
  },
  {
    id: 'detalhe-solicitacao',
    categoria: 'fluxo',
    titulo: 'Detalhe da solicitação',
    descricao: 'Consulte o caso completo: linha do tempo, regulação, financeiro, anexos e observações.',
    keywords: ['detalhe', 'abas', 'linha do tempo', 'anexos', 'observações', 'timeline', 'histórico'],
    paraQueServe:
      'O detalhe é a central da solicitação: identifica o paciente, mostra o status e concentra todo o histórico e as ações de cada setor em abas.',
    quandoUsar: 'Sempre que precisar consultar ou atuar em uma solicitação específica.',
    dicas: [
      "Na aba \"Observações\", Ctrl + Enter envia o texto sem precisar do botão.",
      "A aba \"Anexos\" reúne documentos de todas as origens e permite filtrar por onde entraram (abertura, parecer, passagem, ajuda de custo...).",
      "O número SEI vira link direto para o processo quando a URL foi cadastrada.",
      "O cabeçalho concentra os dados de contato do paciente: telefone e regional sempre à mão.",
    ],
    passos: [
      'Abra a solicitação pela lista (clique na linha).',
      'No cabeçalho, confira paciente, idade, CPF, status, tipo ("Normal" ou "Ajuda de custo"), número, vínculo SEI, regional e laudo.',
      'Aba "Linha do tempo": eventos cronológicos (criação, laudo, parecer, carimbo, agendamento, passagens, ajuda de custo, encerramento).',
      'Aba "Regulação": pareceres médicos, carimbo e agendamentos/tentativas.',
      'Aba "Financeiro": viagens, ajuda de custo, adicionais e o card de fechamento.',
      'Aba "Anexos": todos os documentos da solicitação, com filtro por origem (Abertura, Parecer médico, Passagem, Ajuda de custo etc.).',
      'Aba "Observações": registro de conversas paralelas e alinhamentos (WhatsApp, e-mail, chamadas). Ctrl + Enter envia.',
    ],
    cuidados: [
      'Cada aba só é editável quando a solicitação está no setor correspondente. Fora dele, o conteúdo aparece bloqueado.',
      'Use "Observações" para registrar decisões informais: cada registro guarda autor e perfil, e vira parte do histórico.',
      'Os botões "Enviar para setor" e "Encerrar solicitação" ficam no cabeçalho enquanto a solicitação estiver ativa.',
    ],
    relacionados: ['solicitacoes', 'regulacao', 'financeiro', 'encerramento'],
  },
  {
    id: 'enviar-para-setor',
    categoria: 'fluxo',
    titulo: 'Enviar para setor (tramitação)',
    descricao: 'Avance ou devolva a solicitação entre Dados Básicos, Regulação e Financeiro.',
    keywords: ['enviar', 'tramitar', 'setor', 'devolver', 'devolução', 'encaminhar', 'tramitação'],
    paraQueServe:
      'A tramitação move a solicitação entre setores. Avançar é "Enviar"; voltar para um setor anterior é "Devolver". A movimentação nunca é automática.',
    quandoUsar: 'Quando o trabalho do seu setor terminou (enviar) ou quando falta algo que só o setor anterior resolve (devolver).',
    imagem: {
      src: '/wiki/media/funcionalidades/enviar-setor.png',
      alt: "Drawer Enviar para outro setor com os cartões de destino",
      legenda: "O drawer resume o caso, mostra os setores de destino e destaca a observação na fila por 24 horas.",
    },
    dicas: [
      "A observação escrita no envio aparece destacada na fila do setor de destino nas 24 horas seguintes: use para dar contexto.",
      "O próprio drawer indica se a ação é \"Enviar\" (avança) ou \"Devolver\" (recua), conforme o setor escolhido.",
    ],
    passos: [
      'No detalhe da solicitação (ou na ação da linha), clique em "Enviar para setor".',
      'Escolha o setor de destino nos cartões: "Solicitações" (Dados Básicos), "Regulação" ou "Financeiro". O sistema indica se a ação é "Enviar" ou "Devolver".',
      'Escreva uma observação para o setor de destino (opcional, mas recomendado): ela aparece destacada na fila do destino nas próximas 24 horas.',
      'Confirme no botão "Enviar/Devolver para {setor}".',
    ],
    cuidados: [
      'Devoluções geram um aviso destacado na aba do setor de destino. Explique na observação o que precisa ser corrigido.',
      'Só envie para o Financeiro após o parecer deferido e o carimbo definido: sem isso, o Financeiro devolverá o caso.',
      'A ação exige a permissão de tramitação. Se o botão não aparece, verifique seu papel com o administrador.',
    ],
    relacionados: ['visao-geral', 'regulacao', 'financeiro'],
  },
  {
    id: 'regulacao',
    categoria: 'fluxo',
    titulo: 'Fila de Regulação',
    descricao: 'Trabalhe a fila de análise: parecer médico, carimbo e agendamento de exceção.',
    keywords: ['regulação', 'fila', 'parecer', 'carimbo', 'cid', 'análise', 'médico regulador'],
    paraQueServe:
      'A tela "Regulação" concentra as solicitações em análise: mostra o que aguarda parecer, o que aguarda agendamento e os deferimentos do mês.',
    quandoUsar: 'Rotina diária da equipe de regulação e dos médicos reguladores.',
    dicas: [
      "As ações rápidas na linha da fila (\"Parecer rápido\", \"Definir carimbo\", \"Agendamento rápido\") resolvem casos simples sem abrir o detalhe.",
      "O filtro por carimbo isola casos CNRAC, CET, SAAS ou sem carimbo.",
      "A coluna \"Tempo\" ordena a fila por espera: bom critério de priorização diária.",
    ],
    passos: [
      'No menu, acesse "Regulação". A fila mostra apenas solicitações no setor Regulação.',
      'Acompanhe os cartões: "Aguardando parecer", "Aguardando agendamento", "Deferidos no mês" e "Indeferidos no mês".',
      'Filtre por carimbo ("Aprovado direto", "CNRAC", "CET", "SAAS", "Agendamento" ou "Sem carimbo").',
      'Use as ações rápidas da linha: "Parecer rápido", "Definir carimbo", "Agendamento rápido" (quando CNRAC/CET sem agendamento confirmado) e "Enviar para outro setor".',
      'Para o caso completo, abra o detalhe e use a aba "Regulação".',
    ],
    cuidados: [
      'A coluna "Tempo" mostra há quanto tempo a solicitação espera: priorize os casos mais antigos.',
      'O carimbo só fica disponível depois de um parecer deferido.',
    ],
    relacionados: ['parecer-medico', 'carimbo-regulacao', 'agendamento-tentativas'],
  },
  {
    id: 'parecer-medico',
    categoria: 'fluxo',
    titulo: 'Parecer médico',
    descricao: 'Emita o parecer do médico regulador com decisão, CIDs e template de observação.',
    keywords: ['parecer', 'médico', 'deferido', 'indeferido', 'cid', 'cid-10', 'cid-11', 'crm', 'template'],
    paraQueServe:
      'O parecer médico é a decisão clínica sobre a solicitação: deferido ou indeferido, com diagnóstico (CID) e justificativa. Ele habilita o carimbo e a continuidade do fluxo.',
    quandoUsar: 'Assim que a solicitação chegar à Regulação com laudo válido.',
    dicas: [
      "O botão \"Inserir template\" preenche a observação com o modelo padrão da decisão escolhida (TFD completo, só ajuda de custo, só passagem, prorrogação), bastando ajustar os detalhes.",
      "O autocomplete de CID busca no catálogo inteiro, nas versões CID-10 e CID-11.",
      "\"Exportar\" gera a versão do parecer pronta para impressão e assinatura.",
      "Seus dados de médico (nome, CRM, especialidade) entram automaticamente a partir do perfil.",
    ],
    passos: [
      'Na aba "Regulação" do detalhe, clique em "Adicionar parecer" (ou use "Parecer rápido" na fila).',
      'Revise o "Resumo da solicitação": paciente, acompanhantes e documentos, com o laudo em destaque.',
      'Escolha a decisão: "Deferido" ou "Indeferido". Se deferido, informe a "Situação do serviço no Maranhão".',
      'Selecione o CID principal (CID-10 ou CID-11) e, se houver, o CID secundário.',
      'Use "Inserir template" para preencher a observação com o modelo padrão (TFD completo, apenas ajuda de custo, apenas passagem, prorrogação ou autorização Medife) e ajuste o texto.',
      'Confira o card "Médico responsável" (preenchido com seus dados) e clique em "Salvar parecer".',
      'Para imprimir ou compartilhar, use "Exportar" no parecer salvo.',
    ],
    campos: [
      { nome: 'Decisão', detalhe: 'Deferido libera o carimbo; indeferido registra a negativa com justificativa.' },
      { nome: 'CID principal', detalhe: 'Diagnóstico obrigatório, com busca no catálogo CID-10 ou CID-11.' },
      { nome: 'Médico responsável', detalhe: 'Vem do seu perfil: nome, CRM/UF e especialidade.' },
    ],
    cuidados: [
      'Sem CRM e UF preenchidos em "Meu Perfil", o botão de salvar fica bloqueado com o aviso "Informe seu CRM em Meu Perfil antes de emitir parecer."',
      'Agendamentos de exceção (CNRAC/CET) confirmados exigem um segundo deferimento médico, por exigência da controladoria SES. O sistema sinaliza quando ele está pendente.',
    ],
    video: {
      src: '/wiki/media/wiki-06-parecer-medico.mp4',
      titulo: 'Emissão de parecer médico',
      descricao: 'Parecer deferido com CID e template, do resumo da solicitação ao salvamento.',
    },
    relacionados: ['regulacao', 'carimbo-regulacao', 'usuarios'],
  },
  {
    id: 'carimbo-regulacao',
    categoria: 'fluxo',
    titulo: 'Carimbo de regulação e aprovação direta',
    descricao: 'Defina o encaminhamento após o parecer: Aprovado direto, CNRAC, CET, SAAS ou Agendamento.',
    keywords: ['carimbo', 'aprovado direto', 'aprovação direta', 'cnrac', 'cet', 'saas', 'encaminhamento', 'exceção'],
    paraQueServe:
      'O carimbo define o encaminhamento operacional do caso depois do parecer deferido: seguir direto para o Financeiro ou passar por uma central de exceção.',
    quandoUsar: 'Logo após o parecer deferido. É pré-requisito para o caso andar.',
    dicas: [
      "\"Aprovado direto\" é o caminho expresso: sem central de exceção, o caso pode seguir ao Financeiro.",
      "O carimbo pode ser editado enquanto a solicitação estiver na Regulação, sem perder o histórico.",
      "O dashboard mostra a distribuição por carimbo, útil para acompanhar o perfil da demanda.",
    ],
    passos: [
      'Na aba "Regulação", seção "Carimbo de regulação", clique em "Definir carimbo" (disponível após parecer deferido).',
      'Escolha a opção adequada: "Aprovado direto" quando não há exceção e o processo segue direto; "CNRAC" (alta complexidade fora do estado); "CET" (busca de vaga via central estadual); "SAAS" (encaminhamento de exceção); ou "Agendamento" (a regulação fará tentativas manuais até obter resposta).',
      'Registre uma observação geral se necessário e clique em "Salvar carimbo".',
      'Com o carimbo aplicado e o agendamento resolvido, envie a solicitação ao Financeiro.',
    ],
    campos: [
      { nome: 'Aprovado direto (APR)', detalhe: 'A solicitação segue sem encaminhamento de exceção. É o caminho comum quando o agendamento já veio definido na abertura.' },
      { nome: 'CNRAC / CET / SAAS', detalhe: 'Casos de exceção. Os contatos com as unidades ficam registrados em "Agendamento e Tentativas".' },
      { nome: 'Agendamento (AGND)', detalhe: 'A própria regulação agenda manualmente, registrando cada tentativa.' },
    ],
    cuidados: [
      'Carimbos de exceção (CNRAC/CET) com agendamento confirmado exigem o segundo deferimento médico antes de avançar.',
      'O carimbo pode ser editado ("Editar carimbo") enquanto a solicitação estiver na Regulação.',
    ],
    video: {
      src: '/wiki/media/wiki-07-carimbo-aprovado-direto.mp4',
      titulo: 'Carimbo "Aprovado direto"',
      descricao: 'Aplicação do carimbo de aprovação direta após o parecer deferido.',
    },
    relacionados: ['parecer-medico', 'agendamento-tentativas', 'enviar-para-setor'],
  },
  {
    id: 'agendamento-tentativas',
    categoria: 'fluxo',
    titulo: 'Agendamento e tentativas',
    descricao: 'Registre as tentativas de contato com unidades até confirmar o agendamento.',
    keywords: ['agendamento', 'tentativa', 'contato', 'confirmado', 'unidade', 'vaga', 'negou'],
    paraQueServe:
      'Quando o agendamento não veio pronto na abertura (casos CNRAC, CET ou "Agendamento"), a Regulação registra cada tentativa de contato com as unidades até confirmar data e vaga.',
    quandoUsar: 'Em todos os casos de exceção, a cada contato feito com uma unidade.',
    dicas: [
      "Registre também as tentativas sem sucesso: elas documentam o esforço de regulação e aparecem na linha do tempo.",
      "Ao confirmar um agendamento, os dados de contato da unidade ficam gravados junto.",
      "O card \"Agendamento confirmado\" resume unidade, data e procedimento no topo da aba.",
    ],
    passos: [
      'Na aba "Regulação", seção "Agendamento e Tentativas", clique em "Adicionar tentativa".',
      'Informe a unidade contatada e o desfecho: "Pendente", "Negou", "Pediu documento", "Aceitou", "Sem resposta" ou "Agendamento confirmado".',
      'Ao confirmar um agendamento, registre unidade, data, tipo de procedimento e contato. O card "Agendamento confirmado" aparece na aba.',
      'Nos casos de exceção confirmados, aguarde o segundo deferimento médico antes de enviar ao Financeiro.',
    ],
    cuidados: [
      'Só pode existir uma tentativa com "Agendamento confirmado" por solicitação: se outra for confirmada, a anterior passa a "Aceitou".',
      'Registre também as tentativas sem sucesso ("Negou", "Sem resposta"): elas documentam o esforço de regulação e aparecem na linha do tempo.',
    ],
    relacionados: ['carimbo-regulacao', 'unidades-saude', 'parecer-medico'],
  },
  {
    id: 'financeiro',
    categoria: 'fluxo',
    titulo: 'Fila do Financeiro e fechamento',
    descricao: 'Execute a solicitação: passagens, diárias, adicionais e o checklist de fechamento.',
    keywords: ['financeiro', 'fila', 'fechamento', 'despacho', 'checklist', 'pendências', 'emissão'],
    paraQueServe:
      'A tela "Financeiro" lista as solicitações em execução e organiza o que falta: emitir passagens, cadastrar ajuda de custo e vincular dados bancários, até liberar o despacho.',
    quandoUsar: 'Rotina diária do setor financeiro, assim que solicitações chegarem da Regulação.',
    imagem: {
      src: '/wiki/media/funcionalidades/fechamento.png',
      alt: "Checklist de fechamento do Financeiro completo",
      legenda: "Com passagens, ajuda de custo e dados bancários resolvidos, o botão \"Emitir despacho\" é liberado.",
    },
    dicas: [
      "Os filtros \"Com passagens pendentes\", \"Sem viagem agendada\" e \"Com adicional pendente\" mostram exatamente onde agir.",
      "Passe o mouse no botão de despacho bloqueado: o tooltip lista o que ainda falta.",
      "O Painel avisa quando há viagens nos próximos 7 dias, antecipe as emissões.",
    ],
    passos: [
      'No menu, acesse "Financeiro". A fila mostra apenas solicitações no setor Financeiro.',
      'Use os filtros: "Com passagens pendentes", "Sem viagem agendada", "Com adicional pendente".',
      'Abra a solicitação e vá à aba "Financeiro".',
      'Acompanhe o card de fechamento: "Passagens emitidas" (dispensado em solicitações de ajuda de custo), "Ajuda de custo cadastrada" e "Dados bancários da solicitação".',
      'Com o checklist completo, o botão "Emitir despacho" é liberado. Depois de emitido, use "Visualizar" ou "Editar".',
    ],
    cuidados: [
      'Enquanto houver pendência, o botão de despacho fica desabilitado e mostra o que falta ("Faltam: ...").',
      'A coluna "Aguardando há" indica o tempo de espera: priorize viagens com data próxima (o painel alerta viagens nos próximos 7 dias).',
      'Se faltar algo que só a Regulação resolve, devolva a solicitação com uma observação clara.',
    ],
    relacionados: ['passagens', 'ajuda-de-custo', 'adicionais', 'encerramento'],
  },
  {
    id: 'passagens',
    categoria: 'fluxo',
    titulo: 'Passagens e passagem adicional',
    descricao: 'Emita passagens de ida e volta em qualquer modal e registre passagens extras.',
    keywords: ['passagem', 'viagem', 'aéreo', 'terrestre', 'fluvial', 'ida e volta', 'passagem adicional', 'companhia', 'remarcação'],
    paraQueServe:
      'A seção "Viagens" registra cada passagem emitida para o paciente e os acompanhantes: modal, trecho, datas, companhia e valor. Passagens extras entram como nova passagem ou como adicional do tipo "Passagem extra".',
    quandoUsar: 'Após o agendamento confirmado, para levar o paciente ao destino e trazê-lo de volta.',
    dicas: [
      "O tipo \"Ida e volta\" cria as duas passagens de uma vez.",
      "No modal aéreo, a escolha por aeroporto calcula distância e ajuda de custo automaticamente.",
      "Adicionais vinculados a uma passagem somam ao valor dela nos relatórios.",
      "Remarcações e não comparecimentos têm status próprios: não é preciso excluir nada.",
    ],
    passos: [
      'Na aba "Financeiro" (ou pela ação "Adicionar passagem" na fila), clique em "Passagem".',
      'Selecione o beneficiário: paciente ou acompanhante (doadores aparecem identificados).',
      'Escolha o modal: aéreo (com aeroportos de origem/destino), terrestre ou fluvial (UF e cidade).',
      'Escolha o tipo: "Ida", "Volta" ou "Ida e volta" (esta opção gera duas passagens de uma vez; o botão indica "Salvar (gera 2 passagens)").',
      'Informe datas, companhia e valor, e salve.',
      'Precisou de uma passagem extra (remarcação, retorno adicional)? Emita uma nova passagem, ou registre um adicional da categoria "Passagem extra" quando for um custo complementar.',
    ],
    campos: [
      { nome: 'Beneficiário', detalhe: 'Paciente ou acompanhante vinculado à solicitação.' },
      { nome: 'Modal', detalhe: 'Aéreo usa aeroportos (IATA) e calcula distância; terrestre e fluvial usam UF e cidade.' },
      { nome: 'Status da viagem', detalhe: 'Agendada, Confirmada, Remarcada, Não compareceu, Cancelada ou Reembolso.' },
    ],
    cuidados: [
      'Passagem não se exclui: use o cancelamento, que preserva o histórico.',
      'Adicionais vinculados a uma passagem somam ao valor dela nos relatórios.',
      'Reembolsos são registrados pela ação de reembolso, com valor limitado ao total pago.',
    ],
    video: {
      src: '/wiki/media/wiki-08-passagem-adicional.mp4',
      titulo: 'Passagem adicional',
      descricao: 'Registro de uma passagem extra para a solicitação na etapa financeira.',
    },
    relacionados: ['financeiro', 'adicionais', 'ajuda-de-custo'],
  },
  {
    id: 'ajuda-de-custo',
    categoria: 'fluxo',
    titulo: 'Ajuda de custo (diárias)',
    descricao: 'Cadastre períodos de diária com cálculo automático e regra da Ata 7.',
    keywords: ['ajuda de custo', 'diária', 'pernoite', 'período', 'valor', 'ata 7', 'reembolso', 'glosa'],
    paraQueServe:
      'A ajuda de custo paga as diárias do paciente e dos acompanhantes durante a permanência no destino. O sistema calcula o valor automaticamente a partir do período.',
    quandoUsar: 'Para cada período de permanência do beneficiário no destino, na etapa financeira.',
    imagem: {
      src: '/wiki/media/funcionalidades/ajuda-calculo.png',
      alt: "Drawer de período de ajuda de custo com memória de cálculo",
      legenda: "A memória de cálculo mostra o valor na hora: 5 dias resultam em R$ 107,40.",
    },
    dicas: [
      "A memória de cálculo aparece na hora: (dias − 1) × R$ 24,75 + R$ 8,40 do dia do retorno.",
      "\"Pernoite no retorno\" soma uma diária extra quando a chegada passa da meia-noite (regra da Ata 7).",
      "O select de beneficiário mostra idade e vínculo de cada acompanhante para evitar confusão.",
    ],
    passos: [
      'Na aba "Financeiro", seção "Ajuda de custo", clique em "Adicionar período".',
      'Selecione o beneficiário (paciente ou acompanhante, com idade e vínculo exibidos).',
      'Informe "Data início" e "Data fim" do período.',
      'Se o retorno chegou após a meia-noite, marque "Pernoite no retorno": soma uma diária extra (regra da Ata 7).',
      'Confira a "Memória de cálculo" exibida: (dias − 1) × R$ 24,75 + R$ 8,40 da diária de retorno.',
      'Defina o status ("Emitido" ao criar; "Concluído" quando pago) e salve com "Salvar período".',
    ],
    campos: [
      { nome: 'Diária com pernoite', detalhe: 'R$ 24,75 por noite no destino.' },
      { nome: 'Diária de retorno', detalhe: 'R$ 8,40 no dia da volta (sem pernoite).' },
      { nome: 'Status', detalhe: 'Emitido, Concluído (grava a data de conclusão) ou Glosada.' },
    ],
    cuidados: [
      'O pagamento usa os dados bancários vinculados à solicitação: confira a conta antes de concluir.',
      'Prorrogação de estadia pode ser registrada como adicional da categoria "Ajuda extra (prorrogação)".',
      'Reembolsos e glosas são registrados sobre o período, sem apagar o histórico.',
    ],
    video: {
      src: '/wiki/media/wiki-09-ajuda-de-custo.mp4',
      titulo: 'Ajuda de custo',
      descricao: 'Cadastro de um período de diárias com o cálculo automático do valor.',
    },
    relacionados: ['dados-bancarios', 'financeiro', 'adicionais'],
  },
  {
    id: 'adicionais',
    categoria: 'fluxo',
    titulo: 'Adicionais (despesas extras)',
    descricao: 'Registre despesas complementares: transfer, bagagem, corridas e prorrogações.',
    keywords: ['adicional', 'despesa', 'transfer', 'bagagem', 'uber', 'extra', 'prorrogação'],
    paraQueServe:
      'Os adicionais registram custos extras da viagem que não são passagem nem diária padrão: transfer, bagagem, corrida de aplicativo, passagem extra ou prorrogação de ajuda.',
    quandoUsar: 'Sempre que houver uma despesa complementar comprovada na etapa financeira.',
    dicas: [
      "As categorias cobrem os casos comuns: passagem extra, prorrogação de ajuda, bagagem, transfer e outros.",
      "O comprovante anexado aparece também na aba \"Anexos\" da solicitação, com origem \"Adicional\".",
      "Vincular o adicional a uma passagem consolida os valores nos relatórios de faturamento.",
    ],
    passos: [
      'Na aba "Financeiro" (ou pela ação "Adicionar adicional" na fila), clique em "Adicional".',
      'Selecione o beneficiário e descreva a despesa.',
      'Escolha o "Tipo de despesa" (categorias: "Passagem extra", "Ajuda extra (prorrogação)", "Bagagem", "Transfer", "Outro").',
      'Se fizer sentido, vincule o adicional a uma passagem: o valor soma à passagem nos relatórios.',
      'Informe data de pagamento, valor e anexe o comprovante. Salve.',
    ],
    campos: [
      { nome: 'Status do adicional', detalhe: 'Entra como "Pendente aprovação"; depois "Aprovado", "Indeferido" ou "Pago".' },
      { nome: 'Vincular a passagem', detalhe: 'Opcional. Não disponível em solicitações do tipo ajuda de custo.' },
    ],
    cuidados: [
      'Todo adicional nasce pendente de aprovação: acompanhe o status até o pagamento.',
      'Anexe sempre o comprovante: ele fica disponível na aba "Anexos" com origem "Adicional".',
    ],
    relacionados: ['passagens', 'financeiro', 'ajuda-de-custo'],
  },
  {
    id: 'encerramento',
    categoria: 'fluxo',
    titulo: 'Encerramento e reabertura',
    descricao: 'Encerre a solicitação com motivo, entenda os efeitos e reabra quando preciso.',
    keywords: ['encerramento', 'encerrar', 'motivo', 'alta', 'óbito', 'abandono', 'desistência', 'reabrir', 'funerária'],
    paraQueServe:
      'O encerramento conclui a solicitação e trava qualquer edição. O motivo escolhido fica registrado no histórico e alimenta os indicadores de encerradas no mês.',
    quandoUsar: 'Quando o atendimento terminou (alta, transferência) ou o processo foi interrompido (óbito, abandono, desistência).',
    imagem: {
      src: '/wiki/media/funcionalidades/encerrar.png',
      alt: "Modal Encerrar solicitação com motivo, data e observação",
      legenda: "O encerramento exige um motivo; a data vem preenchida com o dia atual.",
    },
    dicas: [
      "Quando o motivo é óbito, o sistema habilita o bloco de despesas de funerária com subtotal próprio.",
      "\"Reabrir solicitação\" devolve o caso para o setor que você escolher, com motivo registrado.",
      "A lista de motivos é sua para gerenciar: Configurações > Motivos de Encerramento.",
    ],
    passos: [
      'No detalhe (ou na ação da linha), clique em "Encerrar solicitação".',
      'No modal, selecione o "Motivo" (obrigatório): alta médica, transferência, óbito, abandono ou desistência.',
      'Confirme a "Data" (o padrão é hoje) e escreva uma observação se necessário.',
      'Clique em "Confirmar encerramento". O status muda para "Encerrada" e a edição é bloqueada.',
      'Precisou retomar? Use "Reabrir solicitação" (exige permissão), escolha o setor de destino e informe o motivo da reabertura.',
    ],
    campos: [
      { nome: 'Motivo', detalhe: 'Lista configurável em Sistema > Configurações ("Motivos de Encerramento").' },
      { nome: 'Despesas de funerária', detalhe: 'Bloco habilitado quando o motivo é óbito: transporte, urna e translado, com subtotal próprio.' },
    ],
    cuidados: [
      'Antes de encerrar, confira o checklist do Financeiro: pendências de pagamento não devem ficar para depois do encerramento.',
      'A solicitação encerrada exibe o banner "Nenhuma edição é permitida. Para retomar o fluxo, reabra a solicitação."',
      'A lista de motivos precisa estar preenchida nas Configurações: sem motivos cadastrados, o encerramento fica bloqueado.',
    ],
    video: {
      src: '/wiki/media/wiki-10-encerramento.mp4',
      titulo: 'Encerramento da solicitação',
      descricao: 'Encerramento com motivo e o efeito de bloqueio da solicitação.',
    },
    relacionados: ['financeiro', 'detalhe-solicitacao', 'configuracoes'],
  },

  // ────────────────────────────────── GESTÃO ─────────────────────────────────
  {
    id: 'dashboard',
    categoria: 'gestao',
    titulo: 'Painel (Dashboard)',
    descricao: 'Acompanhe indicadores por setor, atividades recentes, tendências e rankings.',
    keywords: ['painel', 'dashboard', 'indicadores', 'kpi', 'gráfico', 'tendência', 'atividades'],
    paraQueServe:
      'O Painel dá a foto do momento: quantas solicitações ativas há em cada setor, o que a equipe fez recentemente e como o volume evolui mês a mês.',
    quandoUsar: 'Início do dia de trabalho e reuniões de acompanhamento.',
    dicas: [
      "Cada item de \"Atividades recentes\" é um link direto para a solicitação correspondente.",
      "\"Ver setor\" nos cards leva à fila já filtrada daquele setor.",
      "A tendência de 6 meses compara entradas e encerramentos: bom termômetro de vazão.",
    ],
    passos: [
      'Acesse "Painel" no menu.',
      'No topo: distribuição das solicitações ativas por setor, "Encerradas no mês" e "Taxa de aprovação".',
      'Em "Atividades recentes", acompanhe as últimas ações da equipe. Cada item leva à solicitação; "Ver todos" abre os logs.',
      'Nos três cards de setor (Solicitação, Regulação, Financeiro), veja os números específicos e use "Ver setor" para ir à fila.',
      'Abaixo, a "Tendência últimos 6 meses" compara novas solicitações e encerramentos, e os rankings mostram as regiões, regionais e municípios com mais casos.',
    ],
    cuidados: [
      'O card do Financeiro alerta viagens nos próximos 7 dias: use esse aviso para antecipar emissões.',
      'Os números do painel refletem o que está registrado: registros atrasados distorcem os indicadores.',
    ],
    relacionados: ['relatorios', 'solicitacoes', 'logs'],
  },
  {
    id: 'relatorios',
    categoria: 'gestao',
    titulo: 'Relatórios',
    descricao: 'Gere os relatórios Financeiro, Faturamento, BPA e Gestão, com exportação.',
    keywords: ['relatório', 'financeiro', 'faturamento', 'bpa', 'gestão', 'exportar', 'csv', 'pdf', 'imprimir'],
    paraQueServe:
      'A tela "Relatórios" consolida os dados do TFD em quatro visões prontas para prestação de contas e lançamentos.',
    quandoUsar: 'Fechamentos mensais e quadrimestrais, lançamento do BPA e análises gerenciais.',
    dicas: [
      "Todos os relatórios exportam para CSV/Excel e têm versão de impressão em PDF.",
      "O relatório de Gestão consolida por paciente: diagnóstico, origem do laudo, destino e parecer numa linha só.",
      "O BPA já sai no formato de lançamento, contando doadores como pacientes.",
    ],
    passos: [
      'No menu, acesse "Relatórios" e escolha a aba.',
      '"Financeiro": acompanhamento quadrimestral consolidado.',
      '"Faturamento": relatório mensal de passagens.',
      '"BPA": dados prontos para lançamento no BPA.',
      '"Gestão": visão consolidada por paciente (diagnóstico, origem do laudo, destino e parecer).',
      'Use "Exportar" (CSV/Excel) ou "Imprimir / PDF" conforme a necessidade.',
    ],
    cuidados: [
      'O acesso a cada relatório é uma permissão separada: seu papel pode ver apenas algumas abas.',
      'Acompanhantes marcados como doador contam como paciente no cálculo do BPA: confira essa marcação nas solicitações.',
    ],
    relacionados: ['dashboard', 'papeis-permissoes'],
  },
  {
    id: 'usuarios',
    categoria: 'gestao',
    titulo: 'Usuários',
    descricao: 'Cadastre usuários, atribua papéis, informe CRM de médicos e redefina senhas.',
    keywords: ['usuário', 'adicionar usuário', 'crm', 'médico', 'matrícula', 'redefinir senha', 'remover'],
    paraQueServe:
      'A tela "Usuários" gerencia quem acessa o sistema, o papel de cada pessoa e os dados profissionais (como CRM dos médicos).',
    quandoUsar: 'Entrada e saída de servidores, mudança de função ou reset de senha.',
    dicas: [
      "O papel pode ser trocado direto na linha da lista, sem abrir o cadastro.",
      "\"Redefinir senha\" dispara o e-mail de redefinição na hora.",
      "O toggle \"Médico\" abre os campos de CRM e UF, pré-requisito para emitir parecer.",
    ],
    passos: [
      'No menu, acesse "Administrativo" (aba "Usuários") e clique em "Adicionar Usuário".',
      'Preencha nome completo, CPF, e-mail institucional, matrícula e cargo.',
      'Escolha o "Papel de acesso" (pode ser definido depois).',
      'Se a pessoa for médica, ative o toggle "Médico" e informe CRM e UF do CRM.',
      'Confirme o cadastro. O usuário receberá o link de primeiro acesso para criar a senha.',
      'Na lista, você pode trocar o papel direto na linha, usar "Redefinir senha" ou "Remover do sistema".',
    ],
    cuidados: [
      'Sem papel atribuído, o usuário entra mas não enxerga as telas de trabalho.',
      'Médicos sem CRM cadastrado não conseguem emitir parecer: o sistema bloqueia com aviso.',
      'Prefira remover o acesso a excluir: o histórico de ações do usuário permanece nos logs.',
    ],
    relacionados: ['papeis-permissoes', 'parecer-medico', 'login'],
  },
  {
    id: 'papeis-permissoes',
    categoria: 'gestao',
    titulo: 'Papéis e permissões',
    descricao: 'Configure perfis de acesso por tela e ação: quem vê e quem faz o quê.',
    keywords: ['papel', 'permissão', 'perfil', 'acesso', 'rbac', 'regulador', 'coordenação', 'atendente'],
    paraQueServe:
      'Os papéis definem o que cada grupo de usuários pode ver e fazer, tela por tela, ação por ação. Exemplos de papéis: Atendente Municipal, Atendente Regional, Coordenação Estadual, Médico Auditor, Setor de Regulação, Setor de Passagens, Financeiro, Assistente Social e Controle Interno.',
    quandoUsar: 'Na implantação e sempre que uma função nova surgir ou mudar de escopo.',
    dicas: [
      "\"Todas\" e \"Nenhuma\" marcam as ações em lote, depois é só lapidar.",
      "Cada papel tem uma cor: ela aparece na lista de usuários e facilita a leitura.",
      "A coluna \"Usuários\" mostra quantas pessoas cada papel afeta antes de você editá-lo.",
    ],
    passos: [
      'No menu, acesse "Administrativo" (aba "Permissões") e clique em "Novo Papel".',
      'Dê nome, descrição e cor ao papel.',
      'Na seção "Telas e ações", marque as telas que o papel acessa e, em cada tela, as ações permitidas (criar, editar, excluir, emitir parecer, aplicar carimbo etc.).',
      'Use "Todas" ou "Nenhuma" para marcar em lote.',
      'Salve. As permissões passam a valer no próximo carregamento da sessão dos usuários.',
    ],
    cuidados: [
      '"Visualizar" é obrigatório quando outras ações da tela estão ativas: o sistema trava essa opção automaticamente.',
      'Salvar o papel substitui completamente as permissões anteriores: revise a lista antes de confirmar.',
      'O perfil "Administrador Master" tem todas as ações e não deve ser distribuído para operação de rotina.',
    ],
    relacionados: ['usuarios', 'navegacao', 'logs'],
  },
  {
    id: 'configuracoes',
    categoria: 'gestao',
    titulo: 'Configurações',
    descricao: 'Mantenha as tabelas auxiliares e os catálogos CID-10, CID-11 e SIGTAP.',
    keywords: ['configurações', 'tabelas auxiliares', 'tipos de procedimento', 'motivos de encerramento', 'bancos', 'companhias', 'cid', 'sigtap', 'vínculo'],
    paraQueServe:
      'As Configurações mantêm as listas que alimentam os formulários do sistema: tipos de procedimento e documento, vínculos, companhias de transporte, motivos de encerramento, tipos de despesa, bancos e regiões, além dos catálogos CID-10, CID-11 e SIGTAP.',
    quandoUsar: 'Na implantação e quando uma opção nova precisar aparecer em algum formulário.',
    dicas: [
      "Tudo que aparece em selects do sistema nasce aqui: procedimentos, vínculos, companhias, bancos, motivos, tipos de despesa.",
      "Os catálogos CID-10, CID-11 e SIGTAP têm abas próprias com busca.",
      "Ajustar o nome de um item atualiza a opção nos formulários sem afetar registros antigos.",
    ],
    passos: [
      'No menu, acesse "Configurações".',
      'Na aba "Tabelas Auxiliares", escolha a categoria (ex.: "Motivos de Encerramento") e use "Novo Item" para incluir, ou edite/exclua itens existentes.',
      'Nas abas "CID-10", "CID-11" e "Códigos SIGTAP", gerencie os catálogos clínicos e de procedimentos usados nos pareceres e no BPA.',
    ],
    cuidados: [
      'Tabela auxiliar vazia bloqueia o fluxo que depende dela: por exemplo, sem "Motivos de Encerramento" cadastrados ninguém consegue encerrar solicitações.',
      'Excluir um item de tabela auxiliar não altera registros antigos, mas remove a opção de novos formulários. Prefira ajustar o nome quando possível.',
    ],
    relacionados: ['encerramento', 'adicionais', 'parecer-medico'],
  },
  {
    id: 'logs',
    categoria: 'gestao',
    titulo: 'Logs e auditoria',
    descricao: 'Audite quem fez o quê, quando e em qual solicitação.',
    keywords: ['logs', 'auditoria', 'histórico', 'ações', 'rastreabilidade', 'quem alterou'],
    paraQueServe:
      'Os logs registram todas as ações relevantes do sistema (criação, edição, parecer, emissão, encerramento, mudanças de usuário), com autor, entidade, data e hora.',
    quandoUsar: 'Para auditar um caso, esclarecer divergências ou responder a questionamentos de controle interno.',
    dicas: [
      "Filtre por módulo (Operacional, Regulação, Passagens, Financeiro, Sistema, Autenticação) para investigar por área.",
      "O período com data início e fim delimita auditorias a um intervalo exato.",
      "O recorte filtrado pode ser exportado em CSV para anexar a relatórios de controle interno.",
    ],
    passos: [
      'No menu, acesse "Administrativo" (aba "Logs").',
      'Busque por usuário ou descrição, e filtre por período, ação ou módulo (Operacional, Regulação, Passagens, Financeiro, Sistema, Autenticação).',
      'Cada linha mostra o usuário, a ação, a entidade alterada e a data/hora.',
      'Use a exportação para gerar o CSV do recorte filtrado.',
    ],
    cuidados: [
      'Os logs são somente leitura: ninguém edita ou apaga o histórico pela interface.',
      'Ao investigar uma solicitação, combine os logs com a aba "Linha do tempo" do detalhe, que mostra os eventos do caso em ordem.',
    ],
    relacionados: ['detalhe-solicitacao', 'papeis-permissoes', 'dashboard'],
  },
];

export function getTopic(id: string): WikiTopic | undefined {
  return WIKI_TOPICS.find((t) => t.id === id);
}

export function getChapter(id: string): WikiChapter | undefined {
  return WIKI_CHAPTERS.find((c) => c.id === id);
}

export function chapterTopics(chapter: WikiChapter): WikiTopic[] {
  return chapter.topicos
    .map((id) => getTopic(id))
    .filter((t): t is WikiTopic => Boolean(t));
}

export function chapterOfTopic(topicId: string): WikiChapter | undefined {
  return WIKI_CHAPTERS.find((c) => c.topicos.includes(topicId));
}

export function searchTopics(query: string): WikiTopic[] {
  const q = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!q) return WIKI_TOPICS;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return WIKI_TOPICS.filter((t) => {
    const chapter = chapterOfTopic(t.id);
    const haystack = [t.titulo, t.descricao, chapter?.titulo ?? '', ...t.keywords].map(norm).join(' ');
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
}
