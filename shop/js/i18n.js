// Site-wide language switching. Static copy is translated declaratively
// via data-i18n attributes; anything rendered dynamically (shop.js,
// product-detail.js, common.js, checkout.js) calls t() directly and
// re-renders through onLangChange() when the language changes.

const LANG_STORAGE_KEY = "velfontLang";
const DEFAULT_LANG = "ko";

const translations = {
  ko: {
    "nav.menuOpen": "메뉴 열기",
    "nav.search": "검색",
    "nav.logoHome": "VELFONT OFFICE 홈으로 이동",
    "nav.login": "로그인",
    "nav.cart": "장바구니",
    "nav.searchPlaceholder": "검색어를 입력하세요",
    "nav.langChange": "언어 변경",

    "cart.title": "장바구니",
    "cart.subtotal": "소계",
    "cart.checkout": "결제하기",
    "cart.empty": "장바구니가 비어 있습니다.",
    "cart.size": "사이즈: {size}",
    "cart.qtyDecrease": "수량 감소",
    "cart.qtyIncrease": "수량 증가",
    "cart.remove": "삭제",

    "modal.close": "닫기",

    "footer.helpShipping": "배송 안내",
    "footer.helpExchange": "교환/반품",
    "footer.helpSizeGuide": "사이즈 가이드",
    "footer.helpContact": "문의하기",
    "footer.companyAbout": "브랜드 소개",
    "footer.companyStore": "스토어 안내",
    "footer.companyCareers": "채용",
    "footer.newsletterText": "신상품 소식을 가장 먼저 받아보세요.",
    "footer.newsletterPlaceholder": "이메일 주소",
    "footer.newsletterSubmit": "구독",
    "footer.newsletterThanks": "구독해주셔서 감사합니다.",

    "collection.sort": "정렬",
    "sort.recommended": "추천순",
    "sort.new": "신상품순",
    "sort.priceAsc": "낮은 가격순",
    "sort.priceDesc": "높은 가격순",
    "shop.itemCount": "전체 {count}개 상품",
    "shop.loadError": "상품을 불러오지 못했습니다.",
    "shop.empty": "등록된 상품이 없습니다.",
    "shop.noResults": "'{query}'에 대한 검색 결과가 없습니다.",
    "promo.hide": "배너 숨기기",
    "promo.reveal": "배너 다시 보기",
    "product.soldOutLabel": "품절",

    "product.color": "색상",
    "product.size": "사이즈",
    "product.sizeGuide": "사이즈 가이드",
    "product.addToCart": "장바구니 담기",
    "product.soldOutButton": "품절된 상품입니다",
    "product.materialTitle": "구성/소재",
    "product.materialBody": "Cotton 100%. 정확한 소재 정보는 상품 라벨을 참고해주세요.",
    "product.careTitle": "케어 가이드",
    "product.careBody": "찬물에 단독 손세탁을 권장하며, 표백제 사용을 피하고 그늘에서 건조해주세요.",
    "product.sizeGuideNote": "단위: cm / 측정 방법에 따라 1~2cm 오차가 있을 수 있습니다.",
    "product.sizeTableHeader": "사이즈",
    "product.lengthTableHeader": "총장",
    "product.chestTableHeader": "가슴단면",
    "product.shoulderTableHeader": "어깨너비",
    "product.sleeveTableHeader": "소매길이",
    "product.notFound": "상품을 찾을 수 없습니다.",
    "product.selectSizeAlert": "사이즈를 선택해주세요.",

    "checkout.title": "주문 요약",
    "checkout.totalLabel": "총 결제 금액",
    "checkout.paymentInfo": "결제 정보",
    "checkout.note": "결제 연동은 준비 중입니다. 아래 버튼은 이후 실제 PG(결제) 연동이 붙을 자리입니다.",
    "checkout.recipientLabel": "받는 사람",
    "checkout.recipientPlaceholder": "이름",
    "checkout.addressLabel": "배송지",
    "checkout.addressPlaceholder": "주소",
    "checkout.phoneLabel": "연락처",
    "checkout.phonePlaceholder": "휴대폰 번호",
    "checkout.submit": "결제하기",
    "checkout.emptyCart": "장바구니가 비어 있습니다.",
    "checkout.continueShopping": "쇼핑 계속하기",
    "checkout.emptyAlert": "장바구니가 비어 있습니다.",
    "checkout.pendingAlert": "결제 연동은 준비 중입니다. PG 연동 후 이 버튼이 실제 결제를 진행합니다.",
    "checkout.itemMeta": "사이즈 {size} · 수량 {qty}",
  },
  en: {
    "nav.menuOpen": "Open menu",
    "nav.search": "Search",
    "nav.logoHome": "Go to VELFONT OFFICE home",
    "nav.login": "Login",
    "nav.cart": "Cart",
    "nav.searchPlaceholder": "Enter a search term",
    "nav.langChange": "Change language",

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
  },
};

function getLang() {
  return localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG;
}

function t(key, vars) {
  const dict = translations[getLang()] || translations[DEFAULT_LANG];
  let str = dict[key] ?? translations[DEFAULT_LANG][key] ?? key;
  if (vars) {
    Object.keys(vars).forEach((name) => {
      str = str.replace(`{${name}}`, vars[name]);
    });
  }
  return str;
}

const langChangeListeners = [];

function onLangChange(callback) {
  langChangeListeners.push(callback);
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

function updateLangOptions() {
  document.querySelectorAll(".lang-option").forEach((opt) => {
    opt.classList.toggle("is-active", opt.dataset.lang === getLang());
  });
}

function setLang(lang) {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
  updateLangOptions();
  langChangeListeners.forEach((callback) => callback(lang));
}

// Globe icon (borrowed from the VELFONT OFFICE main site) opens a small
// dropdown of language options, reusing the shop's existing .dropdown
// hover/open styling — see .lang-switch.has-dropdown in the markup.
function setupLangSwitch() {
  const switchEl = document.getElementById("langSwitch");
  const toggle = document.getElementById("langToggle");
  if (!switchEl || !toggle) return;

  updateLangOptions();

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
      setLang(opt.dataset.lang);
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
  document.documentElement.lang = getLang();
  applyStaticTranslations();
  setupLangSwitch();
});
