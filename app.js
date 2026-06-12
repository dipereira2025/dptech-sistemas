
const CONFIG_CHAVE = "empresa_padrao";
let configVisualCache = {};

const traducoes = {
  "pt-BR": {
    sair:"Sair",
    tituloPadrao:"DPTech Compras XML v6",
    subtituloPadrao:"Compras, vendas, perdas, fornecedores, negociação, royalties, precificação e relatórios."
  },
  "en-US": {
    sair:"Logout",
    tituloPadrao:"DPTech XML Purchasing v6",
    subtituloPadrao:"Purchases, sales, losses, suppliers, negotiation, royalties, pricing and reports."
  },
  "es-ES": {
    sair:"Salir",
    tituloPadrao:"DPTech Compras XML v6",
    subtituloPadrao:"Compras, ventas, pérdidas, proveedores, negociación, regalías, precios e informes."
  }
};

function getConfigVisual(){
  return configVisualCache || JSON.parse(localStorage.getItem('dptech_visual_config') || '{}');
}

function setConfigVisualLocal(cfg){
  configVisualCache = cfg || {};
  localStorage.setItem('dptech_visual_config', JSON.stringify(configVisualCache));
}

async function carregarConfigSupabase(){
  try{
    const { data, error } = await supabaseClient
      .from('configuracoes_sistema')
      .select('*')
      .eq('chave', CONFIG_CHAVE)
      .maybeSingle();

    if(error){
      console.warn('Config Supabase indisponível:', error.message);
      const local = JSON.parse(localStorage.getItem('dptech_visual_config') || '{}');
      configVisualCache = local;
      return;
    }

    if(data?.valor){
      configVisualCache = data.valor;
      localStorage.setItem('dptech_visual_config', JSON.stringify(configVisualCache));
    }else{
      configVisualCache = JSON.parse(localStorage.getItem('dptech_visual_config') || '{}');
    }
  }catch(e){
    console.warn(e);
    configVisualCache = JSON.parse(localStorage.getItem('dptech_visual_config') || '{}');
  }
}

async function salvarConfigSupabase(cfg){
  setConfigVisualLocal(cfg);
  const payload = {
    chave: CONFIG_CHAVE,
    valor: cfg,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('configuracoes_sistema')
    .upsert(payload, { onConflict: 'chave' });

  if(error){
    alert('Não consegui salvar no Supabase. Verifique se executou o schema_v6.sql. Erro: ' + error.message);
    return false;
  }
  return true;
}

function aplicarConfigVisual(){
  const cfg = getConfigVisual();
  const idioma = cfg.idioma || 'pt-BR';
  const t = traducoes[idioma] || traducoes["pt-BR"];

  document.body.classList.remove('palette-amber','palette-shell','palette-blue','palette-green','palette-purple','palette-dark','theme-dark');
  document.body.classList.add('palette-' + (cfg.paleta || 'amber'));
  if((cfg.tema || 'light') === 'dark') document.body.classList.add('theme-dark');

  document.getElementById('appTitle').textContent = cfg.titulo || t.tituloPadrao;
  document.getElementById('appSubtitle').textContent = cfg.subtitulo || t.subtituloPadrao;

  const logo = document.getElementById('appLogo');
  const preview = document.getElementById('logoPreview');

  if(cfg.logo_url || cfg.logo){
    const src = cfg.logo_url || cfg.logo;
    logo.src = src;
    logo.classList.remove('hidden');
    if(preview){
      preview.src = src;
      preview.classList.remove('hidden');
    }
  }else{
    logo.classList.add('hidden');
    if(preview) preview.classList.add('hidden');
  }

  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(t[key]) el.textContent = t[key];
  });

  const cfgTitulo = document.getElementById('cfgTitulo');
  if(cfgTitulo){
    cfgTitulo.value = cfg.titulo || '';
    document.getElementById('cfgSubtitulo').value = cfg.subtitulo || '';
    document.getElementById('cfgPaleta').value = cfg.paleta || 'amber';
    document.getElementById('cfgTema').value = cfg.tema || 'light';
    document.getElementById('cfgIdioma').value = cfg.idioma || 'pt-BR';
  }
}

