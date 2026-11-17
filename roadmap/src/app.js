import { roadmap } from "./roadmap-data.js";

const STORAGE_KEY = "piggy-roadmap-tracker-v1";
const EXPORT_ID = "piggy-roadmap-progress";
let filter = "all";
let toastTimer;
let storageAvailable = true;
let progress = loadProgress();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function emptyProgress() {
  return { version: 1, checks: {}, quality: {}, savedAt: null };
}

function sanitizeProgress(raw) {
  const clean = emptyProgress();
  if (!raw || typeof raw !== "object") return clean;
  const validCriteria = new Set(roadmap.phases.flatMap((phase) => phase.criteria.map((_, index) => `${phase.id}:${index}`)));
  const validQuality = new Set(roadmap.qualityGates.map((gate) => gate.id));
  if (raw.checks && typeof raw.checks === "object" && !Array.isArray(raw.checks)) {
    for (const [key, value] of Object.entries(raw.checks)) {
      if (validCriteria.has(key) && value === true) clean.checks[key] = true;
    }
  }
  if (raw.quality && typeof raw.quality === "object" && !Array.isArray(raw.quality)) {
    for (const [key, value] of Object.entries(raw.quality)) {
      if (validQuality.has(key) && value === true) clean.quality[key] = true;
    }
  }
  clean.savedAt = typeof raw.savedAt === "string" ? raw.savedAt : null;
  return clean;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return emptyProgress();
    return sanitizeProgress(parsed);
  } catch {
    storageAvailable = false;
    return emptyProgress();
  }
}

function persistProgress() {
  progress.savedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  renderAll();
  return storageAvailable;
}

