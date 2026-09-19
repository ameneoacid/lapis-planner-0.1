const STORAGE_KEY = "lapis-planner-tasks-v1";
const PROFILE_KEY = "lapis-planner-profile-v1";
const THEME_KEY = "lapis-planner-theme-v1";
const BACKGROUNDS = [
  { id: "midnight", name: "Midnight", price: 0 },
  { id: "sunset", name: "Sunset", price: 20 },
  { id: "forest", name: "Forest", price: 35 },
  { id: "aurora", name: "Aurora", price: 45 },
  { id: "clouds", name: "Clouds", price: 55 }
];
const $ = (selector) => document.querySelector(selector);
let tasks = loadTasks();
let profile = loadProfile();
let filter = "all";
let sortMode = "newest";

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.map(normalizeTask) : [];
  } catch {
    return [];
  }
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return {
      useCase: "",
      goalTitle: "",
      goalTarget: 3,
      coins: 0,
      purchasedBackgrounds: ["midnight"],
      selectedBackground: "midnight",
      streakDates: [],
      ...saved,
      purchasedBackgrounds: Array.isArray(saved?.purchasedBackgrounds) && saved.purchasedBackgrounds.length
        ? saved.purchasedBackgrounds
        : ["midnight"]
    };
  } catch {
    return {
      useCase: "",
      goalTitle: "",
      goalTarget: 3,
      coins: 0,
      purchasedBackgrounds: ["midnight"],
      selectedBackground: "midnight",
      streakDates: []
    };
  }
}

function normalizeTask(task) {
  return {
    id: String(task.id || makeId()),
    title: String(task.title || "Untitled task"),
    category: String(task.category || "other"),
    priority: String(task.priority || "medium"),
    done: Boolean(task.done),
    createdAt: Number(task.createdAt) || Date.now(),
    completedAt: task.done ? (Number(task.completedAt) || Date.now()) : null
  };
}

