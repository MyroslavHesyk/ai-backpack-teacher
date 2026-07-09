const BONUS_COURSE_URL = "https://invincible-scowl-05a.notion.site/AI-3704db0e9ebd807692b9fdc7e544e81a?source=copy_link"; // замініть на посилання вашого курсу з 8 уроків
const STORAGE_KEY = "aiBackpackTeacherState_v2";
const TOTAL_STATIONS = 12;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = loadState();

const menuBtn = $("#menuBtn");
const mainNav = $("#mainNav");
const resetBtn = $("#resetBtn");
const profileForm = $("#profileForm");
const profileStatus = $("#profileStatus");
const progressBar = $("#progressBar");
const progressText = $("#progressText");
const certificateBtn = $("#certificateBtn");
const certificateDialog = $("#certificateDialog");
const closeDialogBtn = $("#closeDialogBtn");
const certificateCanvas = $("#certificateCanvas");
const downloadCertificateBtn = $("#downloadCertificateBtn");
const bonusCourseLink = $("#bonusCourseLink");
const makeFinalPromptBtn = $("#makeFinalPromptBtn");
const finalPromptWrap = $("#finalPromptWrap");
const finalPrompt = $("#finalPrompt");
const toast = $("#toast");

init();

function init() {
  if (bonusCourseLink) bonusCourseLink.href = BONUS_COURSE_URL;
  hydrateForm();
  wireEvents();
  updateGeneratedPrompt();
  updateMessagePreview("short");
  updateProgressUI();
}

function wireEvents() {
  const closeMenu = () => {
    mainNav?.classList.remove("open");
    menuBtn?.classList.remove("is-open");
    menuBtn?.setAttribute("aria-expanded", "false");
    menuBtn?.setAttribute("aria-label", "Відкрити меню");
  };

  const toggleMenu = () => {
    const isOpen = mainNav?.classList.toggle("open") || false;
    menuBtn?.classList.toggle("is-open", isOpen);
    menuBtn?.setAttribute("aria-expanded", String(isOpen));
    menuBtn?.setAttribute("aria-label", isOpen ? "Закрити меню" : "Відкрити меню");
  };

  menuBtn?.addEventListener("click", toggleMenu);
  $$(".nav a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!mainNav?.classList.contains("open")) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (mainNav.contains(target) || menuBtn?.contains(target)) return;
    closeMenu();
  });

  resetBtn?.addEventListener("click", () => {
    const confirmed = confirm("Скинути прогрес і профіль учасника?");
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(profileForm);
    state.profile = {
      name: String(formData.get("name") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      grade: String(formData.get("grade") || "").trim(),
      aiLevel: String(formData.get("aiLevel") || "").trim()
    };
    state.updatedAt = new Date().toISOString();
    saveState();
    hydrateForm();
    updateGeneratedPrompt();
    showToast("Профіль збережено ✅");
  });

  ["topicInput", "goalInput", "formatInput", "conditionInput"].forEach((id) => {
    const element = $("#" + id);
    element?.addEventListener("input", updateGeneratedPrompt);
    element?.addEventListener("change", updateGeneratedPrompt);
  });

  $$(".choice-list button").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("selected");
      state.selectedNeeds = $$(".choice-list button.selected").map((item) => item.dataset.value).filter(Boolean);
      saveState();
      updateGeneratedPrompt();
    });
  });

  $$(".complete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".station-card");
      const station = Number(card?.dataset.station);
      if (!station) return;

      if (state.completedStations.includes(station)) {
        state.completedStations = state.completedStations.filter((item) => item !== station);
        showToast("Станцію знято з прогресу");
      } else {
        state.completedStations.push(station);
        showToast(`Станцію ${station} зараховано ✅`);
      }

      state.updatedAt = new Date().toISOString();
      saveState();
      updateProgressUI();
    });
  });

  $$(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.dataset.copyTarget;
      const target = targetId ? $("#" + targetId) : null;
      const text = target?.innerText || target?.textContent || "";
      if (!text.trim()) return showToast("Немає тексту для копіювання");
      await copyText(text.trim());
    });
  });

  $$(".tone-demo button").forEach((button) => {
    button.addEventListener("click", () => updateMessagePreview(button.dataset.tone));
  });

  makeFinalPromptBtn?.addEventListener("click", () => {
    if (finalPrompt) finalPrompt.textContent = buildFinalPrompt();
    finalPromptWrap?.classList.remove("hidden");
    finalPromptWrap?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  certificateBtn?.addEventListener("click", () => {
    drawCertificate();
    state.certificateCreated = true;
    state.updatedAt = new Date().toISOString();
    saveState();

    if (typeof certificateDialog?.showModal === "function") {
      certificateDialog.showModal();
    } else {
      certificateDialog?.setAttribute("open", "open");
    }
  });

  closeDialogBtn?.addEventListener("click", () => certificateDialog?.close());
  certificateDialog?.addEventListener("click", (event) => {
    if (event.target === certificateDialog) certificateDialog.close();
  });

  downloadCertificateBtn?.addEventListener("click", () => {
    drawCertificate();
    const profile = getProfile();
    const safeName = profile.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "uchasnyk";
    const link = document.createElement("a");
    link.download = `AI-ryukzak-certificate-${safeName}.png`;
    link.href = certificateCanvas.toDataURL("image/png");
    link.click();
  });
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    showToast("Скопійовано ✅");
  } catch (error) {
    console.error(error);
    showToast("Не вдалося скопіювати. Виділіть текст вручну.");
  }
}

