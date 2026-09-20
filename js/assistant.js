(() => {
  const $ = (selector) => document.querySelector(selector);
  const fab = $("#ai-fab");
  const panel = $("#ai-assistant");
  const close = $("#ai-close");
  const input = $("#ai-input");
  const send = $("#ai-ask");
  const response = $("#ai-response");
  if (!fab || !panel || !close || !input || !send || !response) return;

  const open = () => { panel.hidden = false; panel.setAttribute("aria-hidden", "false"); fab.setAttribute("aria-expanded", "true"); input.focus(); };
  const shut = () => { panel.hidden = true; panel.setAttribute("aria-hidden", "true"); fab.setAttribute("aria-expanded", "false"); };
  const reply = () => {
    const text = input.value.trim();
    if (!text) { response.textContent = "Tell me what you need help organizing and I’ll reply."; return; }
    const lower = text.toLowerCase();
    const suggestions = [];
    if (/(today|focus|urgent|important|priorit)/.test(lower)) suggestions.push("Start with the most important task and give it one focused 25-minute block.");
    if (/(study|school|class|homework|exam|test|read)/.test(lower)) suggestions.push("Choose one study topic and define the smallest next step before you begin.");
    if (/(pray|fajr|dhuhr|asr|maghrib|isha|faith)/.test(lower)) suggestions.push("Use prayer times as anchors and place your other tasks around them.");
    if (/(exercise|workout|gym|walk|health)/.test(lower)) suggestions.push("Add a short movement session you can realistically finish today.");
    if (/(clean|room|laundry|organize)/.test(lower)) suggestions.push("Pick one area and set a 10-minute timer so the task has a clear finish line.");
    if (/(routine|morning|night|schedule)/.test(lower)) suggestions.push("Group repeated tasks into a routine, then add it to today when you are ready.");
    if (!suggestions.length) suggestions.push("Turn your idea into one clear action, choose when to do it, and start with the smallest step.");
    response.innerHTML = `<strong>Here’s a simple plan:</strong><ul>${suggestions.map((item) => `<li>${item}</li>`).join("")}</ul><p class="ai-follow-up">Add the first step to your task list when you’re ready.</p>`;
  };
  fab.addEventListener("click", () => panel.hidden ? open() : shut());
  close.addEventListener("click", shut);
  send.addEventListener("click", reply);
  input.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") reply(); });
  document.querySelectorAll("[data-ai-prompt]").forEach((button) => button.addEventListener("click", () => { input.value = button.dataset.aiPrompt; reply(); }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !panel.hidden) shut(); });
})();
