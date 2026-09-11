import { quizQuestions, type QuizAnswer } from "../config/quiz";

export type LeadTemperature = "frio" | "morno" | "quente";

export type Diagnosis = {
  score: number;
  temperature: LeadTemperature;
  digitalization: "inicial" | "em evolução" | "estruturada";
  automation: "baixa" | "média" | "alta";
  priority: string;
  areas: string[];
  solution: string;
};

export function calculateDiagnosis(answers: Record<string, string>): Diagnosis {
  let score = 0;
  const areaCounts = new Map<string, number>();

  for (const question of quizQuestions) {
    const value = answers[question.id];
    const answer = question.answers?.find((item: QuizAnswer) => item.value === value);
    if (!answer) continue;
    score += answer.score;
    for (const area of answer.areas) {
      areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    }
  }

  const areas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area)
    .slice(0, 3);

  const temperature: LeadTemperature = score >= 21 ? "quente" : score >= 12 ? "morno" : "frio";
  const digitalization = answers["current_control"] === "system"
    ? "estruturada"
    : answers["current_control"] === "mixed"
      ? "em evolução"
      : "inicial";
  const automation = score >= 18 ? "alta" : score >= 10 ? "média" : "baixa";
  const priority = areaLabels[areas[0] ?? "clareza"] ?? areaLabels.clareza;
  const solution = score >= 18
    ? "Sistema sob medida com automações e painel de indicadores"
    : "Diagnóstico operacional + sistema de controle modelado para sua empresa";

  return { score, temperature, digitalization, automation, priority, areas, solution };
}

const areaLabels: Record<string, string> = {
  centralização: "Centralização da operação",
  automação: "Automação de tarefas",
  financeiro: "Controle financeiro",
  vendas: "Vendas e relacionamento",
  processos: "Padronização de processos",
  integrações: "Integração entre ferramentas",
  permissões: "Acesso por equipe e permissões",
  visibilidade: "Visibilidade dos indicadores",
  personalização: "Aderência ao processo real",
  simplicidade: "Simplicidade para a equipe",
  confiabilidade: "Confiabilidade dos dados",
  clareza: "Clareza sobre a operação",
  planejamento: "Planejamento da evolução",
  prioridade: "Priorização do próximo passo",
};

export function formatTemperature(value: LeadTemperature) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
