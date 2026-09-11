import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  Gauge,
  Layers3,
  LockKeyhole,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { businessConfig, buildWhatsAppUrl } from "../config/business";
import { getVisibleQuestions, type QuizQuestion } from "../config/quiz";
import { calculateDiagnosis, formatTemperature, type Diagnosis } from "../lib/leadScoring";
import {
  getAttribution,
  isSupabaseConfigured,
  submitLead,
  type LeadPayload,
} from "../lib/leadService";

export const Route = createFileRoute("/")({ component: BusinessControlLanding });

type Answers = Record<string, string>;

function track(event: string, details?: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("business-control-analytics", { detail: { event, ...details } }));
}

function BusinessControlLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <main className="bc-site">
      <header className="bc-header">
        <a className="bc-logo" href="#" aria-label="Business Control, início">
          <span className="bc-logo-mark"><span /></span>
          <span>Business <strong>Control</strong></span>
        </a>
        <nav className={mobileMenuOpen ? "bc-nav is-open" : "bc-nav"} aria-label="Navegação principal">
          <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>Como funciona</a>
          <a href="#solucoes" onClick={() => setMobileMenuOpen(false)}>Soluções</a>
          <a href="#seguranca" onClick={() => setMobileMenuOpen(false)}>Segurança</a>
          <a href="#duvidas" onClick={() => setMobileMenuOpen(false)}>Dúvidas</a>
        </nav>
        <a className="bc-header-cta" href="#diagnostico">Fazer diagnóstico <ArrowRight size={16} /></a>
        <button className="bc-menu-button" aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileMenuOpen((value) => !value)}>
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <section className="bc-hero">
        <div className="bc-hero-copy">
          <div className="bc-kicker"><span className="bc-kicker-dot" /> {businessConfig.eyebrow}</div>
          <h1>{businessConfig.headline}</h1>
          <p className="bc-hero-subtitle">{businessConfig.subheadline}</p>
          <div className="bc-proof-line"><ShieldCheck size={17} /> Diagnóstico inicial em poucos minutos <span /> Sem compromisso</div>
          <div className="bc-hero-actions">
            <a className="bc-button bc-button-primary" href="#diagnostico">Descobrir meu próximo passo <ArrowRight size={18} /></a>
            <a className="bc-text-link" href="#como-funciona">Entender a abordagem <ChevronRight size={16} /></a>
          </div>
        </div>
        <div className="bc-hero-visual" id="diagnostico">
          <QuizWizard onDiagnosis={setDiagnosis} />
        </div>
      </section>

      <div className="bc-trust-strip">
        <span>Para empresas que querem sair do improviso</span>
        <span className="bc-trust-item"><Check size={15} /> Modelado para sua operação</span>
        <span className="bc-trust-item"><Check size={15} /> Dados sob seu controle</span>
        <span className="bc-trust-item"><Check size={15} /> Evolução por etapas</span>
      </div>

      <section className="bc-section bc-problem-section">
        <div className="bc-section-intro">
          <div className="bc-kicker">O custo do controle improvisado</div>
          <h2>Quando a empresa cresce, a planilha vira parte do problema.</h2>
          <p>O desafio não é usar tecnologia. É continuar tomando decisões importantes com informações espalhadas e processos que só uma pessoa conhece.</p>
        </div>
        <div className="bc-problem-grid">
          <ProblemCard icon={<ClipboardCheck />} title="Versões diferentes" text="A equipe trabalha com arquivos desatualizados e ninguém sabe qual informação é a certa." />
          <ProblemCard icon={<Layers3 />} title="Retrabalho diário" text="O mesmo dado é digitado em vários lugares antes de virar uma decisão." />
          <ProblemCard icon={<Gauge />} title="Gestão no escuro" text="Os números chegam tarde e o empresário descobre o problema quando ele já cresceu." />
          <ProblemCard icon={<Settings2 />} title="Processo dependente" text="A operação para quando a pessoa que domina a planilha não está disponível." />
        </div>
      </section>

      <section className="bc-section bc-dark-section" id="solucoes">
        <div className="bc-section-intro bc-section-intro-light">
          <div className="bc-kicker bc-kicker-light">O que pode ser construído</div>
          <h2>Um sistema que acompanha o jeito que sua empresa trabalha.</h2>
          <p>Não existe um pacote fechado de funções. Existe uma conversa sobre sua operação, uma prioridade clara e uma solução que evolui com você.</p>
        </div>
        <div className="bc-solution-grid">
          <SolutionCard icon={<BarChart3 />} title="Painéis de gestão" text="Indicadores importantes em uma visão simples, atualizada e útil para decidir." />
          <SolutionCard icon={<Database />} title="Controle centralizado" text="Clientes, pedidos, estoque, financeiro ou produção conectados no mesmo fluxo." />
          <SolutionCard icon={<Sparkles />} title="Automação sob medida" text="Menos digitação repetida, alertas no momento certo e rotinas que seguem suas regras." />
        </div>
      </section>

      <section className="bc-section" id="como-funciona">
        <div className="bc-split-section">
          <div className="bc-section-intro">
            <div className="bc-kicker">Como funciona</div>
            <h2>Clareza antes de código.</h2>
            <p>O diagnóstico é o começo de um processo consultivo. Primeiro entendemos o fluxo. Depois definimos o que realmente merece virar sistema.</p>
          </div>
          <div className="bc-steps">
            <Step number="01" title="Mapeamos sua rotina" text="Entendemos entradas, saídas, pessoas, regras e gargalos do seu negócio." />
            <Step number="02" title="Desenhamos a prioridade" text="Organizamos o que deve ser resolvido primeiro para gerar valor sem excesso de complexidade." />
            <Step number="03" title="Construímos e evoluímos" text="Você acompanha entregas por etapas, valida o uso e amplia o sistema quando fizer sentido." />
          </div>
        </div>
      </section>

      <section className="bc-section bc-security-section" id="seguranca">
        <div className="bc-security-card">
          <div className="bc-security-icon"><LockKeyhole size={25} /></div>
          <div>
            <div className="bc-kicker">Segurança desde o desenho</div>
            <h2>Seu controle precisa ser confiável.</h2>
            <p>A arquitetura foi preparada para autenticação administrativa, banco seguro, permissões por perfil, proteção de dados e evolução sem expor credenciais no navegador.</p>
          </div>
          <div className="bc-security-points">
            <span><ShieldCheck size={16} /> RLS no banco</span>
            <span><ShieldCheck size={16} /> Acesso administrativo</span>
            <span><ShieldCheck size={16} /> Consentimento LGPD</span>
          </div>
        </div>
      </section>

      <section className="bc-section bc-faq-section" id="duvidas">
        <div className="bc-section-intro">
          <div className="bc-kicker">Dúvidas frequentes</div>
          <h2>O que você precisa saber antes de começar.</h2>
        </div>
        <div className="bc-faq-list">
          <Faq question="A Business Control atende qualquer ramo?" answer="Sim. A proposta é entender a operação de cada empresa e modelar o sistema para as regras do negócio, seja comércio, serviço, indústria ou outro segmento." />
          <Faq question="Vocês vendem um sistema pronto?" answer="O primeiro passo é o diagnóstico. A partir dele, podemos indicar uma solução sob medida, integrações ou uma evolução por etapas — sem prometer recursos que não resolvem seu problema." />
          <Faq question="Preciso abandonar todas as minhas planilhas de uma vez?" answer="Não. A migração pode acontecer gradualmente, com prioridades claras e validações antes de substituir controles importantes." />
          <Faq question="Quanto custa desenvolver um sistema exclusivo?" answer="O investimento depende da operação, das integrações e da prioridade definida. A reunião serve justamente para transformar uma necessidade ampla em um escopo compreensível." />
        </div>
      </section>

      <section className="bc-final-cta">
        <div>
          <div className="bc-kicker bc-kicker-light">Seu próximo passo começa aqui</div>
          <h2>Menos improviso. Mais controle para fazer a empresa avançar.</h2>
          <p>Responda ao diagnóstico e converse com a Business Control sobre a realidade do seu negócio.</p>
        </div>
        <a className="bc-button bc-button-light" href="#diagnostico">Fazer meu diagnóstico <ArrowRight size={18} /></a>
      </section>

      <section className="bc-section bc-about-section" id="sobre-jose">
        <div className="bc-about-photo-wrap">
          <img
            className="bc-about-photo"
            src="/images/jose-augusto-goncalves-filho.png"
            alt="José Augusto Gonçalves Filho, fundador da Business Control"
          />
        </div>
        <div className="bc-about-copy">
          <div className="bc-kicker">Quem está por trás da Business Control</div>
          <h2>Experiência prática para transformar controle em clareza.</h2>
          <p>
            José Augusto Gonçalves Filho nasceu em 1991 e iniciou sua trajetória profissional em 2013, como técnico de informática. Em 2017, concluiu sua formação em Contabilidade pela Faculdade de Anicuns (FEA), depois de iniciar sua experiência em um escritório contábil como estagiário, em 2016.
          </p>
          <p>
            Atuou na área contábil até 2024 e, nesse caminho, acompanhou de perto os desafios que muitas empresas enfrentam no controle financeiro, de compras, fiscal e operacional. Foi dessa vivência que nasceu a convicção de que os empresários precisam de sistemas simples, ágeis e construídos para a realidade de cada negócio.
          </p>
          <p>
            Seu compromisso é ouvir, entender e transformar processos complexos em ferramentas claras para apoiar decisões melhores. A Business Control nasce para colocar essa experiência a serviço de empresas que querem sair do improviso e construir uma gestão mais segura, organizada e preparada para crescer.
          </p>
          <div className="bc-about-highlights">
            <span><strong>Desde 2013</strong> em tecnologia</span>
            <span><strong>Formação em 2017</strong> em Contabilidade</span>
            <span><strong>Experiência real</strong> em gestão e controle</span>
          </div>
        </div>
      </section>

      <footer className="bc-footer">
        <div className="bc-logo"><span className="bc-logo-mark"><span /></span><span>Business <strong>Control</strong></span></div>
        <p>Controle que se adapta à sua empresa.</p>
        <div className="bc-footer-links"><a href="#diagnostico">Diagnóstico</a><a href="#sobre-jose">Sobre José</a><a href="#seguranca">Privacidade</a><a href="#duvidas">Termos</a></div>
      </footer>
    </main>
  );
}

