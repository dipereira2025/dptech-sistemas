-- DPTech Compras XML v5
-- Opcional: tabela para salvar personalização no banco futuramente.
-- A versão atual salva a personalização no navegador com localStorage.

create table if not exists configuracoes_sistema (
    id uuid primary key default gen_random_uuid(),
    chave varchar(100) unique not null,
    valor jsonb,
    created_at timestamp default now(),
    updated_at timestamp default now()
);
