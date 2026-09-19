const STORAGE_KEY = "lapis-planner-tasks-v1";
const PROFILE_KEY = "lapis-planner-profile-v1";
const THEME_KEY = "lapis-planner-theme-v1";
const $ = (selector) => document.querySelector(selector);

const BACKGROUNDS = [
  { id: "midnight", name: "Midnight", price: 0, colors: ["#080b16", "#312e81"] },
  { id: "sunset", name: "Sunset", price: 20, colors: ["#7c2d3d", "#f59e0b"] },
  { id: "forest", name: "Forest", price: 35, colors: ["#102a2a", "#4d7c0f"] },
  { id: "aurora", name: "Aurora", price: 45, colors: ["#164e63", "#6d28d9"] },
  { id: "clouds", name: "Clouds", price: 55, colors: ["#93c5fd", "#c4b5fd"] },
  { id: "neon", name: "Neon", price: 65, colors: ["#160b35", "#ec4899", "#22d3ee"] },
  { id: "gamer", name: "Gamer", price: 75, colors: ["#111827", "#22c55e", "#7c3aed"] },
  { id: "pixel", name: "Pixel", price: 85, colors: ["#172554", "#f472b6", "#facc15"] },
  { id: "one-piece", name: "One Piece", price: 100, colors: ["#0c4a6e", "#facc15", "#ef4444"] },
  { id: "longyearbyen", name: "Longyearbyen · Svalbard", price: 120, colors: ["#172554", "#67e8f9", "#f8fafc"] }
];