function QuizWizard({ onDiagnosis }: { onDiagnosis: (diagnosis: Diagnosis) => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [showCapture, setShowCapture] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const questions = useMemo(() => getVisibleQuestions(answers), [answers]);
  const question = questions[index];

  function selectAnswer(value: string) {
    if (!question) return;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    track("quiz_step_completed", { question: question.id });
    if (index >= questions.length - 1) {
      setDiagnosis(calculateDiagnosis(next));
      setShowCapture(true);
      track("lead_form_viewed");
    } else {
      setIndex((value) => value + 1);
    }
  }

  function goBack() {
    if (showCapture) {
      setShowCapture(false);
      setIndex(Math.max(0, questions.length - 1));
      return;
    }
    setIndex((value) => Math.max(0, value - 1));
  }

  function handleSubmitted(payload: LeadPayload, result: { ok: boolean; code?: string; message?: string }) {
    if (!diagnosis) return;
    setSubmitted(true);
    setSubmissionMessage(result.ok ? "Diagnóstico enviado. Em breve entraremos em contato." : (result.message ?? "Diagnóstico calculado."));
    onDiagnosis(diagnosis);
    track("lead_submitted", { status: result.ok ? "saved" : result.code ?? "failed" });
    if (!result.ok) track("diagnosis_viewed");
    void payload;
  }

  if (submitted && diagnosis) {
    return <DiagnosisCard diagnosis={diagnosis} message={submissionMessage} />;
  }

  return (
    <div className="bc-quiz-card">
      <div className="bc-quiz-topline">
        <span>{showCapture ? "Seu diagnóstico está pronto" : "Diagnóstico de controle"}</span>
        <span>{showCapture ? "Final" : String(index + 1).padStart(2, "0") + " / " + String(questions.length).padStart(2, "0")}</span>
      </div>
      <div className="bc-progress"><span style={{ width: showCapture ? "100%" : ((index + 1) / questions.length) * 100 + "%" }} /></div>
      {!showCapture && question ? (
        <QuizQuestion question={question} selected={answers[question.id]} onSelect={selectAnswer} onBack={goBack} canGoBack={index > 0} />
      ) : diagnosis ? (
        <LeadCapture diagnosis={diagnosis} answers={answers} onBack={goBack} onSubmitted={handleSubmitted} />
      ) : null}
    </div>
  );
}

function QuizQuestion({ question, selected, onSelect, onBack, canGoBack }: {
  question: QuizQuestion;
  selected?: string | undefined;
  onSelect: (value: string) => void;
  onBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <div className="bc-question">
      <div className="bc-question-icon"><ClipboardCheck size={20} /></div>
      <h2>{question.title}</h2>
      <p>{question.description}</p>
      <div className="bc-option-list">
        {question.answers?.map((answer) => (
          <button key={answer.value} className={selected === answer.value ? "bc-option is-selected" : "bc-option"} onClick={() => onSelect(answer.value)}>
            <span>{answer.label}</span><ChevronRight size={17} />
          </button>
        ))}
      </div>
      <div className="bc-quiz-footer"><button className="bc-back-button" onClick={onBack} disabled={!canGoBack}><ChevronLeft size={16} /> Voltar</button><span>Uma pergunta por vez</span></div>
    </div>
  );
}

function LeadCapture({ diagnosis, answers, onBack, onSubmitted }: {
  diagnosis: Diagnosis;
  answers: Answers;
  onBack: () => void;
  onSubmitted: (payload: LeadPayload, result: { ok: boolean; code?: string; message?: string }) => void;
}) {
  const [form, setForm] = useState({ name: "", companyName: "", phone: "", email: "", role: "", consent: false, honeypot: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name || !form.companyName || !form.phone || !form.email || !form.consent) {
      setError("Preencha os campos obrigatórios e confirme o consentimento.");
      return;
    }
    if (form.honeypot) return;
    setError("");
    setLoading(true);
    const payload: LeadPayload = { ...form, answers, diagnosis, attribution: getAttribution() };
    const result = await submitLead(payload);
    setLoading(false);
    onSubmitted(payload, result);
  }

  return (
    <form className="bc-lead-form" onSubmit={submitForm}>
      <div className="bc-form-heading"><div className="bc-form-badge"><Sparkles size={15} /> Diagnóstico concluído</div><h2>Onde podemos enviar seu próximo passo?</h2><p>Seus dados serão usados apenas para o contato solicitado.</p></div>
      <div className="bc-form-grid">
        <label>Seu nome *<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required /></label>
        <label>Empresa *<input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} autoComplete="organization" required /></label>
        <label>WhatsApp *<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} inputMode="tel" autoComplete="tel" required /></label>
        <label>E-mail *<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" autoComplete="email" required /></label>
      </div>
      <label>Cargo ou função <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Ex.: proprietário, gestor, financeiro" /></label>
      <label className="bc-honeypot" aria-hidden="true">Website<input value={form.honeypot} onChange={(event) => setForm({ ...form, honeypot: event.target.value })} tabIndex={-1} autoComplete="off" /></label>
      <label className="bc-consent"><input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required /><span>Ao enviar, concordo com o contato da equipe da Business Control conforme a Política de Privacidade.</span></label>
      {error && <p className="bc-form-error" role="alert">{error}</p>}
      {!configured && <p className="bc-config-note">A conexão segura com o banco está pendente de configuração. O diagnóstico será exibido, mas o envio automático ainda não está ativo.</p>}
      <div className="bc-form-actions"><button type="button" className="bc-back-button" onClick={onBack}><ChevronLeft size={16} /> Revisar respostas</button><button className="bc-button bc-button-primary" disabled={loading}>{loading ? "Enviando..." : "Ver meu diagnóstico"} <ArrowRight size={17} /></button></div>
    </form>
  );
}

