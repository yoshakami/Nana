// main.js - drop in for Tauri/Browser
const { invoke } = window.__TAURI__?.core ?? window.__TAURI__;

// DOM containers
let containerDrives, containerFiles;
let selectedFiles = [];
let lastSelectedIndex = null;

// small helpers
function fmtBytes(bytes) {
  if (bytes == null) return "Unknown";
  const units = ["B","KB","MB","GB","TB"];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${Math.round(v)} ${units[i]}`;
}

function showError(msg) {
  let el = document.getElementById("nana-error");
  if (!el) {
    el = document.createElement("div");
    el.id = "nana-error";
    el.style.color = "#f88";
    el.style.margin = "6px 0";
    document.querySelector(".main").prepend(el);
  }
  el.textContent = msg;
}
function clearError(){ const el = document.getElementById("nana-error"); if (el) el.textContent = ""; }

// Attach unified selection + optional double-click handler
function attachSelectionHandler(item, entry, index, itemsContainer, onDouble) {
  item.dataset.index = index;
  item.dataset.name = entry.name;

  item.addEventListener("click", (e) => {
    e.stopPropagation();
    const items = Array.from(itemsContainer.querySelectorAll(".file-item, .drive-card"));

    if (e.shiftKey && lastSelectedIndex !== null) {
      const [start, end] = [lastSelectedIndex, index].sort((a,b)=>a-b);
      items.forEach((el, i) => {
        if (i >= start && i <= end) el.classList.add("selected"); else el.classList.remove("selected");
      });
      selectedFiles = items.filter(el => el.classList.contains("selected")).map(el => el.dataset.name);
    } else if (e.ctrlKey || e.metaKey) {
      const was = item.classList.contains("selected");
      item.classList.toggle("selected");
      if (was) selectedFiles = selectedFiles.filter(n => n !== entry.name);
      else selectedFiles.push(entry.name);
      lastSelectedIndex = index;
    } else {
      items.forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedFiles = [entry.name];
      lastSelectedIndex = index;
    }

    // update details pane with current selection (first selected)
    const selName = selectedFiles[0];
    if (selName) {
      // find the DOM element for that name and read its dataset.path if present
      const el = itemsContainer.querySelector(`[data-name="${CSS.escape(selName)}"]`);
      if (el) {
        const data = { name: selName, path: el.dataset.path, is_dir: el.dataset.path && el.dataset.path.endsWith(":\\") };
        updateDetailsPane(data);
      }
    }
  });

  if (onDouble) {
    item.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      onDouble(entry);
    });
  }
}

// UPDATE details pane
function updateDetailsPane(entry) {
  const avatar = document.getElementById("detail-avatar");
  const title = document.getElementById("detail-title");
  const fill = document.getElementById("detail-fill");
  const stats = document.getElementById("detail-stats");
  const fs = document.getElementById("detail-fs");

  if (!entry) {
    avatar.textContent = "—";
    title.textContent = "Select a drive or item";
    fill.style.width = "0%";
    stats.textContent = "—";
    fs.textContent = "File system: —";
    return;
  }

  avatar.textContent = entry.avatar || entry.name?.charAt(0) || "💽";
  title.textContent = entry.name || entry.path || "—";

  // If the entry has free/total use them; otherwise keep mock values
  let pct = 0.3;
  if (typeof entry.free === "number" && typeof entry.total === "number" && entry.total > 0) {
    pct = Math.max(0, Math.min(1, (entry.total - entry.free) / entry.total)); // used fraction
    fill.style.width = `${Math.round(pct * 100)}%`;
    stats.textContent = `${fmtBytes(entry.free)} free of ${fmtBytes(entry.total)}`;
  } else if (typeof entry.pct === "number") {
    fill.style.width = `${Math.round(entry.pct * 100)}%`;
    stats.textContent = entry.label || "";
  } else {
    // fallback mock
    fill.style.width = `30%`;
    stats.textContent = entry.path || "Unknown size";
  }

  fs.textContent = entry.fs || `File system: ${entry.fs || "NTFS"}`;
}

// RENDER drives (expects array of strings or objects)
function renderDrives(drives) {
  containerDrives.innerHTML = "";
  drives.forEach((drive, i) => {
    const entry = (typeof drive === "string") ? { name: drive.replace(/\\$/,""), path: drive, pct: 0.3 } : drive;
    const card = document.createElement("div");
    card.className = "drive-card file-item";
    card.dataset.path = entry.path || "";
    card.dataset.name = entry.name;

    const avatar = document.createElement("div");
    avatar.className = "drive-avatar";
    if (entry.avatar) {
      const img = document.createElement("img");
      img.src = entry.avatar;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      avatar.appendChild(img);
    } else {
      avatar.textContent = entry.name?.charAt(0).toUpperCase() || "D";
    }

    const meta = document.createElement("div"); meta.className = "drive-meta";
    const title = document.createElement("div"); title.className = "drive-title"; title.textContent = entry.name;
    const row = document.createElement("div"); row.className = "progress-row";
    const progress = document.createElement("div"); progress.className = "progress";
    const fill = document.createElement("div"); fill.className = "fill";

    if (typeof entry.free === "number" && typeof entry.total === "number" && entry.total > 0) {
      const usedPct = Math.max(0, Math.min(1, (entry.total - entry.free) / entry.total));
      fill.style.width = `${Math.round(usedPct * 100)}%`;
    } else if (typeof entry.pct === "number") {
      fill.style.width = `${Math.round(entry.pct * 100)}%`;
    } else {
      fill.style.width = "30%";
    }

    progress.appendChild(fill);
    const details = document.createElement("div"); details.className = "drive-details";
    if (typeof entry.free === "number" && typeof entry.total === "number") details.textContent = `${fmtBytes(entry.free)} free of ${fmtBytes(entry.total)}`;
    else details.textContent = entry.label || "—";

    row.appendChild(progress);
    meta.appendChild(title); meta.appendChild(row); meta.appendChild(details);

    const side = document.createElement("div"); side.className = "drive-side";
    const smallIcon = document.createElement("div"); smallIcon.className = "small-drive-icon"; smallIcon.textContent = "💾";
    side.appendChild(smallIcon);

    card.appendChild(avatar); card.appendChild(meta); card.appendChild(side);

    attachSelectionHandler(card, entry, i, containerDrives, async (ent) => {
      try { await fetchFiles(ent.path); } catch (e) { showError(`Cannot open ${ent.path}: ${e}`) }
    });

    containerDrives.appendChild(card);
  });
}

// RENDER files (array of {name,is_dir,path})
function renderFiles(files) {
  containerFiles.innerHTML = "";
  files.forEach((file, idx) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.dataset.path = file.path || "";
    item.dataset.name = file.name || `item-${idx}`;

    const icon = document.createElement("div"); icon.textContent = file.is_dir ? "📁" : "📄"; icon.style.fontSize = "28px"; icon.style.marginBottom = "6px";
    const label = document.createElement("div"); label.textContent = file.name; label.style.fontSize = "13px"; label.style.maxWidth = "100%"; label.style.overflow = "hidden"; label.style.textOverflow = "ellipsis"; label.style.whiteSpace = "nowrap";

    item.appendChild(icon); item.appendChild(label);

    attachSelectionHandler(item, file, idx, containerFiles, file.is_dir ? async (entry) => { await fetchFiles(entry.path); } : null);

    containerFiles.appendChild(item);
  });
}

// Tauri-invoke wrappers
async function fetchFiles(path, limit = null) {
  clearError();
  if (!path) { showError("Empty path"); return; }
  try {
    const files = await invoke("list_dir", { path, limit });
    renderFiles(files);
    // update details pane with the opened folder as selected
    updateDetailsPane({ name: path, path, label: "Folder", pct: 0.0 });
  } catch (err) {
    showError(`Error fetching files: ${err}`);
    console.error(err);
  }
}

async function listDrives() {
  clearError();
  try {
    const drives = await invoke("list_drives");
    const entries = (drives || []).map(d => typeof d === "string" ? { name: String(d).replace(/\\$/,""), path: d, pct: 0.3 } : d);
    renderDrives(entries);
  } catch (err) {
    showError(`Error listing drives: ${err}`);
    console.error(err);
  }
}

/* RIGHT pane toggles and keyboard handling */
function setRightVisible(visible) {
  const right = document.getElementById("right-column");
  if (!right) return;
  if (visible) right.classList.remove("hidden");
  else right.classList.add("hidden");
}
function setPaneVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  if (visible) el.classList.remove("hidden"); else el.classList.add("hidden");
}

window.addEventListener("DOMContentLoaded", () => {
  containerDrives = document.getElementById("drive-list");
  containerFiles = document.getElementById("file-list");

  // wire UI controls
  document.getElementById("refresh").addEventListener("click", () => listDrives());
  document.getElementById("toggle-right").addEventListener("click", () => {
    const right = document.getElementById("right-column");
    right.classList.toggle("hidden");
  });

  // pane toggles
  let detailsVisible = true, actionsVisible = true;
  document.getElementById("toggle-details").addEventListener("click", () => {
    detailsVisible = !detailsVisible;
    setPaneVisible("details-pane", detailsVisible);
  });
  document.getElementById("toggle-actions").addEventListener("click", () => {
    actionsVisible = !actionsVisible;
    setPaneVisible("actions-pane", actionsVisible);
  });

  // keyboard: Ctrl+= toggles right column visibility
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "=") {
      e.preventDefault();
      const right = document.getElementById("right-column");
      right.classList.toggle("hidden");
    }
  });

  // search enter = open path (basic)
  document.getElementById("search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = e.target.value.trim();
      if (!q) return;
      if (/^[A-Za-z]:\\/.test(q) || q.startsWith("/")) fetchFiles(q);
    }
  });

  // initial load
  listDrives();
});
