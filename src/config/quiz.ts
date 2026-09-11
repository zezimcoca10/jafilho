export type QuizAnswer = {
  label: string;
  value: string;
  score: number;
  areas: string[];
};

export type QuizQuestion = {
  id: string;
  title: string;
  description?: string;
  type: "single" | "text";
  answers?: QuizAnswer[];
  placeholder?: string;
  required?: boolean;
  showWhen?: (answers: Record<string, string>) => boolean;
};

export const quizQuestions: QuizQuestion[] = [
  {
    id: "main_challenge",
    title: "Qual é o maior desafio no controle da sua empresa hoje?",
    description: "Escolha o ponto que mais consome sua atenção.",
    type: "single",
    answers: [
      { label: "Informações espalhadas", value: "scattered", score: 3, areas: ["centralização"] },
      { label: "Planilhas difíceis de manter", value: "spreadsheets", score: 3, areas: ["automação"] },
      { label: "Falta de visão financeira", value: "finance", score: 3, areas: ["financeiro"] },
      { label: "Acompanhar vendas e clientes", value: "sales", score: 2, areas: ["vendas"] },
      { label: "Operação sem padrão", value: "operations", score: 3, areas: ["processos"] },
      { label: "Outro gargalo", value: "other", score: 1, areas: ["processos"] },
    ],
  },
  {
    id: "uses_system",
    title: "Sua empresa já utiliza algum sistema para controlar a operação?",
    description: "Essa resposta ajuda a definir o melhor ponto de partida para o seu diagnóstico.",
    type: "single",
    answers: [
      { label: "Sim, já utilizamos um sistema", value: "yes", score: 2, areas: ["processos"] },
      { label: "Não, ainda não utilizamos", value: "no", score: 4, areas: ["centralização", "automação"] },
    ],
  },
  {
    id: "system_name",
    title: "Qual é o nome do sistema utilizado hoje?",
    description: "Digite o nome do sistema que sua empresa utiliza atualmente.",
    type: "text",
    placeholder: "Ex.: sistema financeiro, ERP ou nome da plataforma",
    required: true,
    showWhen: (answers) => answers["uses_system"] === "yes",
  },
  {
    id: "current_control",
    title: "Como sua equipe registra e acompanha a operação?",
    description: "Não existe resposta certa — queremos entender o ponto de partida.",
    type: "single",
    answers: [
      { label: "Principalmente planilhas e papel", value: "manual", score: 4, areas: ["automação", "centralização"] },
      { label: "Planilhas + ferramentas separadas", value: "mixed", score: 3, areas: ["integrações", "centralização"] },
      { label: "Um sistema concentra a maior parte do controle", value: "system", score: 2, areas: ["processos"] },
      { label: "Cada pessoa controla de um jeito", value: "people", score: 4, areas: ["processos", "centralização"] },
    ],
  },
  {
    id: "team_size",
    title: "Quantas pessoas precisam participar desse controle?",
    description: "Inclua quem registra, consulta ou toma decisões.",
    type: "single",
    answers: [
      { label: "Só eu", value: "one", score: 1, areas: ["visibilidade"] },
      { label: "2 a 5 pessoas", value: "small", score: 2, areas: ["visibilidade"] },
      { label: "6 a 15 pessoas", value: "medium", score: 3, areas: ["permissões", "visibilidade"] },
      { label: "Mais de 15 pessoas", value: "large", score: 4, areas: ["permissões", "visibilidade"] },
    ],
  },
  {
    id: "system_limit",
    title: "O que mais limita a forma atual de trabalhar?",
    description: "Essa pergunta aparece para quem já usa algum sistema.",
    type: "single",
    showWhen: (answers) => answers["current_control"] === "system",
    answers: [
      { label: "Não conversa com outras ferramentas", value: "integration", score: 3, areas: ["integrações"] },
      { label: "É complexo para a equipe", value: "complex", score: 3, areas: ["simplicidade"] },
      { label: "Faltam recursos específicos", value: "missing", score: 4, areas: ["personalização"] },
      { label: "Não tenho dados confiáveis", value: "trust", score: 4, areas: ["visibilidade"] },
    ],
  },
  {
    id: "spreadsheet_pain",
    title: "Quando a operação depende de planilhas, o que mais acontece?",
    description: "Essa pergunta aparece para quem usa controles manuais.",
    type: "single",
    showWhen: (answers) => answers["current_control"] === "manual" || answers["current_control"] === "mixed",
    answers: [
      { label: "Erros e versões diferentes", value: "errors", score: 4, areas: ["confiabilidade"] },
      { label: "Muito tempo digitando e conferindo", value: "time", score: 4, areas: ["automação"] },
      { label: "Não consigo acompanhar em tempo real", value: "delay", score: 3, areas: ["visibilidade"] },
      { label: "Só uma pessoa sabe como funciona", value: "dependency", score: 4, areas: ["processos"] },
    ],
  },
  {
    id: "urgency",
    title: "Quando você gostaria de organizar esse controle?",
    description: "A resposta ajuda a priorizar o próximo passo.",
    type: "single",
    answers: [
      { label: "Estou apenas pesquisando", value: "research", score: 1, areas: ["clareza"] },
      { label: "Nos próximos meses", value: "months", score: 2, areas: ["planejamento"] },
      { label: "Quero começar logo", value: "soon", score: 4, areas: ["prioridade"] },
      { label: "É urgente: já estou perdendo tempo ou dinheiro", value: "urgent", score: 5, areas: ["prioridade", "automação"] },
    ],
  },
  {
    id: "desired_control",
    title: "Qual resultado faria mais diferença para você?",
    description: "Escolha a transformação mais importante.",
    type: "single",
    answers: [
      { label: "Ter tudo em um só lugar", value: "centralized", score: 3, areas: ["centralização"] },
      { label: "Automatizar tarefas repetitivas", value: "automated", score: 3, areas: ["automação"] },
      { label: "Enxergar indicadores para decidir melhor", value: "indicators", score: 3, areas: ["visibilidade"] },
      { label: "Ter um fluxo que siga minhas regras", value: "custom", score: 4, areas: ["personalização"] },
    ],
  },
];

export function getVisibleQuestions(answers: Record<string, string>) {
  return quizQuestions.filter((question) => !question.showWhen || question.showWhen(answers));
}
