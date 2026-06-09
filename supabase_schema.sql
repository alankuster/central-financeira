-- =============================================
-- CENTRAL FINANCEIRA FAMILIAR — Supabase Schema
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- MEMBROS DA FAMÍLIA
-- =============================================
create table if not exists membros (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  tipo text not null check (tipo in ('alan', 'vanessa', 'familia')),
  cor text default '#4ADE80',
  created_at timestamptz default now()
);

insert into membros (nome, tipo, cor) values
  ('Alan', 'alan', '#60A5FA'),
  ('Vanessa', 'vanessa', '#A78BFA'),
  ('Família', 'familia', '#4ADE80')
on conflict do nothing;

-- =============================================
-- RECEITAS
-- =============================================
create table if not exists receitas (
  id uuid primary key default uuid_generate_v4(),
  descricao text not null,
  valor decimal(12,2) not null,
  status text not null default 'prevista' check (status in ('prevista', 'confirmada', 'recebida')),
  responsavel text not null check (responsavel in ('alan', 'vanessa', 'familia')),
  categoria text not null default 'Renda',
  data date not null default current_date,
  observacoes text,
  created_at timestamptz default now()
);

-- =============================================
-- DESPESAS
-- =============================================
create table if not exists despesas (
  id uuid primary key default uuid_generate_v4(),
  descricao text not null,
  valor decimal(12,2) not null,
  categoria text not null,
  responsavel text not null default 'familia' check (responsavel in ('alan', 'vanessa', 'familia')),
  data date not null default current_date,
  tipo text default 'variavel' check (tipo in ('fixo', 'variavel')),
  recorrente boolean default false,
  observacoes text,
  estabelecimento text,
  created_at timestamptz default now()
);

-- =============================================
-- DESPESAS RECORRENTES (template)
-- =============================================
create table if not exists despesas_recorrentes (
  id uuid primary key default uuid_generate_v4(),
  descricao text not null,
  valor decimal(12,2) not null,
  categoria text not null,
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  ativo boolean default true,
  created_at timestamptz default now()
);

insert into despesas_recorrentes (descricao, valor, categoria, dia_vencimento) values
  ('Aluguel', 900.00, 'Moradia', 1),
  ('Internet', 129.90, 'Utilidades', 10),
  ('Conta de Luz', 0, 'Utilidades', 5),
  ('Água', 0, 'Utilidades', 15)
on conflict do nothing;

-- =============================================
-- DÍVIDAS
-- =============================================
create table if not exists dividas (
  id uuid primary key default uuid_generate_v4(),
  credor text not null,
  valor_original decimal(12,2) not null,
  valor_atual decimal(12,2) not null,
  valor_negociado decimal(12,2),
  status text not null default 'negativado' check (status in ('negativado', 'em_dia', 'negociando', 'quitado', 'parcelado')),
  taxa_juros decimal(6,2),
  parcelas_total int,
  parcelas_restantes int,
  valor_parcela decimal(12,2),
  data_negativacao date,
  data_vencimento date,
  score_impacto int,
  observacoes text,
  created_at timestamptz default now()
);

-- =============================================
-- ACORDOS E NEGOCIAÇÕES
-- =============================================
create table if not exists acordos (
  id uuid primary key default uuid_generate_v4(),
  divida_id uuid references dividas(id),
  credor text not null,
  valor_original decimal(12,2) not null,
  valor_negociado decimal(12,2) not null,
  desconto_pct decimal(5,2),
  entrada decimal(12,2),
  parcelas int default 1,
  valor_parcela decimal(12,2),
  status text default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'expirado')),
  data_expiracao date,
  fonte text default 'Serasa',
  observacoes text,
  created_at timestamptz default now()
);

-- =============================================
-- OBJETIVOS / SONHOS
-- =============================================
create table if not exists objetivos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  emoji text default '🎯',
  valor_alvo decimal(12,2) not null,
  valor_atual decimal(12,2) default 0,
  data_alvo date,
  prioridade int default 1,
  ativo boolean default true,
  created_at timestamptz default now()
);

