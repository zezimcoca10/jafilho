# Supabase — Business Control

Projeto independente: business-control
Região: São Paulo (sa-east-1)
Status: ativo
Custo informado na criação: US$ 0/mês

## Aplicação

A migration inicial já foi aplicada ao projeto Business Control. Ela está versionada em:
supabase/migrations/202609110001_business_control.sql

O schema inclui leads, respostas do quiz, notas, histórico de status e admin_users. Todas as tabelas públicas usam RLS.

## Primeiro administrador

1. Crie o usuário em Authentication > Users.
2. Copie o UUID do usuário.
3. Insira o UUID em public.admin_users pelo SQL Editor.
4. Use o mesmo e-mail e senha em /admin/login.

Não existe credencial fixa no código.

## Configuração do frontend

Copie .env.example para .env e informe:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_WHATSAPP_NUMBER

Apenas a chave publicável/anon pode aparecer no navegador. A service_role deve permanecer somente em ambiente seguro de backend.

## Auditoria

Após a aplicação e o hardening, o advisor de segurança do Supabase não retornou lints. Os avisos de índices não utilizados referem-se a um banco ainda vazio e não são falhas de segurança.
