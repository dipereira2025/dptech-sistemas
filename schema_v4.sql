-- DPTech Compras XML v4
-- Execute este SQL no Supabase apenas se ainda não executou a v3.
-- Ele é seguro para rodar novamente.

alter table notas_fiscais add column if not exists tipo varchar(30);
alter table notas_fiscais add column if not exists modelo varchar(10);
alter table notas_fiscais add column if not exists natureza_operacao text;
alter table notas_fiscais add column if not exists emitente_cnpj varchar(20);
alter table notas_fiscais add column if not exists destinatario_cnpj varchar(20);

alter table itens_nota add column if not exists fornecedor_id uuid references fornecedores(id);
alter table itens_nota add column if not exists tipo varchar(30);
alter table itens_nota add column if not exists cfop varchar(10);
alter table itens_nota add column if not exists unidade varchar(20);
alter table itens_nota add column if not exists desconto numeric(12,2) default 0;
alter table itens_nota add column if not exists acrescimo numeric(12,2) default 0;
alter table itens_nota add column if not exists data_movimento date;

create table if not exists movimentos_xml (
    id uuid primary key default gen_random_uuid(),
    produto_id uuid references produtos(id),
    fornecedor_id uuid references fornecedores(id),
    nota_id uuid references notas_fiscais(id),
    tipo varchar(30),
    cfop varchar(10),
    quantidade numeric(12,3),
    valor_unitario numeric(12,4),
    valor_total numeric(12,2),
    data_movimento date,
    created_at timestamp default now()
);

create table if not exists categorias (
    id uuid primary key default gen_random_uuid(),
    nome varchar(100) not null
);

create table if not exists estoque (
    id uuid primary key default gen_random_uuid(),
    produto_id uuid references produtos(id),
    quantidade numeric(12,3) default 0,
    estoque_minimo numeric(12,3) default 0,
    created_at timestamp default now()
);

create table if not exists movimentacoes_estoque (
    id uuid primary key default gen_random_uuid(),
    produto_id uuid references produtos(id),
    tipo varchar(20),
    quantidade numeric(12,3),
    observacao text,
    created_at timestamp default now()
);

create table if not exists precificacao_config (
    id uuid primary key default gen_random_uuid(),
    nome varchar(100),
    impostos_percent numeric(8,4) default 0,
    perdas_percent numeric(8,4) default 0,
    taxa_cartao_percent numeric(8,4) default 0,
    royalties_percent numeric(8,4) default 0,
    fundo_propaganda_percent numeric(8,4) default 0,
    margem_percent numeric(8,4) default 0,
    created_at timestamp default now()
);
