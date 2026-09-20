const TASKS_KEY = "lapis-planner-tasks-v1";
const PROFILE_KEY = "lapis-planner-profile-v1";
const THEME_KEY = "lapis-planner-theme-v1";
const PRESETS_KEY = "lapis-planner-presets-v1";
const $ = (selector) => document.querySelector(selector);
const uid = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const esc = (value) => String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const dayKey = (value) => new Date(value).toISOString().slice(0, 10);

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

let tasks = load(TASKS_KEY, []).map((task) => ({
  id: String(task.id || uid()),
  title: String(task.title || "Untitled task"),
  category: String(task.category || "other"),
  priority: String(task.priority || "medium"),
  done: Boolean(task.done),
  createdAt: Number(task.createdAt) || Date.now(),
  dueDate: task.dueDate || "",
  reminder: task.reminder || "",
  completedAt: task.completedAt || null,
  routineId: task.routineId || "",
  reminded: Boolean(task.reminded)
}));

let routines = Array.isArray(load(PRESETS_KEY, []))
  ? load(PRESETS_KEY, []).map(normalizePreset)
  : [];

let profile = { coins: 0, selectedBackground: "midnight", purchasedBackgrounds: ["midnight"], ...load(PROFILE_KEY, {}) };
let filter = "all";
let activeGame = null;
let calendarMonth = new Date();

function normalizePreset(preset) {
  return {
    id: String(preset.id || uid()),
    name: String(preset.name || "Routine"),
    tasks: Array.isArray(preset.tasks) ? preset.tasks.map((task) => ({
      title: String(task.title || "Untitled task"),
      category: String(task.category || "personal"),
      priority: String(task.priority || "medium"),
      time: String(task.time || "")
    })) : []
  };
}

function notify(message) {
  let toast = $("#toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "30",
      padding: "10px 16px",
      borderRadius: "12px",
      background: "var(--accent)",
      color: "#101426",
      fontWeight: "700",
      boxShadow: "var(--shadow)"
    });
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { toast.hidden = true; }, 2400);
}

function streak() {
  const dates = new Set(tasks.filter((task) => task.done && task.completedAt).map((task) => dayKey(task.completedAt)));
  let cursor = new Date(); let count = 0;
  while (dates.has(dayKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

function applyBackground() {
  const bg = BACKGROUNDS.find((item) => item.id === profile.selectedBackground) || BACKGROUNDS[0];
  document.body.style.background = `radial-gradient(circle at 15% 15%, ${bg.colors[1]}66, transparent 35%), linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors.at(-1)})`;
}

function addPlannerControls() {
  const form = $("#task-form");
  if (form && !$("#task-due-date")) {
    form.insertAdjacentHTML("beforeend", '<input id="task-due-date" type="date" aria-label="Task due date"><input id="task-reminder" type="datetime-local" aria-label="Task reminder">');
  }
}

function renderCalendar() {
  let section = $("#calendar");
  if (!section) {
    section = document.createElement("section");
    section.id = "calendar";
    section.className = "panel generated-section";
    $("footer")?.before(section);
  }

  const now = new Date(calendarMonth), year = now.getFullYear(), monthIndex = now.getMonth();
  const first = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;

  const cells = Array.from({ length: offset + totalDays }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1) return '<span class="calendar-day empty"></span>';
    const activeDate = new Date(year, monthIndex, day);
    const key = dayKey(activeDate);
    const entries = tasks.filter((task) => task.dueDate === key).slice(0, 2);
    return `<button class="calendar-day ${key === dayKey(new Date()) ? "today" : ""}" data-date="${key}" type="button"><b>${day}</b>${entries.map((task) => `<small>${esc(task.title)}</small>`).join("")}</button>`;
  }).join("");

  section.innerHTML = `
    <div class="section-head">
      <div><span class="eyebrow">Schedule</span><h2>Calendar</h2></div>
      <div class="calendar-nav">
        <button class="filter" data-calendar="prev" type="button">←</button>
        <strong>${now.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
        <button class="filter" data-calendar="next" type="button">→</button>
      </div>
    </div>
    <div class="calendar-week"><b>Mon</b><b>Tue</b><b>Wed</b><b>Thu</b><b>Fri</b><b>Sat</b><b>Sun</b></div>
    <div class="calendar-grid">${cells}</div>
  `;

  section.querySelectorAll("[data-calendar]").forEach((button) => {
    button.onclick = () => {
      const direction = button.dataset.calendar === "next" ? 1 : -1;
      calendarMonth = new Date(year, monthIndex + direction, 1);
      renderCalendar();
    };
  });

  section.querySelectorAll("[data-date]").forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.date;
      const task = tasks.find((entry) => entry.dueDate === key);
      if (task) notify(`${task.title}${task.reminder ? ` • ${new Date(task.reminder).toLocaleString()}` : ""}`);
    };
  });
}

