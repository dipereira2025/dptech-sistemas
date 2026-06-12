
/* DPTech Compras XML v7
   Versão consolidada: remove funções duplicadas e centraliza todos os dados em movimentos unificados.
*/

const CONFIG_CHAVE = "empresa_padrao";
let configVisualCache = {};

let fornecedores = [];
let produtos = [];
let notas = [];
let itens = [];
let movimentos = [];
let filtroFornecedorAtual = "TODOS";

const fmt = v => (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const qtdFmt = v => (Number(v)||0).toLocaleString("pt-BR",{maximumFractionDigits:3});
const num = v => Number(String(v||"0").replace(",",".")) || 0;
const cnpjLimpo = v => String(v||"").replace(/\D/g,"");

const traducoes = {
  "pt-BR": {
    sair:"Sair",
    tituloPadrao:"DPTech Compras XML v7",
    subtituloPadrao:"Compras, vendas, perdas, fornecedores, negociação, royalties, precificação e relatórios."
  },
  "en-US": {
    sair:"Logout",
    tituloPadrao:"DPTech XML Purchasing v7",
    subtituloPadrao:"Purchases, sales, losses, suppliers, negotiation, royalties, pricing and reports."
  },
  "es-ES": {
    sair:"Salir",
    tituloPadrao:"DPTech Compras XML v7",
    subtituloPadrao:"Compras, ventas, pérdidas, proveedores, negociación, regalías, precios e informes."
  }
};

function byId(id){ return document.getElementById(id); }

function getText(parent, tag){
  const el = parent?.getElementsByTagName(tag)[0];
  return el ? el.textContent.trim() : "";
}

function openTab(id, btn){
  document.querySelectorAll(".tabContent").forEach(x=>x.classList.add("hidden"));
  byId(id)?.classList.remove("hidden");
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn?.classList.add("active");

  if(id === "relatorios"){
    renderCurvaABC();
    renderRankingFornecedores();
    renderVariacaoCustos();
    renderGraficoComprasMensais();
    renderOportunidades();
  }
}

/* =========================
   CONFIGURAÇÃO VISUAL
========================= */

function getConfigVisual(){
  return configVisualCache || JSON.parse(localStorage.getItem("dptech_visual_config") || "{}");
}

function setConfigVisualLocal(cfg){
  configVisualCache = cfg || {};
  localStorage.setItem("dptech_visual_config", JSON.stringify(configVisualCache));
}

async function carregarConfigSupabase(){
  try{
    const { data, error } = await supabaseClient
      .from("configuracoes_sistema")
      .select("*")
      .eq("chave", CONFIG_CHAVE)
      .maybeSingle();

    if(error){
      configVisualCache = JSON.parse(localStorage.getItem("dptech_visual_config") || "{}");
      return;
    }

    if(data?.valor){
      configVisualCache = data.valor;
      localStorage.setItem("dptech_visual_config", JSON.stringify(configVisualCache));
    }else{
      configVisualCache = JSON.parse(localStorage.getItem("dptech_visual_config") || "{}");
    }
  }catch(e){
    console.warn(e);
    configVisualCache = JSON.parse(localStorage.getItem("dptech_visual_config") || "{}");
  }
}

async function salvarConfigSupabase(cfg){
  setConfigVisualLocal(cfg);

  const { error } = await supabaseClient
    .from("configuracoes_sistema")
    .upsert({
      chave: CONFIG_CHAVE,
      valor: cfg,
      updated_at: new Date().toISOString()
    }, { onConflict:"chave" });

  if(error){
    alert("Não consegui salvar no Supabase. Execute o schema_v7.sql. Erro: " + error.message);
    return false;
  }
  return true;
}

function aplicarConfigVisual(){
  const cfg = getConfigVisual();
  const idioma = cfg.idioma || "pt-BR";
  const t = traducoes[idioma] || traducoes["pt-BR"];

  document.body.classList.remove("palette-amber","palette-shell","palette-blue","palette-green","palette-purple","palette-dark","theme-dark");
  document.body.classList.add("palette-" + (cfg.paleta || "amber"));
  if((cfg.tema || "light") === "dark") document.body.classList.add("theme-dark");

  if(byId("appTitle")) byId("appTitle").textContent = cfg.titulo || t.tituloPadrao;
  if(byId("appSubtitle")) byId("appSubtitle").textContent = cfg.subtitulo || t.subtituloPadrao;

  const logo = byId("appLogo");
  const preview = byId("logoPreview");
  const src = cfg.logo_url || cfg.logo;

  if(src){
    if(logo){ logo.src = src; logo.classList.remove("hidden"); }
    if(preview){ preview.src = src; preview.classList.remove("hidden"); }
  }else{
    logo?.classList.add("hidden");
    preview?.classList.add("hidden");
  }

  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(t[key]) el.textContent = t[key];
  });

  if(byId("cfgTitulo")){
    byId("cfgTitulo").value = cfg.titulo || "";
    byId("cfgSubtitulo").value = cfg.subtitulo || "";
    byId("cfgPaleta").value = cfg.paleta || "amber";
    byId("cfgTema").value = cfg.tema || "light";
    byId("cfgIdioma").value = cfg.idioma || "pt-BR";
  }
}

