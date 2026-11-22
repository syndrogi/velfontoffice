const list = document.getElementById("studioList");
const photos = document.getElementById("studioPhotos");
const nameLabel = document.getElementById("studioName");
const link = document.getElementById("studioLink");
const variant = document.getElementById("studioVariant");
const sort = document.getElementById("studioSort");
let query = "";
let activeKey = "";
let ready = false;
let selectionVersion = 0;

function productEntry(product) {
  const rows = getProductImages(product.id).filter(row => row.image);
  const first = rows[0]?.image || product.thumbnail;
  const last = product.hover_image || rows.at(-1)?.image;
  return {
    key: product.id, name: product.name, price: product.status === "sold_out" ? t("product.soldOutLabel") : formatPrice(product.price),
    url: first && resolveImageUrl(first), alternate: last && last !== first && resolveImageUrl(last),
    href: "product.html?slug=" + encodeURIComponent(product.slug)
  };
}

function makePhoto(url, alt) {
  const image = new Image();
  image.src = url;
  image.alt = alt;
  return image;
}

async function selectEntry(entry, button) {
  const version = ++selectionVersion;
  activeKey = entry.key;
  for (const item of list.children) item.setAttribute("aria-pressed", String(item === button));
  const frame = document.createElement(entry.href ? "a" : "div");
  frame.className = "studio-frame";
  if (entry.href) {
    frame.href = entry.href;
    frame.setAttribute("aria-label", entry.name);
  } else frame.classList.add("editorial");
  if (entry.url) {
    const first = makePhoto(entry.url, entry.name);
    await first.decode().catch(() => {});
    if (version !== selectionVersion) return;
    frame.append(first);
  }
  if (entry.alternate) {
    const second = makePhoto(entry.alternate, "");
    second.className = "alternate";
    frame.append(second);
  }
  const previous = photos.lastElementChild;
  photos.append(frame);
  if (previous) {
    previous.inert = true;
    previous.classList.remove("visible");
    setTimeout(() => previous.remove(), 460);
  }
  frame.getBoundingClientRect();
  frame.classList.add("visible");
  variant.hidden = !entry.alternate;
  variant.setAttribute("aria-pressed", "false");
  nameLabel.textContent = [entry.name, entry.price].filter(Boolean).join(" · ");
  link.hidden = !entry.href;
  if (entry.href) link.href = entry.href;
  else link.removeAttribute("href");
}

function renderCollection() {
  if (!ready) return;
  const needle = query.trim().toLowerCase();
  const products = getProducts().filter(p => (p.name + " " + p.category).toLowerCase().includes(needle));
  if (sort.value === "new") products.reverse();
  if (sort.value === "price-asc") products.sort((a,b) => a.price - b.price);
  if (sort.value === "price-desc") products.sort((a,b) => b.price - a.price);
  const entries = products.map(productEntry);
  if (!needle) {
    entries.push({key:"campaign", name:"Campaign", url:"images/laundry-vel-expand.jpg"});
    for (const block of getArchiveBlocks()) {
      entries.push({key:"archive-" + block.id, name:block.title || block.caption || "Archive", url:block.image && resolveImageUrl(block.image,"archive")});
    }
  }
  const count = document.getElementById("studioCount");
  count.textContent = getProductsLoadError() ? t("shop.loadError") : t("shop.itemCount",{count:products.length});
  list.replaceChildren();
  for (const entry of entries) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.name;
    button.onclick = () => { if (activeKey !== entry.key) selectEntry(entry, button); };
    list.append(button);
  }
  if (entries.length) {
    const index = Math.max(0, entries.findIndex(entry => entry.key === activeKey));
    selectEntry(entries[index],list.children[index]);
  } else {
    selectionVersion++;
    activeKey = "";
    photos.replaceChildren();
    link.hidden = variant.hidden = true;
    nameLabel.textContent = t("shop.noResults",{query});
  }
}

function filterCollectionBySearch(value) {
  query = value;
  renderCollection();
}

variant.onclick = () => {
  const alternate = photos.lastElementChild?.classList.toggle("show-alternate");
  variant.setAttribute("aria-pressed", String(Boolean(alternate)));
};
sort.onchange = renderCollection;
document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([productsReady, archiveBlocksReady]);
  ready = true;
  renderCollection();
  onCurrencyChange(renderCollection);
});
