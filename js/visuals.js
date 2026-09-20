(() => {
  const profileKey = "lapis-planner-profile-v1";
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem(profileKey)) || {}; } catch {}
  const selected = profile.selectedBackground || "midnight";
  document.body.dataset.background = selected;
  const gameImages = [
    "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1534791547706-7b57566a85ab?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80"
  ];
  const decorateGames = () => document.querySelectorAll(".game-card .game-art").forEach((art, index) => {
    art.style.backgroundImage = `linear-gradient(180deg, transparent 35%, rgba(4,8,20,.72)), url("${gameImages[index % gameImages.length]}")`;
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", `Game artwork ${index + 1}`);
  });
  decorateGames();
  new MutationObserver(decorateGames).observe(document.body, { childList: true, subtree: true });
})();