async function carregarLogoLocal(event){
  const file = event.target.files[0];
  if(!file) return;

  const cfg = getConfigVisual();
  const nomeArquivo = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"")}`;

  try{
    const { error: uploadError } = await supabaseClient.storage
      .from("logos")
      .upload(nomeArquivo, file, { upsert:false });

    if(uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from("logos").getPublicUrl(nomeArquivo);
    cfg.logo_url = data.publicUrl;
    delete cfg.logo;

    await salvarConfigSupabase(cfg);
    aplicarConfigVisual();
    alert("Logo salva no Supabase. Ela aparecerá no PC e no celular.");
  }catch(e){
    const reader = new FileReader();
    reader.onload = async ev => {
      cfg.logo = ev.target.result;
      delete cfg.logo_url;
      setConfigVisualLocal(cfg);
      aplicarConfigVisual();
      alert("Não consegui salvar no Storage. Salvei localmente. Execute o schema_v7.sql e confirme o bucket logos. Erro: " + e.message);
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
  cfg.titulo = byId("cfgTitulo").value.trim();
  cfg.subtitulo = byId("cfgSubtitulo").value.trim();
  cfg.paleta = byId("cfgPaleta").value;
  cfg.tema = byId("cfgTema").value;
  cfg.idioma = byId("cfgIdioma").value;

  const ok = await salvarConfigSupabase(cfg);
  aplicarConfigVisual();
  if(ok) alert("Personalização salva no Supabase.");
}

function aplicarPaletaSelecionada(){
  const cfg = getConfigVisual();
  cfg.paleta = byId("cfgPaleta").value;
  setConfigVisualLocal(cfg);
  aplicarConfigVisual();
}

function aplicarTemaSelecionado(){
  const cfg = getConfigVisual();
  cfg.tema = byId("cfgTema").value;
  setConfigVisualLocal(cfg);
  aplicarConfigVisual();
}

function aplicarIdiomaSelecionado(){
  const cfg = getConfigVisual();
  cfg.idioma = byId("cfgIdioma").value;
  setConfigVisualLocal(cfg);
  aplicarConfigVisual();
}

/* =========================
   AUTENTICAÇÃO
========================= */

async function verificarSessao(){
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;

  if(session){
    await carregarConfigSupabase();
    aplicarConfigVisual();

    byId("loginBox")?.classList.add("hidden");
    byId("appBox")?.classList.remove("hidden");
    if(byId("userEmail")) byId("userEmail").textContent = session.user.email;
    await carregarDados();
  }else{
    byId("loginBox")?.classList.remove("hidden");
    byId("appBox")?.classList.add("hidden");
    if(byId("userEmail")) byId("userEmail").textContent = "Não logado";
  }
}

async function signup(){
  const email = byId("email").value;
  const password = byId("password").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if(error) return alert(error.message);
  alert("Conta criada. Faça login ou confirme o e-mail se o Supabase solicitar.");
}

async function login(){
  const email = byId("email").value;
  const password = byId("password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error) return alert(error.message);
  verificarSessao();
}

async function logout(){
  await supabaseClient.auth.signOut();
  verificarSessao();
}

/* =========================
   CARREGAMENTO E UNIFICAÇÃO
========================= */

async function carregarDados(){
  const [f,p,n,i,m] = await Promise.all([
    supabaseClient.from("fornecedores").select("*").order("nome"),
    supabaseClient.from("produtos").select("*").order("descricao"),
    supabaseClient.from("notas_fiscais").select("*").order("data_emissao",{ascending:false}),
    supabaseClient.from("itens_nota").select("*, notas_fiscais(*)"),
    supabaseClient.from("movimentos_xml").select("*").order("data_movimento",{ascending:false})
  ]);

  if(f.error) console.warn("fornecedores", f.error.message);
  if(p.error) console.warn("produtos", p.error.message);
  if(n.error) console.warn("notas", n.error.message);
  if(i.error) console.warn("itens", i.error.message);
  if(m.error) console.warn("movimentos", m.error.message);

  fornecedores = f.data || [];
  produtos = p.data || [];
  notas = n.data || [];
  itens = i.data || [];
  movimentos = m.data || [];

  renderTudo();
}

function todosMovimentosUnificados(){
  if(movimentos && movimentos.length){
    return movimentos.map(m => ({
      produto_id: m.produto_id,
      fornecedor_id: m.fornecedor_id,
      nota_id: m.nota_id,
      tipo: m.tipo || "OUTRA",
      cfop: m.cfop,
      quantidade: Number(m.quantidade || 0),
      valor_unitario: Number(m.valor_unitario || 0),
      valor_total: Number(m.valor_total || 0),
      data_movimento: m.data_movimento || m.created_at
    }));
  }

  if(itens && itens.length){
    return itens.map(i => ({
      produto_id: i.produto_id,
      fornecedor_id: i.fornecedor_id || i.notas_fiscais?.fornecedor_id,
      nota_id: i.nota_id,
      tipo: i.tipo || i.notas_fiscais?.tipo || "OUTRA",
      cfop: i.cfop,
      quantidade: Number(i.quantidade || 0),
      valor_unitario: Number(i.valor_unitario || 0),
      valor_total: Number(i.valor_total || 0),
      data_movimento: i.data_movimento || i.notas_fiscais?.data_emissao || i.created_at
    }));
  }

  return [];
}

function movimentosPorTipoGlobal(tipo){
  return todosMovimentosUnificados().filter(m => m.tipo === tipo);
}

function movimentosProdutoUnificado(pid, tipo=null, fid=null){
  let movs = todosMovimentosUnificados().filter(m => m.produto_id === pid);
  if(tipo) movs = movs.filter(m => m.tipo === tipo);
  if(fid) movs = movs.filter(m => m.fornecedor_id === fid);
  return movs.sort((a,b)=>(a.data_movimento||"").localeCompare(b.data_movimento||""));
}

function movimentosFornecedorUnificado(fid, tipo="TODOS"){
  let movs = todosMovimentosUnificados().filter(m => m.fornecedor_id === fid);
  if(tipo !== "TODOS") movs = movs.filter(m => m.tipo === tipo);
  return movs.sort((a,b)=>(a.data_movimento||"").localeCompare(b.data_movimento||""));
}

function statPreco(pid, tipo="ENTRADA", fid=null){
  const arr = movimentosProdutoUnificado(pid, tipo, fid)
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

function diagnosticoDados(){
  return {
    produtos: produtos.length,
    fornecedores: fornecedores.length,
    notas: notas.length,
    itensNota: itens.length,
    movimentosXml: movimentos.length,
    movimentosUnificados: todosMovimentosUnificados().length
  };
}

function renderTudo(){
  renderKPIs();
  renderResumo();
  renderAlertas();
  popularSelects();
  renderFornecedores();
  renderProdutos();
  atualizarPreviewNegociacao();
  try{
    renderCurvaABC();
    renderRankingFornecedores();
    renderVariacaoCustos();
    renderGraficoComprasMensais();
    renderOportunidades();
  }catch(e){
    console.warn("Relatórios ainda não prontos:", e);
  }
}

/* =========================
   XML
========================= */

function tipoNota(meta){
  const mod = meta.modelo;
  const emit = cnpjLimpo(meta.emitCnpj);
  const dest = cnpjLimpo(meta.destCnpj);
  const cfops = meta.cfops || [];

  if(cfops.includes("5927")) return "PERDA";
  if(mod === "65") return "VENDA";
  if(mod === "55" && dest === MINHA_EMPRESA_CNPJ && emit !== MINHA_EMPRESA_CNPJ) return "ENTRADA";
  if(mod === "55" && emit === MINHA_EMPRESA_CNPJ && dest === MINHA_EMPRESA_CNPJ) return "PERDA";
  if(mod === "55" && emit !== MINHA_EMPRESA_CNPJ) return "ENTRADA";
  return "OUTRA";
}

function parseXml(texto){
  const xml = new DOMParser().parseFromString(texto, "text/xml");
  const ide = xml.getElementsByTagName("ide")[0];
  const emit = xml.getElementsByTagName("emit")[0];
  const dest = xml.getElementsByTagName("dest")[0];
  const total = xml.getElementsByTagName("ICMSTot")[0];

  const dets = [...xml.getElementsByTagName("det")];
  const cfops = dets.map(d=>getText(d.getElementsByTagName("prod")[0], "CFOP"));

  const meta = {
    modelo: getText(ide,"mod"),
    numero: getText(ide,"nNF"),
    serie: getText(ide,"serie"),
    data: (getText(ide,"dhEmi") || getText(ide,"dEmi") || new Date().toISOString()).substring(0,10),
    natOp: getText(ide,"natOp"),
    emitCnpj: getText(emit,"CNPJ"),
    emitNome: getText(emit,"xNome"),
    destCnpj: getText(dest,"CNPJ"),
    destNome: getText(dest,"xNome"),
    valorTotal: num(getText(total,"vNF")),
    cfops
  };

  meta.tipo = tipoNota(meta);

  const produtosXml = dets.map(det=>{
    const prod = det.getElementsByTagName("prod")[0];
    const q = num(getText(prod,"qCom"));
    const vProd = num(getText(prod,"vProd"));
    const vUn = num(getText(prod,"vUnCom")) || (q ? vProd/q : 0);
    const vDesc = num(getText(prod,"vDesc"));
    const vOutro = num(getText(prod,"vOutro"));
    const custoLiquido = q ? (vProd - vDesc + vOutro) / q : vUn;

    return {
      codigo: getText(prod,"cProd"),
      ean: getText(prod,"cEAN") === "SEM GTIN" ? "" : getText(prod,"cEAN"),
      descricao: getText(prod,"xProd"),
      ncm: getText(prod,"NCM"),
      cfop: getText(prod,"CFOP"),
      unidade: getText(prod,"uCom"),
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
  let { data } = await supabaseClient.from("fornecedores").select("*").eq("cnpj", cnpj).maybeSingle();
  if(data) return data;

  const ins = await supabaseClient.from("fornecedores").insert({nome, cnpj}).select().single();
  if(ins.error) throw ins.error;
  return ins.data;
}

async function upsertProduto(p){
  let query = supabaseClient.from("produtos").select("*");
  if(p.ean) query = query.eq("ean", p.ean);
  else query = query.eq("codigo", p.codigo);

  let { data } = await query.maybeSingle();
  if(data) return data;

  const ins = await supabaseClient.from("produtos")
    .insert({
      codigo:p.codigo,
      ean:p.ean,
      descricao:p.descricao,
      categoria:p.categoria || "Sem categoria"
    })
    .select()
    .single();

  if(ins.error) throw ins.error;
  return ins.data;
}

function setProgress(atual, total, arquivo, status="processando"){
  const box = byId("uploadProgressBox");
  const fill = byId("progressFill");
  const percent = byId("progressPercent");
  const count = byId("progressCount");
  const current = byId("progressCurrent");

  box?.classList.remove("hidden");
  const pct = total ? Math.round((atual / total) * 100) : 0;
  if(fill) fill.style.width = pct + "%";
  if(percent) percent.textContent = pct + "%";
  if(count) count.textContent = `${atual} de ${total} arquivos`;
  if(current) current.textContent = arquivo ? `${status}: ${arquivo}` : status;
}

function addLogImportacao(texto, tipo="ok"){
  const log = byId("logImportacao");
  if(!log) return;
  log.classList.remove("hidden");

  const linha = document.createElement("div");
  linha.className = "logLine " + (tipo === "erro" ? "logBad" : tipo === "aviso" ? "logWarn" : "logOk");
  linha.textContent = texto;
  log.appendChild(linha);
  log.scrollTop = log.scrollHeight;
}

function limparProgressoImportacao(){
  if(byId("resultadoImportacao")) byId("resultadoImportacao").innerHTML = "";
  if(byId("logImportacao")){
    byId("logImportacao").innerHTML = "";
    byId("logImportacao").classList.add("hidden");
  }
  setProgress(0, 0, "", "Aguardando...");
  byId("uploadProgressBox")?.classList.add("hidden");
}

async function processarXMLs(){
  const files = byId("xmlFiles").files;
  const box = byId("resultadoImportacao");
  const btn = byId("btnProcessar");

  if(!files.length) return alert("Selecione XMLs.");

  limparProgressoImportacao();
  byId("uploadProgressBox")?.classList.remove("hidden");
  btn.disabled = true;
  btn.textContent = "Processando...";

  let resumo = {ENTRADA:0, VENDA:0, PERDA:0, OUTRA:0, itens:0, erros:0};
  const totalArquivos = files.length;

  for(let idx = 0; idx < totalArquivos; idx++){
    const file = files[idx];
    setProgress(idx, totalArquivos, file.name, "Lendo");
    addLogImportacao(`Lendo arquivo: ${file.name}`, "aviso");

    try{
      const texto = await file.text();
      const {meta, produtosXml} = parseXml(texto);

      setProgress(idx, totalArquivos, file.name, `Gravando ${produtosXml.length} itens`);
      addLogImportacao(`Identificado como ${meta.tipo} | NF ${meta.numero} | ${produtosXml.length} itens`, "aviso");

      resumo[meta.tipo] = (resumo[meta.tipo] || 0) + 1;
      resumo.itens += produtosXml.length;

      const fornecedor = meta.tipo === "ENTRADA"
        ? await upsertFornecedor(meta.emitNome, meta.emitCnpj)
        : await upsertFornecedor(meta.emitNome || "Minha empresa", meta.emitCnpj || MINHA_EMPRESA_CNPJ);

      const notaIns = await supabaseClient.from("notas_fiscais").insert({
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
        if(produtosXml.length > 3 && byId("progressCurrent")){
          byId("progressCurrent").textContent = `Item ${itemIndex + 1}/${produtosXml.length}: ${px.descricao}`;
        }

        const produto = await upsertProduto(px);
        const valorUnitario = px.custoLiquido || px.valorUnitario;

        const itemIns = await supabaseClient.from("itens_nota").insert({
          nota_id: nota.id,
          produto_id: produto.id,
          fornecedor_id: fornecedor.id,
          tipo: meta.tipo,
          cfop: px.cfop,
          unidade: px.unidade,
          quantidade: px.quantidade,
          valor_unitario: valorUnitario,
          valor_total: px.valorTotal,
          desconto: px.desconto,
          acrescimo: px.acrescimo,
          data_movimento: meta.data
        }).select().single();

        if(itemIns.error) throw itemIns.error;

        await supabaseClient.from("historico_precos").insert({
          produto_id: produto.id,
          fornecedor_id: fornecedor.id,
          preco: valorUnitario,
          data_preco: meta.data
        });

        await supabaseClient.from("movimentos_xml").insert({
          produto_id: produto.id,
          fornecedor_id: fornecedor.id,
          nota_id: nota.id,
          tipo: meta.tipo,
          cfop: px.cfop,
          quantidade: px.quantidade,
          valor_unitario: valorUnitario,
          valor_total: px.valorTotal,
          data_movimento: meta.data
        });
      }

      addLogImportacao(`OK: ${file.name} processado com sucesso.`, "ok");
    }catch(e){
      resumo.erros++;
      console.error(e);
      addLogImportacao(`ERRO: ${file.name} - ${e.message}`, "erro");
    }

    setProgress(idx + 1, totalArquivos, file.name, "Concluído");
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  setProgress(totalArquivos, totalArquivos, "", "Importação finalizada");
  btn.disabled = false;
  btn.textContent = "Processar XMLs";

  if(box){
    box.innerHTML = `
      <b>Importação finalizada</b><br>
      Entradas: ${resumo.ENTRADA || 0}<br>
      Vendas: ${resumo.VENDA || 0}<br>
      Perdas/baixas: ${resumo.PERDA || 0}<br>
      Outras: ${resumo.OUTRA || 0}<br>
      Itens processados: ${resumo.itens}<br>
      Erros: ${resumo.erros}
    `;
  }

  await carregarDados();
}

/* =========================
   DASHBOARD
========================= */

function renderKPIs(){
  const entradas = notas.filter(n=>n.tipo==="ENTRADA");
  const saidas = notas.filter(n=>n.tipo==="VENDA");
  const perdas = notas.filter(n=>n.tipo==="PERDA");
  const totalCompras = entradas.reduce((s,n)=>s+Number(n.valor_total||0),0);

  if(byId("kpiEntradas")) byId("kpiEntradas").textContent = entradas.length;
  if(byId("kpiSaidas")) byId("kpiSaidas").textContent = saidas.length;
  if(byId("kpiPerdas")) byId("kpiPerdas").textContent = perdas.length;
  if(byId("kpiFornecedores")) byId("kpiFornecedores").textContent = fornecedores.length;
  if(byId("kpiProdutos")) byId("kpiProdutos").textContent = produtos.length;
  if(byId("kpiCompras")) byId("kpiCompras").textContent = fmt(totalCompras);
}

function renderResumo(){
  const todos = todosMovimentosUnificados();
  const entradas = todos.filter(m=>m.tipo==="ENTRADA");
  const vendas = todos.filter(m=>m.tipo==="VENDA");
  const perdas = todos.filter(m=>m.tipo==="PERDA");

  const totalComprado = entradas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalVendido = vendas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalPerdas = perdas.reduce((s,m)=>s+Number(m.valor_total||0),0);

  if(byId("resumoInteligente")){
    byId("resumoInteligente").innerHTML = `
      Total comprado em itens: <b>${fmt(totalComprado)}</b><br>
      Total vendido em itens: <b>${fmt(totalVendido)}</b><br>
      Total baixado/perdido: <b>${fmt(totalPerdas)}</b><br>
      Movimentos unificados: <b>${todos.length}</b><br>
      <span class="warn">Importe meses de XML para fortalecer as análises.</span>
    `;
  }
}

function renderAlertas(){
  const alertas = [];

  produtos.forEach(p=>{
    const c = statPreco(p.id,"ENTRADA");
    const v = statPreco(p.id,"VENDA");
    const perdas = movimentosProdutoUnificado(p.id,"PERDA").reduce((s,m)=>s+Number(m.valor_total||0),0);

    if(c && c.qtd > 1 && c.menor && ((c.maior-c.menor)/c.menor)*100 > 20){
      alertas.push(`<span class="bad">Alta variação:</span> ${p.descricao} variou de ${fmt(c.menor)} para ${fmt(c.maior)}.`);
    }
    if(c && v && v.ultimo && ((v.ultimo-c.ultimo)/v.ultimo)*100 < 25){
      alertas.push(`<span class="warn">Margem baixa:</span> ${p.descricao} pode estar abaixo de 25%.`);
    }
    if(perdas > 0){
      alertas.push(`<span class="warn">Perda:</span> ${p.descricao} tem ${fmt(perdas)} em baixa/perda.`);
    }
  });

  if(byId("alertasGestao")){
    byId("alertasGestao").innerHTML = alertas.slice(0,12).join("<br>") || "Sem alertas no momento.";
  }
}

/* =========================
   FILTROS E SELECTS
========================= */

function categoriasDisponiveis(){
  const cats = new Set();
  produtos.forEach(p => cats.add(p.categoria || "Sem categoria"));
  return [...cats].sort();
}

function produtosDoFornecedor(fid, tipo="ENTRADA"){
  if(!fid) return produtos;

  let ids = new Set(
    todosMovimentosUnificados()
      .filter(m => m.fornecedor_id === fid && (!tipo || m.tipo === tipo))
      .map(m => m.produto_id)
  );

  if(!ids.size){
    ids = new Set(
      todosMovimentosUnificados()
        .filter(m => m.fornecedor_id === fid)
        .map(m => m.produto_id)
    );
  }

  return produtos.filter(p => ids.has(p.id));
}

function produtoTemMovimentoFornecedor(pid, fid, tipo=null){
  if(!fid) return true;
  return movimentosProdutoUnificado(pid, tipo, fid).length > 0;
}

function popularFiltrosProdutos(){
  const fornecedoresOpts = fornecedores.map(f=>`<option value="${f.id}">${f.nome || "Fornecedor"}</option>`).join("");

  const filtroFornecedorProduto = byId("filtroFornecedorProduto");
  if(filtroFornecedorProduto){
    const atual = filtroFornecedorProduto.value;
    filtroFornecedorProduto.innerHTML = '<option value="">Todos os fornecedores</option>' + fornecedoresOpts;
    filtroFornecedorProduto.value = atual;
  }

  const fornecedorNeg = byId("fornecedorNegociacao");
  if(fornecedorNeg){
    const atual = fornecedorNeg.value;
    fornecedorNeg.innerHTML = '<option value="">Todos os fornecedores</option>' + fornecedoresOpts;
    fornecedorNeg.value = atual;
  }

  const cats = categoriasDisponiveis();
  ["filtroCategoriaProduto","categoriaNegociacao"].forEach(id=>{
    const sel = byId(id);
    if(!sel) return;
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todas as categorias</option>' +
      cats.map(c=>`<option value="${c}">${c}</option>`).join("");
    sel.value = atual;
  });
}

function popularSelects(){
  popularFiltrosProdutos();

  filtrarProdutosNegociacao();

  const produtoPreco = byId("produtoPreco");
  if(produtoPreco){
    const atual = produtoPreco.value;
    produtoPreco.innerHTML = produtos.map(p=>`<option value="${p.id}">${p.descricao || "Produto"} - ${p.ean || p.codigo || ""}</option>`).join("");
    produtoPreco.value = atual;
  }
}

/* =========================
   FORNECEDORES
========================= */

function renderFornecedores(){
  const q = (byId("buscaFornecedor")?.value || "").toLowerCase();
  const box = byId("listaFornecedores");
  if(!box) return;

  box.innerHTML = "";

  fornecedores
    .filter(f=>[f.nome,f.cnpj].join(" ").toLowerCase().includes(q))
    .forEach(f=>{
      const movs = movimentosFornecedorUnificado(f.id, "TODOS");
      const entradas = movs.filter(m=>m.tipo==="ENTRADA");
      const vendas = movs.filter(m=>m.tipo==="VENDA");
      const perdas = movs.filter(m=>m.tipo==="PERDA");

      const totalEntradas = entradas.reduce((s,m)=>s+Number(m.valor_total||0),0);
      const totalGeral = movs.reduce((s,m)=>s+Number(m.valor_total||0),0);

      const btn = document.createElement("button");
      btn.innerHTML = `
        ${f.nome || "Fornecedor"}<br>
        <small>${f.cnpj || ""}</small><br>
        <small>Entradas: ${entradas.length} • Vendas: ${vendas.length} • Perdas: ${perdas.length}</small><br>
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
  const movsTodos = movimentosFornecedorUnificado(fid, "TODOS");
  const movs = movimentosFornecedorUnificado(fid, filtroFornecedorAtual);

  const entradas = movsTodos.filter(m=>m.tipo==="ENTRADA");
  const vendas = movsTodos.filter(m=>m.tipo==="VENDA");
  const perdas = movsTodos.filter(m=>m.tipo==="PERDA");

  const totalEntradas = entradas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalVendas = vendas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalPerdas = perdas.reduce((s,m)=>s+Number(m.valor_total||0),0);
  const totalFiltro = movs.reduce((s,m)=>s+Number(m.valor_total||0),0);

  const notasIds = new Set(movsTodos.map(m=>m.nota_id).filter(Boolean));
  const produtosIds = new Set(movsTodos.map(m=>m.produto_id).filter(Boolean));
  const datas = movsTodos.map(m=>m.data_movimento).filter(Boolean).sort();
  const primeira = datas[0] || "-";
  const ultima = datas[datas.length-1] || "-";

  if(!movsTodos.length){
    byId("historicoFornecedor").innerHTML = `
      <h3>${f?.nome || "Fornecedor"}</h3>
      <p class="warn">Este fornecedor ainda não possui movimentos vinculados.</p>
      <p>Importe XMLs desse fornecedor na aba <b>Importar XML</b>.</p>
    `;
    return;
  }

  const filtroBtns = `
    <div class="actions wrapActions">
      <button class="${filtroFornecedorAtual==="TODOS"?"activeMini":""}" onclick="setFiltroFornecedor('TODOS','${fid}')">Todos</button>
      <button class="${filtroFornecedorAtual==="ENTRADA"?"activeMini":""}" onclick="setFiltroFornecedor('ENTRADA','${fid}')">Entradas</button>
      <button class="${filtroFornecedorAtual==="VENDA"?"activeMini":""}" onclick="setFiltroFornecedor('VENDA','${fid}')">Vendas</button>
      <button class="${filtroFornecedorAtual==="PERDA"?"activeMini":""}" onclick="setFiltroFornecedor('PERDA','${fid}')">Perdas</button>
    </div>
  `;

  const porProduto = {};
  movs.forEach(m=>{
    porProduto[m.produto_id] ||= [];
    porProduto[m.produto_id].push(m);
  });

  const linhas = Object.entries(porProduto).map(([pid, arr])=>{
    const p = produtos.find(x=>x.id===pid) || {};
    const precos = arr.map(m=>Number(m.valor_unitario||0)).filter(v=>v>0);
    const menor = precos.length ? Math.min(...precos) : 0;
    const maior = precos.length ? Math.max(...precos) : 0;
    const media = precos.length ? precos.reduce((s,v)=>s+v,0)/precos.length : 0;
    const ultimo = precos.length ? precos[precos.length-1] : 0;
    const qtd = arr.reduce((s,m)=>s+Number(m.quantidade||0),0);
    const total = arr.reduce((s,m)=>s+Number(m.valor_total||0),0);
    const variacao = menor ? ((maior-menor)/menor)*100 : 0;
    const status = !precos.length ? "Sem preço" : precos.length === 1 ? "Pouco histórico" : ultimo <= menor ? "Excelente" : ultimo <= media ? "Aceitável" : "Negociar";
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
      <td><span class="tag ${l.status==="Excelente"?"tagOk":l.status==="Aceitável"?"tagWarn":"tagBad"}">${l.status}</span></td>
      <td><button class="secondary" onclick="mostrarHistoricoProdutoFornecedor('${fid}','${l.pid}')">Ver histórico</button></td>
    </tr>
  `).join("");

  byId("historicoFornecedor").innerHTML = `
    <h3>${f?.nome || "Fornecedor"}</h3>
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
    <p>Filtro atual: <b>${filtroFornecedorAtual}</b> | Valor exibido: <b>${fmt(totalFiltro)}</b></p>
    <p class="warn">Quando só existe uma compra, menor, média, maior e último ficam iguais. Importe mais meses para melhorar a comparação.</p>
    <div id="detalheHistoricoProdutoFornecedor" class="miniResult">Clique em “Ver histórico” em um produto.</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th><th>Mov.</th><th>Qtd</th><th>Total</th><th>Menor</th><th>Média</th><th>Maior</th><th>Último</th><th>Variação</th><th>Status</th><th>Detalhe</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function mostrarHistoricoProdutoFornecedor(fid, pid){
  const f = fornecedores.find(x=>x.id===fid) || {};
  const p = produtos.find(x=>x.id===pid) || {};
  const tipo = filtroFornecedorAtual === "TODOS" ? "ENTRADA" : filtroFornecedorAtual;
  const hist = movimentosProdutoUnificado(pid, tipo, fid);

  if(!hist.length){
    byId("detalheHistoricoProdutoFornecedor").innerHTML = "Não há histórico detalhado para este produto neste filtro.";
    return;
  }

  const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
  const menor = precos.length ? Math.min(...precos) : 0;
  const maior = precos.length ? Math.max(...precos) : 0;
  const media = precos.length ? precos.reduce((s,v)=>s+v,0)/precos.length : 0;
  const ultima = precos.length ? precos[precos.length-1] : 0;

  const aviso = hist.length === 1
    ? '<span class="warn">Apenas uma compra/movimento. Ainda não há histórico suficiente.</span>'
    : '<span class="ok">Histórico disponível para comparar variação de preço.</span>';

  const rows = hist.map(h=>{
    const nota = notas.find(n=>n.id===h.nota_id) || {};
    const diffMenor = menor ? ((Number(h.valor_unitario||0)-menor)/menor)*100 : 0;
    return `
      <tr>
        <td>${h.data_movimento || ""}</td>
        <td>${nota.numero || "-"}</td>
        <td>${qtdFmt(h.quantidade)}</td>
        <td>${fmt(h.valor_unitario)}</td>
        <td>${fmt(h.valor_total)}</td>
        <td>${diffMenor.toFixed(1)}%</td>
      </tr>
    `;
  }).join("");

  byId("detalheHistoricoProdutoFornecedor").innerHTML = `
    <h3>${p.descricao || "Produto"}</h3>
    <p>Fornecedor: <b>${f.nome || ""}</b></p>
    ${aviso}
    <div class="priceCompare">
      <div><small>Menor</small><b>${fmt(menor)}</b></div>
      <div><small>Média</small><b>${fmt(media)}</b></div>
      <div><small>Maior</small><b>${fmt(maior)}</b></div>
      <div><small>Última</small><b>${fmt(ultima)}</b></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>NF</th><th>Qtd</th><th>Preço unit.</th><th>Total</th><th>Acima do menor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* =========================
   PRODUTOS
========================= */

function renderProdutos(){
  const q = (byId("buscaProduto")?.value || "").toLowerCase();
  const fornecedorFiltro = byId("filtroFornecedorProduto")?.value || "";
  const tipoFiltro = byId("filtroTipoProduto")?.value || "";
  const categoriaFiltro = byId("filtroCategoriaProduto")?.value || "";
  const tbody = byId("tabelaProdutos");

  if(!tbody) return;
  tbody.innerHTML = "";

  let lista = produtos.filter(p=>[p.descricao,p.ean,p.codigo].join(" ").toLowerCase().includes(q));

  if(categoriaFiltro){
    lista = lista.filter(p => (p.categoria || "Sem categoria") === categoriaFiltro);
  }

  if(fornecedorFiltro){
    lista = lista.filter(p => produtoTemMovimentoFornecedor(p.id, fornecedorFiltro, tipoFiltro || null));
  }

  lista.forEach(p=>{
    const entradas = movimentosProdutoUnificado(p.id,"ENTRADA", fornecedorFiltro || null);
    const vendas = movimentosProdutoUnificado(p.id,"VENDA", fornecedorFiltro || null);
    const perdas = movimentosProdutoUnificado(p.id,"PERDA", fornecedorFiltro || null);
    const todos = movimentosProdutoUnificado(p.id,null, fornecedorFiltro || null);

    if(tipoFiltro && !todos.some(m => m.tipo === tipoFiltro)) return;

    const custo = statPreco(p.id,"ENTRADA", fornecedorFiltro || null);
    const venda = statPreco(p.id,"VENDA", fornecedorFiltro || null);

    const qtdEntradas = entradas.reduce((s,m)=>s+Number(m.quantidade||0),0);
    const qtdVendas = vendas.reduce((s,m)=>s+Number(m.quantidade||0),0);
    const qtdPerdas = perdas.reduce((s,m)=>s+Number(m.quantidade||0),0);

    const margem = custo?.ultimo && venda?.ultimo ? ((venda.ultimo - custo.ultimo)/venda.ultimo)*100 : null;

    let status = "Sem movimento";
    let cls = "";

    if(todos.length && !entradas.length && !vendas.length && !perdas.length){
      status = "Não classificado";
      cls = "tagWarn";
    }else if(margem !== null){
      if(margem >= 35){ status="Boa"; cls="tagOk"; }
      else if(margem >= 20){ status="Atenção"; cls="tagWarn"; }
      else { status="Baixa"; cls="tagBad"; }
    }else if(entradas.length && !vendas.length){
      status = "Só compra";
      cls = "tagWarn";
    }else if(vendas.length && !entradas.length){
      status = "Só venda";
      cls = "tagWarn";
    }

    tbody.innerHTML += `
      <tr>
        <td>${p.descricao || ""}</td>
        <td>${p.ean || p.codigo || ""}</td>
        <td>${qtdFmt(qtdEntradas)}</td>
        <td>${qtdFmt(qtdVendas)}</td>
        <td>${qtdFmt(qtdPerdas)}</td>
        <td>${custo ? fmt(custo.ultimo) : "-"}</td>
        <td>${venda ? fmt(venda.ultimo) : "-"}</td>
        <td>${margem !== null ? margem.toFixed(1)+"%" : "-"}</td>
        <td><span class="tag ${cls}">${status}</span></td>
      </tr>
    `;
  });

  if(!tbody.innerHTML){
    tbody.innerHTML = `<tr><td colspan="9">Nenhum produto encontrado para este filtro.</td></tr>`;
  }
}

/* =========================
   NEGOCIAÇÃO
========================= */

function filtrarProdutosNegociacao(){
  const termo = (byId("buscaProdutoNegociacao")?.value || "").toLowerCase();
  const fornecedorId = byId("fornecedorNegociacao")?.value || "";
  const categoria = byId("categoriaNegociacao")?.value || "";
  const sel = byId("produtoNegociacao");

  if(!sel) return;

  let lista = fornecedorId ? produtosDoFornecedor(fornecedorId, "ENTRADA") : produtos;

  if(categoria){
    lista = lista.filter(p => (p.categoria || "Sem categoria") === categoria);
  }

  if(termo){
    lista = lista.filter(p => [p.descricao,p.ean,p.codigo].join(" ").toLowerCase().includes(termo));
  }

  const atual = sel.value;
  sel.innerHTML = lista.map(p=>`<option value="${p.id}">${p.descricao || "Produto"} - ${p.ean || p.codigo || ""}</option>`).join("");

  if(lista.some(p=>p.id === atual)) sel.value = atual;

  if(!lista.length){
    sel.innerHTML = '<option value="">Nenhum produto deste fornecedor/categoria</option>';
  }
}

function historicoNegociacao(){
  const pid = byId("produtoNegociacao")?.value;
  const fid = byId("fornecedorNegociacao")?.value || null;

  if(!pid) return null;

  let hist = movimentosProdutoUnificado(pid, "ENTRADA", fid);
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
  const preco = num(byId("precoOfertado")?.value);
  const qtd = num(byId("qtdComprada")?.value);
  const bonif = num(byId("bonificacao")?.value);
  const desc = num(byId("descontoFinanceiro")?.value);
  if(!preco || !qtd) return 0;
  return ((preco*qtd)-desc)/Math.max(1,qtd+bonif);
}

function historicoComprasProdutoNegociacao(){
  const box = byId("historicoComprasNegociacao");
  if(!box) return;

  const st = historicoNegociacao();

  if(!st){
    box.innerHTML = '<span class="warn">Não há compras anteriores para este produto/fornecedor. Importe XMLs de entrada para criar histórico.</span>';
    return;
  }

  const aviso = st.compras === 1
    ? '<span class="warn">Só existe uma compra anterior. Use como referência inicial, mas importe mais meses para comparação real.</span>'
    : '<span class="ok">Histórico com múltiplas compras encontrado.</span>';

  const rows = st.hist.slice(-12).reverse().map(h=>{
    const f = fornecedores.find(x=>x.id===h.fornecedor_id) || {};
    const nota = notas.find(n=>n.id===h.nota_id) || {};
    const diffMenor = st.menor ? ((Number(h.valor_unitario||0)-st.menor)/st.menor)*100 : 0;

    return `
      <tr>
        <td>${h.data_movimento || ""}</td>
        <td>${f.nome || "-"}</td>
        <td>${nota.numero || "-"}</td>
        <td>${qtdFmt(h.quantidade)}</td>
        <td>${fmt(h.valor_unitario)}</td>
        <td>${diffMenor.toFixed(1)}%</td>
      </tr>
    `;
  }).join("");

  box.innerHTML = `
    <h3>Histórico de compras anteriores</h3>
    ${aviso}
    <div class="priceCompare">
      <div><small>Menor histórico</small><b>${fmt(st.menor)}</b></div>
      <div><small>Média histórica</small><b>${fmt(st.media)}</b></div>
      <div><small>Maior histórico</small><b>${fmt(st.maior)}</b></div>
      <div><small>Última compra</small><b>${fmt(st.ultimo)}</b></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Fornecedor</th><th>NF</th><th>Qtd</th><th>Preço</th><th>Acima do menor</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function atualizarPreviewNegociacao(){
  const box = byId("previewNegociacao");
  if(!box) return;

  const st = historicoNegociacao();
  const liquido = custoLiquidoOferta();

  if(!st){
    box.innerHTML = "Selecione um produto com histórico de entrada para comparar.";
    historicoComprasProdutoNegociacao();
    return;
  }

  const diffMedia = st.media ? ((liquido-st.media)/st.media)*100 : 0;
  const aviso = st.compras === 1
    ? '<br><span class="warn">Só existe uma compra anterior.</span>'
    : '<br><span class="ok">Histórico com várias compras disponível.</span>';

  box.innerHTML = `
    Histórico encontrado: <b>${st.compras}</b> compras |
    Menor: <b>${fmt(st.menor)}</b> |
    Média: <b>${fmt(st.media)}</b> |
    Último: <b>${fmt(st.ultimo)}</b><br>
    Custo líquido da oferta: <b>${fmt(liquido)}</b>
    ${liquido ? ` | Diferença contra média: <b>${diffMedia.toFixed(1)}%</b>` : ""}
    ${aviso}
  `;

  historicoComprasProdutoNegociacao();
}

function analisarNegociacao(){
  const st = historicoNegociacao();
  const liquido = custoLiquidoOferta();
  const qtd = num(byId("qtdComprada")?.value);
  const bonif = num(byId("bonificacao")?.value);

  if(!st) return byId("resultadoNegociacao").innerHTML = "Sem histórico para comparar.";
  if(!liquido) return byId("resultadoNegociacao").innerHTML = "Informe preço ofertado e quantidade.";

  const diffMenor = st.menor ? ((liquido-st.menor)/st.menor)*100 : 0;
  const economiaVsMedia = (st.media - liquido) * Math.max(1, qtd+bonif);
  const economiaVsUltimo = (st.ultimo - liquido) * Math.max(1, qtd+bonif);

  let classe = liquido <= st.menor ? "ok" : liquido <= st.media ? "warn" : "bad";
  let texto = liquido <= st.menor ? "FECHA: oferta melhor ou igual ao menor preço histórico." :
              liquido <= st.media ? "ACEITÁVEL: está abaixo da média, mas tente melhorar." :
              "NÃO FECHAR AINDA: está acima da média histórica.";

  byId("resultadoNegociacao").innerHTML = `
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
    <b>Frase pronta:</b><br>
    “Meu melhor custo histórico nesse item foi ${fmt(st.menor)} e minha média é ${fmt(st.media)}. Para fechar hoje, preciso que o custo líquido fique próximo do melhor histórico, seja com desconto, bonificação ou prazo.”
  `;
}

/* =========================
   PRECIFICAÇÃO
========================= */

function preencherPreco(){
  const pid = byId("produtoPreco")?.value;
  const st = statPreco(pid,"ENTRADA");
  if(st && byId("custoPreco")) byId("custoPreco").value = Number(st.ultimo).toFixed(2);
}

function calcularPreco(){
  const custo = num(byId("custoPreco")?.value);
  const impostos = num(byId("impostos")?.value)/100;
  const perdas = num(byId("perdas")?.value)/100;
  const taxaCartao = num(byId("taxaCartao")?.value)/100;
  const royalties = num(byId("royalties")?.value)/100;
  const fundo = num(byId("fundoPropaganda")?.value)/100;
  const margem = num(byId("margem")?.value)/100;
  const concorrencia = num(byId("concorrencia")?.value);

  const custoBase = custo * (1 + perdas);
  const percentuaisSobreVenda = impostos + taxaCartao + royalties + fundo + margem;
  const preco = percentuaisSobreVenda >= 1 ? 0 : custoBase / (1 - percentuaisSobreVenda);

  const valorImpostos = preco * impostos;
  const valorCartao = preco * taxaCartao;
  const valorRoyalties = preco * royalties;
  const valorFundo = preco * fundo;
  const lucro = preco * margem;

  let rec = "";
  if(percentuaisSobreVenda >= 1){
    rec = '<span class="bad">A soma dos percentuais passou de 100%. Reduza algum percentual.</span>';
  }else if(concorrencia){
    rec = preco <= concorrencia ? '<span class="ok">Preço competitivo.</span>' : '<span class="warn">Preço acima da concorrência. Negocie custo ou ajuste margem.</span>';
  }

  byId("resultadoPreco").innerHTML = `
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

/* =========================
   RELATÓRIOS
========================= */

function mesKey(data){
  return (data || "").substring(0,7) || "Sem data";
}

function renderCurvaABC(){
  const box = byId("curvaABC");
  if(!box) return;

  const entradas = movimentosPorTipoGlobal("ENTRADA");
  if(!entradas.length){
    box.innerHTML = "Sem entradas para montar curva ABC.";
    return;
  }

  const porProduto = {};
  entradas.forEach(m=>porProduto[m.produto_id]=(porProduto[m.produto_id]||0)+Number(m.valor_total||0));

  const total = Object.values(porProduto).reduce((s,v)=>s+v,0);
  let acc = 0;

  const rows = Object.entries(porProduto).sort((a,b)=>b[1]-a[1]).map(([pid,valor])=>{
    const p = produtos.find(x=>x.id===pid) || {};
    const perc = total ? (valor/total)*100 : 0;
    acc += perc;
    const classe = acc <= 80 ? "A" : acc <= 95 ? "B" : "C";
    return `<tr><td>${p.descricao||pid}</td><td>${fmt(valor)}</td><td>${perc.toFixed(1)}%</td><td>${acc.toFixed(1)}%</td><td><b>${classe}</b></td></tr>`;
  }).join("");

  box.innerHTML = `
    <p><b>A</b>: produtos que mais pesam nas compras. Negocie primeiro estes.</p>
    <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Valor comprado</th><th>%</th><th>% acumulado</th><th>Classe</th></tr></thead><tbody>${rows}</tbody></table></div>
  `;
}

function renderRankingFornecedores(){
  const box = byId("rankingFornecedores");
  if(!box) return;

  const entradas = movimentosPorTipoGlobal("ENTRADA");
  if(!entradas.length){
    box.innerHTML = "Sem entradas para montar ranking.";
    return;
  }

  const porF = {};
  entradas.forEach(m=>porF[m.fornecedor_id]=(porF[m.fornecedor_id]||0)+Number(m.valor_total||0));
  const total = Object.values(porF).reduce((s,v)=>s+v,0);

  const rows = Object.entries(porF).sort((a,b)=>b[1]-a[1]).map(([fid,valor])=>{
    const f = fornecedores.find(x=>x.id===fid) || {};
    const pct = total ? (valor/total)*100 : 0;
    return `<tr><td>${f.nome||fid}</td><td>${fmt(valor)}</td><td>${pct.toFixed(1)}%</td><td><div class="barMini"><span style="width:${pct}%"></span></div></td></tr>`;
  }).join("");

  box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Total comprado</th><th>%</th><th>Participação</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderVariacaoCustos(){
  const box = byId("variacaoCustos");
  if(!box) return;

  const linhas = produtos.map(p=>{
    const st = statPreco(p.id,"ENTRADA");
    if(!st || st.qtd < 2) return null;
    const variacao = st.menor ? ((st.maior-st.menor)/st.menor)*100 : 0;
    return {produto:p.descricao, menor:st.menor, maior:st.maior, media:st.media, ultimo:st.ultimo, variacao, compras:st.qtd};
  }).filter(Boolean).sort((a,b)=>b.variacao-a.variacao);

  if(!linhas.length){
    box.innerHTML = "Ainda não há produtos com duas ou mais compras para comparar variação.";
    return;
  }

  const rows = linhas.slice(0,100).map(l=>`
    <tr><td>${l.produto}</td><td>${l.compras}</td><td>${fmt(l.menor)}</td><td>${fmt(l.media)}</td><td>${fmt(l.maior)}</td><td>${fmt(l.ultimo)}</td><td>${l.variacao.toFixed(1)}%</td></tr>
  `).join("");

  box.innerHTML = `
    <p>Use esta lista para descobrir onde você comprou caro.</p>
    <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Compras</th><th>Menor</th><th>Média</th><th>Maior</th><th>Último</th><th>Variação</th></tr></thead><tbody>${rows}</tbody></table></div>
  `;
}

function renderGraficoComprasMensais(){
  const box = byId("graficoComprasMensais");
  if(!box) return;

  const entradas = movimentosPorTipoGlobal("ENTRADA");
  if(!entradas.length){
    const d = diagnosticoDados();
    box.innerHTML = `
      <span class="warn">Nenhuma entrada encontrada.</span><br>
      Produtos: <b>${d.produtos}</b><br>
      Fornecedores: <b>${d.fornecedores}</b><br>
      Notas: <b>${d.notas}</b><br>
      Itens: <b>${d.itensNota}</b><br>
      Movimentos: <b>${d.movimentosXml}</b>
    `;
    return;
  }

  const porMes = {};
  entradas.forEach(m=>{
    const mes = mesKey(m.data_movimento);
    porMes[mes] = (porMes[mes] || 0) + Number(m.valor_total || 0);
  });

  const rows = Object.entries(porMes).sort((a,b)=>a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(r=>r[1]), 1);

  box.innerHTML = `
    <div class="chartRows">
      ${rows.map(([mes, valor])=>`
        <div class="chartRow">
          <span>${mes}</span>
          <div class="chartBar"><span style="width:${Math.max(3,(valor/max)*100)}%"></span></div>
          <b>${fmt(valor)}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function renderOportunidades(){
  const box = byId("oportunidades");
  if(!box) return;

  const oportunidades = [];

  produtos.forEach(p=>{
    const hist = movimentosProdutoUnificado(p.id,"ENTRADA");
    if(hist.length < 2) return;

    const precos = hist.map(h=>Number(h.valor_unitario||0)).filter(v=>v>0);
    if(precos.length < 2) return;

    const menor = Math.min(...precos);
    const ultimo = precos[precos.length-1];
    const media = precos.reduce((s,v)=>s+v,0)/precos.length;
    const variacao = menor ? ((ultimo-menor)/menor)*100 : 0;

    if(variacao > 10){
      oportunidades.push({produto:p.descricao, menor, ultimo, media, variacao, compras:hist.length});
    }
  });

  oportunidades.sort((a,b)=>b.variacao-a.variacao);

  box.innerHTML = oportunidades.length ? `
    <p class="warn">Use esses produtos para negociar primeiro.</p>
    ${oportunidades.slice(0,20).map(o=>`
      <div class="timelineItem">
        <b>${o.produto}</b><br>
        Compras no histórico: <b>${o.compras}</b><br>
        Menor: ${fmt(o.menor)} | Média: ${fmt(o.media)} | Último: ${fmt(o.ultimo)}<br>
        <span class="bad">${o.variacao.toFixed(1)}% acima do melhor histórico</span>
      </div>
    `).join("")}
  ` : "Nenhuma oportunidade encontrada ainda. Importe mais meses de XML.";
}

aplicarConfigVisual();
verificarSessao();
