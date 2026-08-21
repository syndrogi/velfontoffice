const members = {
  rim: {
    name: "Hyunrim Gong",
    color: "#FF3B30"
  },
  rogi: {
    name: "Hyungrok Son",
    color: "#34C759"
  },
  seoh: {
    name: "Seohyun Hwang",
    color: "#007AFF"
  }
};

const PASSPHRASE = "business";

const FLASH_HOLD_MS = 200;
const FADE_DURATION_MS = 400;
const WELCOME_HOLD_MS = 700;
const DENIED_HOLD_MS = 1500;

const dots = document.querySelectorAll(".member-dot");
const brand = document.getElementById("brand");
const passphrasePanel = document.getElementById("passphrase-panel");
const passphraseInput = document.getElementById("passphrase");
const passphraseToggle = document.getElementById("passphrase-toggle");
const enterButton = document.getElementById("enter-btn");
const deniedMessage = document.getElementById("denied");
const flash = document.getElementById("flash");
const welcomeBlock = document.getElementById("welcome-block");
const welcomeName = document.getElementById("welcome-name");

let selectedMemberId = null;
let deniedTimeoutId = null;

dots.forEach((dot) => {
  dot.addEventListener("animationend", () => {
    dot.classList.add("settled");
  }, { once: true });

  dot.addEventListener("click", () => {
    selectMember(dot.dataset.member);
  });
});

function selectMember(memberId) {
  selectedMemberId = memberId;
  clearDenied();
  passphraseInput.value = "";
  hidePassphrase();

  dots.forEach((dot) => {
    dot.classList.toggle("dimmed", dot.dataset.member !== memberId);
  });

  passphrasePanel.classList.add("open");
  passphraseInput.focus();
}

function closeSelection() {
  selectedMemberId = null;
  clearDenied();
  passphraseInput.value = "";
  hidePassphrase();
  passphrasePanel.classList.remove("open");
  dots.forEach((dot) => dot.classList.remove("dimmed"));
}

function hidePassphrase() {
  passphraseInput.type = "password";
  passphraseToggle.textContent = "SHOW";
  passphraseToggle.setAttribute("aria-label", "Show passphrase");
  passphraseToggle.setAttribute("aria-pressed", "false");
}

function togglePassphraseVisibility() {
  const willShow = passphraseInput.type === "password";
  passphraseInput.type = willShow ? "text" : "password";
  passphraseToggle.textContent = willShow ? "HIDE" : "SHOW";
  passphraseToggle.setAttribute("aria-label", willShow ? "Hide passphrase" : "Show passphrase");
  passphraseToggle.setAttribute("aria-pressed", String(willShow));
  passphraseInput.focus();
}

function clearDenied() {
  clearTimeout(deniedTimeoutId);
  deniedMessage.classList.remove("visible");
}

function handleEnter() {
  if (!selectedMemberId) return;
  const member = members[selectedMemberId];

  if (passphraseInput.value === PASSPHRASE) {
    authenticate(selectedMemberId, member);
  } else {
    denyAccess();
  }
}

function authenticate(memberId, member) {
  passphraseInput.disabled = true;
  passphraseToggle.disabled = true;
  enterButton.disabled = true;
  flashSuccess(memberId, member);
}

function flashSuccess(memberId, member) {
  flash.style.transition = "none";
  flash.style.backgroundColor = member.color;

  setTimeout(() => {
    welcomeName.textContent = member.name;
    brand.style.display = "none";
    welcomeBlock.style.display = "flex";

    flash.style.transition = `background-color ${FADE_DURATION_MS}ms ease`;
    flash.style.backgroundColor = "transparent";
  }, FLASH_HOLD_MS);

  setTimeout(() => {
    enterFounderDesktop(memberId, member);
  }, FLASH_HOLD_MS + FADE_DURATION_MS + WELCOME_HOLD_MS);
}

// Hands off to the Founder OS application. The session is written to
// sessionStorage — a placeholder for real backend-issued auth — so app/
// can identify who's logged in after a real page navigation, and so app/
// can refuse to render at all if it's opened without one. Swapping this
// for a server session/token later shouldn't require touching app/'s read
// side, only what writes it here.
function enterFounderDesktop(memberId, member) {
  sessionStorage.setItem(
    "founderSession",
    JSON.stringify({ id: memberId, name: member.name, color: member.color })
  );
  window.location.href = "app/index.html";
}

function denyAccess() {
  clearTimeout(deniedTimeoutId);
  deniedMessage.classList.add("visible");
  passphraseInput.value = "";
  passphraseInput.focus();

  deniedTimeoutId = setTimeout(() => {
    deniedMessage.classList.remove("visible");
  }, DENIED_HOLD_MS);
}

enterButton.addEventListener("click", handleEnter);
passphraseToggle.addEventListener("click", togglePassphraseVisibility);

passphraseInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleEnter();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selectedMemberId) {
    closeSelection();
  }
});

// Safety net for the VFO/FOUNDER OS typing reveal: some WebKit builds
// don't reliably finish a clip-path + steps() animation, leaving the
// last character permanently clipped. Force the fully-revealed state
// once the animation should be done — a no-op wherever it already
// finished correctly.
setTimeout(() => {
  document.querySelectorAll(".line").forEach((line) => {
    line.style.clipPath = "inset(0 0 0 0)";
  });
}, 2200);
