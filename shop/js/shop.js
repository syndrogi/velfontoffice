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
let activeGroup = "Campaign";
const rail = document.getElementById("studioRail");
const thumbs = document.getElementById("studioThumbs");
const prev = document.getElementById("studioPrev");
const next = document.getElementById("studioNext");

function clothingType(product) {
  if (/\b(?:tees?|t[ -]?shirts?)\b/i.test(product.name + " " + product.category)) return "T-shirt";
  const category = (product.category || "Other").trim();
  return ({tops:"Top", bottoms:"Bottom", outerwear:"Outer"})[category.toLowerCase()] || category;
}

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

async function selectEntry(entry) {
  const version = ++selectionVersion;
  activeKey = entry.key;
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
    const layer = document.createElement("span");
    layer.className = "alternate";
    layer.append(second);
    second.decode().then(() => frame.append(layer)).catch(() => {});
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

function openGroup(label, entries) {
  activeGroup = label;
  for (const item of list.children) item.setAttribute("aria-pressed", String(item.textContent === label));
  thumbs.replaceChildren();
  rail.hidden = entries.length < 2;
  let selected = Math.max(0, entries.findIndex(entry => entry.key === activeKey));
  function choose(index, scroll) {
    selected = index;
    for (const [i, item] of Array.from(thumbs.children).entries()) {
      item.setAttribute("aria-pressed", String(i === index));
    }
    prev.disabled = index === 0;
    next.disabled = index === entries.length - 1;
    if (scroll && !rail.hidden) {
      const thumb = thumbs.children[index];
      thumbs.scrollTo({left:thumb.offsetLeft - (thumbs.clientWidth - thumb.offsetWidth) / 2,
        behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
    }
    selectEntry(entries[index]);
  }
  for (const [i, entry] of entries.entries()) {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.title = entry.name;
    thumb.setAttribute("aria-label", entry.name);
    if (entry.url) thumb.append(makePhoto(entry.url, ""));
    thumb.onclick = () => choose(i, true);
    thumbs.append(thumb);
  }
  prev.onclick = () => choose(selected - 1, true);
  next.onclick = () => choose(selected + 1, true);
  thumbs.onscrollend = () => {
    if (rail.hidden) return;
    const center = thumbs.scrollLeft + thumbs.clientWidth / 2;
    let nearest = selected;
    let distance = Infinity;
    Array.from(thumbs.children).forEach((thumb, index) => {
      const offset = Math.abs(thumb.offsetLeft + thumb.offsetWidth / 2 - center);
      if (offset < distance) {
        nearest = index;
        distance = offset;
      }
    });
    if (nearest !== selected) choose(nearest, false);
  };
  choose(selected, true);
}

function renderCollection() {
  if (!ready) return;
  const needle = query.trim().toLowerCase();
  const products = getProducts().filter(p => [p.name,p.category,clothingType(p)].join(" ").toLowerCase().includes(needle));
  if (sort.value === "new") products.reverse();
  if (sort.value === "price-asc") products.sort((a,b) => a.price - b.price);
  if (sort.value === "price-desc") products.sort((a,b) => b.price - a.price);
  const groups = new Map();
  if (!needle) {
    const entries = [{key:"campaign", name:"Campaign", url:"images/laundry-vel-expand.jpg"}];
    for (const block of getArchiveBlocks()) {
      entries.push({key:"archive-" + block.id, name:block.title || block.caption || "Archive", url:block.image && resolveImageUrl(block.image,"archive")});
    }
    groups.set("Campaign", entries);
  }
  for (const product of products) {
    const category = clothingType(product);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(productEntry(product));
  }
  const count = document.getElementById("studioCount");
  count.textContent = getProductsLoadError() ? t("shop.loadError") : t("shop.itemCount",{count:products.length});
  list.replaceChildren();
  for (const [label, entries] of groups) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.onclick = () => { if (activeGroup !== label) openGroup(label, entries); };
    list.append(button);
  }
  if (groups.size) {
    const label = groups.has(activeGroup) ? activeGroup : groups.keys().next().value;
    openGroup(label, groups.get(label));
  } else {
    selectionVersion++;
    activeKey = "";
    photos.replaceChildren();
    rail.hidden = true;
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
