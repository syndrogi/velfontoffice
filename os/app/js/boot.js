/**
 * Founder OS — Boot
 *
 * Runs after the topbar and hub components are ready. The synchronous
 * guard in app/index.html's <head> already redirected away if there's no
 * session at all, but sessionStorage having *something* in it proves
 * nothing by itself — devtools can fabricate a founderSession value
 * without ever knowing the passphrase. The token inside it only verifies
 * server-side (same "gate" function os/index.html used to issue it), so
 * nothing renders until that check actually passes.
 */
(function () {
  const raw = sessionStorage.getItem("founderSession");
  if (!raw) {
    window.location.replace("../index.html");
    return;
  }

  let member;
  try {
    member = JSON.parse(raw);
  } catch (err) {
    window.location.replace("../index.html");
    return;
  }

  function denyEntry() {
    sessionStorage.removeItem("founderSession");
    window.location.replace("../index.html");
  }

  if (!member.token || !window.OSGate) {
    denyEntry();
    return;
  }

  window.OSGate.verify(member.token).then((result) => {
    if (!result || !result.ok) {
      denyEntry();
      return;
    }

    if (window.FounderTopbar) window.FounderTopbar.render(member);
    if (window.FounderHub) window.FounderHub.openDefault();

    const desktop = document.getElementById("desktop");
    if (desktop) desktop.classList.add("visible");
  });
})();
