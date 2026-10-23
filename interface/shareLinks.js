// Links reais de compartilhamento. O endereço é sempre a URL pública
// canônica da publicação, para a prévia usar os metadados do HTML.

export function facebookShareHref(url) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function linkedinShareHref(url) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function xShareHref({ title, url }) {
  const params = new URLSearchParams();
  if (title) {
    params.set("text", title);
  }
  params.set("url", url);
  return `https://twitter.com/intent/tweet?${params}`;
}