function DiagnosisCard({ diagnosis, message }: { diagnosis: Diagnosis; message: string }) {
  const whatsappMessage = "Olá! Acabei de realizar o diagnóstico na Business Control e gostaria de entender melhor a solução indicada para minha empresa.";
  return (
    <div className="bc-diagnosis">
      <div className="bc-form-badge"><Check size={15} /> {message}</div>
      <h2>Seu ponto de partida está claro.</h2>
      <p className="bc-diagnosis-intro">Com base nas suas respostas, identificamos oportunidades para tornar o controle mais confiável e menos dependente de planilhas.</p>
      <div className="bc-diagnosis-metrics"><div><span>Nível atual</span><strong>{diagnosis.digitalization}</strong></div><div><span>Potencial de automação</span><strong>{diagnosis.automation}</strong></div><div><span>Prioridade</span><strong>{diagnosis.priority}</strong></div></div>
      <div className="bc-diagnosis-solution"><span>Solução indicada</span><strong>{diagnosis.solution}</strong><div className="bc-area-tags">{diagnosis.areas.map((area) => <span key={area}>{area}</span>)}</div></div>
      <a className="bc-button bc-button-whatsapp" href={buildWhatsAppUrl(whatsappMessage)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Conversar pelo WhatsApp <ArrowRight size={17} /></a>
      <p className="bc-diagnosis-footnote">Classificação inicial: lead {formatTemperature(diagnosis.temperature)} · score {diagnosis.score}</p>
    </div>
  );
}

function ProblemCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="bc-problem-card"><div>{icon}</div><h3>{title}</h3><p>{text}</p></article>; }
function SolutionCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="bc-solution-card"><div>{icon}</div><h3>{title}</h3><p>{text}</p><a href="#diagnostico">Explorar possibilidade <ArrowRight size={15} /></a></article>; }
function Step({ number, title, text }: { number: string; title: string; text: string }) { return <div className="bc-step"><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>; }
function Faq({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return <div className={open ? "bc-faq is-open" : "bc-faq"}><button onClick={() => setOpen((value) => !value)} aria-expanded={open}><span>{question}</span>{open ? <Minus size={18} /> : <Plus size={18} />}</button>{open && <p>{answer}</p>}</div>;
}
