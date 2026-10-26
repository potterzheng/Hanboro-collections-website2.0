'use strict';

const INQUIRY_PRINT_CSS = `
@page{size:A4 portrait;margin:10mm}
#print-root{display:none}
.standalone-sheet #print-root{display:block}
.print-page{box-sizing:border-box;width:190mm;height:276mm;position:relative;break-after:page;page-break-after:always;color:#000;background:#fff;font:10.5pt/1.3 "SimSun","Noto Serif CJK SC",serif;letter-spacing:0;overflow:hidden}
.print-page:last-child{break-after:auto;page-break-after:auto}
.print-heading{height:17mm}
.print-heading h1{font:700 23pt/1.15 Arial,"Microsoft YaHei",sans-serif;margin:0 0 1mm}
.print-heading p{font:10.5pt/1.2 Arial,sans-serif;margin:0}
.print-table{border-collapse:collapse;table-layout:fixed;width:100%;color:#000}
.print-table th,.print-table td{border:.35mm solid #000;box-sizing:border-box}
.print-table th{height:8mm;text-align:center;background:#fbe5d6;font:13pt/1.1 "SimSun",serif;padding:1mm}
.print-table tbody tr{height:34mm;break-inside:avoid;page-break-inside:avoid}
.print-table td{vertical-align:middle;padding:1mm}
.print-table .print-image-cell{padding:.8mm .4mm;text-align:center}
.print-image{display:block;width:100%;height:31mm;object-fit:contain;max-width:none;margin:0 auto}
.print-product-cell{overflow-wrap:anywhere}
.print-description{height:31mm;display:flex;flex-direction:column;justify-content:center}
.print-model{display:block;font-weight:600;margin-bottom:3mm}
.print-sku,.print-color{display:block;margin:0;line-height:1.3}
.print-number{text-align:center;font:12pt/1.2 Arial,sans-serif;white-space:nowrap}
.print-notes{font-size:7.5pt;line-height:1.2;white-space:pre-wrap;overflow-wrap:anywhere}
.print-footer{position:absolute;bottom:0;left:0;right:0;font:8pt/1.3 Arial,"Microsoft YaHei",sans-serif;display:flex;justify-content:space-between;align-items:end;gap:4mm}
.print-contact-inline{font-size:7.5pt;max-width:165mm;overflow-wrap:anywhere}
.print-contact-page{height:auto;min-height:276mm;overflow:visible}
.print-contact-table{width:100%;border-collapse:collapse;font-size:10pt;line-height:1.5;table-layout:fixed}
.print-contact-table th,.print-contact-table td{border:.35mm solid #000;padding:3mm;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}
.print-contact-table th{width:30mm;text-align:left;background:#fbe5d6;font-weight:400}
.standalone-sheet{margin:0;color:#000;background:#fff}
@media screen{.standalone-sheet .print-page{margin:10mm auto}}
@media print{
 body.inquiry-print{margin:0!important;padding:0!important;background:#fff!important}
 body.inquiry-print> :not(#print-root){display:none!important}
 body.inquiry-print>#print-root{display:block!important}
 #print-root,#print-root *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .standalone-sheet .print-page{margin:0}
}
`;
const inquiryStyle = document.createElement('style');
inquiryStyle.textContent = INQUIRY_PRINT_CSS;
document.head.append(inquiryStyle);

