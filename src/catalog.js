'use strict';

const TEXT = {
  catalog:['产品','Collections'], favorites:['收藏','Favorites'], cart:['购物车','Cart'], inquiry:['询价单','Inquiry sheet'],
  all:['全部','All'], tonneau:['酒桶型','Tonneau'], men:['男款','Men'], women:['女款','Women'], round:['圆形','Round'], slim:['超薄款','Slim model'], backToTop:['返回顶部','Back to top'],
  'women-square':['女款方形','Women · square'], 'women-round':['女款圆形','Women · round'], page:['页','Page'], previousPage:['上一页','Previous page'], nextPage:['下一页','Next page'], inCart:['已加入购物车','In cart'], itemNotes:['商品备注','Item notes'], noColorPhotos:['暂无产品图片','Product images unavailable'], chooseStyle:['款式','Style'],
  search:['搜索型号','Search model'], clearSearch:['清除搜索','Clear search'], sort:['排序','Sort by'], default:['默认排序','Default'], low:['价格从低到高','Price: low to high'], high:['价格从高到低','Price: high to low'],
  products:['款产品','collections'], caseSize:['表壳直径','Case size'], price:['价格','Price'], color:['颜色','Colors'], from:['起','From'], unknown:['未提供','Not provided'], notLabeled:['未标注','Unspecified'],
  favoriteAdd:['收藏产品','Save to favorites'], favoriteRemove:['取消收藏','Remove from favorites'], back:['返回产品','Back to collections'],
  sku:['子型号','Model version'], main:['主图','Main image'], variant:['配色','Colorway'], packaging:['包装','Packaging'], overview:['总体图片','Overview'], gallery:['其他图片','Other images'], images:['产品图片','Product images'],
  description:['产品说明','Product details'], specs:['产品参数','Specifications'], movement:['机芯','Movement'], thickness:['厚度','Thickness'], strapWidth:['表带宽度','Strap width'], strapLength:['表带长度','Strap length'], water:['防水','Water resistance'],
  chooseColor:['配色','Colorway'], defaultColor:['主图款 / 默认配色','Main image / default version'], caseColor:['表壳 / 配色','Case / color'], dial:['表盘','Dial'], strap:['表带','Strap'],
  quantity:['数量','Quantity'], add:['加入购物车','Add to cart'], added:['已加入购物车','Added to cart'], viewCart:['查看购物车','View cart'], listPrice:['吊牌价 · CNY','List price · CNY'],
  noImage:['图片待补充','Image unavailable'], noSpecs:['参数待补充','Specifications unavailable'], prevImage:['上一张图片','Previous image'], nextImage:['下一张图片','Next image'], zoom:['查看大图','View full image'], close:['关闭','Close'],
  noMatch:['没有符合条件的产品','No matching products'], noFavorites:['暂无收藏','No favorites yet'], noCart:['购物车为空','Your cart is empty'], noInquiry:['询价单为空','Your inquiry sheet is empty'],
  continue:['继续选购','Browse collections'], reset:['重置筛选','Reset filters'], summary:['商品汇总','Summary'], totalQty:['总数量','Total quantity'], total:['合计','Total'], priceTotal:['吊牌价合计','List-price total'],
  unitPrice:['单价','Unit price'], subtotal:['小计','Subtotal'], remove:['移除商品','Remove item'], decrease:['减少数量','Decrease quantity'], increase:['增加数量','Increase quantity'],
  makeInquiry:['生成询价单','Create inquiry sheet'], print:['打印询价单','Print inquiry sheet'], export:['导出询价单','Export inquiry sheet'], exported:['已导出图片询价单','Image inquiry sheet exported'],
  contact:['询价信息','Inquiry details'], company:['公司','Company'], name:['联系人','Contact name'], email:['邮箱','Email'], phone:['电话','Phone'], notes:['备注','Notes'], date:['日期','Date'], reference:['人民币吊牌价，仅供询价参考','CNY list prices; for inquiry reference'],
  inquiryItem:['产品 / 配色','Product / colorway'], editCart:['返回购物车','Back to cart'], english:['English','English'], chinese:['中文','中文'], notFound:['产品不存在','Product not found'],
  missingConfig:['请先选择配色','Select a colorway'], imageOf:['产品图片','Product image'], language:['语言','Language'],
  priceOnRequest:['待询价','On request'], pendingPrice:['有产品价格待询，合计仅包含已知吊牌价','Some prices are pending; the total includes known list prices only'], outOfStock:['原目录标注：无货','Source status: out of stock'],
};
const models = CATALOG.models;
const modelById = new Map(models.map(m => [m.id,m]));
const productBySku = new Map(models.flatMap(m=>m.products.map(p=>[p.id,p])));
const storageKey = 'hanboro.collections.v1';
function readStorage() { try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { return {}; } }
const stored = readStorage();
let lang = stored.lang === 'en' ? 'en' : 'zh';
let favorites = new Set(Array.isArray(stored.favorites) ? stored.favorites.filter(id=>modelById.has(id)) : []);
const contactFields = ['company','name','email','phone','notes'];
let contact = Object.fromEntries(contactFields.map(key=>[key, typeof stored.contact?.[key] === 'string' ? stored.contact[key].slice(0,key==='notes'?2000:180) : '']));
const clamp = n => Math.min(999,Math.max(1,Math.floor(Number(n)||1)));
let cart = normalizeCartEntries(stored.cart,models.flatMap(model=>model.products));
const state = { category:'all',sort:'default',search:'',detail:null,cartPage:1,inquiryPage:1 };
const content = document.getElementById('content');
const footer = document.getElementById('footer');
const lightbox = document.getElementById('lightbox');
let toastTimer;
let swipeStart=null;
let renderedPage=null;
let catalogPosition=history.state?.hanboroCatalog || null;
let resetCatalogRequested=false;
let scrollFrame;
try { history.scrollRestoration='manual'; } catch {}