function makeId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function priorityRank(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

function visibleTasks() {
  const query = $("#search").value.trim().toLowerCase();
  return tasks
    .filter((task) => {
      const matchesFilter = filter === "all" || (filter === "done" ? task.done : !task.done);
      const haystack = `${task.title} ${task.category} ${task.priority}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    })
    .sort((a, b) => {
      if (sortMode === "priority") return priorityRank(a.priority) - priorityRank(b.priority);
      if (sortMode === "oldest") return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff);
  return monday;
}

function taskCompletedThisWeek(task) {
  if (!task.done || !task.completedAt) return false;
  return task.completedAt >= getCurrentWeekStart().getTime();
}

function getGoalProgress() {
  const target = Number(profile.goalTarget) || 3;
  const completed = tasks.filter(taskCompletedThisWeek).length;
  return { completed, target, percent: target ? Math.min(100, (completed / target) * 100) : 0 };
}

function updateSummary() {
  const done = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#total-count").textContent = total;
  $("#done-count").textContent = done;
  $("#left-count").textContent = total - done;
  $("#progress-label").textContent = `${percent}%`;
  $("#progress-bar").style.width = `${percent}%`;
  $("#progress-copy").textContent = total ? `${done} of ${total} tasks completed.` : "Add a task to get started.";
}

function updateDashboard() {
  $("#coin-total").textContent = Number(profile.coins || 0);
  $("#streak-total").textContent = Number(profile.streakDates?.length ? getCurrentStreak() : 0);
  $("#streak-best").textContent = Number(getBestStreak());

  const goal = getGoalProgress();
  $("#goal-title").textContent = profile.goalTitle || "Finish 3 tasks this week";
  $("#goal-progress-text").textContent = `${goal.completed} / ${goal.target}`;
  $("#goal-progress-bar").style.width = `${goal.percent}%`;

  renderBackgroundShop();
}

function getCurrentStreak() {
  const dates = [...new Set(tasks.filter((task) => task.done && task.completedAt).map((task) => dateKey(task.completedAt)))].sort();
  if (!dates.length) return 0;

  let cursor = new Date();
  let streak = 0;
  while (dates.includes(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getBestStreak() {
  const dates = [...new Set(tasks.filter((task) => task.done && task.completedAt).map((task) => dateKey(task.completedAt)))].sort();
  if (!dates.length) return 0;

  let best = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00`);
    const currentDate = new Date(`${dates[index]}T00:00:00`);
    const difference = (currentDate - previous) / 86400000;

    if (difference === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
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
      zIndex: "20",
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
  notify.timer = setTimeout(() => { toast.hidden = true; }, 2200);
}

function renderBackgroundShop() {
  const shop = $("#background-shop");
  if (!shop) return;

  shop.innerHTML = BACKGROUNDS.map((background) => {
    const owned = profile.purchasedBackgrounds.includes(background.id);
    const selected = profile.selectedBackground === background.id;
    const affordable = profile.coins >= background.price;

    let label = selected ? "Selected" : owned ? "Apply" : `Buy ${background.price}`;
    if (!owned && !affordable) label = `${background.price} coins`;

    return `
      <button class="shop-item ${selected ? "active" : ""} ${owned ? "owned" : ""}" type="button" data-background="${background.id}" ${selected ? "aria-pressed=\"true\"" : "aria-pressed=\"false\""}>
        <span class="shop-swatch" style="background:${background.id === "midnight" ? "linear-gradient(135deg,#0d1326,#6a5cff)" : background.id === "sunset" ? "linear-gradient(135deg,#ff8b5e,#f7d76d)" : background.id === "forest" ? "linear-gradient(135deg,#244d4d,#90d66f)" : background.id === "aurora" ? "linear-gradient(135deg,#1e5f74,#7ef9d5)" : "linear-gradient(135deg,#cbd6ff,#7f92ff)"};"></span>
        <span>
          <strong>${background.name}</strong>
          <small>${owned ? "Unlocked" : `${background.price} coins`}</small>
        </span>
        <em>${label}</em>
      </button>
    `;
  }).join("");
}

function applyBackground(backgroundId = profile.selectedBackground) {
  document.body.dataset.background = backgroundId;
  localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("light") ? "light" : "dark");
}

function render() {
  const list = $("#task-list");
  const shown = visibleTasks();

  list.innerHTML = shown.map((task) => `
    <li class="task ${task.done ? "done" : ""}" data-id="${escapeHtml(task.id)}">
      <button class="check" data-action="toggle" type="button" aria-label="Mark ${escapeHtml(task.title)} as ${task.done ? "active" : "complete"}"></button>
      <div>
        <div class="title">${escapeHtml(task.title)}</div>
        <div class="meta">
          <span class="tag">${escapeHtml(task.category)}</span>
          <span>${escapeHtml(task.priority)} priority</span>
          <span>added ${formatDate(task.createdAt)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action" data-action="duplicate" type="button">Copy</button>
        <button class="task-action" data-action="edit" type="button">Edit</button>
        <button class="task-action delete" data-action="delete" type="button">Delete</button>
      </div>
    </li>`).join("");

  $("#empty-state").classList.toggle("hidden", shown.length !== 0);
  updateSummary();
  updateDashboard();
}

function awardCoinsForCompletion() {
  const today = dateKey(Date.now());
  if (!profile.streakDates.includes(today)) {
    profile.streakDates.push(today);
    profile.coins += 10;
    saveProfile();
    notify("+10 coins for your streak");
  }

  const goal = getGoalProgress();
  if (goal.completed >= goal.target && goal.target > 0 && !profile.goalRewardedThisWeek) {
    profile.coins += 25;
    profile.goalRewardedThisWeek = true;
    saveProfile();
    notify("Goal cleared! +25 coins");
  }

  if (goal.completed < goal.target) {
    profile.goalRewardedThisWeek = false;
  }
}

function defaultGoalText(useCase) {
  const templates = {
    school: "Finish 3 study wins this week",
    work: "Finish 3 work priorities this week",
    life: "Finish 3 life admin tasks this week",
    creative: "Finish 3 creative wins this week",
    habit: "Finish 3 healthy habits this week"
  };
  return templates[useCase] || "Finish 3 important tasks this week";
}

function showOnboarding() {
  const modal = $("#onboarding");
  if (!modal) return;
  modal.classList.remove("hidden");
  const activeUseCase = $(".usecase-btn.active") || $(".usecase-btn");
  if (activeUseCase) activeUseCase.classList.add("active");
}

function hideOnboarding() {
  const modal = $("#onboarding");
  if (modal) modal.classList.add("hidden");
}

function ensureProfileReady() {
  if (!profile.useCase || !profile.goalTitle) {
    showOnboarding();
    return false;
  }
  hideOnboarding();
  return true;
}

$("#task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#task-input");
  const title = input.value.trim();
  if (!title) return input.focus();

  tasks.unshift({
    id: makeId(),
    title,
    category: $("#task-category").value,
    priority: $("#task-priority").value,
    done: false,
    createdAt: Date.now(),
    completedAt: null
  });
  save();
  render();
  input.value = "";
  input.focus();
  notify("Task added");
});

