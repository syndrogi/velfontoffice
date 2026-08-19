const ARCHIVE_STORAGE_BUCKET = "archive";
const ARCHIVE_BLOCK_INTERVAL = 5; // an archive block after every 5th product, while blocks last

// Sold-out products already show "Sold Out" in place of the price (see
// productCardHtml's .sold-out-label below) — a badge on top of the image
// would just repeat it, so this only flags coming-soon items.
function badgeFor(product) {
  if (product.status === "coming_soon") return '<span class="badge">Coming Soon</span>';
  return "";
}

// Interleaves archive blocks into the product sequence every ARCHIVE_BLOCK_INTERVAL
// slot. With zero archive blocks (the default today) this is just the product list.
function buildFeed(products, archiveBlocks) {
  if (!archiveBlocks.length) {
    return products.map((product) => ({ kind: "product", product }));
  }

  const feed = [];
  let archiveIndex = 0;

  products.forEach((product, i) => {
    feed.push({ kind: "product", product });
    const atInterval = (i + 1) % ARCHIVE_BLOCK_INTERVAL === 0;
    if (atInterval && archiveIndex < archiveBlocks.length) {
      feed.push({ kind: "archive", block: archiveBlocks[archiveIndex] });
      archiveIndex++;
    }
  });

  while (archiveIndex < archiveBlocks.length) {
    feed.push({ kind: "archive", block: archiveBlocks[archiveIndex] });
    archiveIndex++;
  }

  return feed;
}

function productCardHtml(product) {
  const soldOut = product.status === "sold_out";
  const images = getProductImages(product.id);
  const stageUrls = images.length ? images.map((row) => resolveImageUrl(row.image)) : [product.thumbnail ? resolveImageUrl(product.thumbnail) : ""];

  const stageImagesHtml = stageUrls
    .filter(Boolean)
    .map((src, i) => `<img class="stage-image${i === 0 ? " is-active" : ""}" src="${src}" alt="${product.name}" loading="lazy">`)
    .join("");

  return `
    <a class="collection-card" href="product.html?slug=${product.slug}" data-product-id="${product.id}">
      <div class="collection-card-media${soldOut ? " is-sold-out" : ""}">
        ${stageImagesHtml}
        ${badgeFor(product)}
      </div>
      <div class="collection-card-info">
        <div class="collection-card-name">${product.name}</div>
        ${soldOut ? `<div class="sold-out-label">${t("product.soldOutLabel")}</div>` : `<div class="price"><span>${formatPrice(product.price)}</span></div>`}
      </div>
    </a>
  `;
}

function archiveBlockHtml(block) {
  const img = block.image
    ? `<img src="${resolveImageUrl(block.image, ARCHIVE_STORAGE_BUCKET)}" alt="${block.title || ""}" loading="lazy">`
    : "";
  const caption =
    block.title || block.caption
      ? `<div class="archive-block-caption">
          ${block.title ? `<div class="archive-block-title">${block.title}</div>` : ""}
          ${block.caption ? `<p>${block.caption}</p>` : ""}
        </div>`
      : "";

  return `
    <div class="collection-card archive-block${block.span === 2 ? " span-2" : ""}">
      <div class="collection-card-media">${img}</div>
      ${caption}
    </div>
  `;
}

function productReelCardHtml(product, isDuplicate, index) {
  const images = getProductImages(product.id);
  const imagePath = images.length ? images[0].image : product.thumbnail;
  const imageUrl = resolveImageUrl(imagePath);
  const duplicateAttrs = isDuplicate ? ' aria-hidden="true" tabindex="-1"' : "";

  return `
    <a class="product-reel-card" href="product.html?slug=${product.slug}"${duplicateAttrs}>
      <span class="product-reel-media">
        ${imageUrl ? `<img src="${imageUrl}" alt="${product.name}" loading="eager">` : ""}
      </span>
      <span class="product-reel-meta">
        <span class="product-reel-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="product-reel-name">${product.name}</span>
        <span class="product-reel-category">${product.category || "Collection"}</span>
      </span>
    </a>
  `;
}

function renderProductReel() {
  const reel = document.getElementById("productReel");
  const track = document.getElementById("productReelTrack");
  if (!reel || !track || getProductsLoadError()) return;

  const products = getProducts();
  if (!products.length) return;

  track.innerHTML = `
    <div class="product-reel-set">
      ${products.map((product, index) => productReelCardHtml(product, false, index)).join("")}
    </div>
    <div class="product-reel-set" aria-hidden="true">
      ${products.map((product, index) => productReelCardHtml(product, true, index)).join("")}
    </div>
  `;
  reel.hidden = false;
}

// Swaps straight to the card's last stage image on hover — product_images
// rows are inserted white-first then black-last (see supabase/*.sql), so
// the last image is that product's black colorway. Crossfades via the
// .stage-image opacity transition in style.css, not a timer, so it
// reacts immediately instead of waiting out a cycle interval. With only
// one image this is a no-op, since there's nothing to swap to.
function setupHoverCycle(card) {
  const stageImages = card.querySelectorAll(".stage-image");
  if (stageImages.length < 2) return;

  const first = stageImages[0];
  const last = stageImages[stageImages.length - 1];

  card.addEventListener("pointerenter", () => {
    first.classList.remove("is-active");
    last.classList.add("is-active");
  });

  card.addEventListener("pointerleave", () => {
    last.classList.remove("is-active");
    first.classList.add("is-active");
  });
}

// Set by filterCollectionBySearch(); empty means no active search.
let currentSearchQuery = "";

function matchesSearch(product, query) {
  return product.name.toLowerCase().includes(query) || (product.category || "").toLowerCase().includes(query);
}

