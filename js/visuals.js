(() => {
  const profileKey = "lapis-planner-profile-v1";
  const images = {
    midnight: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",
    sunset: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80",
    forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
    aurora: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=900&q=80",
    clouds: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=900&q=80",
    neon: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    gamer: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80",
    pixel: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",
    "one-piece": "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
    longyearbyen: "https://source.unsplash.com/900x600/?longyearbyen,svalbard,arctic"
  };
  const getProfile = () => { try { return JSON.parse(localStorage.getItem(profileKey)) || {}; } catch { return {}; } };
  const decorateShop = () => document.querySelectorAll(".shop-item").forEach((item) => {
    const id = item.dataset.background;
    const swatch = item.querySelector(".shop-swatch");
    if (swatch && images[id]) swatch.style.backgroundImage = `linear-gradient(180deg, transparent 25%, rgba(3,7,18,.65)), url(\"${images[id]}\")`;
  });
  const addAiLauncher = () => {
    const panel = document.querySelector("#ai-assistant");
    if (!panel || document.querySelector(".ai-fab")) return;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    const fab = document.createElement("button");
    fab.className = "ai-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Open Lapis AI assistant");
    fab.setAttribute("aria-expanded", "false");
    fab.textContent = "✦";
    const close = document.createElement("button");
    close.className = "ai-close";
    close.type = "button";
    close.setAttribute("aria-label", "Close Lapis AI assistant");
    close.textContent = "×";
    panel.prepend(close);
    const shut = () => { panel.hidden = true; panel.classList.remove("ai-open"); panel.setAttribute("aria-hidden", "true"); fab.setAttribute("aria-expanded", "false"); };
    const open = () => { panel.hidden = false; panel.classList.add("ai-open"); panel.setAttribute("aria-hidden", "false"); fab.setAttribute("aria-expanded", "true"); panel.querySelector("#ai-input")?.focus(); };
    fab.addEventListener("click", () => panel.hidden ? open() : shut());
    close.addEventListener("click", shut);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") shut(); });
    document.body.append(fab);
  };
  const sync = () => { const profile = getProfile(); document.body.dataset.background = profile.selectedBackground || "midnight"; decorateShop(); addAiLauncher(); };
  sync();
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
})();