$("#task-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  const item = event.target.closest(".task");
  if (!button || !item) return;

  const task = tasks.find((entry) => entry.id === item.dataset.id);
  if (!task) return;

  const wasDone = task.done;

  if (button.dataset.action === "toggle") {
    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;
    if (task.done && !wasDone) awardCoinsForCompletion();
  }
  if (button.dataset.action === "delete") tasks = tasks.filter((entry) => entry.id !== task.id);
  if (button.dataset.action === "duplicate") {
    tasks.unshift({ ...task, id: makeId(), title: `${task.title} (copy)`, done: false, completedAt: null, createdAt: Date.now() });
    notify("Task duplicated");
  }
  if (button.dataset.action === "edit") {
    const title = window.prompt("Edit task", task.title);
    if (title?.trim()) task.title = title.trim();
  }

  save();
  saveProfile();
  render();
});

$("#search").addEventListener("input", render);
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  filter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
  render();
}));

const filterBar = document.querySelector(".filters");
const sortButton = document.createElement("button");
sortButton.className = "filter";
sortButton.type = "button";
sortButton.textContent = "Priority";
sortButton.title = "Sort tasks by priority";
filterBar.append(sortButton);
sortButton.addEventListener("click", () => {
  sortMode = sortMode === "priority" ? "newest" : "priority";
  sortButton.classList.toggle("active", sortMode === "priority");
  render();
});

$("#clear-completed").addEventListener("click", () => {
  const removed = tasks.filter((task) => task.done).length;
  tasks = tasks.filter((task) => !task.done);
  save();
  render();
  notify(removed ? `${removed} completed task${removed === 1 ? "" : "s"} cleared` : "No completed tasks to clear");
});

$("#reset-data").addEventListener("click", () => {
  if (window.confirm("Delete all saved tasks?")) {
    tasks = [];
    save();
    render();
    notify("Planner reset");
  }
});

$("#new-plan").addEventListener("click", () => {
  $("#task-input").focus();
  document.querySelector(".planner").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#start-today").addEventListener("click", () => $("#task-input").focus());

$("#edit-goal").addEventListener("click", () => {
  const nextGoal = window.prompt("What is your weekly goal?", profile.goalTitle || defaultGoalText(profile.useCase));
  if (!nextGoal || !nextGoal.trim()) return;
  profile.goalTitle = nextGoal.trim();
  saveProfile();
  render();
});

$("#goal-target").addEventListener("input", (event) => {
  const value = Number(event.target.value) || 1;
  profile.goalTarget = Math.max(1, Math.min(50, value));
  saveProfile();
  render();
});

$("#start-planner").addEventListener("click", () => {
  const useCaseButtons = document.querySelectorAll(".usecase-btn");
  const selectedButton = [...useCaseButtons].find((button) => button.classList.contains("active"));
  const useCase = selectedButton ? selectedButton.dataset.usecase : "school";
  const goalInput = $("#goal-input");
  const goalTarget = $("#goal-target");

  profile.useCase = useCase;
  profile.goalTarget = Number(goalTarget.value) || 3;
  profile.goalTitle = goalInput.value.trim() || defaultGoalText(useCase);

  saveProfile();
  hideOnboarding();
  render();
  notify("Planner ready");
});

$("#goal-input").addEventListener("input", (event) => {
  const value = event.target.value.trim();
  if (!value) {
    $("#goal-input").placeholder = defaultGoalText(profile.useCase || "school");
  }
});

document.querySelectorAll(".usecase-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".usecase-btn").forEach((item) => item.classList.toggle("active", item === button));
    const goalInput = $("#goal-input");
    const suggestedGoal = defaultGoalText(button.dataset.usecase);
    goalInput.value = profile.goalTitle || suggestedGoal;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement.tagName !== "INPUT") {
    event.preventDefault();
    $("#search").focus();
  }
  if (event.key === "Escape" && document.activeElement === $("#search")) {
    $("#search").value = "";
    $("#search").blur();
    render();
  }
});

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "light") document.documentElement.classList.add("light");
$("#theme-toggle").addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
  localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("light") ? "light" : "dark");
});

$("#background-shop").addEventListener("click", (event) => {
  const button = event.target.closest("[data-background]");
  if (!button) return;

  const targetId = button.dataset.background;
  const background = BACKGROUNDS.find((entry) => entry.id === targetId);
  if (!background) return;

  const hasOwned = profile.purchasedBackgrounds.includes(targetId);
  if (!hasOwned) {
    if (profile.coins < background.price) {
      notify(`Need ${background.price - profile.coins} more coins`);
      return;
    }
    profile.coins -= background.price;
    profile.purchasedBackgrounds.push(targetId);
    notify(`${background.name} unlocked`);
  }

  profile.selectedBackground = targetId;
  saveProfile();
  applyBackground(targetId);
  render();
});

if (!profile.useCase) {
  const firstUseCase = $(".usecase-btn");
  if (firstUseCase) {
    firstUseCase.classList.add("active");
    $("#goal-input").value = defaultGoalText(firstUseCase.dataset.usecase);
  }
}

applyBackground(profile.selectedBackground || "midnight");
ensureProfileReady();
render();