function phaseCounts(phase) {
  const done = phase.criteria.reduce((sum, _, index) => sum + (progress.checks[`${phase.id}:${index}`] ? 1 : 0), 0);
  const total = phase.criteria.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function phaseStatus(phase) {
  const { done, total } = phaseCounts(phase);
  if (done === total) return "done";
  if (done > 0) return "in-progress";
  return "not-started";
}

const statusLabel = (status) => ({
  "not-started": "未開始", "in-progress": "進行中", done: "已完成"
})[status];

function overallCounts() {
  const done = roadmap.phases.reduce((sum, phase) => sum + phaseCounts(phase).done, 0);
  const total = roadmap.phases.reduce((sum, phase) => sum + phaseCounts(phase).total, 0);
  const phasesDone = roadmap.phases.filter((phase) => phaseStatus(phase) === "done").length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, phasesDone };
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function renderOverview() {
  const counts = overallCounts();
  $("#overallProgress").textContent = `${counts.percent}%`;
  $("#criteriaDone").textContent = counts.done;
  $("#criteriaTotal").textContent = counts.total;
  $("#phaseDone").textContent = counts.phasesDone;
  $("#phaseTotal").textContent = roadmap.phases.length;
  $("#phaseCount").textContent = String(roadmap.phases.length).padStart(2, "0");
  const bar = $("#overallBar");
  bar.setAttribute("aria-valuenow", String(counts.percent));
  $(".progress-track-large span", bar).style.width = `${counts.percent}%`;
  const overallStatus = $("#overallStatus");
  overallStatus.textContent = counts.phasesDone === roadmap.phases.length ? "所有階段完成" : counts.done ? "追蹤進行中" : "尚未開始追蹤";
  overallStatus.className = `status-chip ${counts.phasesDone === roadmap.phases.length ? "status-done" : counts.done ? "status-in-progress" : "status-not-started"}`;
  const next = roadmap.phases.find((phase) => phaseStatus(phase) !== "done");
  $("#nextPhase").textContent = next ? `階段 ${Number(next.number)} · ${next.title}` : "全部階段已完成";
  const qualityDone = roadmap.qualityGates.filter((gate) => progress.quality[gate.id]).length;
  $("#qualityDone").innerHTML = `${qualityDone}<span class="stat-small">/ ${roadmap.qualityGates.length}</span>`;
  $("#qualityCountLarge").textContent = `${qualityDone} / ${roadmap.qualityGates.length}`;
  if (!storageAvailable) {
    $("#lastSaved").textContent = "瀏覽器未允許本機保存；請匯出進度備份";
  } else if (progress.savedAt) {
    const date = new Date(progress.savedAt);
    $("#lastSaved").textContent = `已儲存於此瀏覽器 · ${date.toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}`;
  } else {
    $("#lastSaved").textContent = "進度只儲存在這個瀏覽器";
  }
}

function renderPhaseNav() {
  $("#phaseNav").innerHTML = roadmap.phases.map((phase) => `
    <a class="phase-nav-link ${phaseStatus(phase) === "done" ? "is-done" : ""}" href="#phase-${phase.id}">
      <span class="phase-nav-number">${escapeHTML(phase.number)}</span><span>${escapeHTML(phase.short)}</span>
    </a>`).join("");
}

function listMarkup(items) {
  return `<ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
}

function renderMilestones(phase) {
  if (!phase.milestones?.length) return "";
  return `<div class="phase-milestones"><h4>可獨立發布的里程碑</h4><ol>${phase.milestones.map((item) => `<li><b>${escapeHTML(item.tag)}</b> ${escapeHTML(item.text)}</li>`).join("")}</ol></div>`;
}

function renderPhase(phase) {
  const counts = phaseCounts(phase);
  const status = phaseStatus(phase);
  const priorityClass = `priority-${phase.priority.toLowerCase()}`;
  const criteria = phase.criteria.map((criterion, index) => {
    const key = `${phase.id}:${index}`;
    const checked = progress.checks[key] ? "checked" : "";
    return `<label class="criterion"><input type="checkbox" data-type="criterion" data-key="${key}" ${checked} /><span>${escapeHTML(criterion)}</span></label>`;
  }).join("");
  return `
    <article class="phase-card ${status === "done" ? "is-done" : ""}" id="phase-${phase.id}" data-phase="${phase.id}" data-status="${status}">
      <div class="phase-card-head">
        <div class="phase-heading-main">
          <span class="phase-number">${escapeHTML(phase.number)}</span>
          <div class="phase-title-wrap">
            <div class="phase-kicker"><span class="priority-tag ${priorityClass}">${escapeHTML(phase.priority)}</span><span class="effort-tag">${escapeHTML(phase.effort)}</span></div>
            <h3>${escapeHTML(phase.title)}</h3>
            <p class="phase-desc">${escapeHTML(phase.summary)}</p>
          </div>
        </div>
        <div class="phase-top-right"><span class="status-chip status-${status}">${statusLabel(status)}</span><span class="phase-progress-label"><b>${counts.done}</b> / ${counts.total} 完成條件</span><div class="phase-mini-bar" role="progressbar" aria-label="${escapeHTML(phase.title)}進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${counts.percent}"><span style="width:${counts.percent}%"></span></div></div>
      </div>
      <div class="phase-content">
        <section class="phase-block"><h4>階段目標</h4><p>${escapeHTML(phase.goal)}</p></section>
        <section class="phase-block"><h4>前置依賴</h4>${listMarkup(phase.dependencies)}</section>
        <section class="phase-block"><h4>主要交付</h4>${listMarkup(phase.deliverables)}</section>
        <section class="phase-block"><h4>風險與控制</h4><p>${escapeHTML(phase.risk)}</p></section>
      </div>
      ${renderMilestones(phase)}
      <div class="phase-dependency"><span class="dependency-label">依賴關係</span>${phase.dependencies.map((dep) => `<span class="dependency-pill">${escapeHTML(dep)}</span>`).join("")}</div>
      <section class="acceptance" aria-label="${escapeHTML(phase.title)}完成條件">
        <div class="acceptance-head"><h4>完成條件</h4><span>勾選後自動更新階段狀態</span></div>
        <div class="criteria-list">${criteria}</div>
      </section>
    </article>`;
}

function renderPhases() {
  const container = $("#phaseList");
  container.innerHTML = roadmap.phases.map(renderPhase).join("");
  for (const card of $$(".phase-card", container)) {
    const shouldShow = filter === "all" || card.dataset.status === filter;
    card.hidden = !shouldShow;
  }
  for (const button of $$("[data-filter]")) {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function renderQuality() {
  $("#qualityList").innerHTML = roadmap.qualityGates.map((gate) => `
    <label class="quality-item"><input type="checkbox" data-type="quality" data-key="${escapeHTML(gate.id)}" ${progress.quality[gate.id] ? "checked" : ""} />
      <span><b>${escapeHTML(gate.title)}</b><small>${escapeHTML(gate.text)}</small></span></label>`).join("");
}

function releaseStatus(release) {
  const statuses = release.phases.map((id) => phaseStatus(roadmap.phases.find((phase) => phase.id === id)));
  if (statuses.every((status) => status === "done")) return { text: "相關階段已完成", className: "is-done" };
  if (statuses.some((status) => status !== "not-started")) return { text: "相關階段進行中", className: "is-progress" };
  return { text: "建議節點 · 尚未開始", className: "" };
}

function renderReleases() {
  $("#releaseList").innerHTML = roadmap.releases.map((release) => {
    const status = releaseStatus(release);
    return `<article class="release-card"><span class="release-label">VERSION ${escapeHTML(release.id)}</span><h3>${escapeHTML(release.title)}</h3><p>${escapeHTML(release.text)}</p><div class="release-related">${release.related.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}</div><span class="release-status ${status.className}">${status.text}</span></article>`;
  }).join("");
}

function renderAll() {
  renderOverview();
  renderPhaseNav();
  renderPhases();
  renderQuality();
  renderReleases();
}

function exportProgress() {
  const payload = {
    schema: EXPORT_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: sanitizeProgress(progress)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `piggy-roadmap-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已匯出進度備份；檔案只包含勾選狀態，不含個人資料。");
}

async function importProgress(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed?.schema !== EXPORT_ID || parsed?.version !== 1 || !parsed.progress || typeof parsed.progress !== "object") {
      throw new Error("格式不符");
    }
    progress = sanitizeProgress(parsed.progress);
    const persisted = persistProgress();
    showToast(persisted ? "進度已匯入並儲存在此瀏覽器。" : "進度已匯入本頁，但瀏覽器未允許保存；重新載入後可能遺失。");
  } catch {
    showToast("匯入失敗：請選擇本看板匯出的有效 JSON 備份。");
  }
}

