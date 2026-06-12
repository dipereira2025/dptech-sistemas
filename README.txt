DPTech Compras XML v6

NOVIDADES DA VERSÃO 6
- Logo sincronizada entre PC e celular usando Supabase Storage.
- Configurações salvas no Supabase:
  - Nome do sistema
  - Subtítulo
  - Logo
  - Paleta de cores
  - Tema claro/escuro
  - Idioma
- Fallback local caso o bucket de logo ainda não esteja configurado.
- Gráfico simples de evolução mensal de compras.
- Resumo de oportunidades de negociação.
- Mantém:
  - Importação com barra de progresso
  - Histórico por fornecedor
  - Histórico por produto na negociação
  - Precificação com royalties
  - Relatórios ABC/ranking/variação

PASSO OBRIGATÓRIO PARA SINCRONIZAR LOGO
1. No Supabase, abra SQL Editor.
2. Execute schema_v6.sql.
3. Isso cria:
   - tabela configuracoes_sistema
   - bucket logos público
   - policies de upload/leitura

Depois abra index.html, vá em Configurações e envie a logo.

OBSERVAÇÃO
Se não executar schema_v6.sql, a logo poderá ficar salva apenas localmente no navegador.
