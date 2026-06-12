-- DPTech Compras XML v6

-- Configurações sincronizadas entre PC e celular
create table if not exists configuracoes_sistema (
    id uuid primary key default gen_random_uuid(),
    chave varchar(100) unique not null,
    valor jsonb,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

-- Políticas simples para projeto individual.
-- Se usar RLS desativado, não precisa destas policies.
alter table configuracoes_sistema enable row level security;

drop policy if exists configuracoes_sistema_all on configuracoes_sistema;

create policy configuracoes_sistema_all
on configuracoes_sistema
for all
to authenticated
using (true)
with check (true);

-- Crie também um bucket no Storage chamado:
-- logos
-- Recomendado: público para simplificar exibição da logo.
-- No Supabase:
-- Storage > New bucket > logos > Public bucket ON

-- Se quiser criar policy de storage via SQL:
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

drop policy if exists logos_select_public on storage.objects;
drop policy if exists logos_insert_auth on storage.objects;
drop policy if exists logos_update_auth on storage.objects;
drop policy if exists logos_delete_auth on storage.objects;

create policy logos_select_public
on storage.objects
for select
to public
using (bucket_id = 'logos');

create policy logos_insert_auth
on storage.objects
for insert
to authenticated
with check (bucket_id = 'logos');

create policy logos_update_auth
on storage.objects
for update
to authenticated
using (bucket_id = 'logos')
with check (bucket_id = 'logos');

create policy logos_delete_auth
on storage.objects
for delete
to authenticated
using (bucket_id = 'logos');