function renderCollection() {
  const grid = document.getElementById("productGrid");
  const itemCount = document.getElementById("itemCount");

  if (getProductsLoadError()) {
    grid.innerHTML = `<p class="cart-empty">${t("shop.loadError")}</p>`;
    itemCount.textContent = "";
    return;
  }

  const query = currentSearchQuery.trim().toLowerCase();
  const products = query ? getProducts().filter((p) => matchesSearch(p, query)) : getProducts();

  if (!products.length) {
    grid.innerHTML = `<p class="cart-empty">${query ? t("shop.noResults", { query: currentSearchQuery.trim() }) : t("shop.empty")}</p>`;
    itemCount.textContent = t("shop.itemCount", { count: 0 });
    return;
  }

  // Archive blocks are editorial, not products — leave them out of search results.
  const feed = query ? products.map((product) => ({ kind: "product", product })) : buildFeed(products, getArchiveBlocks());

  grid.innerHTML = feed
    .map((entry) => (entry.kind === "product" ? productCardHtml(entry.product) : archiveBlockHtml(entry.block)))
    .join("");

  itemCount.textContent = t("shop.itemCount", { count: products.length });

  grid.querySelectorAll(".collection-card").forEach(setupHoverCycle);
}

function sortProducts(order) {
  const products = getProducts();

  if (order === "price-asc") {
    products.sort((a, b) => a.price - b.price);
  } else if (order === "price-desc") {
    products.sort((a, b) => b.price - a.price);
  } else if (order === "new") {
    products.reverse();
  }

  renderCollection();
}

// Called by common.js's search box (live as the user types, and once on
// load if the page was reached via a ?search= link from another page).
function filterCollectionBySearch(query) {
  currentSearchQuery = query;
  renderCollection();
}

// Small rounded floating pills (All / Sort) — the one deliberate exception
// to this site's otherwise square-cornered visual language. Each opens the
// same dropdown content/logic the header used to hold inline.
function setupFloatingDropdown(itemId, toggleId) {
  const item = document.getElementById(itemId);
  const toggle = document.getElementById(toggleId);
  if (!item || !toggle) return null;

  function close() {
    item.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = item.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!item.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return { close };
}

function setupFloatingNav() {
  setupFloatingDropdown("floatingAllItem", "floatingAllToggle");
  const sortHandle = setupFloatingDropdown("floatingSortItem", "floatingSortToggle");

  document.querySelectorAll(".sort-option").forEach((option) => {
    option.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".sort-option").forEach((o) => o.classList.remove("is-active"));
      option.classList.add("is-active");
      sortProducts(option.dataset.sort);
      sortHandle?.close();
    });
  });
}

/**
 * Promo Banner — Idle Drift
 * The (zoomed-in, model-anchored — see .promo-banner-image-center in
 * style.css) photo drifts gently and continuously on its own. Bounds
 * are measured from the actual rendered box rather than hardcoded, so
 * the drift can never expose empty space around the (asymmetrically
 * anchored) image.
 */
function setupPromoBannerIdle() {
  const wrap = document.querySelector(".promo-banner-image");
  const img = wrap?.querySelector("img");
  if (!wrap || !img) return;

  // Must match the translate() in .promo-banner-image-center.
  const ANCHOR_X = 0.55;
  const ANCHOR_Y = 0.58;
  const IDLE_AMOUNT = 0.4; // fraction of the tighter safe bound per axis
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) return;

  let idleStart = null;

  function computeBounds() {
    const cr = wrap.getBoundingClientRect();
    const imgW = img.offsetWidth;
    const imgH = img.offsetHeight;
    const neutralLeft = cr.left + cr.width / 2 - ANCHOR_X * imgW;
    const neutralTop = cr.top + cr.height / 2 - ANCHOR_Y * imgH;
    return {
      maxX: cr.left - neutralLeft,
      minX: -(neutralLeft + imgW - (cr.left + cr.width)),
      maxY: cr.top - neutralTop,
      minY: -(neutralTop + imgH - (cr.top + cr.height)),
    };
  }

  function idleTick(timestamp) {
    if (idleStart === null) idleStart = timestamp;
    const elapsed = (timestamp - idleStart) / 1000;
    const bounds = computeBounds();
    const ampX = Math.min(bounds.maxX, -bounds.minX) * IDLE_AMOUNT;
    const ampY = Math.min(bounds.maxY, -bounds.minY) * IDLE_AMOUNT;
    img.style.transform = `translate(${Math.sin((elapsed * 2 * Math.PI) / 9) * ampX}px, ${
      Math.sin((elapsed * 2 * Math.PI) / 7) * ampY
    }px)`;
    requestAnimationFrame(idleTick);
  }

  requestAnimationFrame(idleTick);
}

// Collapses/reveals the promo banner via .promo-banner-clip's max-height
// transition (see style.css) — the button itself lives outside that clip
// so it stays put as the small reveal control once collapsed, swapping
// its own icon/label through .promo-banner.is-hidden.
function setupPromoBannerToggle() {
  const banner = document.getElementById("promoBanner");
  const toggle = document.getElementById("promoBannerToggle");
  if (!banner || !toggle) return;

  toggle.addEventListener("click", () => {
    const hidden = banner.classList.toggle("is-hidden");
    toggle.setAttribute("aria-label", t(hidden ? "promo.reveal" : "promo.hide"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPromoBannerIdle();
  setupPromoBannerToggle();
});

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([productsReady, archiveBlocksReady]);
  renderProductReel();
  renderCollection();
  setupFloatingNav();
  onCurrencyChange(renderCollection);
});