function rememberCatalog(card=null,persist=false) {
  if(renderedPage!=='catalog')return;
  catalogPosition={category:state.category,sort:state.sort,search:state.search,y:window.scrollY,anchor:card?.dataset.model || null,offset:card?.getBoundingClientRect().top || 0};
  if(persist)try{history.replaceState({...history.state,hanboroCatalog:catalogPosition},'');}catch{}
}
function updateScrollControls() {
  const button=document.querySelector('.back-to-top');
  button.hidden=renderedPage!=='catalog' || window.scrollY<300;
}
function navigateRoute() {
  const page=route().page;
  const position=resetCatalogRequested?null:history.state?.hanboroCatalog || catalogPosition;
  resetCatalogRequested=false;
  if(page==='catalog') {
    state.category=position?.category || 'all';
    state.sort=position?.sort || 'default';
    state.search=position?.search || '';
  }
  render();
  if(page==='product' && catalogPosition)try{history.replaceState({...history.state,hanboroCatalog:catalogPosition},'');}catch{}
  if(scrollFrame)cancelAnimationFrame(scrollFrame);
  content.focus({preventScroll:true});
  // Restore against the card, so viewport changes do not lose the product.
  scrollFrame=requestAnimationFrame(()=>{
    let top=page==='catalog'?(Number(position?.y)||0):0;
    if(page==='catalog' && position?.anchor) {
      const card=[...document.querySelectorAll('.product-card')].find(card=>card.dataset.model===position.anchor);
      if(card)top=window.scrollY+card.getBoundingClientRect().top-(Number(position.offset)||0);
    }
    window.scrollTo({top:Math.max(0,top),left:0,behavior:'instant'});
    if(page==='catalog')rememberCatalog(null,true);
    updateScrollControls();
  });
}
function catalogHome() {
  state.category='all';state.sort='default';state.search='';
  catalogPosition=null;resetCatalogRequested=true;
  if(route().page==='catalog')navigateRoute();
  else location.hash='/catalog';
}

function fitCardText() {
  document.querySelectorAll('.card-copy h2,.card-price').forEach(element=>{
    element.style.fontSize='';element.style.whiteSpace='';element.style.overflowWrap='';
    let size=parseFloat(getComputedStyle(element).fontSize);
    while(element.scrollWidth>element.clientWidth && size>8){size-=.5;element.style.fontSize=size+'px';}
    if(element.scrollWidth>element.clientWidth){element.style.whiteSpace='normal';element.style.overflowWrap='anywhere';}
  });
}