function loadState() {
  const fallback = {
    profile: { name: "", subject: "", grade: "", aiLevel: "" },
    selectedNeeds: [],
    completedStations: [],
    certificateCreated: false,
    updatedAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      profile: { ...fallback.profile, ...(parsed.profile || {}) },
      selectedNeeds: Array.isArray(parsed.selectedNeeds) ? parsed.selectedNeeds : [],
      completedStations: Array.isArray(parsed.completedStations) ? parsed.completedStations : []
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getProfile() {
  return {
    name: state.profile.name || "Учасник/учасниця",
    subject: state.profile.subject || "ваш предмет",
    grade: state.profile.grade || "ваш клас",
    aiLevel: state.profile.aiLevel || "не вказано"
  };
}

function hydrateForm() {
  if (!profileForm) return;
  const { name, subject, grade, aiLevel } = state.profile;
  profileForm.elements.name.value = name || "";
  profileForm.elements.subject.value = subject || "";
  profileForm.elements.grade.value = grade || "";
  if (aiLevel) profileForm.elements.aiLevel.value = aiLevel;

  if (name || subject || grade) {
    profileStatus.textContent = `Профіль: ${name || "без імені"} · ${subject || "предмет не вказано"} · ${grade || "клас не вказано"}`;
  } else {
    profileStatus.textContent = "Профіль ще не заповнено.";
  }

  $$(".choice-list button").forEach((button) => {
    button.classList.toggle("selected", state.selectedNeeds.includes(button.dataset.value));
  });
}

function updateGeneratedPrompt() {
  const profile = getProfile();
  const topic = $("#topicInput")?.value?.trim() || "[вкажіть тему]";
  const goal = $("#goalInput")?.value?.trim() || "[вкажіть мету]";
  const format = $("#formatInput")?.value || "повний план уроку";
  const condition = $("#conditionInput")?.value?.trim() || "[за потреби: рівень класу, мало часу, НУШ, змішаний рівень]";
  const needs = state.selectedNeeds.length ? state.selectedNeeds.join(", ") : "план уроку, пояснення, завдання, оцінювання";

  const prompt = `Ти — досвідчений помічник учителя. Допоможи мені підготувати ${format}.

Контекст:
- Предмет: ${profile.subject}
- Клас / вікова група: ${profile.grade}
- Тема: ${topic}
- Мета: ${goal}
- Рівень знайомства вчителя з AI: ${profile.aiLevel}
- Особлива умова: ${condition}
- Найбільше потрібна допомога з: ${needs}

Сформуй відповідь українською мовою.

Вимоги до відповіді:
1. Дай чітку структуру, яку можна використати на реальному уроці.
2. Не пиши загальними фразами — додавай конкретні приклади.
3. Пояснюй простими словами, але не спрощуй зміст до примітивного рівня.
4. Додай 2–3 інтерактивні активності для учнів.
5. Додай коротку перевірку розуміння.
6. Додай домашнє завдання або ідею для продовження роботи.
7. Наприкінці запропонуй 3 уточнювальні запитання, які я можу поставити тобі, щоб покращити результат.`;

  const promptEl = $("#generatedPrompt");
  if (promptEl) promptEl.textContent = prompt;
}

function updateProgressUI() {
  const uniqueCompleted = [...new Set(state.completedStations)]
    .map(Number)
    .filter((item) => item >= 1 && item <= TOTAL_STATIONS)
    .sort((a, b) => a - b);

  state.completedStations = uniqueCompleted;
  const completed = uniqueCompleted.length;
  const percent = Math.round((completed / TOTAL_STATIONS) * 100);

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressText) progressText.textContent = `${completed}/${TOTAL_STATIONS} станцій пройдено`;
  progressBar?.parentElement?.setAttribute("aria-valuenow", String(completed));

  $$(".station-card").forEach((card) => {
    const station = Number(card.dataset.station);
    const done = uniqueCompleted.includes(station);
    card.classList.toggle("done", done);
    const button = $(".complete-btn", card);
    if (button) button.textContent = done ? "Станцію зараховано" : "Зарахувати станцію";
  });

  if (certificateBtn) {
    certificateBtn.disabled = completed < TOTAL_STATIONS;
    certificateBtn.textContent = completed < TOTAL_STATIONS
      ? `Сертифікат відкриється після ${TOTAL_STATIONS} станцій`
      : "Отримати сертифікат";
  }
}

function updateMessagePreview(tone) {
  $$(".tone-demo button").forEach((button) => button.classList.toggle("selected", button.dataset.tone === tone));
  const messages = {
    short: "Шановні батьки, нагадую: завтра учні мають принести зошит, підручник і виконане домашнє завдання. Дякую!",
    soft: "Шановні батьки, прошу звернути увагу на підготовку дітей до завтрашнього уроку. Буду вдячний/вдячна, якщо ви нагадаєте про зошит, підручник і домашнє завдання.",
    official: "Шановні батьки! Просимо забезпечити готовність учнів до завтрашнього навчального заняття: наявність підручника, робочого зошита та виконаного домашнього завдання. Дякуємо за співпрацю."
  };
  const preview = $("#messagePreview");
  if (preview) preview.textContent = messages[tone] || messages.short;
}

function buildFinalPrompt() {
  const profile = getProfile();
  const topic = $("#topicInput")?.value?.trim() || "[тема уроку]";
  const goal = $("#goalInput")?.value?.trim() || "[мета уроку]";
  const condition = $("#conditionInput")?.value?.trim() || "[особливості класу / умови]";
  const needs = state.selectedNeeds.length ? state.selectedNeeds.join(", ") : "план уроку, тести, активності, оцінювання";

  return `Ти — мій AI-помічник для підготовки уроку.

Контекст:
- Предмет: ${profile.subject}
- Клас / група: ${profile.grade}
- Тема: ${topic}
- Мета: ${goal}
- Особливі умови: ${condition}
- Потрібно особливо допомогти з: ${needs}

Створи повний AI-пакет уроку:

1. коротка мета уроку;
2. очікувані результати;
3. мотиваційний вступ;
4. пояснення теми простими словами;
5. план уроку на 45 хвилин із часом по етапах;
6. 3 інтерактивні завдання;
7. завдання для роботи в парах або групах;
8. диференціація: базовий, середній і високий рівень;
9. тест із 8 запитань і відповідями;
10. критерії оцінювання;
11. домашнє завдання;
12. ідея для презентації або навчального зображення;
13. рефлексія наприкінці уроку;
14. 5 уточнювальних запитань, які я можу поставити, щоб покращити матеріал.

Важливо:
- відповідай українською мовою;
- не використовуй загальні фрази;
- зроби матеріал практичним і придатним для реального уроку;
- якщо є ризик фактичної помилки, окремо познач, що потрібно перевірити вчителю.`;
}

function drawCertificate() {
  if (!certificateCanvas) return;
  const ctx = certificateCanvas.getContext("2d");
  const { name, subject, grade } = getProfile();

  ctx.clearRect(0, 0, certificateCanvas.width, certificateCanvas.height);

  const gradient = ctx.createLinearGradient(0, 0, certificateCanvas.width, certificateCanvas.height);
  gradient.addColorStop(0, "#f7f4ff");
  gradient.addColorStop(0.45, "#ffffff");
  gradient.addColorStop(1, "#fff1c7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, certificateCanvas.width, certificateCanvas.height);

  drawRoundedRect(ctx, 70, 70, 1260, 850, 42, "#ffffff", "#6757ff", 6);
  drawRoundedRect(ctx, 105, 105, 1190, 780, 32, "rgba(103,87,255,0.04)", "rgba(103,87,255,0.18)", 2);

  ctx.fillStyle = "#6757ff";
  ctx.font = "900 82px Inter, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Сертифікат", 700, 220);

  ctx.fillStyle = "#17142c";
  ctx.font = "700 34px Inter, Arial";
  ctx.fillText("учасника AI-мандрівки", 700, 272);

  ctx.fillStyle = "#67627d";
  ctx.font = "500 26px Inter, Arial";
  ctx.fillText("підтверджує, що", 700, 350);

  ctx.fillStyle = "#17142c";
  ctx.font = "900 58px Inter, Arial";
  wrapCanvasText(ctx, name, 700, 430, 1040, 68);

  ctx.fillStyle = "#67627d";
  ctx.font = "500 28px Inter, Arial";
  wrapCanvasText(ctx, "успішно зібрав/зібрала власний AI-рюкзак вчителя та пройшов/пройшла міні-практикум", 700, 560, 1040, 40);

  ctx.fillStyle = "#6757ff";
  ctx.font = "800 34px Inter, Arial";
  wrapCanvasText(ctx, "«Штучний інтелект на допомогу вчителю»", 700, 660, 1040, 44);

  ctx.fillStyle = "#17142c";
  ctx.font = "700 25px Inter, Arial";
  
  ctx.fillText("Літня школа «Освітні горизонти: літо професійного розвитку»", 700, 770);

  ctx.fillStyle = "#67627d";
  ctx.font = "500 23px Inter, Arial";
  ctx.fillText("Лумшори · Закарпаття · липень 2026", 700, 810);

  ctx.fillStyle = "#17142c";
  ctx.font = "700 24px Inter, Arial";
  ctx.textAlign = "left";
  ctx.fillText("Автор: Мирослав Гесик", 150, 850);

  ctx.textAlign = "right";
  ctx.fillText("#ОсвітніГоризонти2026", 1250, 850);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffb84d";
  ctx.font = "70px Arial";
  ctx.fillText("🎒", 700, 120);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word, index) => {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && index > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  ctx.fillText(line.trim(), x, currentY);
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}
