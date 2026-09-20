const TASKS_KEY = "lapis-planner-tasks-v1";
const PROFILE_KEY = "lapis-planner-profile-v1";
const THEME_KEY = "lapis-planner-theme-v1";
const $ = (selector) => document.querySelector(selector);
const uid = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const esc = (value) => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const BACKGROUNDS = [
  ["midnight", "Midnight", 0, ["#080b16", "#312e81"]], ["sunset", "Sunset", 20, ["#7c2d3d", "#f59e0b"]],
  ["forest", "Forest", 35, ["#102a2a", "#4d7c0f"]], ["aurora", "Aurora", 45, ["#164e63", "#6d28d9"]],
  ["clouds", "Clouds", 55, ["#93c5fd", "#c4b5fd"]], ["neon", "Neon", 65, ["#160b35", "#ec4899", "#22d3ee"]],
  ["gamer", "Gamer", 75, ["#111827", "#22c55e", "#7c3aed"]], ["pixel", "Pixel", 85, ["#172554", "#f472b6", "#facc15"]],
  ["one-piece", "One Piece", 100, ["#0c4a6e", "#facc15", "#ef4444"]], ["longyearbyen", "Longyearbyen · Svalbard", 120, ["#172554", "#67e8f9", "#f8fafc"]]
].map(([id, name, price, colors]) => ({ id, name, price, colors }));
const GAMES = [
  ["neon-drift", "Neon Drift", 7, "Dodge falling blocks", 25], ["orb-breaker", "Orb Breaker", 14, "Click glowing orbs", 30],
  ["pixel-punch", "Pixel Punch", 21, "Hit targets quickly", 35], ["task-tetris", "Task Tetris", 28, "Survive falling blocks", 40],
  ["astro-dash", "Astro Dash", 35, "Dodge the asteroids", 45], ["memory-run", "Memory Run", 42, "Repeat the sequence", 50]
].map(([id, name, unlock, description, reward]) => ({ id, name, unlock, description, reward }));

let tasks = load(TASKS_KEY, []).map(task => ({ id: String(task.id || uid()), title: String(task.title || "Untitled task"), category: String(task.category || "other"), priority: String(task.priority || "medium"), done: Boolean(task.done), createdAt: Number(task.createdAt) || Date.now(), dueDate: task.dueDate || "", reminder: task.reminder || "", completedAt: task.completedAt || null }));
let profile = { coins: 0, selectedBackground: "midnight", purchasedBackgrounds: ["midnight"], ...load(PROFILE_KEY, {}) };
let filter = "all";
let activeGame = null;

function notify(message) { let toast = $("#toast"); if (!toast) { toast = document.createElement("div"); toast.id = "toast"; Object.assign(toast.style, { position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 30, padding: "10px 16px", borderRadius: "12px", background: "var(--accent)", color: "#101426", fontWeight: 700 }); document.body.append(toast); } toast.textContent = message; toast.hidden = false; clearTimeout(notify.timer); notify.timer = setTimeout(() => { toast.hidden = true; }, 2400); }
function dayKey(value) { return new Date(value).toISOString().slice(0, 10); }
function streak() { const days = new Set(tasks.filter(t => t.done && t.completedAt).map(t => dayKey(t.completedAt))); let d = new Date(), total = 0; while (days.has(dayKey(d))) { total++; d.setDate(d.getDate() - 1); } return total; }
function currentMonth() { return window.calendarMonth || new Date(); }
function applyBackground() { const bg = BACKGROUNDS.find(item => item.id === profile.selectedBackground) || BACKGROUNDS[0]; document.body.style.background = `radial-gradient(circle at 15% 15%, ${bg.colors[1]}66, transparent 35%), linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors.at(-1)})`; }