function t(key) { return (TEXT[key] || [key,key])[lang==='en'?1:0]; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function icon(name) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[name] || []).map(([tag,attrs])=>'<'+tag+' '+Object.entries(attrs).map(([k,v])=>esc(k)+'="'+esc(v)+'"').join(' ')+' />').join('')+'</svg>'; }
function amount(price) { return price === null || price === undefined ? t('priceOnRequest') : '¥'+Number(price).toLocaleString(lang==='zh'?'zh-CN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function save() { try { localStorage.setItem(storageKey,JSON.stringify({lang,favorites:[...favorites],cart,contact})); } catch {} }
function toast(message) { const target=document.getElementById('toast'); clearTimeout(toastTimer); target.textContent=message;target.classList.add('visible');toastTimer=setTimeout(()=>target.classList.remove('visible'),2400); }
function totalQuantity() { return cart.reduce((n,e)=>n+e.quantity,0); }
function totalPrice() { const known=cart.filter(e=>productBySku.get(e.productId||e.sku)?.specs.priceCny!==null);return known.length?known.reduce((n,e)=>n+productBySku.get(e.productId||e.sku).specs.priceCny*e.quantity,0):null; }
function lineSubtotal(entry,product) { return product.specs.priceCny===null?null:entry.quantity*product.specs.priceCny; }
function imgSrc(image,thumb=false) { return (thumb ? image?.thumb : image?.url) || ''; }
function imageMarkup(image,{className='',thumb=false,lazy=true,alt=''}={}) { return image ? '<img class="'+esc(className)+'" src="'+esc(imgSrc(image,thumb))+'" alt="'+esc(alt || image.fileName)+'" title="'+esc(image.remark || image.fileName)+'" loading="'+(lazy?'lazy':'eager')+'" decoding="async" draggable="false">' : '<div class="empty-image '+esc(className)+'">'+icon('ImageOff')+'<span>'+t('noImage')+'</span></div>'; }
function attrLabel(raw) {
  if (!raw) return t('notLabeled');
  if (lang === 'zh') return raw;
  const words = { '玫瑰金':'Rose gold', '咖啡色':'Coffee', '咖啡':'Coffee', '浅蓝':'Light blue', '深蓝':'Dark blue', '银色':'Silver', '蓝钻':'Blue stones', '皮带':'leather strap', '胶带':'rubber strap', '钢带':'steel bracelet', '纲带':'strap (纲带)', '壳':'case', '面':'dial', '带':'strap', '银':'Silver', '白':'White', '黑':'Black', '蓝':'Blue', '绿':'Green', '棕':'Brown', '粉':'Pink', '红':'Red', '金':'Gold', '彩':'Multicolor', '砖':'砖', '石':'stone' };
  const pattern = /玫瑰金|咖啡色|咖啡|浅蓝|深蓝|银色|蓝钻|皮带|胶带|钢带|纲带|壳|面|带|银|白|黑|蓝|绿|棕|粉|红|金|彩|砖|石/g;
  return raw.replace(pattern,token=>words[token]+' ').trim();
}
function colorHex(raw='') { if(/玫瑰金/.test(raw))return '#c79583';if(/浅蓝/.test(raw))return '#8bcbd3';if(/蓝/.test(raw))return '#346882';if(/绿/.test(raw))return '#537154';if(/棕|咖啡/.test(raw))return '#947044';if(/粉/.test(raw))return '#d5a3b3';if(/红/.test(raw))return '#ae4848';if(/黑/.test(raw))return '#2a2c2c';if(/白/.test(raw))return '#fafafa';if(/银/.test(raw))return '#b9bec1';if(/彩/.test(raw))return '#777da1';return '#d7dbd8'; }
function variantLabel(variant) { return variant ? variant.raw.split('_').map(attrLabel).join(' · ') : t('defaultColor'); }
function currentProduct() { return productBySku.get(state.detail?.productId || state.detail?.sku); }
function currentVariant() { return currentProduct()?.variants.find(v=>v.id===state.detail?.variantId) || null; }
function galleryItems(product=currentProduct()) { return productGallery(product); }
function currentImage() { return galleryItems().find(i=>i.id===state.detail?.imageId) || null; }
function filteredGallery() { return galleryItems().filter(i=>state.detail.galleryFilter==='all'||i.role===state.detail.galleryFilter); }
function productLink(model,sku=null,variantId=null,imageId=null) { const params=new URLSearchParams(); if(sku)params.set('sku',sku);if(variantId)params.set('variant',variantId);if(imageId)params.set('image',imageId);return '#/product/'+encodeURIComponent(model)+(params.size?'?'+params.toString():''); }
function route() {
  try { const url = new URL((location.hash.slice(1)||'/catalog'),'https://hanboro.local'); const parts=url.pathname.split('/').filter(Boolean);return {page:parts[0]||'catalog',model:decodeURIComponent(parts[1]||''),sku:url.searchParams.get('sku'),variantId:url.searchParams.get('variant'),imageId:url.searchParams.get('image')}; } catch { return {page:'catalog'}; }
}
function navigation(page) {
  const entries=[['favorites','Heart',favorites.size],['cart','ShoppingBag',totalQuantity()],['inquiry','FileText',totalQuantity()]];
  document.getElementById('navigation').innerHTML = entries.map(([name,ic,count])=>'<a class="nav-link '+(page===name?'active':'')+'" href="#/'+name+'" aria-label="'+esc(t(name))+(count?' ('+count+')':'')+'" title="'+esc(t(name))+'" '+(page===name?'aria-current="page"':'')+'>'+icon(ic)+'<span class="nav-label">'+t(name)+'</span>'+(count?'<span class="count">'+count+'</span>':'')+'</a>').join('');
}
function renderFooter() { footer.className='footer';footer.innerHTML='<span>© HANBORO</span><div class="language-switch" role="group" aria-label="'+esc(t('language'))+'"><button type="button" data-action="language" data-lang="zh" aria-pressed="'+(lang==='zh')+'">中文</button><button type="button" data-action="language" data-lang="en" aria-pressed="'+(lang==='en')+'">English</button></div>'; }
function favoriteButton(model,isCard=false) { const active=favorites.has(model);return '<button type="button" class="icon-btn '+(isCard?'favorite-card':'favorite-toggle')+(active?' is-favorite':'')+'" data-action="favorite" data-model="'+esc(model)+'" aria-pressed="'+active+'" aria-label="'+esc(t(active?'favoriteRemove':'favoriteAdd'))+'" title="'+esc(t(active?'favoriteRemove':'favoriteAdd'))+'">'+icon('Heart')+'</button>'; }
function colorSwatches(model) { const values=[...new Set(model.products.flatMap(p=>p.variants.map(v=>v.attributes.dial || v.attributes.strap || v.attributes.caseColor || v.attributes.color).filter(Boolean)))];return values.length ? values.slice(0,7).map(value=>'<span class="swatch" style="background:'+colorHex(value)+'" role="img" aria-label="'+esc(attrLabel(value))+'" title="'+esc(attrLabel(value))+'"></span>').join('')+(values.length>7?'<span class="muted">+'+(values.length-7)+'</span>':'') : '<span class="muted">'+t('unknown')+'</span>'; }
function card(model,index) { const product=model.products.find(p=>p.sku===model.defaultSku);const prices=new Set(model.products.map(p=>p.specs.priceCny).filter(p=>p!==null));return '<article class="product-card" data-model="'+esc(model.id)+'">'+favoriteButton(model.id,true)+'<a class="card-main" href="'+productLink(model.id)+'" aria-label="'+esc(model.title)+'"><div class="card-copy"><h2>'+esc(model.title)+'</h2><p class="card-price">'+(prices.size>1&&lang==='en'?'<span class="from">'+t('from')+'</span>':'')+amount(model.priceFromCny)+(prices.size>1&&lang==='zh'?' <span class="from">'+t('from')+'</span>':'')+'</p>'+(model.kind==='packaging'?'':'<p class="card-spec">'+t('caseSize')+'<strong>'+esc(product?.specs.caseSize || t('unknown'))+'</strong></p><div class="card-colors"><span class="card-color-label">'+t('color')+'</span>'+colorSwatches(model)+'</div>')+'</div>'+imageMarkup(model.images.main,{className:'card-img',lazy:index>2,alt:model.title})+'</a></article>'; }
function filteredModels(favoritesOnly=false) { let items=models.filter(m=>(!favoritesOnly || favorites.has(m.id)) && (state.category==='all'||m.gender===state.category||m.shape===state.category||m.series===state.category||m.category===state.category) && (!state.search||[m.model,m.title,...m.products.map(p=>p.sku)].some(s=>s.toLowerCase().includes(state.search.toLowerCase().trim()))));if(state.sort!=='default')items.sort((a,b)=>a.priceFromCny===null?(b.priceFromCny===null?0:1):b.priceFromCny===null?-1:(state.sort==='low'?1:-1)*(a.priceFromCny-b.priceFromCny));return items; }
function empty(title,ic='Search',reset=false) { return '<div class="empty">'+icon(ic)+'<h2>'+t(title)+'</h2>'+(reset?'<button type="button" class="secondary" data-action="reset">'+t('reset')+'</button>':'<a class="secondary" href="#/catalog">'+t('continue')+'</a>')+'</div>'; }
function renderGrid(favoritesOnly=false) { const items=filteredModels(favoritesOnly); const target=document.getElementById('product-results');if(target) target.innerHTML=items.length?'<div class="product-grid">'+items.map(card).join('')+'</div>':empty(favoritesOnly&&!favorites.size?'noFavorites':'noMatch',favoritesOnly?'Heart':'Search',!favoritesOnly||favorites.size>0);const count=document.getElementById('product-count');if(count)count.textContent=items.length+' '+t('products');fitCardText(); }
function renderCatalog(favoritesOnly=false) {
  content.innerHTML='<div class="catalog-top"><div><h1>'+(favoritesOnly?t('favorites'):'Hanboro collections')+'</h1><p id="product-count" class="page-count"></p></div><div class="search">'+icon('Search')+'<input type="search" id="search-input" aria-label="'+esc(t('search'))+'" placeholder="'+esc(t('search'))+'" value="'+esc(state.search)+'"><button type="button" class="icon-btn" data-action="clear-search" aria-label="'+esc(t('clearSearch'))+'" title="'+esc(t('clearSearch'))+'">'+icon('X')+'</button></div></div><div class="toolbar"><div class="tabs" role="group" aria-label="'+t('catalog')+'">'+['all','tonneau','men','women','women-square','women-round','round','slim','packaging'].map(key=>'<button class="tab" type="button" data-action="category" data-category="'+key+'" aria-pressed="'+(state.category===key)+'">'+t(key)+'</button>').join('')+'</div><label class="sort">'+t('sort')+'<select id="sort-select" aria-label="'+t('sort')+'">'+['default','low','high'].map(key=>'<option value="'+key+'" '+(state.sort===key?'selected':'')+'>'+t(key)+'</option>').join('')+'</select></label></div><div id="product-results"></div>';
  renderGrid(favoritesOnly);
}
function describe(product) {
  const specKeys=product.kind==='packaging'?[]:[['caseSize','caseSize'],['thickness','thickness'],['strapWidth','strapWidth'],['strapLength','strapLength'],['waterResistance','water']];
  const movement=lang==='zh'?product.specs.movement:product.specs.movement?.includes('石英')?'Quartz movement':product.specs.movement?'Mechanical movement'+(product.specs.movement.match(/8205|JHS08/) ? ' · '+product.specs.movement.match(/8205|JHS08/)[0]:''):null;
  const bullets=product.description[lang] || [];
  return '<section class="description"><h2>'+t('description')+'</h2>'+(bullets.length?'<ul>'+bullets.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':'<p class="muted">'+t('noSpecs')+'</p>')+(product.kind==='packaging'?'':'<dl class="spec-table"><div><dt>'+t('movement')+'</dt><dd>'+esc(movement || t('unknown'))+'</dd></div>'+specKeys.map(([key,label])=>'<div><dt>'+t(label)+'</dt><dd>'+esc(product.specs[key] || t('unknown'))+'</dd></div>').join('')+'</dl>')+'</section>';
}
function selectMarkup(id,label,options,value) { return '<div class="field"><label for="'+id+'">'+esc(label)+'</label><select id="'+id+'">'+options.map(([key,text])=>'<option value="'+esc(key)+'" '+(key===value?'selected':'')+'>'+esc(text)+'</option>').join('')+'</select></div>'; }
function quantityMarkup(value,key=null) { return '<div class="quantity"><button class="icon-btn" type="button" data-action="decrease" '+(key!==null?'data-index="'+key+'"':'')+' aria-label="'+esc(t('decrease'))+'" title="'+esc(t('decrease'))+'" '+(value<=1?'disabled':'')+'>'+icon('Minus')+'</button><input type="number" inputmode="numeric" min="1" max="999" step="1" value="'+value+'" aria-label="'+esc(t('quantity'))+'" '+(key!==null?'data-cart-quantity="'+key+'"':'id="detail-quantity"')+'><button class="icon-btn" type="button" data-action="increase" '+(key!==null?'data-index="'+key+'"':'')+' aria-label="'+esc(t('increase'))+'" title="'+esc(t('increase'))+'" '+(value>=999?'disabled':'')+'>'+icon('Plus')+'</button></div>'; }
function purchaseMarkup(product,model) {
  const variant=currentVariant();
  const choices=product.variants.length?selectMarkup('variant-select',t('chooseColor'),product.variants.map(v=>[v.id,variantLabel(v)]),variant?.id || product.variants[0].id):'';
  const selected=variant?'<p class="selected-color"><span class="swatch" style="background:'+colorHex(variant.attributes.dial||variant.attributes.strap||variant.attributes.caseColor||variant.attributes.color)+'"></span><span class="selected-description">'+esc(variantLabel(variant))+'</span></p>':'';
  const ready=Boolean(currentImage()&&(!product.variants.length||variant));
  return '<div class="detail-title"><h1>'+esc(model.title)+'</h1>'+favoriteButton(model.id)+'</div><p class="detail-price">'+amount(product.specs.priceCny)+'</p><p class="price-basis">'+(product.specs.priceCny===null?t('priceOnRequest'):t('listPrice'))+'</p><div class="quick-specs"><div><span>SKU</span>'+esc(product.sku)+'</div>'+(product.kind==='packaging'?'':'<div><span>'+t('caseSize')+'</span>'+esc(product.specs.caseSize || t('unknown'))+'</div>')+'</div>'+(model.products.length>1?'<div class="field"><p class="field-label">'+t('sku')+'</p><div class="sku-options" role="radiogroup" aria-label="'+t('sku')+'">'+model.products.map(p=>'<label class="sku-radio"><input type="radio" name="sku" value="'+esc(p.id)+'" '+(product.id===p.id?'checked':'')+'><span>'+esc(p.sku)+'</span></label>').join('')+'</div></div>':'')+choices+selected+(!ready?'<p class="pending-price">'+t('noColorPhotos')+'</p>':'')+'<div class="field"><p class="field-label">'+t('quantity')+'</p>'+quantityMarkup(state.detail.quantity)+'</div><button type="button" class="primary add-cart" data-action="add-cart" '+(!ready?'disabled':'')+'>'+icon('ShoppingBag')+t('add')+'</button><a class="view-cart" href="#/cart">'+t('viewCart')+' ('+totalQuantity()+')</a><div class="mobile-description">'+describe(product)+'</div>';
}
function thumbLabel(image) { return image.role==='variant' ? attrLabel(image.attributes?.dial || image.attributes?.strap || image.raw) : t(image.role); }
function renderGallery() { const image=currentImage();const items=galleryItems();const visible=filteredGallery();document.getElementById('image-stage').innerHTML=imageMarkup(image,{lazy:false,alt:image?thumbLabel(image):t('noImage')})+(items.length>1?'<div class="stage-controls"><button type="button" class="icon-btn" data-action="prev-image" aria-label="'+t('prevImage')+'" title="'+t('prevImage')+'">'+icon('ChevronLeft')+'</button><button type="button" class="icon-btn" data-action="next-image" aria-label="'+t('nextImage')+'" title="'+t('nextImage')+'">'+icon('ChevronRight')+'</button><button type="button" class="icon-btn" data-action="zoom" aria-label="'+t('zoom')+'" title="'+t('zoom')+'">'+icon('Maximize2')+'</button></div>':items.length?'<div class="stage-controls"><button type="button" class="icon-btn" data-action="zoom" aria-label="'+t('zoom')+'" title="'+t('zoom')+'">'+icon('Maximize2')+'</button></div>':'');const thumbnails=document.getElementById('gallery-thumbs');if(thumbnails)thumbnails.innerHTML=visible.map(item=>{const count=cartImageQuantity(cart,currentProduct().id,item.id);return '<button type="button" class="thumb" data-action="thumbnail" data-image="'+esc(item.id)+'" aria-pressed="'+(image?.id===item.id)+'" title="'+esc(item.role==='variant'?attrLabel(item.raw):item.fileName)+'" aria-label="'+esc(thumbLabel(item)+' · '+t('inCart')+' '+count)+'">'+imageMarkup(item,{thumb:true,lazy:false,alt:thumbLabel(item)})+'<span class="thumb-count '+(count?'has-quantity':'')+'">'+count+'</span></button>';}).join(''); }
function renderDetail(r) {
  const model=modelById.get(r.model);
  if(!model) {content.innerHTML=empty('notFound','ImageOff');return;}
  const product=model.products.find(p=>p.sku===r.sku) || model.products.find(p=>p.sku===model.defaultSku) || model.products[0];
  if(!product) {content.innerHTML=empty('notFound','ImageOff');return;}
  if(!state.detail || state.detail.model!==model.id || state.detail.sku!==product.sku || state.detail.routeHash!==location.hash) {
    const requestedVariant=product.legacyVariantIds?.[r.variantId]||r.variantId;const variant=product.variants.find(v=>v.id===requestedVariant)||product.variants[0];
    const selection=purchaseSelection(product,variant?.id||null,r.imageId);
    state.detail={model:model.id,productId:product.id,routeHash:location.hash,sku:product.sku,variantId:selection?.variant?.id||null,imageId:selection?.image.id||null,galleryFilter:'all',quantity:state.detail?.model===model.id?state.detail.quantity:1};
  } else if(r.variantId && state.detail.variantId!==r.variantId) {const requestedVariant=product.legacyVariantIds?.[r.variantId]||r.variantId;const variant=product.variants.find(v=>v.id===requestedVariant);if(variant){state.detail.variantId=variant.id;state.detail.imageId=variant.image.id;}}
  const roles=['all','main','variant','overview','gallery'].filter(role=>role==='all'||galleryItems().some(i=>i.role===role));
  content.innerHTML='<a class="back" href="#/catalog">'+icon('ArrowLeft')+t('back')+'</a><div class="detail"><div class="detail-visual"><div class="image-stage" id="image-stage"></div><div class="gallery-heading"><h3>'+t('images')+'</h3><span class="muted">'+galleryItems().length+'</span></div><div class="tabs gallery-tabs" role="group" aria-label="'+t('images')+'">'+roles.map(role=>'<button class="tab" type="button" data-action="gallery-filter" data-role="'+role+'" aria-pressed="'+(state.detail.galleryFilter===role)+'">'+t(role)+'</button>').join('')+'</div><div class="thumbs" id="gallery-thumbs"></div>'+describe(product)+'</div><section class="detail-info" id="purchase">'+purchaseMarkup(product,model)+'</section></div>';
  if(!product.variants.length)document.querySelectorAll('.gallery-heading,.gallery-tabs,#gallery-thumbs').forEach(element=>element.remove());
  renderGallery();
}
function updatePurchase() { const product=currentProduct();document.getElementById('purchase').innerHTML=purchaseMarkup(product,modelById.get(product.modelId)); }
function selectGalleryImage(item,resetFilter=false) {
  if(!item)return;
  if(item.variantId)state.detail.variantId=item.variantId;
  else if(item.role==='main')state.detail.variantId=null;
  state.detail.imageId=item.id;
  if(resetFilter)state.detail.galleryFilter='all';
  try{history.replaceState(history.state,'',productLink(currentProduct().modelId,currentProduct().sku,state.detail.variantId,state.detail.imageId));}catch{}
  state.detail.routeHash=location.hash;
  updatePurchase();renderGallery();
  document.querySelectorAll('[data-action="gallery-filter"]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.role===state.detail.galleryFilter));
  if(lightbox.open)renderLightbox();
}
function chooseVariant(id) {const product=currentProduct();const v=product.variants.find(v=>v.id===id);if(v)selectGalleryImage({...v.image,variantId:v.id},true);}
function stepImage(direction) {const items=filteredGallery();if(!items.length)return;const index=items.findIndex(i=>i.id===state.detail.imageId);const next=index<0?(direction>0?0:items.length-1):(index+direction+items.length)%items.length;selectGalleryImage(items[next]);}
function renderLightbox() {const image=currentImage();if(!image)return;lightbox.innerHTML='<div class="lightbox-heading"><span>'+esc(image.role==='variant'?attrLabel(image.raw):t(image.role))+'</span><button type="button" class="icon-btn" data-action="close-lightbox" aria-label="'+t('close')+'" title="'+t('close')+'">'+icon('X')+'</button></div>'+imageMarkup(image,{className:'lightbox-image',lazy:false})+'<div class="lightbox-bottom"><button type="button" class="icon-btn" data-action="prev-image" aria-label="'+t('prevImage')+'" title="'+t('prevImage')+'">'+icon('ChevronLeft')+'</button><span>'+(galleryItems().findIndex(i=>i.id===image.id)+1)+' / '+galleryItems().length+'</span><button type="button" class="icon-btn" data-action="next-image" aria-label="'+t('nextImage')+'" title="'+t('nextImage')+'">'+icon('ChevronRight')+'</button></div>';}
function resolveEntry(entry) {return purchaseSelection(productBySku.get(entry.productId),entry.variantId,entry.imageId,true);}
function productTitle(product) {return modelById.get(product.modelId)?.title || 'HB-'+product.model;}
function entryLabel(entry) {const selection=resolveEntry(entry);return selection.product.kind==='packaging'?selection.product.model:variantLabel(selection.variant);}
function summaryMarkup(inquiry=false) {return '<aside class="summary"><h2>'+t('summary')+'</h2><p class="summary-row"><span>'+t('totalQty')+'</span><span>'+totalQuantity()+'</span></p><p class="summary-row summary-total"><span>'+t('priceTotal')+'</span><strong>'+amount(totalPrice())+'</strong></p>'+(inquiry?'':'<a class="primary" href="#/inquiry">'+icon('FileText')+t('makeInquiry')+'</a>')+'<p class="muted">'+t('reference')+'</p>'+(cart.some(e=>resolveEntry(e).product.specs.priceCny===null)?'<p class="pending-price">'+t('pendingPrice')+'</p>':'')+'</aside>';}
function paginationMarkup(view,key) {
  if(view.pages<=1)return '<nav class="pagination" aria-label="'+t('page')+'"><span>1 / 1</span></nav>';
  const pages=[...new Set([1,...Array.from({length:5},(_,index)=>view.page+index-2).filter(page=>page>1&&page<view.pages),view.pages])].sort((a,b)=>a-b);
  const command=(page,label,body,disabled=false)=>'<button type="button" class="icon-btn page-button" data-action="paginate" data-list="'+key+'" data-page="'+page+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" '+(page===view.page?'aria-current="page" ':'')+(disabled?'disabled':'')+'>'+body+'</button>';
  return '<nav class="pagination" aria-label="'+t('page')+'">'+command(view.page-1,t('previousPage'),icon('ChevronLeft'),view.page===1)+pages.map((page,index)=>(index&&page>pages[index-1]+1?'<span aria-hidden="true">...</span>':'')+command(page,t('page')+' '+page,page)).join('')+command(view.page+1,t('nextPage'),icon('ChevronRight'),view.page===view.pages)+'<span class="page-status">'+view.page+' / '+view.pages+'</span></nav>';
}
function renderCart() {
  const view=paginateEntries(cart,state.cartPage);state.cartPage=view.page;
  content.innerHTML='<div class="page-heading"><h1>'+t('cart')+'</h1><a class="back" href="#/catalog" style="margin:0">'+icon('ArrowLeft')+t('continue')+'</a></div>'+(cart.length?'<div class="cart-layout"><div><div class="line-list">'+view.items.map(({entry,index})=>{
    const {product:p,variant:v,image}=resolveEntry(entry);const href=productLink(p.modelId,p.sku,v?.id,image.id);
    return '<article class="line-item" data-line-index="'+index+'"><a href="'+href+'">'+imageMarkup(image,{className:'line-image',thumb:true,lazy:false,alt:productTitle(p)+' '+entryLabel(entry)})+'</a><div class="line-description"><h2><a href="'+href+'">'+esc(productTitle(p))+'</a></h2><p>SKU '+esc(p.sku)+'</p><p>'+esc(entryLabel(entry))+'</p><p class="unit-price">'+amount(p.specs.priceCny)+'</p></div><div class="line-actions">'+quantityMarkup(entry.quantity,index)+'<p class="line-total">'+amount(lineSubtotal(entry,p))+'</p><button type="button" class="icon-btn" data-action="remove-item" data-index="'+index+'" aria-label="'+t('remove')+'" title="'+t('remove')+'">'+icon('Trash2')+'</button></div></article>';
  }).join('')+'</div>'+paginationMarkup(view,'cart')+'</div>'+summaryMarkup()+'</div>':empty('noCart','ShoppingBag'));
}
function renderInquiry() {
  const view=paginateEntries(cart,state.inquiryPage);state.inquiryPage=view.page;
  content.innerHTML='<div class="page-heading"><div><h1>'+t('inquiry')+'</h1><p class="page-count">HANBORO · '+new Date().toLocaleDateString(lang==='zh'?'zh-CN':'en-GB')+'</p></div>'+(cart.length?'<div class="inquiry-actions"><button type="button" class="secondary" data-action="print">'+icon('Printer')+t('print')+'</button><button type="button" class="secondary" data-action="export">'+icon('Download')+t('export')+'</button></div>':'')+'</div>'+(cart.length?'<div class="inquiry-layout"><div class="inquiry-list"><div class="inquiry-table-wrap"><table class="inquiry-table"><thead><tr><th scope="col">'+t('inquiryItem')+'</th><th scope="col">'+t('unitPrice')+'</th><th scope="col">'+t('quantity')+'</th><th scope="col">'+t('subtotal')+'</th><th scope="col">'+t('notes')+'</th></tr></thead><tbody>'+view.items.map(({entry,index})=>{
    const {product:p,variant:v,image}=resolveEntry(entry);
    return '<tr data-line-index="'+index+'"><td><a class="inquiry-product" href="'+productLink(p.modelId,p.sku,v?.id,image.id)+'">'+imageMarkup(image,{thumb:true,lazy:false,alt:productTitle(p)+' '+entryLabel(entry)})+'<div><strong>'+esc(productTitle(p))+'</strong><small>'+esc(p.sku)+'<br>'+esc(entryLabel(entry))+'</small></div></a></td><td>'+amount(p.specs.priceCny)+'</td><td>'+quantityMarkup(entry.quantity,index)+'</td><td>'+amount(lineSubtotal(entry,p))+'<button type="button" class="icon-btn" data-action="remove-item" data-index="'+index+'" aria-label="'+t('remove')+'" title="'+t('remove')+'">'+icon('Trash2')+'</button></td><td><textarea class="item-notes" data-line-note="'+index+'" maxlength="60" aria-label="'+esc(t('itemNotes')+' '+p.sku)+'">'+esc(entry.notes)+'</textarea></td></tr>';
  }).join('')+'</tbody></table></div>'+paginationMarkup(view,'inquiry')+'<a class="back" href="#/cart" style="margin:20px 0 0">'+icon('ArrowLeft')+t('editCart')+'</a></div><aside class="inquiry-info"><h2>'+t('contact')+'</h2><form class="contact-form" onsubmit="return false">'+contactFields.map(key=>'<div class="form-field"><label for="contact-'+key+'">'+t(key)+'</label>'+(key==='notes'?'<textarea id="contact-notes" data-contact="notes" maxlength="2000">'+esc(contact.notes)+'</textarea>':'<input id="contact-'+key+'" data-contact="'+key+'" type="'+(key==='email'?'email':key==='phone'?'tel':'text')+'" maxlength="180" value="'+esc(contact[key])+'" autocomplete="'+({company:'organization',name:'name',email:'email',phone:'tel'}[key])+'">')+'</div>').join('')+'</form>'+summaryMarkup(true)+'</aside></div>':empty('noInquiry','FileText'));
  renderPrintRoot();
  document.querySelectorAll('.inquiry-table tbody tr').forEach(row=>{
    [null,'unitPrice','quantity','subtotal','notes'].forEach((key,index)=>{if(key)row.cells[index].dataset.label=t(key);});
  });
}
function render() {
  const r=route();
  renderedPage=r.page;
  content.classList.toggle('catalog-page',r.page==='catalog');
  const topButton=document.querySelector('.back-to-top');
  topButton.innerHTML=icon('ArrowUp');topButton.title=t('backToTop');topButton.setAttribute('aria-label',t('backToTop'));
  updateScrollControls();
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.querySelector('.skip-link').textContent=lang==='zh'?'跳至内容':'Skip to content';
  navigation(r.page);
  renderFooter();
  if(r.page==='product'){renderDetail(r);document.title=(modelById.get(r.model)?.title || t('notFound'))+' · Hanboro collections';}
  else if(r.page==='favorites'){renderCatalog(true);document.title=t('favorites')+' · Hanboro collections';}
  else if(r.page==='cart'){renderCart();document.title=t('cart')+' · Hanboro collections';}
  else if(r.page==='inquiry'){
    renderInquiry();
    document.title=t('inquiry')+' · Hanboro collections';
    document.querySelectorAll('.inquiry-table td:nth-child(2),.inquiry-table td:nth-child(4)').forEach(cell=>{
      let size=parseFloat(getComputedStyle(cell).fontSize);
      while(cell.scrollWidth>cell.clientWidth && size>9){size-=.5;cell.style.fontSize=size+'px';}
    });
  }
  else{renderCatalog();document.title='Hanboro collections';}
}
function updateCartQuantity(index,n) {if(!cart[index])return;cart[index].quantity=clamp(n);save();render();}
function addToCart() { const product=currentProduct();const v=currentVariant();const image=currentImage();if(!product||!image||product.outOfStock||product.variants.length&&!v)return;const item={productId:product.id,sku:product.sku,variantId:v?.id||null,imageId:image.id,quantity:clamp(state.detail.quantity),notes:''};const existing=cart.find(entry=>cartIdentity(entry)===cartIdentity(item));if(existing)existing.quantity=clamp(existing.quantity+item.quantity);else cart.push(item);save();navigation('product');updatePurchase();renderGallery();toast(t('added')); }

document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#/"]');
  if(link && event.button===0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)rememberCatalog(link.closest('.product-card'),true);
  const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
  if(action==='catalog-home'){if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();catalogHome();}
  else if(action==='back-to-top'){window.scrollTo({top:0,left:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  else if(action==='paginate'){state[button.dataset.list==='cart'?'cartPage':'inquiryPage']=Number(button.dataset.page);render();window.scrollTo({top:0,behavior:'instant'});content.focus({preventScroll:true});}
  else if(action==='favorite'){event.preventDefault();const id=button.dataset.model;if(favorites.has(id))favorites.delete(id);else favorites.add(id);save();if(route().page==='favorites')renderGrid(true);else document.querySelectorAll('[data-action="favorite"][data-model="'+id+'"]').forEach(btn=>{const active=favorites.has(id);btn.classList.toggle('is-favorite',active);btn.setAttribute('aria-pressed',active);btn.setAttribute('aria-label',t(active?'favoriteRemove':'favoriteAdd'));btn.title=t(active?'favoriteRemove':'favoriteAdd');});navigation(route().page);}
  else if(action==='language'){if(lang===button.dataset.lang)return;lang=button.dataset.lang;save();render();document.querySelector('[data-lang="'+lang+'"]').focus({preventScroll:true});}
  else if(action==='category'){state.category=button.dataset.category;document.querySelectorAll('[data-action="category"]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.category===state.category));renderGrid(route().page==='favorites');}
  else if(action==='clear-search'){state.search='';document.getElementById('search-input').value='';renderGrid(route().page==='favorites');document.getElementById('search-input').focus();}
  else if(action==='reset'){state.category='all';state.search='';render();}
  else if(action==='gallery-filter'){state.detail.galleryFilter=button.dataset.role;document.querySelectorAll('[data-action="gallery-filter"]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.role===state.detail.galleryFilter));renderGallery();}
  else if(action==='thumbnail')selectGalleryImage(galleryItems().find(i=>i.id===button.dataset.image));
  else if(action==='prev-image'||action==='next-image')stepImage(action==='prev-image'?-1:1);
  else if(action==='zoom'){renderLightbox();if(!lightbox.open)lightbox.showModal();}
  else if(action==='close-lightbox')lightbox.close();
  else if(action==='add-cart')addToCart();
  else if(action==='increase'||action==='decrease'){const delta=action==='increase'?1:-1;if(button.dataset.index!==undefined)updateCartQuantity(Number(button.dataset.index),cart[Number(button.dataset.index)]?.quantity+delta);else{state.detail.quantity=clamp(state.detail.quantity+delta);updatePurchase();}}
  else if(action==='remove-item'){cart.splice(Number(button.dataset.index),1);save();render();}
  else if(action==='print')window.print();
  else if(action==='export')exportInquiry();
});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='sort-select'){state.sort=target.value;renderGrid(route().page==='favorites');}
  else if(target.name==='sku'){const p=productBySku.get(target.value);location.hash=productLink(p.modelId,p.sku);}
  else if(target.id==='variant-select')chooseVariant(target.value);
  else if(target.id.startsWith('attribute-')){const key=target.id.slice(10);const p=currentProduct();const selected=currentVariant();const value=target.value;if(value==='__all'){chooseVariant('');return;}const attribute=v=>key==='caseColor'?(v.attributes.caseColor||v.attributes.color||''):v.attributes[key]||'';const candidates=p.variants.filter(v=>attribute(v)===value);candidates.sort((a,b)=>{const score=v=>Object.entries(selected?.attributes||{}).reduce((n,[k,val])=>n+(v.attributes[k]===val?1:0),0);return score(b)-score(a);});if(candidates[0])chooseVariant(candidates[0].id);}
  else if(target.id==='detail-quantity'){state.detail.quantity=clamp(target.value);updatePurchase();}
  else if(target.dataset.cartQuantity!==undefined)updateCartQuantity(Number(target.dataset.cartQuantity),target.value);
});
document.addEventListener('input',event=>{const target=event.target;if(target.id==='search-input'){state.search=target.value;renderGrid(route().page==='favorites');}else if(target.dataset.contact){contact[target.dataset.contact]=target.value;save();renderPrintRoot();}else if(target.dataset.lineNote!==undefined){const entry=cart[Number(target.dataset.lineNote)];if(entry){entry.notes=target.value.slice(0,60);save();renderPrintRoot();}}});
document.addEventListener('pointerdown',event=>{
  if(!event.isPrimary || event.button!==0 || !event.target.closest('#image-stage') || event.target.closest('button'))return;
  swipeStart={pointerId:event.pointerId,x:event.clientX,y:event.clientY,productId:state.detail?.productId};
});
document.addEventListener('pointerup',event=>{
  const start=swipeStart;swipeStart=null;
  if(!start || start.pointerId!==event.pointerId || start.productId!==state.detail?.productId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(Math.abs(dx)>=40 && Math.abs(dx)>Math.abs(dy)*1.3)stepImage(dx<0?1:-1);
});
document.addEventListener('pointercancel',()=>{swipeStart=null;});
lightbox.addEventListener('click',event=>{if(event.target!==lightbox)return;const r=lightbox.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)lightbox.close();});
document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement){const label=document.createElement('div');label.className='empty-image '+event.target.className;label.textContent=t('noImage');event.target.replaceWith(label);}},true);
window.addEventListener('scroll',()=>{if(route().page==='catalog')rememberCatalog();updateScrollControls();},{passive:true});
let textFitFrame;
window.addEventListener('resize',()=>{if(textFitFrame)cancelAnimationFrame(textFitFrame);textFitFrame=requestAnimationFrame(fitCardText);});
window.addEventListener('pagehide',()=>rememberCatalog(null,true));
window.addEventListener('hashchange',()=>{if(lightbox.open)lightbox.close();navigateRoute();});
navigateRoute();