function renderReminders() {
  let section = $("#reminders");
  if (!section) {
    section = document.createElement("section");
    section.id = "reminders";
    section.className = "panel generated-section";
    $("footer")?.before(section);
  }

  const upcoming = tasks.filter((task) => task.reminder && !task.done).sort((a, b) => new Date(a.reminder) - new Date(b.reminder));
  section.innerHTML = `
    <div class="section-head">
      <div><span class="eyebrow">Stay on track</span><h2>Reminders</h2></div>
      <span>${upcoming.length} upcoming</span>
    </div>
    ${upcoming.length ? `<ul class="reminder-list">${upcoming.map((task) => `<li><span>⏰</span><div><strong>${esc(task.title)}</strong><small>${new Date(task.reminder).toLocaleString()}</small></div></li>`).join("")}</ul>` : '<p class="empty-copy">No reminders yet. Add one when creating a task.</p>'}
  `;
}

function renderShop() {
  let section = $("#background-shop");
  if (!section) {
    section = document.createElement("section");
    section.id = "background-shop";
    section.className = "panel generated-section";
    $("footer")?.before(section);
  }

  section.innerHTML = `
    <div class="section-head">
      <div><span class="eyebrow">The collection</span><h2>Backgrounds</h2></div>
      <strong>${profile.coins || 0} coins</strong>
    </div>
    <div class="shop-grid">
      ${BACKGROUNDS.map((background) => {
        const owned = profile.purchasedBackgrounds.includes(background.id);
        const selected = profile.selectedBackground === background.id;
        return `<button class="shop-item ${selected ? "active" : ""}" data-background="${background.id}" type="button"><span class="shop-swatch" style="background:linear-gradient(135deg,${background.colors.join(",")})"></span><span><strong>${background.name}</strong><small>${owned ? "Unlocked" : `${background.price} coins`}</small></span><em>${selected ? "Selected" : owned ? "Apply" : "Unlock"}</em></button>`;
      }).join("")}
    </div>
  `;

  section.querySelectorAll("[data-background]").forEach((button) => {
    button.onclick = () => {
      const bg = BACKGROUNDS.find((item) => item.id === button.dataset.background);
      if (!bg) return;

      if (!profile.purchasedBackgrounds.includes(bg.id)) {
        if (profile.coins < bg.price) return notify(`Need ${bg.price - profile.coins} more coins`);
        profile.coins -= bg.price;
        profile.purchasedBackgrounds.push(bg.id);
      }

      profile.selectedBackground = bg.id;
      save(PROFILE_KEY, profile);
      applyBackground();
      renderShop();
      notify(`${bg.name} selected`);
    };
  });
}

function renderArcade() {
  let section = $("#arcade");
  if (!section) {
    section = document.createElement("section");
    section.id = "arcade";
    section.className = "panel generated-section";
    $("footer")?.before(section);
  }

  const currentStreak = streak();
  section.innerHTML = `
    <div class="section-head">
      <div><span class="eyebrow">Streak arcade</span><h2>Mini games</h2><p>All games are 2D Canvas games that play directly in the browser.</p></div>
      <strong>${currentStreak} day streak</strong>
    </div>
    <div class="game-grid">
      ${GAMES.map((game) => {
        const unlocked = currentStreak >= game.unlock;
        return `<article class="game-card ${unlocked ? "unlocked" : "locked"}"><div class="game-art">${unlocked ? "▶" : "🔒"}</div><div><h3>${game.name}</h3><p>${game.description}</p><small>${unlocked ? `Win up to ${game.reward} coins` : `Unlock at ${game.unlock} days`}</small></div><button class="primary-btn" data-game="${game.id}" type="button" ${unlocked ? "" : "disabled"}>${unlocked ? "Play" : "Locked"}</button></article>`;
      }).join("")}
    </div>
  `;

  section.querySelectorAll("[data-game]").forEach((button) => {
    button.onclick = () => openGame(button.dataset.game);
  });
}

