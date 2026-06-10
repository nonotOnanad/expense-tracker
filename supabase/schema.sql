-- ============================================================
-- Clarity Expense Tracker — Supabase schema & security setup
--
-- Run this once in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- Expenses ----------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text not null default '',
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, date desc, created_at desc);

alter table public.expenses enable row level security;

create policy "Select own expenses" on public.expenses
  for select using (auth.uid() = user_id);

create policy "Insert own expenses" on public.expenses
  for insert with check (auth.uid() = user_id);

create policy "Update own expenses" on public.expenses
  for update using (auth.uid() = user_id);

create policy "Delete own expenses" on public.expenses
  for delete using (auth.uid() = user_id);

-- Budgets (one row per user) -----------------------------------
create table if not exists public.budgets (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  overall numeric(12, 2),
  categories jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;

create policy "Select own budgets" on public.budgets
  for select using (auth.uid() = user_id);

create policy "Insert own budgets" on public.budgets
  for insert with check (auth.uid() = user_id);

create policy "Update own budgets" on public.budgets
  for update using (auth.uid() = user_id);

create policy "Delete own budgets" on public.budgets
  for delete using (auth.uid() = user_id);
