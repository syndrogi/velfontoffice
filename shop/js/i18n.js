// Site copy is English-only (see shop/js/products.js's formatPrice for the
// one thing the header's globe icon still switches: display currency, not
// language). Static markup still carries its original Korean text plus
// data-i18n attributes from before that decision — applyStaticTranslations()
// swaps it to English on load. Anything rendered dynamically (shop.js,
// product-detail.js, common.js, checkout.js) calls t() directly.

const STRINGS = {
  "nav.menuOpen": "Open menu",
  "nav.search": "Search",
  "nav.logoHome": "Go to VELFONT OFFICE home",
  "nav.login": "Login",
  "nav.cart": "Cart",
  "nav.searchPlaceholder": "Enter a search term",
  "nav.langChange": "Change currency",

  "cart.title": "Cart",
  "cart.subtotal": "Subtotal",
  "cart.checkout": "Checkout",
  "cart.empty": "Your cart is empty.",
  "cart.size": "Size: {size}",
  "cart.qtyDecrease": "Decrease quantity",
  "cart.qtyIncrease": "Increase quantity",
  "cart.remove": "Remove",

  "modal.close": "Close",

  "footer.helpShipping": "Shipping Info",
  "footer.helpExchange": "Exchange & Returns",
  "footer.helpSizeGuide": "Size Guide",
  "footer.helpContact": "Contact Us",
  "footer.companyAbout": "About the Brand",
  "footer.companyStore": "Store Info",
  "footer.companyCareers": "Careers",
  "footer.newsletterText": "Be the first to hear about new arrivals.",
  "footer.newsletterPlaceholder": "Email address",
  "footer.newsletterSubmit": "Subscribe",
  "footer.newsletterThanks": "Thanks for subscribing.",

  "collection.sort": "Sort",
  "sort.recommended": "Recommended",
  "sort.new": "Newest",
  "sort.priceAsc": "Price: Low to High",
  "sort.priceDesc": "Price: High to Low",
  "shop.itemCount": "{count} items total",
  "shop.loadError": "Failed to load products.",
  "shop.empty": "No products available.",
  "shop.noResults": "No results found for \"{query}\".",
  "promo.hide": "Hide banner",
  "promo.reveal": "reveal",
  "product.soldOutLabel": "Sold Out",

  "product.color": "Color",
  "product.size": "Size",
  "product.sizeGuide": "Size Guide",
  "product.addToCart": "Add to Cart",
  "product.soldOutButton": "This item is sold out",
  "product.materialTitle": "Composition & Material",
  "product.materialBody": "Cotton 100%. Please check the product label for exact material details.",
  "product.careTitle": "Care Guide",
  "product.careBody": "Hand-wash separately in cold water, avoid bleach, and dry in the shade.",
  "product.sizeGuideNote": "Unit: cm / Measurements may vary by 1–2cm depending on method.",
  "product.sizeTableHeader": "Size",
  "product.lengthTableHeader": "Length",
  "product.chestTableHeader": "Chest",
  "product.shoulderTableHeader": "Shoulder",
  "product.sleeveTableHeader": "Sleeve",
  "product.notFound": "Product not found.",
  "product.selectSizeAlert": "Please select a size.",

  "checkout.title": "Order Summary",
  "checkout.totalLabel": "Total Payment",
  "checkout.paymentInfo": "Payment Information",
  "checkout.note": "Payment integration is in progress. This button will connect to a real payment gateway later.",
  "checkout.recipientLabel": "Recipient",
  "checkout.recipientPlaceholder": "Name",
  "checkout.addressLabel": "Shipping Address",
  "checkout.addressPlaceholder": "Address",
  "checkout.phoneLabel": "Phone Number",
  "checkout.phonePlaceholder": "Mobile Number",
  "checkout.submit": "Checkout",
  "checkout.emptyCart": "Your cart is empty.",
  "checkout.continueShopping": "Continue Shopping",
  "checkout.emptyAlert": "Your cart is empty.",
  "checkout.pendingAlert": "Payment integration is in progress. This button will process real payments once connected.",
  "checkout.itemMeta": "Size {size} · Qty {qty}",
};

function t(key, vars) {
  let str = STRINGS[key] ?? key;
  if (vars) {
    Object.keys(vars).forEach((name) => {
      str = str.replace(`{${name}}`, vars[name]);
    });
  }
  return str;
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
}

// Currency — the one thing the header's globe icon still switches (see
// formatPrice() in products.js). KRW is what every price in the database
// actually is; USD is a static approximate conversion for display only,
// not a live rate — checkout itself has no real payment gateway yet
// (see checkout.note above) so there's nothing that needs one.
const CURRENCY_STORAGE_KEY = "velfontCurrency";
const DEFAULT_CURRENCY = "KRW";

function getCurrency() {
  return localStorage.getItem(CURRENCY_STORAGE_KEY) || DEFAULT_CURRENCY;
}

const currencyChangeListeners = [];

function onCurrencyChange(callback) {
  currencyChangeListeners.push(callback);
}

function updateCurrencyOptions() {
  document.querySelectorAll(".lang-option").forEach((opt) => {
    opt.classList.toggle("is-active", opt.dataset.currency === getCurrency());
  });
}

function setCurrency(currency) {
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  updateCurrencyOptions();
  currencyChangeListeners.forEach((callback) => callback(currency));
}

// Globe icon opens a small dropdown of currency options, reusing the same
// .lang-switch/.lang-menu/.lang-option markup and styling this used for
// the language switch it replaced.
function setupLangSwitch() {
  const switchEl = document.getElementById("langSwitch");
  const toggle = document.getElementById("langToggle");
  if (!switchEl || !toggle) return;

  updateCurrencyOptions();

  function closeMenu() {
    switchEl.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = switchEl.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  switchEl.querySelectorAll(".lang-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.preventDefault();
      setCurrency(opt.dataset.currency);
      closeMenu();
    });
  });

  document.addEventListener("click", (e) => {
    if (!switchEl.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = "en";
  applyStaticTranslations();
  setupLangSwitch();
});