function renderRoutines() {
  let section = $("#routines");
  if (!section) {
    section = document.createElement("section");
    section.id = "routines";
    section.className = "panel generated-section";
    $("footer")?.before(section);
  }

  if (!routines.length) {
    section.innerHTML = `
      <div class="section-head">
        <div><span class="eyebrow">Daily flow</span><h2>Routines</h2></div>
        <button class="primary-btn" data-routine-action="create" type="button">New routine</button>
      </div>
      <div class="empty-copy compact">
        Create a morning, prayer, study, or night routine and add it to today in one tap.
      </div>
    `;
  } else {
    section.innerHTML = `
      <div class="section-head">
        <div><span class="eyebrow">Daily flow</span><h2>Routines</h2></div>
        <button class="primary-btn" data-routine-action="create" type="button">New routine</button>
      </div>
      <div class="routine-grid">
        ${routines.map((preset) => `
          <article class="routine-card">
            <div class="routine-header">
              <div>
                <strong>${esc(preset.name)}</strong>
                <span>${preset.tasks.length} tasks</span>
              </div>
              <div class="routine-actions">
                <button class="mini-btn" data-routine-action="add-${preset.id}" type="button">Add today</button>
                <button class="mini-btn" data-routine-action="edit-${preset.id}" type="button">Edit</button>
                <button class="mini-btn danger" data-routine-action="delete-${preset.id}" type="button">Delete</button>
              </div>
            </div>
            <ul class="routine-tasks">
              ${preset.tasks.slice(0, 3).map((task) => `<li><span>${esc(task.title)}</span><small>${task.time || "Any time"}</small></li>`).join("")}
              ${preset.tasks.length > 3 ? `<li class="routine-more">+${preset.tasks.length - 3} more</li>` : ""}
            </ul>
          </article>
        `).join("")}
      </div>
    `;
  }

  section.querySelectorAll("[data-routine-action]").forEach((button) => {
    const action = button.dataset.routineAction;
    if (action === "create") {
      button.onclick = createRoutinePreset;
      return;
    }
    const presetId = action.replace(/^add-|^edit-|^delete-/, "");
    const preset = routines.find((item) => item.id === presetId);
    if (!preset) return;

    if (action.startsWith("add-")) button.onclick = () => addPresetToToday(preset.id);
    if (action.startsWith("edit-")) button.onclick = () => editRoutinePreset(preset.id);
    if (action.startsWith("delete-")) button.onclick = () => deleteRoutinePreset(preset.id);
  });
}

function createRoutinePreset() {
  const name = window.prompt("Name your routine preset", "Morning flow");
  if (!name || !name.trim()) return;

  const rawInput = window.prompt(
    "Add one task per line. Format: Task name | category | priority | time\nExample:\nBrush teeth | health | high | 07:15\nPray Fajr | faith | high | 05:15",
    "Brush teeth | health | high | 07:15\nPray Fajr | faith | high | 05:15"
  );

  if (!rawInput || !rawInput.trim()) return;

  const tasks = rawInput.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [title, category = "personal", priority = "medium", time = ""] = line.split("|").map((part) => part.trim());
    return { title, category, priority, time };
  }).filter((task) => task.title);

  if (!tasks.length) {
    notify("Add at least one task to the preset");
    return;
  }

  routines.push({ id: uid(), name: name.trim(), tasks });
  save(PRESETS_KEY, routines);
  renderRoutines();
  notify("Routine saved");
}

function editRoutinePreset(presetId) {
  const preset = routines.find((item) => item.id === presetId);
  if (!preset) return;
  const name = window.prompt("Rename this routine", preset.name);
  if (name && name.trim()) preset.name = name.trim();

  const rawInput = window.prompt(
    "Edit the tasks. One per line. Format: Task name | category | priority | time",
    preset.tasks.map((task) => `${task.title} | ${task.category} | ${task.priority}${task.time ? ` | ${task.time}` : ""}`).join("\n")
  );

  if (rawInput && rawInput.trim()) {
    preset.tasks = rawInput.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [title, category = "personal", priority = "medium", time = ""] = line.split("|").map((part) => part.trim());
      return { title, category, priority, time };
    }).filter((task) => task.title);
  }

  save(PRESETS_KEY, routines);
  renderRoutines();
  notify("Routine updated");
}