$("#phaseList").addEventListener("change", (event) => {
  const input = event.target.closest('input[type="checkbox"][data-type="criterion"]');
  if (!input) return;
  progress.checks[input.dataset.key] = input.checked;
  persistProgress();
  requestAnimationFrame(() => $(`input[data-type="criterion"][data-key="${CSS.escape(input.dataset.key)}"]`)?.focus({ preventScroll: true }));
});

$("#qualityList").addEventListener("change", (event) => {
  const input = event.target.closest('input[type="checkbox"][data-type="quality"]');
  if (!input) return;
  progress.quality[input.dataset.key] = input.checked;
  persistProgress();
  requestAnimationFrame(() => $(`input[data-type="quality"][data-key="${CSS.escape(input.dataset.key)}"]`)?.focus({ preventScroll: true }));
});

$("#roadmap").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  renderPhases();
});

$("#btnExport").addEventListener("click", exportProgress);
$("#btnImport").addEventListener("click", () => $("#fileImport").click());
$("#fileImport").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importProgress(file);
  event.target.value = "";
});
$("#btnReset").addEventListener("click", () => {
  if (!confirm("要清除這個瀏覽器保存的所有 Roadmap 勾選進度嗎？此動作無法復原，建議先匯出備份。")) return;
  progress = emptyProgress();
  persistProgress();
  showToast("追蹤狀態已重設。");
});

renderAll();
