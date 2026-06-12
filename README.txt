DPTech Compras XML v7

Esta versão foi revisada e consolidada para ficar funcional.

PRINCIPAIS AJUSTES
- app.js refeito de forma limpa, sem funções duplicadas.
- Uma única fonte de verdade para movimentos:
  - usa movimentos_xml quando existir;
  - usa itens_nota como fallback quando necessário.
- Produtos:
  - filtro por fornecedor;
  - filtro por tipo: entrada, venda, perda;
  - filtro por categoria;
  - quando escolhe fornecedor, mostra só produtos dele.
- Fornecedores:
  - histórico por produto;
  - botão Ver histórico;
  - comparação por data, NF, preço e variação.
- Negociação:
  - ao escolher fornecedor, aparecem só produtos dele;
  - histórico de compras anteriores aparece claramente;
  - frase pronta para negociar.
- Relatórios:
  - curva ABC;
  - ranking de fornecedores;
  - variação de custo;
  - compras mensais;
  - oportunidades de negociação.
- Personalização:
  - logo no Supabase;
  - cores;
  - tema claro/escuro;
  - idioma.

PASSO RECOMENDADO
Execute schema_v7.sql no SQL Editor do Supabase.

Depois substitua os arquivos:
- index.html
- style.css
- app.js
- config.js

Se algo ainda aparecer vazio, importe novamente alguns XMLs de entrada e venda para gerar movimentos novos.