function deleteRoutinePreset(presetId) {
  const preset = routines.find((item) => item.id === presetId);
  if (!preset) return;
  if (!window.confirm(`Delete the routine “${preset.name}”?`)) return;
  routines = routines.filter((item) => item.id !== presetId);
  save(PRESETS_KEY, routines);
  renderRoutines();
  notify("Routine deleted");
}

function addPresetToToday(presetId) {
  const preset = routines.find((item) => item.id === presetId);
  if (!preset) return;

  const today = new Date();
  const dateValue = dayKey(today);
  const existingToday = tasks.filter((task) => task.routineId === presetId && task.dueDate === dateValue).map((task) => task.title.toLowerCase());

  let added = 0;
  preset.tasks.forEach((task) => {
    const title = task.title.trim();
    if (!title || existingToday.includes(title.toLowerCase())) return;

    const parsedReminder = task.time ? `${dateValue}T${task.time}` : "";
    tasks.unshift({
      id: uid(),
      title,
      category: task.category || "personal",
      priority: task.priority || "medium",
      done: false,
      createdAt: Date.now(),
      dueDate: dateValue,
      reminder: parsedReminder,
      completedAt: null,
      routineId: presetId,
      reminded: false
    });
    added += 1;
  });

  save(TASKS_KEY, tasks);
  render();
  notify(added ? `${preset.name} added to today` : "Already added today");
}

