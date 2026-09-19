const STORAGE_KEY = "lapis-planner-tasks-v1";
const THEME_KEY = "lapis-planner-theme-v1";
const $ = (selector) => document.querySelector(selector);
let tasks = loadTasks();
let filter = "all";

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char])); }
function visibleTasks() {
  const query = $("#search").value.trim().toLowerCase();
  return tasks.filter((task) => (filter === "all" || (filter === "done" ? task.done : !task.done)) && (!query || `${task.title} ${task.category} ${task.priority}`.toLowerCase().includes(query)));
}
function render() {
  const list = $("#task-list");
  const shown = visibleTasks();
  list.innerHTML = shown.map((task) => `<li class="task ${task.done ? "done" : ""}" data-id="${task.id}"><button class="check" data-action="toggle" aria-label="Mark ${escapeHtml(task.title)} as ${task.done ? "active" : "complete"}"></button><div><div class="title">${escapeHtml(task.title)}</div><div class="meta"><span class="tag">${escapeHtml(task.category)}</span><span>${escapeHtml(task.priority)} priority</span><span>${new Date(task.createdAt).toLocaleDateString()}</span></div></div><div class="task-actions"><button class="task-action" data-action="edit" type="button">Edit</button><button class="task-action delete" data-action="delete" type="button">Delete</button></div></li>`).join("");
  $("#empty-state").classList.toggle("hidden", shown.length !== 0); updateSummary();
}
function updateSummary() {
  const done = tasks.filter((task) => task.done).length; const total = tasks.length; const percent = total ? Math.round(done / total * 100) : 0;
  $("#total-count").textContent = total; $("#done-count").textContent = done; $("#left-count").textContent = total - done; $("#progress-label").textContent = `${percent}%`; $("#progress-bar").style.width = `${percent}%`; $("#progress-copy").textContent = total ? `${done} of ${total} tasks completed.` : "Add a task to get started.";
}
$("#task-form").addEventListener("submit", (event) => { event.preventDefault(); const input = $("#task-input"); tasks.unshift({ id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), title: input.value.trim(), category: $("#task-category").value, priority: $("#task-priority").value, done: false, createdAt: Date.now() }); save(); input.value = ""; render(); input.focus(); });
$("#task-list").addEventListener("click", (event) => { const button = event.target.closest("[data-action]"); if (!button) return; const item = event.target.closest(".task"); const task = tasks.find((entry) => entry.id === item.dataset.id); if (!task) return; if (button.dataset.action === "toggle") task.done = !task.done; if (button.dataset.action === "delete") tasks = tasks.filter((entry) => entry.id !== task.id); if (button.dataset.action === "edit") { const title = prompt("Edit task", task.title); if (title && title.trim()) task.title = title.trim(); } save(); render(); });
$("#search").addEventListener("input", render);
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button)); render(); }));
$("#clear-completed").addEventListener("click", () => { tasks = tasks.filter((task) => !task.done); save(); render(); });
$("#reset-data").addEventListener("click", () => { if (confirm("Delete all saved tasks?")) { tasks = []; save(); render(); } });
$("#new-plan").addEventListener("click", () => { $("#task-input").focus(); window.scrollTo({ top: document.querySelector(".planner").offsetTop - 90, behavior: "smooth" }); });
$("#start-today").addEventListener("click", () => $("#task-input").focus());
const savedTheme = localStorage.getItem(THEME_KEY); if (savedTheme === "light") document.documentElement.classList.add("light");
$("#theme-toggle").addEventListener("click", () => { document.documentElement.classList.toggle("light"); localStorage.setItem(THEME_KEY, document.documentElement.classList.contains("light") ? "light" : "dark"); });
render();
