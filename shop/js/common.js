function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const CART_STORAGE_KEY = "velfontCart";

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function addToCart(productId, size, qty = 1) {
  const items = loadCart();
  const existing = items.find((i) => i.productId === productId && i.size === size);

  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ productId, size, qty });
  }

  saveCart(items);
  renderCartDrawer();
}

function setCartItemQty(productId, size, qty) {
  let items = loadCart();

  if (qty <= 0) {
    items = items.filter((i) => !(i.productId === productId && i.size === size));
  } else {
    const item = items.find((i) => i.productId === productId && i.size === size);
    if (item) item.qty = qty;
  }

  saveCart(items);
  renderCartDrawer();
}

function getCartCount() {
  return loadCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartSubtotal() {
  return loadCart().reduce((sum, i) => {
    const product = getProductById(i.productId);
    return sum + (product ? product.price * i.qty : 0);
  }, 0);
}

function renderCartDrawer() {
  const itemsEl = document.getElementById("cartDrawerItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  const cartCountEl = document.getElementById("cartCount");
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!itemsEl) return;

  const items = loadCart();

  itemsEl.innerHTML = items.length
    ? items
        .map((i) => {
          const product = getProductById(i.productId);
          if (!product) return "";
          return `
            <div class="cart-item" data-id="${i.productId}" data-size="${i.size}">
              <div class="cart-item-image">
                ${product.thumbnail ? `<img src="${resolveImageUrl(product.thumbnail)}" alt="${product.name}">` : ""}
              </div>
              <div class="cart-item-info">
                <div class="cart-item-name">${product.name}</div>
                <div class="cart-item-size">${t("cart.size", { size: i.size })}</div>
                <div class="cart-item-qty">
                  <button type="button" class="qty-btn qty-minus" aria-label="${t("cart.qtyDecrease")}">-</button>
                  <span class="qty-value">${i.qty}</span>
                  <button type="button" class="qty-btn qty-plus" aria-label="${t("cart.qtyIncrease")}">+</button>
                </div>
                <div class="cart-item-price">${formatPrice(product.price * i.qty)}</div>
              </div>
              <button type="button" class="cart-item-remove" aria-label="${t("cart.remove")}">
                <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
              </button>
            </div>`;
        })
        .join("")
    : `<p class="cart-empty">${t("cart.empty")}</p>`;

  if (subtotalEl) subtotalEl.textContent = formatPrice(getCartSubtotal());
  if (cartCountEl) cartCountEl.textContent = getCartCount();
  if (checkoutBtn) checkoutBtn.disabled = items.length === 0;
}

function openCartDrawer() {
  document.getElementById("cartNavItem")?.classList.add("open");
}

function closeCartDrawer() {
  document.getElementById("cartNavItem")?.classList.remove("open");
}

function setupNav() {
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  navToggle?.addEventListener("click", () => {
    const isOpen = mainNav?.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    // The off-canvas nav and the search bar are both full-width overlays
    // on narrow viewports — leaving both open stacks the nav's opaque
    // background over the search results, hiding them from view.
    if (isOpen) document.getElementById("searchBar")?.classList.remove("open");
  });

  const allNavItem = document.getElementById("allNavItem");
  const allToggle = document.getElementById("allToggle");
  if (!allNavItem || !allToggle) return;

  function closeAllDropdown() {
    allNavItem.classList.remove("open");
    allToggle.setAttribute("aria-expanded", "false");
  }

  allToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = allNavItem.classList.toggle("open");
    allToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!allNavItem.contains(e.target)) closeAllDropdown();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllDropdown();
  });
}

// Live-filters the collection grid as the user types, on pages that have
// one (index.html, via shop.js). On pages without a grid (e.g. a single
// product page), Enter instead navigates to the collection with the query
// so search always works from anywhere on the site.
function setupSearch() {
  const searchToggle = document.getElementById("searchToggle");
  const searchBar = document.getElementById("searchBar");
  const searchInput = document.getElementById("searchInput");
  if (!searchToggle || !searchBar || !searchInput) return;

  function openSearch() {
    // See setupNav()'s matching guard: same reason, reversed direction.
    document.getElementById("mainNav")?.classList.remove("open");
    document.getElementById("navToggle")?.classList.remove("open");
    searchBar.classList.add("open");
    searchInput.focus();
  }

  function closeSearch() {
    searchBar.classList.remove("open");
  }

  searchToggle.addEventListener("click", () => {
    if (searchBar.classList.contains("open")) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearch();
  });

  searchInput.addEventListener(
    "input",
    debounce(() => {
      if (typeof filterCollectionBySearch === "function") {
        filterCollectionBySearch(searchInput.value);
      }
    }, 200)
  );

  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (typeof filterCollectionBySearch === "function") {
      filterCollectionBySearch(searchInput.value);
    } else {
      const query = searchInput.value.trim();
      window.location.href = query ? `index.html?search=${encodeURIComponent(query)}` : "index.html";
    }
  });

  const presetQuery = new URLSearchParams(window.location.search).get("search");
  if (presetQuery) {
    searchInput.value = presetQuery;
    openSearch();
    if (typeof filterCollectionBySearch === "function") {
      filterCollectionBySearch(presetQuery);
    }
  }
}

