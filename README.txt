DPTech Compras XML v4

NOVIDADES
- Mantém barra de carregamento da versão 3.1.
- Negociação com fornecedor mais clara.
- Comparativo histórico com menor, média, maior e última compra.
- Frase pronta para negociar com fornecedor.
- Precificação com royalties de franquia.
- Fundo de propaganda/marketing.
- Taxa de cartão.
- Relatórios:
  - Curva ABC de compras
  - Ranking de fornecedores
  - Produtos com maior variação de custo
- Alertas de gestão:
  - Alta variação de custo
  - Margem baixa
  - Perdas/baixas

COMO USAR
1. Se já executou o schema_v3.sql, não precisa rodar SQL novo obrigatoriamente.
2. Se quiser deixar tudo pronto, execute schema_v4.sql no SQL Editor do Supabase.
3. Abra index.html.
4. Faça login.
5. Importe XMLs de entrada, saída e baixa.
6. Use a tela Negociação no celular com o fornecedor.

IMPORTANTE
O CNPJ da empresa está no config.js:
26489896000108

Caso use outro CNPJ, altere MINHA_EMPRESA_CNPJ.


NOVIDADES DA VERSÃO 5
- Tela Configurações.
- Upload de logo.
- Nome e subtítulo personalizados.
- Paleta de cores selecionável.
- Modo claro e escuro.
- Sistema básico de idiomas:
  - Português
  - Inglês
  - Espanhol

OBSERVAÇÃO
Nesta versão, a personalização fica salva no navegador usando localStorage.
Para salvar a configuração no Supabase e carregar em qualquer computador/celular,
execute o schema_v5.sql e evolua para salvar na tabela configuracoes_sistema.


CORREÇÃO DA VERSÃO 5.1
- Aba Fornecedores refeita.
- Agora mostra Total Entradas, Total Vendas, Total Perdas e Notas vinculadas.
- Adicionado filtro Todos / Entradas / Vendas / Perdas.
- Adicionado fallback para buscar dados também em itens_nota quando movimentos_xml ainda estiver vazio.
- Mensagem clara quando o fornecedor não possui XML/movimento vinculado.


CORREÇÃO DA VERSÃO 5.2
- Aba Produtos corrigida.
- Agora busca movimentos em movimentos_xml.
- Se movimentos_xml estiver vazio, usa fallback em itens_nota.
- Status mais claro:
  - Sem movimento
  - Só compra
  - Só venda
  - Não classificado
  - Boa / Atenção / Baixa


CORREÇÃO DA VERSÃO 5.3
- Fornecedores: botão “Ver histórico” por produto.
- Mostra compras por data, nota, preço, total e diferença acima do menor preço.
- Explica quando menor/média/maior/último ficam iguais: só existe uma compra.
- Negociação: adiciona busca de produto.
- Negociação: mostra histórico de compras anteriores antes de analisar a oferta.
- Negociação: mostra aviso quando ainda não há histórico suficiente.