function addPlannerControls() {
  const form = $("#task-form");
  if (form && !$("#task-due-date")) form.insertAdjacentHTML("beforeend", `<input id="task-due-date" type="date" aria-label="Due date"><input id="task-reminder" type="datetime-local" aria-label="Reminder"><button class="ghost-btn" type="submit">Add</button>`);
}
function renderCalendar() {
  let section = $("#calendar"); if (!section) { section = document.createElement("section"); section.id = "calendar"; section.className = "panel generated-section"; $("footer")?.before(section); }
  const month = currentMonth(), year = month.getFullYear(), monthIndex = month.getMonth(), first = new Date(year, monthIndex, 1), days = new Date(year, monthIndex + 1, 0).getDate(), offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: offset + days }, (_, index) => { const day = index - offset + 1; if (day < 1) return `<span class="calendar-day empty"></span>`; const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const entries = tasks.filter(t => t.dueDate === key); return `<button class="calendar-day ${key === dayKey(Date.now()) ? "today" : ""}" data-date="${key}" type="button"><b>${day}</b>${entries.slice(0, 2).map(t => `<small>${esc(t.title)}</small>`).join("")}</button>`; }).join("");
  section.innerHTML = `<div class="section-head"><div><span class="eyebrow">Schedule</span><h2>Calendar</h2></div><div><button class="filter" data-calendar="prev" type="button">←</button><strong>${month.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong><button class="filter" data-calendar="next" type="button">→</button></div></div><div class="calendar-week"><b>Mon</b><b>Tue</b><b>Wed</b><b>Thu</b><b>Fri</b><b>Sat</b><b>Sun</b></div><div class="calendar-grid">${cells}</div>`;
  section.querySelectorAll("[data-calendar]").forEach(button => button.onclick = () => { month.setMonth(month.getMonth() + (button.dataset.calendar === "next" ? 1 : -1)); window.calendarMonth = month; renderCalendar(); });
  section.querySelectorAll("[data-date]").forEach(button => button.onclick = () => { const task = tasks.find(t => t.dueDate === button.dataset.date); if (task) notify(`${task.title}${task.reminder ? ` · reminder ${new Date(task.reminder).toLocaleString()}` : ""}`); });
}
function renderReminders() {
  let section = $("#reminders"); if (!section) { section = document.createElement("section"); section.id = "reminders"; section.className = "panel generated-section"; $("footer")?.before(section); }
  const upcoming = tasks.filter(t => t.reminder && !t.done).sort((a, b) => new Date(a.reminder) - new Date(b.reminder));
  section.innerHTML = `<div class="section-head"><div><span class="eyebrow">Stay on track</span><h2>Reminders</h2></div><span>${upcoming.length} upcoming</span></div>${upcoming.length ? `<ul class="reminder-list">${upcoming.map(t => `<li><span>⏰</span><div><strong>${esc(t.title)}</strong><small>${new Date(t.reminder).toLocaleString()}</small></div></li>`).join("")}</ul>` : `<p class="empty">No reminders yet. Add one when creating a task.</p>`;
}
function renderShop() {
  let section = $("#background-shop"); if (!section) { section = document.createElement("section"); section.id = "background-shop"; section.className = "panel generated-section"; $("footer")?.before(section); }
  section.innerHTML = `<div class="section-head"><div><span class="eyebrow">The collection</span><h2>Backgrounds</h2></div><strong>${profile.coins || 0} coins</strong></div><div class="shop-grid">${BACKGROUNDS.map(bg => { const owned = profile.purchasedBackgrounds.includes(bg.id); return `<button class="shop-item ${profile.selectedBackground === bg.id ? "active" : ""}" data-background="${bg.id}" type="button"><span class="shop-swatch" style="background:linear-gradient(135deg,${bg.colors.join(",")})"></span><span><strong>${bg.name}</strong><small>${owned ? "Unlocked" : `${bg.price} coins`}</small></span><em>${profile.selectedBackground === bg.id ? "Selected" : owned ? "Apply" : "Unlock"}</em></button>`; }).join("")}</div>`;
  section.querySelectorAll("[data-background]").forEach(button => button.onclick = () => { const bg = BACKGROUNDS.find(item => item.id === button.dataset.background); if (!profile.purchasedBackgrounds.includes(bg.id)) { if (profile.coins < bg.price) return notify(`Need ${bg.price - profile.coins} more coins`); profile.coins -= bg.price; profile.purchasedBackgrounds.push(bg.id); } profile.selectedBackground = bg.id; save(PROFILE_KEY, profile); applyBackground(); renderShop(); notify(`${bg.name} selected`); });
}
function renderArcade() {
  let section = $("#arcade"); if (!section) { section = document.createElement("section"); section.id = "arcade"; section.className = "panel generated-section"; $("footer")?.before(section); }
  const days = streak(); section.innerHTML = `<div class="section-head"><div><span class="eyebrow">Streak arcade</span><h2>Mini games</h2><p>All games are 2D Canvas games that play in your browser.</p></div><strong>${days} day streak</strong></div><div class="game-grid">${GAMES.map(game => { const open = days >= game.unlock; return `<article class="game-card ${open ? "unlocked" : "locked"}"><div class="game-art">${open ? "▶" : "🔒"}</div><div><h3>${game.name}</h3><p>${game.description}</p><small>${open ? `Win up to ${game.reward} coins` : `Unlock at ${game.unlock} days`}</small></div><button class="primary-btn" data-game="${game.id}" type="button" ${open ? "" : "disabled"}>${open ? "Play" : "Locked"}</button></article>`; }).join("")}</div>`;
  section.querySelectorAll("[data-game]").forEach(button => button.onclick = () => openGame(button.dataset.game));
}
function render() {
  const query = $("#search")?.value.trim().toLowerCase() || "";
  const visible = tasks.filter(t => (filter === "all" || (filter === "done" ? t.done : !t.done)) && `${t.title} ${t.category} ${t.priority}`.toLowerCase().includes(query)).sort((a, b) => b.createdAt - a.createdAt);
  $("#task-list").innerHTML = visible.map(t => `<li class="task ${t.done ? "done" : ""}" data-id="${esc(t.id)}"><button class="check" data-action="toggle" type="button" aria-label="Toggle task"></button><div><div class="title">${esc(t.title)}</div><div class="meta"><span class="tag">${esc(t.category)}</span><span>${esc(t.priority)} priority</span>${t.dueDate ? `<span>due ${t.dueDate}</span>` : ""}</div></div><div class="task-actions"><button class="task-action" data-action="edit" type="button">Edit</button><button class="task-action delete" data-action="delete" type="button">Delete</button></div></li>`).join("");
  $("#empty-state")?.classList.toggle("hidden", visible.length > 0); const done = tasks.filter(t => t.done).length, total = tasks.length, percent = total ? Math.round(done / total * 100) : 0;
  $("#total-count").textContent = total; $("#done-count").textContent = done; $("#left-count").textContent = total - done; $("#progress-label").textContent = `${percent}%`; $("#progress-bar").style.width = `${percent}%`; $("#progress-copy").textContent = total ? `${done} of ${total} tasks completed.` : "Add a task to get started.";
  renderCalendar(); renderReminders(); renderShop(); renderArcade();
}
function openGame(gameId) {
  const game = GAMES.find(item => item.id === gameId); let modal = $("#game-modal"); if (!modal) { modal = document.createElement("div"); modal.id = "game-modal"; modal.className = "game-modal"; document.body.append(modal); }
  modal.hidden = false; modal.innerHTML = `<div class="game-window"><header><div><span class="eyebrow">2D arcade</span><h2>${game.name}</h2></div><button class="icon-btn" id="close-game" type="button">×</button></header><p id="game-status">Click the canvas to score points. Move with A/D or arrow keys.</p><canvas id="game-canvas" width="640" height="360"></canvas><button class="primary-btn" id="restart-game" type="button">Restart</button></div>`; $("#close-game").onclick = closeGame; $("#restart-game").onclick = () => playGame(game); playGame(game);
}
function closeGame() { if (activeGame) activeGame.stop = true; $("#game-modal").hidden = true; }
function playGame(game) {
  if (activeGame) activeGame.stop = true; const canvas = $("#game-canvas"), ctx = canvas.getContext("2d"), status = $("#game-status"); let state = { stop: false, score: 0, start: performance.now(), x: 320, target: null }; activeGame = state;
  const click = event => { const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * 640 / rect.width, y = (event.clientY - rect.top) * 360 / rect.height; if (!state.target || Math.hypot(x - state.target.x, y - state.target.y) < state.target.r) state.score++; state.target = null; }; canvas.onclick = click;
  const key = event => { if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") state.x -= 18; if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") state.x += 18; state.x = Math.max(20, Math.min(620, state.x)); }; window.addEventListener("keydown", key);
  function frame(now) { if (state.stop) { window.removeEventListener("keydown", key); return; } const seconds = Math.floor((now - state.start) / 1000); if (seconds >= 20) { const reward = Math.max(5, Math.min(game.reward, state.score * 3)); profile.coins += reward; save(PROFILE_KEY, profile); status.textContent = `Game over: ${state.score} points. +${reward} coins`; window.removeEventListener("keydown", key); renderShop(); return; } ctx.fillStyle = "#080b16"; ctx.fillRect(0, 0, 640, 360); ctx.fillStyle = "#63e6d5"; ctx.font = "16px monospace"; ctx.fillText(`SCORE ${state.score} · ${20 - seconds}s`, 16, 24); if (["neon-drift", "task-tetris", "astro-dash"].includes(game.id)) { if (Math.random() < .05) state.target = { x: Math.random() * 600 + 20, y: -10, r: 16 }; if (state.target) { state.target.y += 4; ctx.fillStyle = "#f472b6"; ctx.fillRect(state.target.x - state.target.r, state.target.y, state.target.r * 2, state.target.r * 2); if (state.target.y > 350) state.target = null; } ctx.fillStyle = "#22d3ee"; ctx.fillRect(state.x - 14, 320, 28, 20); } else { if (!state.target || now - state.target.created > 1000) state.target = { x: 30 + Math.random() * 580, y: 50 + Math.random() * 260, r: 18, created: now }; ctx.fillStyle = game.id === "pixel-punch" ? "#f97316" : "#a78bfa"; ctx.beginPath(); ctx.arc(state.target.x, state.target.y, state.target.r, 0, Math.PI * 2); ctx.fill(); } requestAnimationFrame(frame); } requestAnimationFrame(frame);
}

addPlannerControls();
$("#task-form").addEventListener("submit", event => { event.preventDefault(); const input = $("#task-input"), title = input.value.trim(); if (!title) return input.focus(); tasks.unshift({ id: uid(), title, category: $("#task-category")?.value || "other", priority: $("#task-priority")?.value || "medium", dueDate: $("#task-due-date")?.value || "", reminder: $("#task-reminder")?.value || "", done: false, createdAt: Date.now(), completedAt: null }); save(TASKS_KEY, tasks); input.value = ""; $("#task-due-date").value = ""; $("#task-reminder").value = ""; render(); notify("Task added"); });
$("#task-list").addEventListener("click", event => { const button = event.target.closest("[data-action]"), item = event.target.closest(".task"); if (!button || !item) return; const task = tasks.find(t => t.id === item.dataset.id); if (!task) return; if (button.dataset.action === "toggle") { task.done = !task.done; task.completedAt = task.done ? Date.now() : null; if (task.done) { profile.coins += 10; save(PROFILE_KEY, profile); notify("+10 coins earned"); } } else if (button.dataset.action === "delete") tasks = tasks.filter(t => t.id !== task.id); else if (button.dataset.action === "edit") { const title = prompt("Edit task", task.title); if (title?.trim()) task.title = title.trim(); } save(TASKS_KEY, tasks); render(); });
$("#search")?.addEventListener("input", render); document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button)); render(); })); $("#clear-completed")?.addEventListener("click", () => { tasks = tasks.filter(t => !t.done); save(TASKS_KEY, tasks); render(); notify("Completed tasks cleared"); }); $("#new-plan")?.addEventListener("click", () => $("#task-input").focus()); $("#start-today")?.addEventListener("click", () => $("#task-input").focus()); $("#reset-data")?.addEventListener("click", () => { if (confirm("Delete all saved tasks?")) { tasks = []; save(TASKS_KEY, tasks); render(); notify("Planner reset"); } });
const savedTheme = localStorage.getItem(THEME_KEY); if (savedTheme === "light") document.documentElement.classList.add("light"); $("#theme-toggle")?.addEventListener("click", () => { document.documentElement.classList.toggle("light"); localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("light") ? "light" : "dark"); });
setInterval(() => { const now = Date.now(); tasks.filter(t => t.reminder && !t.done && !t.reminded && new Date(t.reminder).getTime() <= now).forEach(t => { t.reminded = true; notify(`Reminder: ${t.title}`); if ("Notification" in window && Notification.permission === "granted") new Notification("Lapis reminder", { body: t.title }); save(TASKS_KEY, tasks); }); }, 30000);
applyBackground(); render();
