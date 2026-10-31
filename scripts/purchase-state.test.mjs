import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/purchase-state.js',import.meta.url),'utf8')+'\nglobalThis.api={productGallery,purchaseSelection,normalizeCartEntries,cartIdentity,paginateEntries,cartImageQuantity};',context);
const api=context.api;
const main={id:'main',role:'main',url:'main.webp'};
const first={id:'front',role:'variant',url:'front.webp'};
const second={id:'angle',role:'variant',url:'angle.webp'};
function product(id='slim:003-1'){return {id,sku:'003-1',outOfStock:false,images:{main,overview:[{id:'overview'}],gallery:[]},variants:[{id:id+':color',image:first,images:[first,second]}]};}

test('color galleries exclude main and overview while retaining every actual photo',()=>{
  const p=product();const images=api.productGallery(p);
  assert.equal(images.length,2);assert.equal(images[1].id,'angle');
  assert(images.every(image=>image.role==='variant'));
});
test('models without colors retain their main image',()=>{
  const p=product();p.variants=[];
  assert.equal(api.productGallery(p)[0].id,'main');
  assert.equal(api.purchaseSelection(p,null,null).image.id,'main');
});
test('missing photos and out of stock cannot be purchased',()=>{
  const p=product();p.variants=[];p.images.main=null;
  assert.equal(api.purchaseSelection(p,null,null),null);
  p.outOfStock=true;assert.equal(api.purchaseSelection(p,null,null),null);
});
test('003 keeps the selected view instead of switching to the color first photo',()=>{
  const p=product();const selected=api.purchaseSelection(p,p.variants[0].id,'angle');
  assert.equal(selected.image.url,'angle.webp');
  const cart=api.normalizeCartEntries([{productId:p.id,variantId:selected.variant.id,imageId:'angle',quantity:2}],[p]);
  assert.equal(cart[0].imageId,'angle');
  assert.equal(api.purchaseSelection(p,cart[0].variantId,cart[0].imageId,true).image.url,'angle.webp');
});

test('a removed photo is not silently replaced by another photo in a saved cart',()=>{
  const p=product();
  assert.equal(api.purchaseSelection(p,p.variants[0].id,'removed-photo',true),null);
  assert.equal(api.normalizeCartEntries([{productId:p.id,variantId:p.variants[0].id,imageId:'removed-photo',quantity:2}],[p]).length,0);
});

test('exact photo restores the correct color after a source color label is corrected',()=>{
  const p=product();p.variants.push({id:'corrected-color',image:second,images:[second]});p.variants[0].images=[first];
  const cart=api.normalizeCartEntries([{productId:p.id,variantId:p.variants[0].id,imageId:'angle',quantity:2}],[p]);
  assert.equal(cart[0].imageId,'angle');assert.equal(cart[0].variantId,'corrected-color');
});
test('same SKU in separate collections does not resolve through an ambiguous alias',()=>{
  const a=product();const b=product('women-square:003-1');
  assert.equal(api.normalizeCartEntries([{sku:'003-1',quantity:1}],[a,b]).length,0);
  assert.equal(api.normalizeCartEntries([{productId:b.id,sku:b.sku,variantId:b.variants[0].id,imageId:'angle',quantity:1}],[a,b])[0].productId,b.id);
});
test('exact-image quantities merge independently and survive reload',()=>{
  const p=product();const entries=['front','angle','angle'].map(imageId=>({productId:p.id,variantId:p.variants[0].id,imageId,quantity:2}));
  const cart=api.normalizeCartEntries(entries,[p]);
  assert.equal(cart.length,2);assert.equal(api.cartImageQuantity(cart,p.id,'angle'),4);
  assert.equal(api.cartImageQuantity(cart,p.id,'front'),2);
  assert.equal(api.normalizeCartEntries(JSON.parse(JSON.stringify(cart)),[p])[1].quantity,4);
});
test('legacy cart entries use unique product IDs and preserve valid main selections',()=>{
  const p=product();const cart=api.normalizeCartEntries([{productId:p.id,variantId:null,quantity:2}],[p]);
  assert.equal(cart[0].imageId,'main');
  assert.equal(api.purchaseSelection(p,null,'main',true).image.id,'main');
});
test('second page retains global indices and deleting its final item clamps the page',()=>{
  const entries=Array.from({length:11},(_,index)=>({index}));
  const view=api.paginateEntries(entries,2);
  assert.equal(view.items.length,1);assert.equal(view.items[0].index,10);
  assert.equal(view.pages,2);assert.equal(api.paginateEntries(entries.slice(0,10),2).page,1);
});
test('notes remain literal text and are limited for the fixed print rows',()=>{
  const p=product();const cart=api.normalizeCartEntries([{productId:p.id,variantId:p.variants[0].id,quantity:1,notes:'<script>'+('x'.repeat(80))}],[p]);
  assert.equal(cart[0].notes.length,60);assert(cart[0].notes.startsWith('<script>'));
});