insert into objetivos (nome, emoji, valor_alvo, valor_atual, data_alvo) values
  ('Nome Limpo', '🏷️', 28400, 8700, '2027-12-01'),
  ('Reserva de Emergência', '🛡️', 6000, 480, '2028-05-01'),
  ('Neriah', '👶', 5000, 150, '2029-03-01'),
  ('Vanessa Organizer', '👗', 15000, 0, '2030-01-01')
on conflict do nothing;

-- =============================================
-- HISTÓRICO DE SCORE
-- =============================================
create table if not exists score_historico (
  id uuid primary key default uuid_generate_v4(),
  score int not null,
  bureau text default 'Serasa',
  data date not null default current_date,
  observacoes text,
  created_at timestamptz default now()
);

insert into score_historico (score, data) values
  (380, '2026-01-01'),
  (395, '2026-02-01'),
  (408, '2026-03-01'),
  (415, '2026-04-01'),
  (422, '2026-05-01'),
  (428, '2026-06-01')
on conflict do nothing;

-- =============================================
-- CATEGORIAS APRENDIDAS (aprendizado automático)
-- =============================================
create table if not exists categorias_aprendidas (
  id uuid primary key default uuid_generate_v4(),
  termo text not null unique,
  categoria text not null,
  vezes_confirmado int default 1,
  created_at timestamptz default now()
);

insert into categorias_aprendidas (termo, categoria) values
  ('mercado koch', 'Mercado'),
  ('supermercado', 'Mercado'),
  ('posto', 'Combustível'),
  ('shell', 'Combustível'),
  ('ipiranga', 'Combustível'),
  ('farmácia', 'Saúde'),
  ('ifood', 'Alimentação'),
  ('rappi', 'Alimentação'),
  ('netflix', 'Assinaturas'),
  ('spotify', 'Assinaturas')
on conflict do nothing;

-- =============================================
-- VIEWS ÚTEIS
-- =============================================

-- Resumo financeiro do mês atual
create or replace view resumo_mes as
select
  coalesce(sum(case when status = 'recebida' then valor end), 0) as total_recebido,
  coalesce(sum(case when status in ('confirmada','recebida') then valor end), 0) as total_confirmado,
  coalesce(sum(valor), 0) as total_previsto
from receitas
where date_trunc('month', data) = date_trunc('month', current_date);

-- Total despesas do mês
create or replace view despesas_mes as
select
  coalesce(sum(valor), 0) as total,
  categoria,
  count(*) as quantidade
from despesas
where date_trunc('month', data) = date_trunc('month', current_date)
group by categoria;

-- Situação das dívidas
create or replace view situacao_dividas as
select
  count(*) as total_dividas,
  sum(valor_atual) as total_valor,
  sum(case when status = 'negativado' then valor_atual else 0 end) as total_negativado,
  sum(case when status = 'quitado' then valor_original else 0 end) as total_quitado
from dividas
where status != 'quitado';

-- =============================================
-- ROW LEVEL SECURITY (básico — sem autenticação multiusuário)
-- =============================================
alter table receitas enable row level security;
alter table despesas enable row level security;
alter table dividas enable row level security;
alter table acordos enable row level security;
alter table objetivos enable row level security;
alter table score_historico enable row level security;
alter table categorias_aprendidas enable row level security;

-- Política de acesso público (para uso familiar sem login complexo)
create policy "acesso_publico_receitas" on receitas for all using (true) with check (true);
create policy "acesso_publico_despesas" on despesas for all using (true) with check (true);
create policy "acesso_publico_dividas" on dividas for all using (true) with check (true);
create policy "acesso_publico_acordos" on acordos for all using (true) with check (true);
create policy "acesso_publico_objetivos" on objetivos for all using (true) with check (true);
create policy "acesso_publico_score" on score_historico for all using (true) with check (true);
create policy "acesso_publico_categorias" on categorias_aprendidas for all using (true) with check (true);