async function carregarLogoLocal(event){
  const file = event.target.files[0];
  if(!file) return;

  const cfg = getConfigVisual();
  const nomeArquivo = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'')}`;

  try{
    const { error: uploadError } = await supabaseClient
      .storage
      .from('logos')
      .upload(nomeArquivo, file, { upsert:false });

    if(uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from('logos').getPublicUrl(nomeArquivo);
    cfg.logo_url = data.publicUrl;
    delete cfg.logo;

    await salvarConfigSupabase(cfg);
    aplicarConfigVisual();
    alert('Logo salva no Supabase. Agora ela aparecerá também no celular.');
  }catch(e){
    // fallback local se bucket não existir ou estiver privado sem policy.
    const reader = new FileReader();
    reader.onload = async ev => {
      cfg.logo = ev.target.result;
      delete cfg.logo_url;
      setConfigVisualLocal(cfg);
      aplicarConfigVisual();
      alert('Não consegui subir a logo para o Supabase. Salvei localmente neste navegador. Verifique se criou o bucket público "logos". Erro: ' + e.message);
    };
    reader.readAsDataURL(file);
  }
}

async function removerLogo(){
  const cfg = getConfigVisual();
  delete cfg.logo;
  delete cfg.logo_url;
  await salvarConfigSupabase(cfg);
  aplicarConfigVisual();
}

async function salvarPersonalizacao(){
  const cfg = getConfigVisual();
  cfg.titulo = document.getElementById('cfgTitulo').value.trim();
  cfg.subtitulo = document.getElementById('cfgSubtitulo').value.trim();
  cfg.paleta = document.getElementById('cfgPaleta').value;
  cfg.tema = document.getElementById('cfgTema').value;
  cfg.idioma = document.getElementById('cfgIdioma').value;

  const ok = await salvarConfigSupabase(cfg);
  aplicarConfigVisual();
  if(ok) alert('Personalização salva no Supabase. Abra no celular para ver igual.');
}

async function aplicarPaletaSelecionada(){
  const cfg = getConfigVisual();
  cfg.paleta = document.getElementById('cfgPaleta').value;
  setConfigVisualLocal(cfg);
  aplicarConfigVisual();
}

async function aplicarTemaSelecionado(){
  const cfg = getConfigVisual();
  cfg.tema = document.getElementById('cfgTema').value;
  setConfigVisualLocal(cfg);
  aplicarConfigVisual();
}

async function aplicarIdiomaSelecionado(){
  const cfg = getConfigVisual();
  cfg.idioma = document.getElementById('cfgIdioma').value;
  setConfigVisualLocal(cfg);
  aplicarConfigVisual();
}


let fornecedores = [];
let produtos = [];
let notas = [];
let itens = [];
let movimentos = [];
let filtroFornecedorAtual = 'TODOS';

const fmt = v => (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qtdFmt = v => (Number(v)||0).toLocaleString('pt-BR',{maximumFractionDigits:3});
const num = v => Number(String(v||'0').replace(',','.')) || 0;
const cnpjLimpo = v => String(v||'').replace(/\D/g,'');

function getText(parent, tag){
  const el = parent?.getElementsByTagName(tag)[0];
  return el ? el.textContent.trim() : '';
}

function openTab(id, btn){
  document.querySelectorAll('.tabContent').forEach(x=>x.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
}

async function verificarSessao(){
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;
  if(session){
    await carregarConfigSupabase();
    aplicarConfigVisual();
    document.getElementById('loginBox').classList.add('hidden');
    document.getElementById('appBox').classList.remove('hidden');
    document.getElementById('userEmail').textContent = session.user.email;
    await carregarDados();
  }else{
    document.getElementById('loginBox').classList.remove('hidden');
    document.getElementById('appBox').classList.add('hidden');
    document.getElementById('userEmail').textContent = 'Não logado';
  }
}

async function signup(){
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if(error) return alert(error.message);
  alert('Conta criada. Faça login ou confirme o e-mail se o Supabase solicitar.');
}

async function login(){
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error) return alert(error.message);
  aplicarConfigVisual();

function mesKey(data){
  return (data || '').substring(0,7) || 'Sem data';
}

function renderGraficoComprasMensais(){
  const entradas = movimentos.filter(m=>m.tipo==='ENTRADA');
  const porMes = {};
  entradas.forEach(m=>{
    const mes = mesKey(m.data_movimento);
    porMes[mes] = (porMes[mes] || 0) + Number(m.valor_total || 0);
  });

  const rows = Object.entries(porMes).sort((a,b)=>a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(r=>r[1]), 1);

  document.getElementById('graficoComprasMensais').innerHTML = `
    <div class="chartRows">
      ${rows.map(([mes, valor])=>`
        <div class="chartRow">
          <span>${mes}</span>
          <div class="chartBar"><span style="width:${Math.max(3,(valor/max)*100)}%"></span></div>
          <b>${fmt(valor)}</b>
        </div>
      `).join('') || 'Sem compras importadas.'}
    </div>
  `;
}

function renderOportunidades(){
  const oportunidades = [];

  produtos.forEach(p=>{
    const hist = movimentosProdutoUnificado(p.id,'ENTRADA');
    if(hist.length < 2) return;

    const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
    if(precos.length < 2) return;

    const menor = Math.min(...precos);
    const ultimo = precos[precos.length-1];
    const media = precos.reduce((s,v)=>s+v,0)/precos.length;
    const variacao = menor ? ((ultimo-menor)/menor)*100 : 0;

    if(variacao > 10){
      oportunidades.push({
        produto:p.descricao,
        menor, ultimo, media, variacao,
        texto:`${p.descricao}: última compra ${fmt(ultimo)} está ${variacao.toFixed(1)}% acima do melhor preço ${fmt(menor)}.`
      });
    }
  });

  oportunidades.sort((a,b)=>b.variacao-a.variacao);

  document.getElementById('oportunidades').innerHTML = oportunidades.length ? `
    <p class="warn">Use esses produtos para negociar primeiro.</p>
    ${oportunidades.slice(0,20).map(o=>`
      <div class="timelineItem">
        <b>${o.produto}</b><br>
        Menor: ${fmt(o.menor)} | Média: ${fmt(o.media)} | Último: ${fmt(o.ultimo)}<br>
        <span class="bad">${o.variacao.toFixed(1)}% acima do melhor histórico</span>
      </div>
    `).join('')}
  ` : 'Nenhuma oportunidade encontrada. Importe mais meses de XML para gerar comparativos melhores.';
}

verificarSessao();
}

async function logout(){
  await supabaseClient.auth.signOut();
  aplicarConfigVisual();

function mesKey(data){
  return (data || '').substring(0,7) || 'Sem data';
}

function renderGraficoComprasMensais(){
  const entradas = movimentos.filter(m=>m.tipo==='ENTRADA');
  const porMes = {};
  entradas.forEach(m=>{
    const mes = mesKey(m.data_movimento);
    porMes[mes] = (porMes[mes] || 0) + Number(m.valor_total || 0);
  });

  const rows = Object.entries(porMes).sort((a,b)=>a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(r=>r[1]), 1);

  document.getElementById('graficoComprasMensais').innerHTML = `
    <div class="chartRows">
      ${rows.map(([mes, valor])=>`
        <div class="chartRow">
          <span>${mes}</span>
          <div class="chartBar"><span style="width:${Math.max(3,(valor/max)*100)}%"></span></div>
          <b>${fmt(valor)}</b>
        </div>
      `).join('') || 'Sem compras importadas.'}
    </div>
  `;
}

function renderOportunidades(){
  const oportunidades = [];

  produtos.forEach(p=>{
    const hist = movimentosProdutoUnificado(p.id,'ENTRADA');
    if(hist.length < 2) return;

    const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
    if(precos.length < 2) return;

    const menor = Math.min(...precos);
    const ultimo = precos[precos.length-1];
    const media = precos.reduce((s,v)=>s+v,0)/precos.length;
    const variacao = menor ? ((ultimo-menor)/menor)*100 : 0;

    if(variacao > 10){
      oportunidades.push({
        produto:p.descricao,
        menor, ultimo, media, variacao,
        texto:`${p.descricao}: última compra ${fmt(ultimo)} está ${variacao.toFixed(1)}% acima do melhor preço ${fmt(menor)}.`
      });
    }
  });

  oportunidades.sort((a,b)=>b.variacao-a.variacao);

  document.getElementById('oportunidades').innerHTML = oportunidades.length ? `
    <p class="warn">Use esses produtos para negociar primeiro.</p>
    ${oportunidades.slice(0,20).map(o=>`
      <div class="timelineItem">
        <b>${o.produto}</b><br>
        Menor: ${fmt(o.menor)} | Média: ${fmt(o.media)} | Último: ${fmt(o.ultimo)}<br>
        <span class="bad">${o.variacao.toFixed(1)}% acima do melhor histórico</span>
      </div>
    `).join('')}
  ` : 'Nenhuma oportunidade encontrada. Importe mais meses de XML para gerar comparativos melhores.';
}

verificarSessao();
}

async function carregarDados(){
  const [f,p,n,i,m] = await Promise.all([
    supabaseClient.from('fornecedores').select('*').order('nome'),
    supabaseClient.from('produtos').select('*').order('descricao'),
    supabaseClient.from('notas_fiscais').select('*').order('data_emissao',{ascending:false}),
    supabaseClient.from('itens_nota').select('*, produtos(*), notas_fiscais(*), fornecedores(*)'),
    supabaseClient.from('movimentos_xml').select('*').order('data_movimento',{ascending:false})
  ]);

  fornecedores = f.data || [];
  produtos = p.data || [];
  notas = n.data || [];
  itens = i.data || [];
  movimentos = m.data || [];
  renderTudo();
}

function renderTudo(){
  renderKPIs();
  renderResumo();
  renderAlertas();
  renderFornecedores();
  renderProdutos();
  popularSelects();
  atualizarPreviewNegociacao();
}

function tipoNota(meta){
  const mod = meta.modelo;
  const emit = cnpjLimpo(meta.emitCnpj);
  const dest = cnpjLimpo(meta.destCnpj);
  const cfops = meta.cfops || [];
  if(cfops.includes('5927')) return 'PERDA';
  if(mod === '65') return 'VENDA';
  if(mod === '55' && dest === MINHA_EMPRESA_CNPJ && emit !== MINHA_EMPRESA_CNPJ) return 'ENTRADA';
  if(mod === '55' && emit === MINHA_EMPRESA_CNPJ && dest === MINHA_EMPRESA_CNPJ) return 'PERDA';
  if(mod === '55' && emit !== MINHA_EMPRESA_CNPJ) return 'ENTRADA';
  return 'OUTRA';
}

function parseXml(texto){
  const xml = new DOMParser().parseFromString(texto, 'text/xml');
  const ide = xml.getElementsByTagName('ide')[0];
  const emit = xml.getElementsByTagName('emit')[0];
  const dest = xml.getElementsByTagName('dest')[0];
  const total = xml.getElementsByTagName('ICMSTot')[0];

  const dets = [...xml.getElementsByTagName('det')];
  const cfops = dets.map(d=>getText(d.getElementsByTagName('prod')[0], 'CFOP'));

  const meta = {
    modelo: getText(ide,'mod'),
    numero: getText(ide,'nNF'),
    serie: getText(ide,'serie'),
    data: (getText(ide,'dhEmi') || getText(ide,'dEmi') || new Date().toISOString()).substring(0,10),
    natOp: getText(ide,'natOp'),
    emitCnpj: getText(emit,'CNPJ'),
    emitNome: getText(emit,'xNome'),
    destCnpj: getText(dest,'CNPJ'),
    destNome: getText(dest,'xNome'),
    valorTotal: num(getText(total,'vNF')),
    cfops
  };
  meta.tipo = tipoNota(meta);

  const produtosXml = dets.map(det=>{
    const prod = det.getElementsByTagName('prod')[0];
    const q = num(getText(prod,'qCom'));
    const vProd = num(getText(prod,'vProd'));
    const vUn = num(getText(prod,'vUnCom')) || (q ? vProd/q : 0);
    const vDesc = num(getText(prod,'vDesc'));
    const vOutro = num(getText(prod,'vOutro'));
    const custoLiquido = q ? (vProd - vDesc + vOutro) / q : vUn;
    return {
      codigo: getText(prod,'cProd'),
      ean: getText(prod,'cEAN') === 'SEM GTIN' ? '' : getText(prod,'cEAN'),
      descricao: getText(prod,'xProd'),
      ncm: getText(prod,'NCM'),
      cfop: getText(prod,'CFOP'),
      unidade: getText(prod,'uCom'),
      quantidade: q,
      valorUnitario: vUn,
      valorTotal: vProd,
      desconto: vDesc,
      acrescimo: vOutro,
      custoLiquido
    };
  });

  return {meta, produtosXml};
}

async function upsertFornecedor(nome, cnpj){
  cnpj = cnpjLimpo(cnpj);
  let { data } = await supabaseClient.from('fornecedores').select('*').eq('cnpj', cnpj).maybeSingle();
  if(data) return data;
  const ins = await supabaseClient.from('fornecedores').insert({nome, cnpj}).select().single();
  if(ins.error) throw ins.error;
  return ins.data;
}

async function upsertProduto(p){
  let query = supabaseClient.from('produtos').select('*');
  if(p.ean) query = query.eq('ean', p.ean);
  else query = query.eq('codigo', p.codigo);
  let { data } = await query.maybeSingle();
  if(data) return data;
  const ins = await supabaseClient.from('produtos')
    .insert({codigo:p.codigo, ean:p.ean, descricao:p.descricao, categoria:'Sem categoria'})
    .select().single();
  if(ins.error) throw ins.error;
  return ins.data;
}

function setProgress(atual, total, arquivo, status='processando'){
  const box = document.getElementById('uploadProgressBox');
  const fill = document.getElementById('progressFill');
  const percent = document.getElementById('progressPercent');
  const count = document.getElementById('progressCount');
  const current = document.getElementById('progressCurrent');
  box.classList.remove('hidden');
  const pct = total ? Math.round((atual / total) * 100) : 0;
  fill.style.width = pct + '%';
  percent.textContent = pct + '%';
  count.textContent = `${atual} de ${total} arquivos`;
  current.textContent = arquivo ? `${status}: ${arquivo}` : status;
}

function addLogImportacao(texto, tipo='ok'){
  const log = document.getElementById('logImportacao');
  log.classList.remove('hidden');
  const linha = document.createElement('div');
  linha.className = 'logLine ' + (tipo === 'erro' ? 'logBad' : tipo === 'aviso' ? 'logWarn' : 'logOk');
  linha.textContent = texto;
  log.appendChild(linha);
  log.scrollTop = log.scrollHeight;
}

function limparProgressoImportacao(){
  document.getElementById('resultadoImportacao').innerHTML = '';
  document.getElementById('logImportacao').innerHTML = '';
  document.getElementById('logImportacao').classList.add('hidden');
  setProgress(0, 0, '', 'Aguardando...');
  document.getElementById('uploadProgressBox').classList.add('hidden');
}

async function processarXMLs(){
  const files = document.getElementById('xmlFiles').files;
  const box = document.getElementById('resultadoImportacao');
  const btn = document.getElementById('btnProcessar');

  if(!files.length) return alert('Selecione XMLs.');

  limparProgressoImportacao();
  document.getElementById('uploadProgressBox').classList.remove('hidden');
  btn.disabled = true;
  btn.textContent = 'Processando...';

  let resumo = {ENTRADA:0, VENDA:0, PERDA:0, OUTRA:0, itens:0, erros:0};
  const totalArquivos = files.length;

  for(let idx = 0; idx < totalArquivos; idx++){
    const file = files[idx];
    setProgress(idx, totalArquivos, file.name, 'Lendo');
    addLogImportacao(`Lendo arquivo: ${file.name}`, 'aviso');

    try{
      const texto = await file.text();
      const {meta, produtosXml} = parseXml(texto);

      setProgress(idx, totalArquivos, file.name, `Gravando ${produtosXml.length} itens`);
      addLogImportacao(`Identificado como ${meta.tipo} | NF ${meta.numero} | ${produtosXml.length} itens`, 'aviso');

      resumo[meta.tipo] = (resumo[meta.tipo]||0)+1;
      resumo.itens += produtosXml.length;

      let fornecedor = null;
      if(meta.tipo === 'ENTRADA') fornecedor = await upsertFornecedor(meta.emitNome, meta.emitCnpj);
      else fornecedor = await upsertFornecedor(meta.emitNome || 'Minha empresa', meta.emitCnpj || MINHA_EMPRESA_CNPJ);

      const notaIns = await supabaseClient.from('notas_fiscais').insert({
        numero: meta.numero,
        fornecedor_id: fornecedor.id,
        data_emissao: meta.data,
        valor_total: meta.valorTotal,
        xml_url: file.name,
        tipo: meta.tipo,
        modelo: meta.modelo,
        natureza_operacao: meta.natOp,
        emitente_cnpj: cnpjLimpo(meta.emitCnpj),
        destinatario_cnpj: cnpjLimpo(meta.destCnpj)
      }).select().single();

      if(notaIns.error) throw notaIns.error;
      const nota = notaIns.data;

      for(let itemIndex = 0; itemIndex < produtosXml.length; itemIndex++){
        const px = produtosXml[itemIndex];

        if(produtosXml.length > 3){
          document.getElementById('progressCurrent').textContent = `Item ${itemIndex + 1}/${produtosXml.length}: ${px.descricao}`;
        }

        const produto = await upsertProduto(px);
        const itemIns = await supabaseClient.from('itens_nota').insert({
          nota_id: nota.id,
          produto_id: produto.id,
          fornecedor_id: fornecedor.id,
          tipo: meta.tipo,
          cfop: px.cfop,
          unidade: px.unidade,
          quantidade: px.quantidade,
          valor_unitario: px.custoLiquido || px.valorUnitario,
          valor_total: px.valorTotal,
          desconto: px.desconto,
          acrescimo: px.acrescimo,
          data_movimento: meta.data
        }).select().single();

        if(itemIns.error) throw itemIns.error;

        await supabaseClient.from('historico_precos').insert({
          produto_id: produto.id,
          fornecedor_id: fornecedor.id,
          preco: px.custoLiquido || px.valorUnitario,
          data_preco: meta.data
        });

        await supabaseClient.from('movimentos_xml').insert({
          produto_id: produto.id,
          fornecedor_id: fornecedor.id,
          nota_id: nota.id,
          tipo: meta.tipo,
          cfop: px.cfop,
          quantidade: px.quantidade,
          valor_unitario: px.custoLiquido || px.valorUnitario,
          valor_total: px.valorTotal,
          data_movimento: meta.data
        });
      }

      addLogImportacao(`OK: ${file.name} processado com sucesso.`, 'ok');
    }catch(e){
      resumo.erros++;
      console.error(e);
      addLogImportacao(`ERRO: ${file.name} - ${e.message}`, 'erro');
    }

    setProgress(idx + 1, totalArquivos, file.name, 'Concluído');
    await new Promise(resolve => setTimeout(resolve, 120));
  }

  setProgress(totalArquivos, totalArquivos, '', 'Importação finalizada');
  btn.disabled = false;
  btn.textContent = 'Processar XMLs';

  box.innerHTML = `
    <b>Importação finalizada</b><br>
    Entradas: ${resumo.ENTRADA || 0}<br>
    Vendas: ${resumo.VENDA || 0}<br>
    Perdas/baixas: ${resumo.PERDA || 0}<br>
    Outras: ${resumo.OUTRA || 0}<br>
    Itens processados: ${resumo.itens}<br>
    Erros: ${resumo.erros}
  `;

  await carregarDados();
}

function renderKPIs(){
  const entradas = notas.filter(n=>n.tipo==='ENTRADA');
  const saidas = notas.filter(n=>n.tipo==='VENDA');
  const perdas = notas.filter(n=>n.tipo==='PERDA');
  const totalCompras = entradas.reduce((s,n)=>s+Number(n.valor_total||0),0);

  document.getElementById('kpiEntradas').textContent = entradas.length;
  document.getElementById('kpiSaidas').textContent = saidas.length;
  document.getElementById('kpiPerdas').textContent = perdas.length;
  document.getElementById('kpiFornecedores').textContent = fornecedores.length;
  document.getElementById('kpiProdutos').textContent = produtos.length;
  document.getElementById('kpiCompras').textContent = fmt(totalCompras);
}

function movimentosProduto(pid, tipo){
  return movimentos.filter(m=>m.produto_id===pid && (!tipo || m.tipo===tipo));
}

function statPreco(pid, tipo){
  const arr = movimentosProduto(pid,tipo).map(m=>Number(m.valor_unitario||0)).filter(v=>v>0);
  if(!arr.length) return null;
  return {
    menor: Math.min(...arr),
    maior: Math.max(...arr),
    media: arr.reduce((s,v)=>s+v,0)/arr.length,
    ultimo: arr[arr.length-1],
    qtd: arr.length
  };
}

function renderResumo(){
  const entradas = movimentos.filter(m=>m.tipo==='ENTRADA');
  const vendas = movimentos.filter(m=>m.tipo==='VENDA');
  const perdas = movimentos.filter(m=>m.tipo==='PERDA');
  const totalComprado = entradas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalVendido = vendas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalPerdas = perdas.reduce((s,m)=>s+Number(m.valor_total||0),0);

  document.getElementById('resumoInteligente').innerHTML = `
    Total comprado em itens: <b>${fmt(totalComprado)}</b><br>
    Total vendido em itens: <b>${fmt(totalVendido)}</b><br>
    Total baixado/perdido: <b>${fmt(totalPerdas)}</b><br>
    Movimentos de entrada: <b>${entradas.length}</b><br>
    Movimentos de venda: <b>${vendas.length}</b><br>
    Movimentos de perda: <b>${perdas.length}</b><br>
    <span class="warn">Quanto mais meses de XML você importar, mais forte ficará o histórico para negociar.</span>
  `;
}

function renderAlertas(){
  const alertas = [];
  produtos.forEach(p=>{
    const c = statPreco(p.id,'ENTRADA');
    const v = statPreco(p.id,'VENDA');
    const perdas = movimentosProduto(p.id,'PERDA').reduce((s,m)=>s+Number(m.valor_total||0),0);
    if(c && c.menor && c.maior && ((c.maior-c.menor)/c.menor)*100 > 20){
      alertas.push(`<span class="bad">Alta variação:</span> ${p.descricao} variou de ${fmt(c.menor)} para ${fmt(c.maior)}.`);
    }
    if(c && v && v.ultimo && ((v.ultimo-c.ultimo)/v.ultimo)*100 < 25){
      alertas.push(`<span class="warn">Margem baixa:</span> ${p.descricao} pode estar com margem abaixo de 25%.`);
    }
    if(perdas > 0){
      alertas.push(`<span class="warn">Perda registrada:</span> ${p.descricao} tem ${fmt(perdas)} em baixa/perda.`);
    }
  });
  document.getElementById('alertasGestao').innerHTML = alertas.slice(0,10).join('<br>') || 'Sem alertas no momento.';
}

function movimentosFornecedorUnificado(fid, tipo='TODOS'){
  let movs = movimentos.filter(m => m.fornecedor_id === fid);

  // Fallback: se movimentos_xml ainda estiver vazio ou incompleto,
  // tenta montar a visão usando itens_nota.
  if(!movs.length && itens.length){
    movs = itens
      .filter(i => i.fornecedor_id === fid || i.notas_fiscais?.fornecedor_id === fid)
      .map(i => ({
        produto_id: i.produto_id,
        fornecedor_id: i.fornecedor_id || i.notas_fiscais?.fornecedor_id,
        nota_id: i.nota_id,
        tipo: i.tipo || i.notas_fiscais?.tipo || 'OUTRA',
        cfop: i.cfop,
        quantidade: Number(i.quantidade || 0),
        valor_unitario: Number(i.valor_unitario || 0),
        valor_total: Number(i.valor_total || 0),
        data_movimento: i.data_movimento || i.notas_fiscais?.data_emissao
      }));
  }

  if(tipo !== 'TODOS'){
    movs = movs.filter(m => m.tipo === tipo);
  }

  return movs;
}

function renderFornecedores(){
  const q = (document.getElementById('buscaFornecedor')?.value || '').toLowerCase();
  const box = document.getElementById('listaFornecedores');
  if(!box) return;
  box.innerHTML = '';

  fornecedores
    .filter(f=>[f.nome,f.cnpj].join(' ').toLowerCase().includes(q))
    .forEach(f=>{
      const movs = movimentosFornecedorUnificado(f.id, 'TODOS');
      const entradas = movs.filter(m=>m.tipo==='ENTRADA');
      const vendas = movs.filter(m=>m.tipo==='VENDA');
      const perdas = movs.filter(m=>m.tipo==='PERDA');
      const totalEntradas = entradas.reduce((s,m)=>s+Number(m.valor_total||0),0);
      const totalGeral = movs.reduce((s,m)=>s+Number(m.valor_total||0),0);

      const btn = document.createElement('button');
      btn.innerHTML = `
        ${f.nome || 'Fornecedor'}<br>
        <small>${f.cnpj || ''}</small><br>
        <small>
          Entradas: ${entradas.length} • Vendas: ${vendas.length} • Perdas: ${perdas.length}
        </small><br>
        <small>Total entradas: ${fmt(totalEntradas)} | Total geral: ${fmt(totalGeral)}</small>
      `;
      btn.onclick = ()=>abrirFornecedor(f.id);
      box.appendChild(btn);
    });
}

function setFiltroFornecedor(tipo, fid){
  filtroFornecedorAtual = tipo;
  abrirFornecedor(fid);
}

function abrirFornecedor(fid){
  const f = fornecedores.find(x=>x.id===fid);
  const movsTodos = movimentosFornecedorUnificado(fid, 'TODOS');
  const movs = movimentosFornecedorUnificado(fid, filtroFornecedorAtual);

  const entradas = movsTodos.filter(m=>m.tipo==='ENTRADA');
  const vendas = movsTodos.filter(m=>m.tipo==='VENDA');
  const perdas = movsTodos.filter(m=>m.tipo==='PERDA');
  const outras = movsTodos.filter(m=>!['ENTRADA','VENDA','PERDA'].includes(m.tipo));

  const totalEntradas = entradas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalVendas = vendas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalPerdas = perdas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalFiltro = movs.reduce((s,m)=>s+Number(m.valor_total||0),0);

  const notasIds = new Set(movsTodos.map(m=>m.nota_id).filter(Boolean));
  const produtosIds = new Set(movsTodos.map(m=>m.produto_id).filter(Boolean));
  const datas = movsTodos.map(m=>m.data_movimento).filter(Boolean).sort();
  const primeira = datas[0] || '-';
  const ultima = datas[datas.length-1] || '-';

  const filtroBtns = `
    <div class="actions wrapActions">
      <button class="${filtroFornecedorAtual==='TODOS'?'activeMini':''}" onclick="setFiltroFornecedor('TODOS','${fid}')">Todos</button>
      <button class="${filtroFornecedorAtual==='ENTRADA'?'activeMini':''}" onclick="setFiltroFornecedor('ENTRADA','${fid}')">Entradas</button>
      <button class="${filtroFornecedorAtual==='VENDA'?'activeMini':''}" onclick="setFiltroFornecedor('VENDA','${fid}')">Vendas</button>
      <button class="${filtroFornecedorAtual==='PERDA'?'activeMini':''}" onclick="setFiltroFornecedor('PERDA','${fid}')">Perdas</button>
    </div>
  `;

  if(!movsTodos.length){
    document.getElementById('historicoFornecedor').innerHTML = `
      <h3>${f?.nome || 'Fornecedor'}</h3>
      <p class="warn">Este fornecedor ainda não possui movimentos vinculados.</p>
      <p>Isso pode acontecer por 3 motivos:</p>
      <ol>
        <li>Ele foi cadastrado manualmente, mas ainda não tem XML importado.</li>
        <li>Os XMLs foram importados antes da criação da tabela <b>movimentos_xml</b>.</li>
        <li>O XML não foi identificado como entrada/venda/perda.</li>
      </ol>
      <p>Importe novamente alguns XMLs desse fornecedor na aba <b>Importar XML</b>.</p>
    `;
    return;
  }

  const porProduto = {};
  movs.forEach(m=>{
    porProduto[m.produto_id] ||= [];
    porProduto[m.produto_id].push(m);
  });

  let linhas = Object.entries(porProduto).map(([pid, arr])=>{
    const p = produtos.find(x=>x.id===pid) || {};
    const precos = arr.map(m=>Number(m.valor_unitario||0)).filter(v=>v>0);
    const menor = precos.length ? Math.min(...precos) : 0;
    const maior = precos.length ? Math.max(...precos) : 0;
    const media = precos.length ? precos.reduce((s,v)=>s+v,0)/precos.length : 0;
    const ultimo = precos.length ? precos[precos.length-1] : 0;
    const qtd = arr.reduce((s,m)=>s+Number(m.quantidade||0),0);
    const total = arr.reduce((s,m)=>s+Number(m.valor_total||0),0);
    const variacao = menor ? ((maior-menor)/menor)*100 : 0;
    const status = !precos.length ? 'Sem preço' : ultimo <= menor ? 'Excelente' : ultimo <= media ? 'Aceitável' : 'Negociar';
    return {pid, produto:p.descricao||pid, qtd, total, menor, maior, media, ultimo, variacao, compras:arr.length, status};
  }).sort((a,b)=>b.total-a.total);

  const rows = linhas.slice(0,150).map(l=>`
    <tr>
      <td>${l.produto}</td>
      <td>${l.compras}</td>
      <td>${qtdFmt(l.qtd)}</td>
      <td>${fmt(l.total)}</td>
      <td>${fmt(l.menor)}</td>
      <td>${fmt(l.media)}</td>
      <td>${fmt(l.maior)}</td>
      <td>${fmt(l.ultimo)}</td>
      <td>${l.variacao.toFixed(1)}%</td>
      <td><span class="tag ${l.status==='Excelente'?'tagOk':l.status==='Aceitável'?'tagWarn':'tagBad'}">${l.status}</span></td>
      <td><button class="secondary" onclick="mostrarHistoricoProdutoFornecedor('${fid}','${l.pid}')">Ver histórico</button></td>
    </tr>
  `).join('');

  document.getElementById('historicoFornecedor').innerHTML = `
    <h3>${f?.nome || 'Fornecedor'}</h3>

    <div class="metric">
      <div><small>Total entradas</small><b>${fmt(totalEntradas)}</b></div>
      <div><small>Total vendas</small><b>${fmt(totalVendas)}</b></div>
      <div><small>Total perdas</small><b>${fmt(totalPerdas)}</b></div>
      <div><small>Notas vinculadas</small><b>${notasIds.size}</b></div>
    </div>

    <div class="metric">
      <div><small>Itens filtrados</small><b>${movs.length}</b></div>
      <div><small>Produtos distintos</small><b>${produtosIds.size}</b></div>
      <div><small>Período inicial</small><b>${primeira}</b></div>
      <div><small>Período final</small><b>${ultima}</b></div>
    </div>

    ${filtroBtns}

    <p>
      Filtro atual: <b>${filtroFornecedorAtual}</b> |
      Valor exibido no filtro: <b>${fmt(totalFiltro)}</b>
    </p>

    <p class="warn">
      Para negociação, observe menor preço, média, último preço e status “Negociar”.
      Quando só existe uma compra, menor, média, maior e último ficam iguais porque ainda não há histórico suficiente.
    </p>

    <div id="detalheHistoricoProdutoFornecedor" class="miniResult">Clique em “Ver histórico” em um produto para ver as compras por data e nota.</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Mov.</th>
            <th>Qtd</th>
            <th>Total</th>
            <th>Menor</th>
            <th>Média</th>
            <th>Maior</th>
            <th>Último</th>
            <th>Variação</th>
            <th>Status</th><th>Detalhe</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}


