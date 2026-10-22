// Link wa.me abre o WhatsApp no celular e o WhatsApp Web no computador, com
// o texto pronto para escolher o contato ou grupo.
export function whatsappShareHref({ title, url }) {
  const text = title ? `${title}\n${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
