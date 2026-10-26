'use strict';

let preparingInquiry = false;

function readImageData(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Image could not be read'));
    reader.readAsDataURL(blob);
  });
}

// Only fetch export images for the items actually selected by the visitor.
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action="export"],[data-action="print"]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (preparingInquiry) return;
  const urls = [...new Set(cart.map(entry => resolveEntry(entry).image?.url).filter(Boolean))];
  preparingInquiry = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        if (MEDIA[url]) continue;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Image download failed');
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('Invalid image response');
        MEDIA[url] = await readImageData(blob);
      }
    }));
    if(button.dataset.action==='print')await printInquiry();
    else exportInquiry();
  } catch {
    toast(lang === 'zh' ? '\u56fe\u7247\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5' : 'Images could not be loaded. Please try again.');
  } finally {
    preparingInquiry = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}, true);