function inquiryPages(embed = false) {
  if (!cart.length) return '';
  const date = new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB');
  const heading = '<header class="print-heading"><h1>'+t('inquiry')+'</h1><p>HANBORO·'+esc(date)+'</p></header>';
  const contactText = contactFields.filter(key=>contact[key]).map(key=>t(key)+': '+contact[key]).join(' / ');
  const contactAppendix = contactText.length > 80;
  const pageCount = Math.ceil(cart.length / 7);
  const pages = [];
  for (let page = 0; page < pageCount; page++) {
    const entries = cart.slice(page * 7, page * 7 + 7);
    const rows = entries.map(entry=>{
      const {product,image}=resolveEntry(entry);
      const src=embed?(MEDIA[image.url]||MEDIA[image.thumb]):(MEDIA[image.url]||image.url);
      if(embed&&!src)throw new Error('Inquiry image was not prepared');
      return '<tr data-product="'+esc(product.id)+'"><td class="print-image-cell"><img class="print-image" src="'+esc(src)+'" alt="'+esc(productTitle(product))+'" loading="eager"></td><td class="print-product-cell"><div class="print-description"><span class="print-model">'+esc(productTitle(product))+'</span><span class="print-sku">'+esc(product.sku)+'</span><span class="print-color">'+esc(entryLabel(entry))+'</span></div></td><td class="print-number">'+amount(product.specs.priceCny)+'</td><td class="print-number">'+entry.quantity+'</td><td class="print-number">'+amount(lineSubtotal(entry,product))+'</td><td class="print-notes">'+esc(entry.notes)+'</td></tr>';
    }).join('');
    const summary=page===pageCount-1?'<div>'+t('totalQty')+' '+totalQuantity()+' · '+t('priceTotal')+' '+amount(totalPrice())+(!contactAppendix&&contactText?'<div class="print-contact-inline">'+esc(contactText)+'</div>':'')+'</div>':'<span>HANBORO</span>';
    pages.push('<section class="print-page">'+heading+'<table class="print-table"><colgroup><col style="width:12%"><col style="width:17%"><col style="width:21%"><col style="width:17%"><col style="width:23%"><col style="width:10%"></colgroup><thead><tr><th colspan="2">'+t('inquiryItem')+'</th><th>'+t('unitPrice')+'</th><th>'+t('quantity')+'</th><th>'+t('subtotal')+'</th><th>'+t('notes')+'</th></tr></thead><tbody>'+rows+'</tbody></table><footer class="print-footer">'+summary+'<span>'+(page+1)+' / '+pageCount+'</span></footer></section>');
  }
  if(contactAppendix)pages.push('<section class="print-page print-contact-page">'+heading+'<table class="print-contact-table"><tbody>'+contactFields.filter(key=>contact[key]).map(key=>'<tr><th>'+t(key)+'</th><td>'+esc(contact[key])+'</td></tr>').join('')+'</tbody></table></section>');
  return pages.join('');
}

function renderPrintRoot(embed = false) {
  document.getElementById('print-root').innerHTML = inquiryPages(embed);
}

function fitInquiryRows() {
  document.querySelectorAll('.print-description').forEach(element=>{
    if(!element.clientHeight)return;
    let size=parseFloat(getComputedStyle(element).fontSize);
    while(element.scrollHeight>element.clientHeight+1 && size>9){size-=.25;element.style.fontSize=size+'px';}
  });
}

function inquiryHtml() {
  return '<!DOCTYPE html><html lang="'+(lang==='zh'?'zh-CN':'en')+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HANBORO '+t('inquiry')+'</title><style>'+INQUIRY_PRINT_CSS+'</style></head><body class="standalone-sheet"><div id="print-root">'+inquiryPages(true)+'</div><script>('+fitInquiryRows.toString()+')();window.addEventListener("beforeprint",'+fitInquiryRows.toString()+');<\/script></body></html>';
}

function exportInquiry() {
  if(!cart.length)return;
  const blob=new Blob([inquiryHtml()],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='Hanboro-inquiry-'+new Date().toISOString().slice(0,10)+'.html';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast(t('exported'));
}

async function printInquiry() {
  renderPrintRoot(true);
  await Promise.all([...document.querySelectorAll('#print-root img')].map(image=>image.decode()));
  await document.fonts.ready;
  document.body.classList.add('inquiry-print');
  window.print();
}

window.addEventListener('beforeprint',()=>{
  if(route().page==='inquiry'&&cart.length){renderPrintRoot();document.body.classList.add('inquiry-print');fitInquiryRows();}
});
window.addEventListener('afterprint',()=>document.body.classList.remove('inquiry-print'));
