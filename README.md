# Central Financeira Familiar
### Alan & Vanessa — Pronto para rodar

---

## ✅ O que já foi feito automaticamente

- [x] Banco de dados criado no Supabase (schema `financeiro`)
- [x] Todas as tabelas criadas: receitas, despesas, dívidas, acordos, objetivos, score, categorias
- [x] Dados iniciais inseridos: 5 dívidas, 4 objetivos, histórico de score, 27 categorias aprendidas
- [x] Edge Function `ia-consultora` deployada (IA segura no servidor)
- [x] Arquivo `.env` com as chaves do Supabase já preenchidas

---

## 🔑 Único passo manual — Chave da Anthropic (IA)

A IA já está deployada no Supabase. Só falta dar a chave:

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Crie uma conta (se não tiver) → vá em **API Keys** → crie uma chave
3. Acesse o painel do Supabase: [supabase.com/dashboard](https://supabase.com/dashboard)
4. Selecione o projeto → **Edge Functions** → `ia-consultora` → **Secrets**
5. Adicione: `ANTHROPIC_API_KEY` = `sk-ant-sua_chave_aqui`

Pronto. A IA está funcionando.

---

## 🚀 Rodar o projeto

```bash
# Entre na pasta
cd central-financeira

# Instale as dependências (só na primeira vez)
npm install

# Rode
npm start
# Abre em http://localhost:3000
```

---

## 📱 Acessar do celular (deploy gratuito na Vercel)

```bash
# Instale o Vercel CLI (só uma vez)
npm install -g vercel

# Deploy
vercel

# Quando perguntar sobre variáveis de ambiente, confirme
# Ou adicione manualmente em vercel.com → seu projeto → Settings → Environment Variables
```

As variáveis necessárias já estão no `.env` — a Vercel as lê automaticamente.

---

## 🗄️ Estrutura do banco (Supabase)

Schema: `financeiro`

| Tabela | Conteúdo |
|--------|----------|
| `receitas` | Todas as entradas da família |
| `despesas` | Todos os gastos |
| `dividas` | 5 dívidas já cadastradas |
| `acordos` | Negociações do Serasa |
| `objetivos` | Nome Limpo, Reserva, Neriah, Vanessa Organizer |
| `score_historico` | Evolução do score desde Jan/2026 |
| `categorias_aprendidas` | 27 padrões de gasto já mapeados |

Edge Function: `ia-consultora` (URL: `https://lhwsounfzhwhwyxncsrn.supabase.co/functions/v1/ia-consultora`)

---

## 💰 Custo mensal estimado

| Serviço | Custo |
|---------|-------|
| Supabase | Gratuito (dentro do free tier) |
| Vercel | Gratuito |
| Anthropic API | ~R$ 1-3/mês (uso familiar normal) |