function movimentosProdutoUnificado(pid, tipo=null){
  let movs = movimentos.filter(m => m.produto_id === pid);

  // Fallback: se movimentos_xml estiver vazio, usa itens_nota.
  if(!movs.length && itens.length){
    movs = itens
      .filter(i => i.produto_id === pid)
      .map(i => ({
        produto_id: i.produto_id,
        fornecedor_id: i.fornecedor_id || i.notas_fiscais?.fornecedor_id,
        nota_id: i.nota_id,
        tipo: i.tipo || i.notas_fiscais?.tipo || 'OUTRA',
        cfop: i.cfop,
        quantidade: Number(i.quantidade || 0),
        valor_unitario: Number(i.valor_unitario || 0),
        valor_total: Number(i.valor_total || 0),
        data_movimento: i.data_movimento || i.notas_fiscais?.data_emissao
      }));
  }

  if(tipo){
    movs = movs.filter(m => m.tipo === tipo);
  }

  return movs;
}

function statPrecoUnificado(pid, tipo){
  const arr = movimentosProdutoUnificado(pid, tipo)
    .map(m => Number(m.valor_unitario || 0))
    .filter(v => v > 0);

  if(!arr.length) return null;

  return {
    menor: Math.min(...arr),
    maior: Math.max(...arr),
    media: arr.reduce((s,v)=>s+v,0)/arr.length,
    ultimo: arr[arr.length - 1],
    qtd: arr.length
  };
}