let tasks = load(STORAGE_KEY, []).map(normalizeTask);
let profile = load(PROFILE_KEY, {
  coins: 0, goal: "Finish 3 important tasks this week", goalTarget: 3,
  purchasedBackgrounds: ["midnight"], selectedBackground: "midnight", useCase: ""
});
let filter = "all";
let sortMode = "newest";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function saveProfile() { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); }
function id() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function normalizeTask(task) {
  return { id: String(task.id || id()), title: String(task.title || "Untitled task"),
    category: String(task.category || "other"), priority: String(task.priority || "medium"),
    done: Boolean(task.done), createdAt: Number(task.createdAt) || Date.now(), completedAt: task.completedAt || null };
}
function escape(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function dateKey(value) { return new Date(value).toISOString().slice(0, 10); }
function notify(message) {
  let toast = $("#toast");
  if (!toast) { toast = document.createElement("div"); toast.id = "toast"; document.body.append(toast); }
  toast.textContent = message; toast.hidden = false; clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { toast.hidden = true; }, 2200);
}
function currentStreak() {
  const dates = new Set(tasks.filter(t => t.done && t.completedAt).map(t => dateKey(t.completedAt)));
  let day = new Date(), count = 0;
  while (dates.has(dateKey(day))) { count++; day.setDate(day.getDate() - 1); }
  return count;
}
function weekProgress() {
  const start = new Date(); const day = start.getDay();
  start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  const completed = tasks.filter(t => t.done && t.completedAt >= start.getTime()).length;
  const target = Math.max(1, Number(profile.goalTarget) || 3);
  return { completed, target, percent: Math.min(100, completed / target * 100) };
}
function setBackground(background) {
  const colors = background.colors;
  document.body.style.background = `radial-gradient(circle at 15% 15%, ${colors[1]}66, transparent 35%), linear-gradient(135deg, ${colors[0]}, ${colors.at(-1)})`;
  document.body.dataset.background = background.id;
}
function renderShop() {
  let shop = $("#background-shop");
  if (!shop) {
    shop = document.createElement("section"); shop.id = "background-shop"; shop.className = "panel background-shop";
    shop.innerHTML = '<div class="section-head"><div><span class="eyebrow">The collection</span><h2>Backgrounds</h2></div><strong id="coin-total">0 coins</strong></div><div class="shop-grid"></div>';
    $("footer")?.before(shop);
  }
  $("#coin-total").textContent = `${profile.coins || 0} coins`;
  shop.querySelector(".shop-grid").innerHTML = BACKGROUNDS.map(bg => {
    const owned = profile.purchasedBackgrounds.includes(bg.id);
    const active = profile.selectedBackground === bg.id;
    const swatch = `linear-gradient(135deg, ${bg.colors.join(", ")})`;
    return `<button class="shop-item ${active ? "active" : ""}" data-background="${bg.id}" type="button">
      <span class="shop-swatch" style="background:${swatch}"></span><span><strong>${bg.name}</strong><small>${owned ? "Unlocked" : `${bg.price} coins`}</small></span><em>${active ? "Selected" : owned ? "Apply" : "Unlock"}</em></button>`;
  }).join("");
}
function render() {
  const query = $("#search")?.value.trim().toLowerCase() || "";
  const visible = tasks.filter(t => (filter === "all" || (filter === "done" ? t.done : !t.done)) && `${t.title} ${t.category} ${t.priority}`.toLowerCase().includes(query));
  visible.sort((a, b) => sortMode === "oldest" ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
  $("#task-list").innerHTML = visible.map(t => `<li class="task ${t.done ? "done" : ""}" data-id="${escape(t.id)}"><button class="check" data-action="toggle" type="button" aria-label="Toggle task"></button><div><div class="title">${escape(t.title)}</div><div class="meta"><span class="tag">${escape(t.category)}</span><span>${escape(t.priority)} priority</span></div></div><div class="task-actions"><button class="task-action" data-action="edit" type="button">Edit</button><button class="task-action delete" data-action="delete" type="button">Delete</button></div></li>`).join("");
  $("#empty-state")?.classList.toggle("hidden", visible.length > 0);
  const done = tasks.filter(t => t.done).length, total = tasks.length, percent = total ? Math.round(done / total * 100) : 0;
  $("#total-count").textContent = total; $("#done-count").textContent = done; $("#left-count").textContent = total - done;
  $("#progress-label").textContent = `${percent}%`; $("#progress-bar").style.width = `${percent}%`;
  $("#progress-copy").textContent = total ? `${done} of ${total} tasks completed.` : "Add a task to get started.";
  renderShop();
  const progress = weekProgress();
  $("#streak-total") && ($("#streak-total").textContent = currentStreak());
  $("#goal-title") && ($("#goal-title").textContent = profile.goal);
  $("#goal-progress-text") && ($("#goal-progress-text").textContent = `${progress.completed} / ${progress.target}`);
  $("#goal-progress-bar") && ($("#goal-progress-bar").style.width = `${progress.percent}%`);
}

$("#task-form").addEventListener("submit", event => {
  event.preventDefault(); const input = $("#task-input"), title = input.value.trim(); if (!title) return input.focus();
  tasks.unshift({ id: id(), title, category: $("#task-category")?.value || "other", priority: $("#task-priority")?.value || "medium", done: false, createdAt: Date.now(), completedAt: null });
  save(); input.value = ""; render(); input.focus(); notify("Task added");
});
$("#task-list").addEventListener("click", event => {
  const button = event.target.closest("[data-action]"), item = event.target.closest(".task"); if (!button || !item) return;
  const task = tasks.find(t => t.id === item.dataset.id); if (!task) return;
  if (button.dataset.action === "toggle") {
    task.done = !task.done; task.completedAt = task.done ? Date.now() : null;
    if (task.done) { profile.coins += 10; saveProfile(); notify("+10 coins earned"); }
  } else if (button.dataset.action === "delete") tasks = tasks.filter(t => t.id !== task.id);
  else if (button.dataset.action === "edit") { const title = prompt("Edit task", task.title); if (title?.trim()) task.title = title.trim(); }
  save(); saveProfile(); render();
});
$("#search")?.addEventListener("input", render);
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === button)); render(); }));
$("#clear-completed")?.addEventListener("click", () => { tasks = tasks.filter(t => !t.done); save(); render(); notify("Completed tasks cleared"); });
$("#new-plan")?.addEventListener("click", () => $("#task-input").focus());
$("#start-today")?.addEventListener("click", () => $("#task-input").focus());
$("#reset-data")?.addEventListener("click", () => { if (confirm("Delete all saved tasks?")) { tasks = []; save(); render(); notify("Planner reset"); } });
$("#background-shop")?.addEventListener("click", event => {
  const button = event.target.closest("[data-background]"); if (!button) return;
  const background = BACKGROUNDS.find(bg => bg.id === button.dataset.background); if (!background) return;
  const owned = profile.purchasedBackgrounds.includes(background.id);
  if (!owned) { if (profile.coins < background.price) return notify(`Need ${background.price - profile.coins} more coins`); profile.coins -= background.price; profile.purchasedBackgrounds.push(background.id); notify(`${background.name} unlocked`); }
  profile.selectedBackground = background.id; saveProfile(); setBackground(background); render();
});

const savedTheme = localStorage.getItem(THEME_KEY); if (savedTheme === "light") document.documentElement.classList.add("light");
$("#theme-toggle")?.addEventListener("click", () => { document.documentElement.classList.toggle("light"); localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("light") ? "light" : "dark"); });
setBackground(BACKGROUNDS.find(bg => bg.id === profile.selectedBackground) || BACKGROUNDS[0]);
render();
