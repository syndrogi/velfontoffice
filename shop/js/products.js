// Product data access. Everything else (shop.js, product-detail.js,
// common.js, checkout.js) reads products through the functions below —
// none of them talk to Supabase directly.

const PRODUCTS_STORAGE_BUCKET = "products";

let cachedProducts = [];
let loadError = null;
let cachedProductImages = new Map();

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load products from Supabase:", error.message);
    loadError = error;
    cachedProducts = [];
    return cachedProducts;
  }

  loadError = null;
  cachedProducts = data ?? [];
  return cachedProducts;
}

async function loadProductImages() {
  const { data, error } = await supabaseClient
    .from("product_images")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load product images from Supabase:", error.message);
    cachedProductImages = new Map();
    return cachedProductImages;
  }

  cachedProductImages = new Map();
  (data ?? []).forEach((row) => {
    const list = cachedProductImages.get(row.product_id) || [];
    list.push(row);
    cachedProductImages.set(row.product_id, list);
  });
  return cachedProductImages;
}

// Kicked off once, at parse time, so every page only ever pays for one
// round of fetches. Callers that need product data await this before
// touching the cache accessors below.
const productsReady = Promise.all([loadProducts(), loadProductImages()]);

function getProducts() {
  return cachedProducts;
}

function getProductsLoadError() {
  return loadError;
}

// Ordered image rows (stage, sort_order) for one product, or [] if none
// exist yet — every call site treats that as "nothing to cycle through,
// just show the static thumbnail," so this never needs a special case.
function getProductImages(productId) {
  return cachedProductImages.get(productId) || [];
}

function getProductBySlug(slug) {
  return cachedProducts.find((p) => p.slug === slug);
}

function getProductById(id) {
  return cachedProducts.find((p) => p.id === id);
}

// Not wired to any UI yet — the shop has no filter bar today — but kept
// here so adding one later is a rendering change, not a data-layer one.
function filterProducts({ category, status, featured } = {}) {
  return cachedProducts.filter((p) => {
    if (category && p.category !== category) return false;
    if (status && p.status !== status) return false;
    if (featured !== undefined && p.featured !== featured) return false;
    return true;
  });
}

function resolveImageUrl(path, bucket = PRODUCTS_STORAGE_BUCKET) {
  if (!path) return "";
  return supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Every price in the database is KRW; USD is a static approximate
// conversion for display only (see the currency note in js/i18n.js).
const USD_PER_KRW = 1 / 1400;

function formatPrice(krwValue) {
  if (getCurrency() === "USD") {
    return (krwValue * USD_PER_KRW).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }
  return krwValue.toLocaleString("ko-KR") + "원";
}
