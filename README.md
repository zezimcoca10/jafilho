# Business Control

Landing page inteligente para diagnóstico, qualificação e captação de empresas que querem substituir planilhas e controles dispersos por um sistema sob medida.

## Projeto

A Business Control atende MEIs, pequenas e médias empresas em todo o Brasil. O fluxo principal é:

visitante → diagnóstico → qualificação → captura → resultado → WhatsApp/reunião → gestão comercial.

## Arquitetura

- Frontend: React, TypeScript, TanStack Start, Vite e Tailwind CSS.
- Quiz: configuração independente em src/config/quiz.ts, com perguntas condicionais e score por resposta.
- Backend: Supabase REST/Auth preparados em src/lib/leadService.ts.
- Banco: migration em supabase/migrations.
- Administração: /admin/login e /admin, protegidos por autenticação real do Supabase e RLS.

## Desenvolvimento local

1. Copie .env.example para .env.
2. Preencha a URL e a chave publicável do Supabase quando o projeto estiver ativo.
3. Instale as dependências com npm install ou bun install.
4. Execute npm run dev.
5. Valide com npm run lint e npm run build.

## Variáveis de ambiente

- VITE_SUPABASE_URL: URL pública do projeto Supabase.
- VITE_SUPABASE_PUBLISHABLE_KEY: chave publicável/anon. Nunca use service_role.
- VITE_WHATSAPP_NUMBER: número com DDI e DDD, somente números.
- VITE_GA_MEASUREMENT_ID, VITE_GTM_ID e VITE_META_PIXEL_ID: opcionais.

## Supabase

O arquivo supabase/migrations/202609110001_business_control.sql cria leads, respostas, notas, histórico e admin_users, ativa RLS e impede leitura pública de leads.

O primeiro administrador deve ser criado no Supabase Auth e depois autorizado inserindo seu UUID em public.admin_users. Não existe senha fixa no código.

## Customização

- Segmento, marca e contato: src/config/business.ts.
- Perguntas, ramificações e pontuação: src/config/quiz.ts.
- Score e faixas de temperatura: src/lib/leadScoring.ts.
- Conteúdo e componentes visuais: src/routes/index.tsx.
- Identidade visual e responsividade: src/styles.css.

## Estado atual

A interface, o quiz, o score, a captura progressiva, o painel e o schema de segurança estão implementados no código. A persistência real depende de ativar/configurar o projeto Supabase e aplicar a migration. Enquanto isso, a aplicação informa claramente que a conexão está pendente e não simula leads salvos.

## Deploy

O projeto pode ser hospedado em Vercel, Netlify, Cloudflare ou infraestrutura própria compatível com TanStack Start. Configure as variáveis de ambiente no provedor antes de ativar a captação em produção.

## GitHub

Esta entrega está organizada no branch feature/landing-lead-generation. O branch deve passar por lint, typecheck/build e revisão antes de ser incorporado à main.
