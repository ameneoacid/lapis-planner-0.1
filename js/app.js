const STORAGE_KEY = "lapis-planner-tasks-v1";
const THEME_KEY = "lapis-planner-theme-v1";
const $ = (selector) => document.querySelector(selector);
let tasks = loadTasks();
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

function normalizeTask(task) {
  return {
    id: String(task.id || makeId()),
    title: String(task.title || "Untitled task"),
    category: String(task.category || "other"),
    priority: String(task.priority || "medium"),
    done: Boolean(task.done),
    createdAt: Number(task.createdAt) || Date.now()
  };
}

function makeId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

function notify(message) {
  let toast = $("#toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
      zIndex: "20", padding: "10px 16px", borderRadius: "12px", background: "var(--accent)",
      color: "#101426", fontWeight: "700", boxShadow: "var(--shadow)"
    });
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { toast.hidden = true; }, 2200);
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
    createdAt: Date.now()
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

  if (button.dataset.action === "toggle") task.done = !task.done;
  if (button.dataset.action === "delete") tasks = tasks.filter((entry) => entry.id !== task.id);
  if (button.dataset.action === "duplicate") {
    tasks.unshift({ ...task, id: makeId(), title: `${task.title} (copy)`, done: false, createdAt: Date.now() });
    notify("Task duplicated");
  }
  if (button.dataset.action === "edit") {
    const title = window.prompt("Edit task", task.title);
    if (title?.trim()) task.title = title.trim();
  }

  save();
  render();
});

$("#search").addEventListener("input", render);
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  filter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
  render();
}));

// Add a sort control without requiring a second page or a framework.
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

// Keyboard shortcuts make the planner faster to use.
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

render();