function movimentosProdutoFornecedor(fid, pid, tipo='ENTRADA'){
  return movimentosFornecedorUnificado(fid, tipo)
    .filter(m => m.produto_id === pid)
    .sort((a,b)=>(a.data_movimento||'').localeCompare(b.data_movimento||''));
}

function mostrarHistoricoProdutoFornecedor(fid, pid){
  const f = fornecedores.find(x=>x.id===fid) || {};
  const p = produtos.find(x=>x.id===pid) || {};
  const hist = movimentosProdutoFornecedor(fid, pid, filtroFornecedorAtual === 'TODOS' ? 'ENTRADA' : filtroFornecedorAtual);

  if(!hist.length){
    document.getElementById('detalheHistoricoProdutoFornecedor').innerHTML = 'Não há histórico detalhado para este produto neste filtro.';
    return;
  }

  const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
  const menor = Math.min(...precos);
  const maior = Math.max(...precos);
  const media = precos.reduce((s,v)=>s+v,0)/precos.length;
  const ultima = precos[precos.length-1];
  const aviso = hist.length === 1
    ? '<span class="warn">Ainda existe apenas uma compra deste produto. Importe mais meses de XML para comparar se comprou caro ou barato.</span>'
    : '<span class="ok">Histórico disponível para comparar variação real de preço.</span>';

  const rows = hist.map(h=>{
    const nota = notas.find(n=>n.id===h.nota_id) || {};
    const diffMenor = menor ? ((Number(h.valor_unitario||0)-menor)/menor)*100 : 0;
    return `
      <tr>
        <td>${h.data_movimento || ''}</td>
        <td>${nota.numero || '-'}</td>
        <td>${qtdFmt(h.quantidade)}</td>
        <td>${fmt(h.valor_unitario)}</td>
        <td>${fmt(h.valor_total)}</td>
        <td>${diffMenor.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  document.getElementById('detalheHistoricoProdutoFornecedor').innerHTML = `
    <h3>${p.descricao || 'Produto'}</h3>
    <p>Fornecedor: <b>${f.nome || ''}</b></p>
    ${aviso}
    <div class="priceCompare">
      <div><small>Menor compra</small><b>${fmt(menor)}</b></div>
      <div><small>Média</small><b>${fmt(media)}</b></div>
      <div><small>Maior compra</small><b>${fmt(maior)}</b></div>
      <div><small>Última compra</small><b>${fmt(ultima)}</b></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>NF</th><th>Qtd</th><th>Preço unit.</th><th>Total</th><th>Acima do menor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function filtrarProdutosNegociacao(){
  const termo = (document.getElementById('buscaProdutoNegociacao')?.value || '').toLowerCase();
  const sel = document.getElementById('produtoNegociacao');
  if(!sel) return;

  const filtrados = produtos.filter(p => [p.descricao,p.ean,p.codigo].join(' ').toLowerCase().includes(termo));
  sel.innerHTML = filtrados.map(p=>`<option value="${p.id}">${p.descricao || 'Produto'} - ${p.ean || p.codigo || ''}</option>`).join('');
  atualizarPreviewNegociacao();
}

function historicoComprasProdutoNegociacao(){
  const box = document.getElementById('historicoComprasNegociacao');
  if(!box) return;

  const pid = document.getElementById('produtoNegociacao')?.value;
  const fid = document.getElementById('fornecedorNegociacao')?.value;

  let hist = movimentosProdutoUnificado(pid,'ENTRADA');
  if(fid) hist = hist.filter(m=>m.fornecedor_id===fid);

  hist = hist.sort((a,b)=>(a.data_movimento||'').localeCompare(b.data_movimento||''));

  if(!hist.length){
    box.innerHTML = '<span class="warn">Não há compras anteriores para este produto/fornecedor. Importe XMLs de entrada para criar histórico.</span>';
    return;
  }

  const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
  const menor = Math.min(...precos);
  const maior = Math.max(...precos);
  const media = precos.reduce((s,v)=>s+v,0)/precos.length;
  const ultimo = precos[precos.length-1];

  const aviso = hist.length === 1
    ? '<span class="warn">Só existe uma compra anterior. Ainda não dá para saber tendência, mas já dá para usar esse preço como referência inicial.</span>'
    : '<span class="ok">Histórico com múltiplas compras encontrado. Use menor preço e média para negociar.</span>';

  const rows = hist.slice(-12).reverse().map(h=>{
    const f = fornecedores.find(x=>x.id===h.fornecedor_id) || {};
    const nota = notas.find(n=>n.id===h.nota_id) || {};
    const diffMenor = menor ? ((Number(h.valor_unitario||0)-menor)/menor)*100 : 0;
    return `
      <tr>
        <td>${h.data_movimento || ''}</td>
        <td>${f.nome || '-'}</td>
        <td>${nota.numero || '-'}</td>
        <td>${qtdFmt(h.quantidade)}</td>
        <td>${fmt(h.valor_unitario)}</td>
        <td>${diffMenor.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  box.innerHTML = `
    <h3>Histórico de compras anteriores</h3>
    ${aviso}
    <div class="priceCompare">
      <div><small>Menor histórico</small><b>${fmt(menor)}</b></div>
      <div><small>Média histórica</small><b>${fmt(media)}</b></div>
      <div><small>Maior histórico</small><b>${fmt(maior)}</b></div>
      <div><small>Última compra</small><b>${fmt(ultimo)}</b></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Fornecedor</th><th>NF</th><th>Qtd</th><th>Preço</th><th>Acima do menor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderProdutos(){
  const q = (document.getElementById('buscaProduto')?.value || '').toLowerCase();
  const tbody = document.getElementById('tabelaProdutos');
  if(!tbody) return;
  tbody.innerHTML = '';

  produtos
    .filter(p=>[p.descricao,p.ean,p.codigo].join(' ').toLowerCase().includes(q))
    .forEach(p=>{
      const entradas = movimentosProdutoUnificado(p.id,'ENTRADA');
      const vendas = movimentosProdutoUnificado(p.id,'VENDA');
      const perdas = movimentosProdutoUnificado(p.id,'PERDA');
      const outros = movimentosProdutoUnificado(p.id,'OUTRA');
      const todos = movimentosProdutoUnificado(p.id,null);

      const custo = statPrecoUnificado(p.id,'ENTRADA');
      const venda = statPrecoUnificado(p.id,'VENDA');

      const qtdEntradas = entradas.reduce((s,m)=>s+Number(m.quantidade||0),0);
      const qtdVendas = vendas.reduce((s,m)=>s+Number(m.quantidade||0),0);
      const qtdPerdas = perdas.reduce((s,m)=>s+Number(m.quantidade||0),0);

      const margem = custo?.ultimo && venda?.ultimo ? ((venda.ultimo - custo.ultimo)/venda.ultimo)*100 : null;

      let status = 'Sem movimento';
      let cls = '';
      let dica = '';

      if(todos.length && !entradas.length && !vendas.length && !perdas.length){
        status = 'Não classificado';
        cls = 'tagWarn';
        dica = 'Tem movimento, mas sem tipo ENTRADA/VENDA/PERDA';
      }else if(margem !== null){
        if(margem >= 35){ status='Boa'; cls='tagOk'; }
        else if(margem >= 20){ status='Atenção'; cls='tagWarn'; }
        else { status='Baixa'; cls='tagBad'; }
      }else if(entradas.length && !vendas.length){
        status = 'Só compra';
        cls = 'tagWarn';
        dica = 'Tem custo, mas não tem venda vinculada';
      }else if(vendas.length && !entradas.length){
        status = 'Só venda';
        cls = 'tagWarn';
        dica = 'Tem venda, mas não tem compra vinculada';
      }

      tbody.innerHTML += `
        <tr title="${dica}">
          <td>${p.descricao || ''}</td>
          <td>${p.ean || p.codigo || ''}</td>
          <td>${qtdFmt(qtdEntradas)}</td>
          <td>${qtdFmt(qtdVendas)}</td>
          <td>${qtdFmt(qtdPerdas)}</td>
          <td>${custo ? fmt(custo.ultimo) : '-'}</td>
          <td>${venda ? fmt(venda.ultimo) : '-'}</td>
          <td>${margem !== null ? margem.toFixed(1)+'%' : '-'}</td>
          <td><span class="tag ${cls}">${status}</span></td>
        </tr>
      `;
    });
}

function popularSelects(){
  const optsP = produtos.map(p=>`<option value="${p.id}">${p.descricao || 'Produto'} - ${p.ean || p.codigo || ''}</option>`).join('');
  const optsF = fornecedores.map(f=>`<option value="${f.id}">${f.nome || 'Fornecedor'}</option>`).join('');
  ['produtoNegociacao','produtoPreco'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.innerHTML = optsP;
  });
  const fsel = document.getElementById('fornecedorNegociacao');
  if(fsel) fsel.innerHTML = `<option value="">Todos os fornecedores</option>` + optsF;
}

function historicoNegociacao(){
  const pid = document.getElementById('produtoNegociacao')?.value;
  const fid = document.getElementById('fornecedorNegociacao')?.value;
  let hist = movimentosProduto(pid,'ENTRADA');
  if(fid) hist = hist.filter(m=>m.fornecedor_id===fid);
  const precos = hist.map(m=>Number(m.valor_unitario||0)).filter(v=>v>0);
  if(!precos.length) return null;
  return {
    hist,
    menor: Math.min(...precos),
    maior: Math.max(...precos),
    media: precos.reduce((s,v)=>s+v,0)/precos.length,
    ultimo: precos[precos.length-1],
    compras: precos.length
  };
}

function custoLiquidoOferta(){
  const preco = num(document.getElementById('precoOfertado')?.value);
  const qtd = num(document.getElementById('qtdComprada')?.value);
  const bonif = num(document.getElementById('bonificacao')?.value);
  const desc = num(document.getElementById('descontoFinanceiro')?.value);
  if(!preco || !qtd) return 0;
  return ((preco*qtd)-desc)/Math.max(1,qtd+bonif);
}

function atualizarPreviewNegociacao(){
  const box = document.getElementById('previewNegociacao');
  if(!box) return;
  const st = historicoNegociacao();
  const liquido = custoLiquidoOferta();
  if(!st){
    box.innerHTML = 'Selecione um produto com histórico de entrada para comparar.';
    return;
  }
  const diffMedia = st.media ? ((liquido-st.media)/st.media)*100 : 0;
  const aviso = st.compras === 1
    ? '<br><span class="warn">Só existe uma compra anterior. Importe mais XMLs para fortalecer a comparação.</span>'
    : '<br><span class="ok">Histórico com várias compras disponível.</span>';

  box.innerHTML = `
    Histórico encontrado: <b>${st.compras}</b> compras |
    Menor: <b>${fmt(st.menor)}</b> |
    Média: <b>${fmt(st.media)}</b> |
    Último: <b>${fmt(st.ultimo)}</b><br>
    Custo líquido da oferta: <b>${fmt(liquido)}</b>
    ${liquido ? ` | Diferença contra média: <b>${diffMedia.toFixed(1)}%</b>` : ''}
    ${aviso}
  `;

  historicoComprasProdutoNegociacao();
}

function analisarNegociacao(){
  const st = historicoNegociacao();
  const liquido = custoLiquidoOferta();
  const qtd = num(document.getElementById('qtdComprada').value);
  const bonif = num(document.getElementById('bonificacao').value);
  if(!st) return document.getElementById('resultadoNegociacao').innerHTML = 'Sem histórico para comparar.';
  if(!liquido) return document.getElementById('resultadoNegociacao').innerHTML = 'Informe preço ofertado e quantidade.';

  const diffMenor = st.menor ? ((liquido-st.menor)/st.menor)*100 : 0;
  const economiaVsMedia = (st.media - liquido) * Math.max(1, qtd+bonif);
  const economiaVsUltimo = (st.ultimo - liquido) * Math.max(1, qtd+bonif);

  let classe = liquido <= st.menor ? 'ok' : liquido <= st.media ? 'warn' : 'bad';
  let texto = liquido <= st.menor ? 'FECHA: oferta melhor ou igual ao menor preço histórico.' :
              liquido <= st.media ? 'ACEITÁVEL: está abaixo da média, mas ainda pode tentar melhorar.' :
              'NÃO FECHAR AINDA: está acima da média histórica.';

  document.getElementById('resultadoNegociacao').innerHTML = `
    <span class="${classe}">${texto}</span><br><br>
    <div class="metric">
      <div><small>Custo líquido</small><b>${fmt(liquido)}</b></div>
      <div><small>Menor histórico</small><b>${fmt(st.menor)}</b></div>
      <div><small>Média histórica</small><b>${fmt(st.media)}</b></div>
      <div><small>Última compra</small><b>${fmt(st.ultimo)}</b></div>
    </div>
    Diferença contra o menor preço: <b>${diffMenor.toFixed(1)}%</b><br>
    Economia contra a média: <b>${fmt(economiaVsMedia)}</b><br>
    Economia contra a última compra: <b>${fmt(economiaVsUltimo)}</b><br><br>
    <b>Como negociar:</b><br>
    1. Mostre que seu menor histórico foi <b>${fmt(st.menor)}</b>.<br>
    2. Peça para chegar nesse custo líquido usando desconto, bonificação ou prazo.<br>
    3. Se não conseguir, tente ficar pelo menos abaixo da média: <b>${fmt(st.media)}</b>.<br><br>
    <b>Frase pronta:</b><br>
    “Meu melhor custo histórico nesse item foi ${fmt(st.menor)} e minha média é ${fmt(st.media)}. Para fechar hoje, preciso que o custo líquido fique próximo do melhor histórico, seja com desconto, bonificação ou prazo.”
  `;
}

function preencherPreco(){
  const pid = document.getElementById('produtoPreco').value;
  const st = statPreco(pid,'ENTRADA');
  if(st) document.getElementById('custoPreco').value = st.ultimo.toFixed(2);
}

function calcularPreco(){
  const custo = num(document.getElementById('custoPreco').value);
  const impostos = num(document.getElementById('impostos').value)/100;
  const perdas = num(document.getElementById('perdas').value)/100;
  const taxaCartao = num(document.getElementById('taxaCartao').value)/100;
  const royalties = num(document.getElementById('royalties').value)/100;
  const fundo = num(document.getElementById('fundoPropaganda').value)/100;
  const margem = num(document.getElementById('margem').value)/100;
  const concorrencia = num(document.getElementById('concorrencia').value);

  const custoBase = custo * (1 + perdas);
  const percentuaisSobreVenda = impostos + taxaCartao + royalties + fundo + margem;
  const preco = percentuaisSobreVenda >= 1 ? 0 : custoBase / (1 - percentuaisSobreVenda);

  const valorImpostos = preco * impostos;
  const valorCartao = preco * taxaCartao;
  const valorRoyalties = preco * royalties;
  const valorFundo = preco * fundo;
  const lucro = preco * margem;

  let rec = '';
  if(percentuaisSobreVenda >= 1){
    rec = '<span class="bad">A soma de margem, impostos, cartão, royalties e fundo passou de 100%. Reduza algum percentual.</span>';
  }else if(concorrencia){
    rec = preco <= concorrencia ? '<span class="ok">Preço competitivo contra a concorrência.</span>' : '<span class="warn">Preço calculado acima da concorrência. Negocie custo, reduza perdas ou ajuste margem.</span>';
  }

  document.getElementById('resultadoPreco').innerHTML = `
    <div class="metric">
      <div><small>Preço sugerido</small><b>${fmt(preco)}</b></div>
      <div><small>Custo com perdas</small><b>${fmt(custoBase)}</b></div>
      <div><small>Lucro desejado</small><b>${fmt(lucro)}</b></div>
      <div><small>Royalties</small><b>${fmt(valorRoyalties)}</b></div>
    </div>
    Impostos/taxas: <b>${fmt(valorImpostos)}</b><br>
    Taxa de cartão: <b>${fmt(valorCartao)}</b><br>
    Fundo de propaganda/marketing: <b>${fmt(valorFundo)}</b><br>
    Soma de percentuais sobre venda: <b>${(percentuaisSobreVenda*100).toFixed(2)}%</b><br>
    ${rec}
  `;
}

function renderCurvaABC(){
  const entradas = movimentos.filter(m=>m.tipo==='ENTRADA');
  const porProduto = {};
  entradas.forEach(m=>porProduto[m.produto_id]=(porProduto[m.produto_id]||0)+Number(m.valor_total||0));
  const total = Object.values(porProduto).reduce((s,v)=>s+v,0);
  let acumulado = 0;
  const linhas = Object.entries(porProduto).map(([pid, valor])=>{
    const p = produtos.find(x=>x.id===pid) || {};
    const perc = total ? (valor/total)*100 : 0;
    acumulado += perc;
    const classe = acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C';
    return {produto:p.descricao||pid, valor, perc, acumulado, classe};
  }).sort((a,b)=>b.valor-a.valor);

  let rows = '';
  let acc = 0;
  linhas.forEach(l=>{
    acc += l.perc;
    const classe = acc <= 80 ? 'A' : acc <= 95 ? 'B' : 'C';
    rows += `<tr><td>${l.produto}</td><td>${fmt(l.valor)}</td><td>${l.perc.toFixed(1)}%</td><td>${acc.toFixed(1)}%</td><td><b>${classe}</b></td></tr>`;
  });

  document.getElementById('curvaABC').innerHTML = `
    <p><b>A</b>: produtos que mais pesam nas compras. Negocie primeiro estes.</p>
    <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Valor comprado</th><th>%</th><th>% acumulado</th><th>Classe</th></tr></thead><tbody>${rows}</tbody></table></div>
  `;
}

function renderRankingFornecedores(){
  const entradas = movimentos.filter(m=>m.tipo==='ENTRADA');
  const porF = {};
  entradas.forEach(m=>porF[m.fornecedor_id]=(porF[m.fornecedor_id]||0)+Number(m.valor_total||0));
  const total = Object.values(porF).reduce((s,v)=>s+v,0);
  const rows = Object.entries(porF).sort((a,b)=>b[1]-a[1]).map(([fid,valor])=>{
    const f = fornecedores.find(x=>x.id===fid) || {};
    const pct = total ? (valor/total)*100 : 0;
    return `<tr><td>${f.nome||fid}</td><td>${fmt(valor)}</td><td>${pct.toFixed(1)}%</td><td><div class="barMini"><span style="width:${pct}%"></span></div></td></tr>`;
  }).join('');
  document.getElementById('rankingFornecedores').innerHTML = `
    <div class="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Total comprado</th><th>%</th><th>Participação</th></tr></thead><tbody>${rows}</tbody></table></div>
  `;
}

function renderVariacaoCustos(){
  const linhas = produtos.map(p=>{
    const st = statPreco(p.id,'ENTRADA');
    if(!st) return null;
    const variacao = st.menor ? ((st.maior-st.menor)/st.menor)*100 : 0;
    return {produto:p.descricao, menor:st.menor, maior:st.maior, media:st.media, ultimo:st.ultimo, variacao};
  }).filter(Boolean).sort((a,b)=>b.variacao-a.variacao);

  const rows = linhas.slice(0,100).map(l=>`
    <tr>
      <td>${l.produto}</td><td>${fmt(l.menor)}</td><td>${fmt(l.media)}</td><td>${fmt(l.maior)}</td><td>${fmt(l.ultimo)}</td><td>${l.variacao.toFixed(1)}%</td>
    </tr>
  `).join('');

  document.getElementById('variacaoCustos').innerHTML = `
    <p>Use esta lista para descobrir onde você comprou caro e onde existe oportunidade de negociação.</p>
    <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Menor</th><th>Média</th><th>Maior</th><th>Último</th><th>Variação</th></tr></thead><tbody>${rows}</tbody></table></div>
  `;
}

aplicarConfigVisual();

function mesKey(data){
  return (data || '').substring(0,7) || 'Sem data';
}

function renderGraficoComprasMensais(){
  const entradas = movimentos.filter(m=>m.tipo==='ENTRADA');
  const porMes = {};
  entradas.forEach(m=>{
    const mes = mesKey(m.data_movimento);
    porMes[mes] = (porMes[mes] || 0) + Number(m.valor_total || 0);
  });

  const rows = Object.entries(porMes).sort((a,b)=>a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(r=>r[1]), 1);

  document.getElementById('graficoComprasMensais').innerHTML = `
    <div class="chartRows">
      ${rows.map(([mes, valor])=>`
        <div class="chartRow">
          <span>${mes}</span>
          <div class="chartBar"><span style="width:${Math.max(3,(valor/max)*100)}%"></span></div>
          <b>${fmt(valor)}</b>
        </div>
      `).join('') || 'Sem compras importadas.'}
    </div>
  `;
}

function renderOportunidades(){
  const oportunidades = [];

  produtos.forEach(p=>{
    const hist = movimentosProdutoUnificado(p.id,'ENTRADA');
    if(hist.length < 2) return;

    const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
    if(precos.length < 2) return;

    const menor = Math.min(...precos);
    const ultimo = precos[precos.length-1];
    const media = precos.reduce((s,v)=>s+v,0)/precos.length;
    const variacao = menor ? ((ultimo-menor)/menor)*100 : 0;

    if(variacao > 10){
      oportunidades.push({
        produto:p.descricao,
        menor, ultimo, media, variacao,
        texto:`${p.descricao}: última compra ${fmt(ultimo)} está ${variacao.toFixed(1)}% acima do melhor preço ${fmt(menor)}.`
      });
    }
  });

  oportunidades.sort((a,b)=>b.variacao-a.variacao);

  document.getElementById('oportunidades').innerHTML = oportunidades.length ? `
    <p class="warn">Use esses produtos para negociar primeiro.</p>
    ${oportunidades.slice(0,20).map(o=>`
      <div class="timelineItem">
        <b>${o.produto}</b><br>
        Menor: ${fmt(o.menor)} | Média: ${fmt(o.media)} | Último: ${fmt(o.ultimo)}<br>
        <span class="bad">${o.variacao.toFixed(1)}% acima do melhor histórico</span>
      </div>
    `).join('')}
  ` : 'Nenhuma oportunidade encontrada. Importe mais meses de XML para gerar comparativos melhores.';
}

verificarSessao();
