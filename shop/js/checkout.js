function renderCheckout() {
  const itemsEl = document.getElementById("checkoutItems");
  const totalEl = document.getElementById("checkoutTotal");
  const items = loadCart();

  if (!items.length) {
    itemsEl.innerHTML = `<p class="cart-empty">${t("checkout.emptyCart")} <a href="index.html">${t("checkout.continueShopping")}</a></p>`;
    totalEl.textContent = formatPrice(0);
    return;
  }

  itemsEl.innerHTML = items
    .map((i) => {
      const product = getProductById(i.productId);
      if (!product) return "";
      return `
        <div class="checkout-item">
          <div class="checkout-item-image">
            ${product.thumbnail ? `<img src="${resolveImageUrl(product.thumbnail)}" alt="${product.name}">` : ""}
          </div>
          <div class="checkout-item-info">
            <div class="checkout-item-name">${product.name}</div>
            <div class="checkout-item-meta">${t("checkout.itemMeta", { size: i.size, qty: i.qty })}</div>
          </div>
          <div class="checkout-item-price">${formatPrice(product.price * i.qty)}</div>
        </div>`;
    })
    .join("");

  totalEl.textContent = formatPrice(getCartSubtotal());
}

function setupCheckoutSubmit() {
  const btn = document.getElementById("checkoutSubmitBtn");
  btn.addEventListener("click", () => {
    if (getCartCount() === 0) {
      alert(t("checkout.emptyAlert"));
      return;
    }
    alert(t("checkout.pendingAlert"));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await productsReady;
  renderCheckout();
  setupCheckoutSubmit();
  onCurrencyChange(renderCheckout);
});