function setupCartDrawer() {
  const cartNavItem = document.getElementById("cartNavItem");
  const cartBtn = document.getElementById("cartBtn");
  const drawer = document.getElementById("cartDrawer");
  const itemsEl = document.getElementById("cartDrawerItems");
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!drawer) return;

  cartBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    cartNavItem?.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (cartNavItem && !cartNavItem.contains(e.target)) closeCartDrawer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCartDrawer();
  });

  itemsEl.addEventListener("click", (e) => {
    const itemEl = e.target.closest(".cart-item");
    if (!itemEl) return;

    const id = Number(itemEl.dataset.id);
    const size = itemEl.dataset.size;
    const items = loadCart();
    const item = items.find((i) => i.productId === id && i.size === size);
    if (!item) return;

    if (e.target.closest(".qty-plus")) {
      setCartItemQty(id, size, item.qty + 1);
    } else if (e.target.closest(".qty-minus")) {
      setCartItemQty(id, size, item.qty - 1);
    } else if (e.target.closest(".cart-item-remove")) {
      setCartItemQty(id, size, 0);
    }
  });

  checkoutBtn?.addEventListener("click", () => {
    if (getCartCount() > 0) {
      window.location.href = "checkout.html";
    }
  });

  renderCartDrawer();
}

function setupNewsletter() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    if (input.value) {
      alert(t("footer.newsletterThanks"));
      input.value = "";
    }
  });
}

const LOGIN_STORAGE_KEY = "velfontLoggedIn";

function isLoggedIn() {
  return localStorage.getItem(LOGIN_STORAGE_KEY) === "true";
}

function renderAccountButton() {
  const btn = document.getElementById("accountBtn");
  if (!btn) return;
  btn.textContent = isLoggedIn() ? "profile" : "login";
}

function setupLoginModal() {
  const accountBtn = document.getElementById("accountBtn");
  const overlay = document.getElementById("loginOverlay");
  const modal = document.getElementById("loginModal");
  const closeBtn = document.getElementById("loginModalClose");
  const form = document.getElementById("loginForm");
  const googleBtn = document.getElementById("googleLoginBtn");
  if (!accountBtn || !modal) return;

  function openLoginModal() {
    if (isLoggedIn()) return;
    overlay.classList.add("open");
    modal.classList.add("open");
    document.getElementById("loginEmail")?.focus();
  }

  function closeLoginModal() {
    overlay.classList.remove("open");
    modal.classList.remove("open");
  }

  function logIn() {
    localStorage.setItem(LOGIN_STORAGE_KEY, "true");
    renderAccountButton();
    closeLoginModal();
  }

  accountBtn.addEventListener("click", openLoginModal);
  closeBtn?.addEventListener("click", closeLoginModal);
  overlay?.addEventListener("click", closeLoginModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLoginModal();
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    logIn();
  });

  googleBtn?.addEventListener("click", () => {
    logIn();
  });
}

// Header stays solid white at the very top of the page; past a small
// scroll threshold it drops its background (see .site-header.is-scrolled
// in style.css) so the logo/nav text keep floating over the page while
// the header itself turns transparent. rAF-throttled since scroll fires
// continuously.
function setupHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const SCROLL_THRESHOLD = 24;
  let ticking = false;

  function update() {
    header.classList.toggle("is-scrolled", window.scrollY > SCROLL_THRESHOLD);
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  });

  update();
}

function revealPageVeil() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("is-entered");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupSearch();
  setupNewsletter();
  renderAccountButton();
  setupLoginModal();
  setupHeaderScroll();
  revealPageVeil();
});

document.addEventListener("DOMContentLoaded", async () => {
  await productsReady;
  setupCartDrawer();
  onCurrencyChange(renderCartDrawer);
});
