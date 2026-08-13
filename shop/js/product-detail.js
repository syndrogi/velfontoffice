function getProductFromUrl() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  return getProductBySlug(slug) || getProducts()[0];
}

// product_images rows carry no color of their own — but they're inserted
// one contiguous block per color, in the same order as the color list
// (e.g. white front/back, then black front/back), so an even split across
// the color count recovers which image starts a given color's block.
// Anything that doesn't divide evenly (single color, odd counts, etc.)
// just points back at the first image.
function colorStartIndex(images, colorIndex, colorCount) {
  if (colorCount <= 1 || images.length % colorCount !== 0) return 0;
  const perColor = images.length / colorCount;
  return colorIndex * perColor;
}

function galleryHtml(images, product, soldOut) {
  const mainVisual = images.length
    ? `<div class="gallery-visual"><img id="mainImage" src="${images[0]}" alt="${product.name}"></div>`
    : `<div class="gallery-visual gallery-placeholder"></div>`;

  const thumbsHtml = images.length > 1
    ? `
      <div class="gallery-thumbs">
        ${images
          .map(
            (src, i) => `
          <button class="thumb${i === 0 ? " active" : ""}" data-src="${src}">
            <img src="${src}" alt="${product.name} thumbnail ${i + 1}">
          </button>`
          )
          .join("")}
      </div>`
    : "";

  return `
    ${thumbsHtml}
    <div class="gallery-main">
      ${mainVisual}
      ${soldOut ? '<span class="badge">Sold Out</span>' : ""}
    </div>
  `;
}

function renderProductDetail(product) {
  if (!product) {
    document.getElementById("productDetail").innerHTML = `<p class="cart-empty">${t("product.notFound")}</p>`;
    return { images: [], colorList: [] };
  }

  document.title = `VELFONT OFFICE — ${product.name}`;
  document.getElementById("breadcrumbName").textContent = product.name;

  const productImages = getProductImages(product.id);
  const images = productImages.length
    ? productImages.map((row) => resolveImageUrl(row.image))
    : product.thumbnail
    ? [resolveImageUrl(product.thumbnail)]
    : [];

  const soldOut = product.status === "sold_out";

  const colorList = (product.color || "")
    .split("/")
    .map((c) => c.trim())
    .filter(Boolean);

  const colorOptions = colorList.map((c) => `<option value="${c}">${c}</option>`).join("");

  const sizeOptions = (product.size || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (size) => `
      <button type="button" class="size-option" data-size="${size}"${soldOut ? " disabled" : ""}>${size}</button>`
    )
    .join("");

  const descriptionLines = (product.description || "").split("\n").filter(Boolean);
  const descriptionHtml = descriptionLines.map((line) => `<li>${line}</li>`).join("");

  const el = document.getElementById("productDetail");
  el.innerHTML = `
    <div class="product-gallery" id="productGallery">
      ${galleryHtml(images, product, soldOut)}
    </div>

    <div class="product-panel">
      <h1>${product.name}</h1>
      <div class="product-colors">${product.color || ""}</div>
      <div class="product-price"><span>${formatPrice(product.price)}</span></div>

      ${descriptionHtml ? `<ul class="product-description">${descriptionHtml}</ul>` : ""}

      <div class="option-group">
        <label for="colorSelect">${t("product.color")}</label>
        <select id="colorSelect">${colorOptions}</select>
      </div>

      <div class="option-group">
        <div class="option-group-head">
          <label>${t("product.size")}</label>
          <a href="#sizeGuide" class="size-guide-link">${t("product.sizeGuide")}</a>
        </div>
        <div class="size-options">${sizeOptions}</div>
      </div>

      ${
        soldOut
          ? `<button class="add-to-cart-btn" disabled>${t("product.soldOutButton")}</button>`
          : `<button class="add-to-cart-btn" id="addToCartBtn">${t("product.addToCart")}</button>`
      }

      <div class="accordion">
        <details open>
          <summary>${t("product.materialTitle")}</summary>
          <div class="accordion-body">
            <p>${t("product.materialBody")}</p>
          </div>
        </details>
        <details id="sizeGuide">
          <summary>${t("product.sizeGuide")}</summary>
          <div class="accordion-body">
            <table class="size-guide-table">
              <thead>
                <tr><th>${t("product.sizeTableHeader")}</th><th>${t("product.lengthTableHeader")}</th><th>${t("product.chestTableHeader")}</th><th>${t("product.shoulderTableHeader")}</th><th>${t("product.sleeveTableHeader")}</th></tr>
              </thead>
              <tbody>
                <tr><td>S</td><td>68</td><td>54</td><td>50</td><td>21</td></tr>
                <tr><td>M</td><td>70</td><td>57</td><td>52</td><td>22</td></tr>
                <tr><td>L</td><td>72</td><td>60</td><td>54</td><td>23</td></tr>
                <tr><td>XL</td><td>74</td><td>63</td><td>56</td><td>24</td></tr>
              </tbody>
            </table>
            <p class="size-guide-note">${t("product.sizeGuideNote")}</p>
          </div>
        </details>
        <details>
          <summary>${t("product.careTitle")}</summary>
          <div class="accordion-body">
            <p>${t("product.careBody")}</p>
          </div>
        </details>
      </div>
    </div>
  `;

  return { images, colorList };
}

function setupGallery() {
  const thumbs = document.querySelectorAll(".thumb");
  const mainImage = document.getElementById("mainImage");
  if (!thumbs.length || !mainImage) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainImage.src = thumb.dataset.src;
      thumbs.forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
}

// Jumps the main image (and the matching thumb's active state) to the
// selected color's first image — see colorStartIndex(). The thumbnail
// rail itself always keeps showing every image (detail shots and every
// color together), exactly like clicking a thumb directly; this just
// picks one for you.
function setupColorSelect(images, colorList) {
  const select = document.getElementById("colorSelect");
  const mainImage = document.getElementById("mainImage");
  if (!select || !mainImage || colorList.length < 2) return;

  select.addEventListener("change", () => {
    const colorIndex = Math.max(colorList.indexOf(select.value), 0);
    const index = colorStartIndex(images, colorIndex, colorList.length);
    const src = images[index];
    if (!src) return;

    mainImage.src = src;
    const thumbs = document.querySelectorAll(".thumb");
    thumbs.forEach((thumb, i) => thumb.classList.toggle("active", i === index));
  });
}

function setupSizeOptions() {
  const options = document.querySelectorAll(".size-option:not([disabled])");
  options.forEach((btn) => {
    btn.addEventListener("click", () => {
      options.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setupAddToCart(product) {
  const btn = document.getElementById("addToCartBtn");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    const selectedSize = document.querySelector(".size-option.active");
    if (!selectedSize) {
      alert(t("product.selectSizeAlert"));
      return;
    }
    e.stopPropagation();
    addToCart(product.id, selectedSize.dataset.size, 1);
    openCartDrawer();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await productsReady;
  const product = getProductFromUrl();

  function render() {
    const { images, colorList } = renderProductDetail(product);
    setupGallery();
    setupSizeOptions();
    if (product) {
      setupAddToCart(product);
      setupColorSelect(images, colorList);
    }
  }

  render();
  onCurrencyChange(render);
});