function render() {
  const query = $("#search")?.value.trim().toLowerCase() || "";
  const visible = tasks.filter((task) => (filter === "all" || (filter === "done" ? task.done : !task.done)) && `${task.title} ${task.category} ${task.priority}`.toLowerCase().includes(query)).sort((a, b) => b.createdAt - a.createdAt);

  $("#task-list").innerHTML = visible.map((task) => `
    <li class="task ${task.done ? "done" : ""}" data-id="${esc(task.id)}">
      <button class="check" data-action="toggle" type="button" aria-label="Toggle task"></button>
      <div>
        <div class="title">${esc(task.title)}</div>
        <div class="meta">
          <span class="tag">${esc(task.category)}</span>
          <span>${esc(task.priority)} priority</span>
          ${task.dueDate ? `<span>due ${task.dueDate}</span>` : ""}
          ${task.reminder ? `<span>reminder ${new Date(task.reminder).toLocaleString()}</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action" data-action="edit" type="button">Edit</button>
        <button class="task-action delete" data-action="delete" type="button">Delete</button>
      </div>
    </li>`).join("");

  $("#empty-state")?.classList.toggle("hidden", visible.length > 0);
  const done = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#total-count").textContent = total;
  $("#done-count").textContent = done;
  $("#left-count").textContent = total - done;
  $("#progress-label").textContent = `${percent}%`;
  $("#progress-bar").style.width = `${percent}%`;
  $("#progress-copy").textContent = total ? `${done} of ${total} tasks completed.` : "Add a task to get started.";

  renderCalendar();
  renderReminders();
  renderShop();
  renderArcade();
  renderRoutines();
}

function openGame(gameId) {
  const game = GAMES.find((item) => item.id === gameId);
  if (!game) return;

  let modal = $("#game-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "game-modal";
    modal.className = "game-modal";
    document.body.append(modal);
  }

  modal.hidden = false;
  modal.innerHTML = `<div class="game-window"><header><div><span class="eyebrow">2D arcade</span><h2>${game.name}</h2></div><button class="icon-btn" id="close-game" type="button">×</button></header><p id="game-status">Click the canvas to score points. Move with A/D or arrow keys.</p><canvas id="game-canvas" width="640" height="360"></canvas><button class="primary-btn" id="restart-game" type="button">Restart</button></div>`;

  $("#close-game").onclick = () => { if (activeGame) activeGame.stop = true; modal.hidden = true; };
  $("#restart-game").onclick = () => playGame(game);
  playGame(game);
}

function playGame(game) {
  if (activeGame) activeGame.stop = true;
  const canvas = $("#game-canvas"), ctx = canvas.getContext("2d"), status = $("#game-status");
  let state = { stop: false, score: 0, start: performance.now(), x: 320, target: null };
  activeGame = state;

  const keyHandler = (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") state.x -= 18;
    if (key === "arrowright" || key === "d") state.x += 18;
    state.x = Math.max(20, Math.min(620, state.x));
  };

  window.addEventListener("keydown", keyHandler);
  canvas.onclick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 640 / rect.width;
    const y = (event.clientY - rect.top) * 360 / rect.height;
    if (!state.target || Math.hypot(x - state.target.x, y - state.target.y) < state.target.r) {
      state.score += 1;
      state.target = null;
    }
  };

  function frame(now) {
    if (state.stop) {
      window.removeEventListener("keydown", keyHandler);
      return;
    }

    const seconds = Math.floor((now - state.start) / 1000);
    if (seconds >= 20) {
      const reward = Math.max(5, Math.min(game.reward, state.score * 3));
      profile.coins += reward;
      save(PROFILE_KEY, profile);
      status.textContent = `Game over: ${state.score} points. +${reward} coins`;
      renderShop();
      notify(`+${reward} coins from ${game.name}`);
      window.removeEventListener("keydown", keyHandler);
      return;
    }

    ctx.fillStyle = "#080b16";
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = "#63e6d5";
    ctx.font = "16px monospace";
    ctx.fillText(`SCORE ${state.score} • ${20 - seconds}s`, 16, 24);

    if (["neon-drift", "task-tetris", "astro-dash"].includes(game.id)) {
      if (Math.random() < 0.05) state.target = { x: Math.random() * 600 + 20, y: -10, r: 16 };
      if (state.target) {
        state.target.y += 4;
        ctx.fillStyle = "#f472b6";
        ctx.fillRect(state.target.x - state.target.r, state.target.y, state.target.r * 2, state.target.r * 2);
        if (state.target.y > 350) state.target = null;
      }
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(state.x - 14, 320, 28, 20);
    } else {
      if (!state.target || now - state.target.created > 1000) {
        state.target = { x: 30 + Math.random() * 580, y: 50 + Math.random() * 260, r: 18, created: now };
      }
      ctx.fillStyle = game.id === "pixel-punch" ? "#f97316" : "#a78bfa";
      ctx.beginPath();
      ctx.arc(state.target.x, state.target.y, state.target.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

$("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#task-input");
  const title = input.value.trim();
  if (!title) return input.focus();

  tasks.unshift({
    id: uid(),
    title,
    category: $("#task-category")?.value || "other",
    priority: $("#task-priority")?.value || "medium",
    done: false,
    createdAt: Date.now(),
    dueDate: $("#task-due-date")?.value || "",
    reminder: $("#task-reminder")?.value || "",
    completedAt: null,
    routineId: "",
    reminded: false
  });

  save(TASKS_KEY, tasks);
  input.value = "";
  $("#task-due-date").value = "";
  $("#task-reminder").value = "";
  render();
  notify("Task added");
});

$("#task-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  const item = event.target.closest(".task");
  if (!button || !item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;
    if (task.done) {
      profile.coins += 10;
      save(PROFILE_KEY, profile);
      notify("+10 coins earned");
    }
  }
  if (button.dataset.action === "delete") tasks = tasks.filter((entry) => entry.id !== task.id);
  if (button.dataset.action === "edit") {
    const title = window.prompt("Edit task", task.title);
    if (title?.trim()) task.title = title.trim();
  }

  save(TASKS_KEY, tasks);
  render();
});

$("#search")?.addEventListener("input", render);
document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.filter) {
      filter = button.dataset.filter;
    }
    document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

$("#clear-completed")?.addEventListener("click", () => {
  const removed = tasks.filter((task) => task.done).length;
  tasks = tasks.filter((task) => !task.done);
  save(TASKS_KEY, tasks);
  render();
  notify(removed ? `${removed} completed task${removed === 1 ? "" : "s"} cleared` : "No completed tasks to clear");
});

$("#new-plan")?.addEventListener("click", () => $("#task-input").focus());
$("#start-today")?.addEventListener("click", () => $("#task-input").focus());
$("#reset-data")?.addEventListener("click", () => {
  if (window.confirm("Delete all saved tasks?")) {
    tasks = [];
    save(TASKS_KEY, tasks);
    render();
    notify("Planner reset");
  }
});

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "light") document.documentElement.classList.add("light");
$("#theme-toggle")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
  localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("light") ? "light" : "dark");
});

setInterval(() => {
  const now = Date.now();
  tasks.filter((task) => task.reminder && !task.done && !task.reminded && new Date(task.reminder).getTime() <= now).forEach((task) => {
    task.reminded = true;
    notify(`Reminder: ${task.title}`);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Lapis reminder", { body: task.title });
    }
  });
  save(TASKS_KEY, tasks);
}, 30000);

addPlannerControls();
applyBackground();
render();
