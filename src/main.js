const { invoke } = window.__TAURI__.core;
let selectedFiles = [];
let lastSelectedIndex = null;
const container = document.querySelector("#file-list");;

/* js layout:
renderFavourites
fetchFiles
attachSelectionHandler
buttons actions
renderFiles
listDrives
renderDrives
DOMContentLoaded
*/

// placeholder querySelector stub
async function placeholderCommand(type) {
  const el = document.querySelector(`#prop-${type}`);
  console.log("Would operate on element:", el);
}
// placeholder querySelector function you asked for
async function placeholderCommand(key) {
  // mapping to your properties IDs used in the properties pane
  const map = {
    name: "#prop-name",
    type: "#prop-type",
    size: "#prop-size",
    modified: "#prop-modified",
    added: "#prop-added",
    width: "#prop-width",
    height: "#prop-height",
    length: "#prop-length"
  };
  const selector = map[key];
  console.log("placeholderCommand ->", key, selector);

  if (!selector) return;

  const el = document.querySelector(selector);
  if (!el) {
    console.warn("Target element not found for", selector);
    return;
  }

  // visual feedback: flash the element
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 280);

  // just log the current value (or would run a command here)
  console.log("Would run command on:", selector, "value:", el.textContent);
}

let globalDir = null;

async function fetchFiles(path, limit = null) {
  clearError();
  console.log("fetchFiles called with:", path, limit);
  globalDir = path;
  try {
    const files = await invoke("list_dir", { path, limit });
    renderFiles(files);
  } catch (err) {
    showError(`Error fetching files: ${err}`);
    console.error(err);
  }
}
async function attachSelectionHandler(item, fileOrDrive, index, container) {
  item.addEventListener("click", (e) => {
    e.stopPropagation();

    const items = Array.from(document.querySelectorAll(".file-item"));

    if (e.shiftKey && lastSelectedIndex !== null) {
      const [start, end] = [lastSelectedIndex, index].sort((a, b) => a - b);
      items.forEach((el, i) => {
        if (i >= start && i <= end) el.classList.add("selected");
        else el.classList.remove("selected");
      });
      selectedFiles = items
        .filter((el) => el.classList.contains("selected"))
        .map((el) => el.dataset.name);
    } else if (e.ctrlKey || e.metaKey) {
      const alreadySelected = item.classList.contains("selected");
      item.classList.toggle("selected");
      if (alreadySelected) {
        selectedFiles = selectedFiles.filter((n) => n !== fileOrDrive.name);
      } else {
        selectedFiles.push(fileOrDrive.name);
      }
      lastSelectedIndex = index;
    } else {
      items.forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedFiles = [fileOrDrive.name];
      lastSelectedIndex = index;
    }
  });
}


async function renderFiles(files) {
  container.innerHTML = "";

  files.forEach((file, idx) => {
    const item = document.createElement("div");
    item.classList.add("file-item");
    item.dataset.index = idx;
    item.dataset.name = file.name;
    item.dataset.path = file.path;

    // show icon or image
    const icon = document.createElement("span");
    icon.style.marginRight = "0.5em";
    if (file.is_dir) icon.textContent = "📁";
    else icon.textContent = "📄";

    item.append(icon, document.createTextNode(file.name));

    // images
    if (!file.is_dir && /\.(png|jpg|jpeg|gif)$/i.test(file.name)) {
      const img = document.createElement("img");
      img.src = "file:///" + file.path;
      img.style.maxWidth = "50px";
      img.style.maxHeight = "50px";
      img.style.marginLeft = "0.5em";
      item.appendChild(img);
    }

    attachSelectionHandler(item, file, idx, container);

    // double-click to open directories
    if (file.is_dir) {
      item.addEventListener("dblclick", async (e) => {
        e.stopPropagation();
        clearError();
        try {
          await fetchFiles(file.path);
        } catch (err) {
          showError(`Cannot open ${file.path}: ${err}`);
        }
      });
    }

    container.appendChild(item);
  });
}

async function showPreview(name) {
  document.getElementById("preview").innerHTML = `<img src="mock/${name}" alt="${name}">`;
}

async function updateProperties(file) {
  document.getElementById("prop-name").textContent = file.name;
  document.getElementById("prop-type").textContent = file.is_dir ? "Folder" : "File";
  document.getElementById("prop-size").textContent = "123 KB";
  document.getElementById("prop-modified").textContent = "2025-10-06";
  document.getElementById("prop-added").textContent = "2025-10-01";
  document.getElementById("prop-width").textContent = "1024";
  document.getElementById("prop-height").textContent = "768";
  document.getElementById("prop-length").textContent = "3:42";
}

// Utility to show errors
async function showError(msg) {
  let errDiv = document.querySelector("#error-message");
  if (!errDiv) {
    errDiv = document.createElement("div");
    errDiv.id = "error-message";
    errDiv.style.color = "red";
    errDiv.style.margin = "0.5em 0";
    container.parentElement.prepend(errDiv);
  }
  errDiv.textContent = msg;
}

// Clear previous error
async function clearError() {
  const errDiv = document.querySelector("#error-message");
  if (errDiv) errDiv.textContent = "";
}


async function listDrives() {
  clearError();
  try {
    const drives = await invoke("list_drives");
    const driveEntries = drives.map((path) => ({
      name: path.replace(/\\$/, ""),
      is_dir: true,
      path,
      free: Math.random() * 0.8 + 0.2,
    }));
    renderDrives(driveEntries);
  } catch (err) {
    showError(`Error fetching drives: ${err}`);
    console.error(err);
  }
}
async function renderDrives(drives) {
  container.innerHTML = "";

  drives.forEach((drive, idx) => {
    const item = document.createElement("div");
    item.classList.add("file-item");
    item.dataset.index = idx;
    item.dataset.name = drive.name;
    item.dataset.path = drive.path; // so we can open it later

    const icon = document.createElement("span");
    icon.textContent = "💽";
    icon.style.fontSize = "2em";

    const name = document.createElement("div");
    name.textContent = drive.name;
    name.style.fontWeight = "bold";

    const bar = document.createElement("div");
    bar.classList.add("drive-bar");
    bar.innerHTML = `<div class="fill" style="width:${drive.free * 100}%;"></div>`;

    item.append(icon, name, bar);

    // 🟢 Add selection logic (click)
    attachSelectionHandler(item, drive, idx, container);

    // 🟣 Add double-click logic (open drive)
    item.addEventListener("dblclick", async (e) => {
      e.stopPropagation();
      console.log("Double-clicked:", drive.path);
      await fetchFiles(drive.path);
    });

    container.appendChild(item);
  });
}

// ==== Actions ====
async function pasteFiles() {
  const res = await invoke("paste", { op });
  console.log("paste files:", op);
}
// ==== Helper placeholders ====
function getSelectedPaths() {
  // this var is accessible from global scope 
  // container = document.querySelector("#file-list");
  // get all div with class .selected
  // direct children of container.
  let a = document.querySelectorAll('.selected')
  console.log(a)
  console.log(Array.from(a).map((x) => x.getAttribute('data-path')))
  return Array.from(a).map((x) => x.getAttribute('data-path'));
}
async function copyPathToClipboard(paths) {
  await navigator.clipboard.writeText(paths);
  console.log("Copied paths:", paths);
}

async function setReadonly(path, ro) {
  const res = await invoke("set_readonly", { path, readonly: ro });
  console.log("Set readonly:", res);
}

async function createNewFolder() {
  // this var is accessible from global scope 
  // globalDir = "C:\"
  // need to do something about folder name? or just let user rename manually after
  const res = await invoke("create_folder", { globalDir, name: "NewFolder" });
  console.log("New folder:", globalDir);
}

async function createNewFile() {
  const res = await invoke("create_file", { globalDir, name: "NewFile" });
  console.log("New file:", res);
}

async function moveToBin(path) {
  ///const res = await invoke("recycle_path", { path });
  // get all selected div direct children of container, and remove them
  // <div class="file-item" data-index="10" data-name="Dolphin" data-path="C:\Dolphin"><span style="margin-right: 0.5em;">📁</span>Dolphin</div>
  let selectedItems = container.querySelectorAll('.selected');
  for (item of selectedItems) {
    item.remove();
  }
  const res = await invoke("move_to_bin", { path });
  console.log("Move to bin:", res);
}

async function deleteFile(path) {
  // get all div direct children of container, and remove them
  let selectedItems = container.querySelectorAll('.selected');
  for (item of selectedItems) {
    item.remove();
  }
  const res = await invoke("delete_path", { path });
  console.log("Delete:", res);
}

async function selectAll() {
  [...container.querySelectorAll(":scope > .file-item")].forEach(el => el.classList.add("selected"));
  console.log("Select all items");
}

async function selectNone() {
  [...container.querySelectorAll(":scope > .file-item")].forEach(el => el.classList.remove("selected"));
  console.log("Select none");
}

async function invertSelection() {
  [...container.querySelectorAll(":scope > .file-item")].forEach(el => {
    el.classList.toggle("selected");
  });
  console.log("Invert selection");
}


async function openFile(paths) {
  if (!paths?.length) return;
  const res = await invoke("open_paths", { paths });
  console.log("Open:", res);
}

async function editFile(paths) {
  if (!paths?.length) return;
  const res = await invoke("edit_path", { paths });
  console.log("Edit:", res);
}

async function showHistory(path) {
  if (!path) return;
  const res = await invoke("show_history", { path });
  console.log("History:", res);
}

// Placeholder for user scripts
async function runUserScript(id, paths) {
  console.log(`Run Script ${id} on`, paths);
}

async function editConfigFile() {
  const res = await invoke("open_config_file");
  console.log("Edit config:", res);
}

let op = null; // { type: "copy"|"cut", paths: [] }
// ==== Action mapping ====
const actionFuncs = {
  copy: () => { op = { type: "copy", paths: getSelectedPaths() }; },
  cut: () => { op = { type: "cut", paths: getSelectedPaths() }; },
  paste: () => pasteFiles(),
  symlink: () => { op = { type: "symlink", paths: getSelectedPaths() }; },
  hardlink: () => { op = { type: "hardlink", paths: getSelectedPaths() }; },
  "copy-path": () => copyPathToClipboard(getSelectedPaths()),
  "read-only": () => setReadonly(getSelectedPaths(), true),
  "read-write": () => setReadonly(getSelectedPaths(), false),
  "new-folder": () => createNewFolder(),
  "new-file": () => createNewFile(),
  "move-to-bin": () => moveToBin(getSelectedPaths()),
  "delete-forever": () => deleteFile(getSelectedPaths()),
  "select-all": () => selectAll(),
  "select-none": () => selectNone(),
  "invert-selection": () => invertSelection(),
  open: () => openFile(getSelectedPaths()),
  edit: () => editFile(getSelectedPaths()),
  history: () => showHistory(getLastSelected()),
  "script-1": () => runUserScript(1, getSelectedPaths()),
  "script-2": () => runUserScript(2, getSelectedPaths()),
  "script-3": () => runUserScript(3, getSelectedPaths()),
  "script-4": () => runUserScript(4, getSelectedPaths()),
  "script-5": () => runUserScript(5, getSelectedPaths()),
  "script-6": () => runUserScript(6, getSelectedPaths()),
  "script-7": () => runUserScript(7, getSelectedPaths()),
  "script-8": () => runUserScript(8, getSelectedPaths()),
  "script-9": () => runUserScript(9, getSelectedPaths()),
  "edit-config-file": () => editConfigFile(),
  back: () => previousDir(),
  forward: () => nextDir(),
  refresh: () => f5(),
  up: () => parentDir(),
  "add-favourite": () => toggleFavourite(getSelectedPaths()),
};

// ==== FAVOURITES ====


// --- mock drives ---
let mockDrives = [
  // { name: "C:", path: "C:\\", type:0 },
  // { name: "D:", path: "D:\\" },
];
renderFavourites(mockDrives);

async function renderFavourites(drives) {
  let container2 = document.querySelector("#favourites");
  container2.innerHTML = "";
  drives.forEach((drive, idx) => {
    let item = document.createElement("div");
    item.classList.add("file-item");
    item.dataset.index = idx;
    item.dataset.name = drive.name;
    item.dataset.path = drive.path;
    // 🎨 Choose icon based on type
    let icon = document.createElement("span");
    icon.style.fontSize = "2em";
    switch (drive.type) {
      case 0: icon.textContent = "💽"; break;
      case 1: icon.textContent = "📝"; break;
      case 2: icon.textContent = "📁"; break;
      default: icon.textContent = "📦";
    }
    item.append(icon)
    item.textContent += `${drive.name}`;
    let file = { name: drive.name, path: drive.path }
    attachSelectionHandler(item, file, idx, container);

    // double-click to open directories
    if (file.is_dir) {
      item.addEventListener("dblclick", async (e) => {
      });
    }
    item.addEventListener("dblclick", () => {
      console.log("Opening:", drive.path);
      clearError();
      try {
        fetchFiles(file.path);
      } catch (err) {
        showError(`Cannot open ${file.path}: ${err}`);
      }
    });
    container2.appendChild(item);
  });
}

async function saveFavourites() {
  try {
    localStorage.setItem("favourites", JSON.stringify(mockDrives));
    console.log("✅ Favourites saved:", mockDrives);
  } catch (err) {
    console.error("Failed to save favourites:", err);
  }
}

async function loadFavourites() {
  try {
    const data = localStorage.getItem("favourites");
    if (data) {
      mockDrives = JSON.parse(data);
      console.log("📂 Favourites loaded:", mockDrives);
      renderFavourites(mockDrives);
    } else {
      mockDrives = [];
    }
  } catch (err) {
    console.error("Failed to load favourites:", err);
    mockDrives = [];
  }
}

// 🟡 Add new favourites (paths[] = array of strings)
async function toggleFavourite(paths) {
  console.log(paths)
  console.log("paths =", paths, "type =", typeof paths, "length =", paths?.length);
  if (paths == null) return;
  let changed = false;

  paths.forEach(path => {
    if (path == null) return
    console.log(path)
    // Avoid duplicates
    if (!mockDrives.some(d => d.path === path)) {
      const type = path.endsWith("\\") || path.endsWith("/") ? 0 : 2; // guess type: drive(0) or folder(2)
      const name = path.replace(/\\$/, "").split(/[\\/]/).pop() || path; // last part or drive name
      mockDrives.push({ name, path, type });
      changed = true;
    }
  });

  if (changed) {
    console.log("⭐ Added favourites:", paths);
  } else {
    paths.forEach(path => { removeFavourite(path) })
  }
  saveFavourites();
  renderFavourites(mockDrives);
}

// 🗑️ Remove a favourite by path
async function removeFavourite(path) {
  const index = mockDrives.findIndex(d => d.path === path);
  if (index >= 0) {
    mockDrives.splice(index, 1);
    console.log("🗑️ Removed favourite:", path);
  }
}

loadFavourites();   // <=== load them right away
listDrives(); // automatically list drives on load
// ---------- RIGHT PANEL: commands + placeholders ----------

// ==== Event binding ====
// ==== Event binding ====
function bindActionButtons(selector) {
  document.querySelectorAll(`${selector} a`).forEach(item => {
    const id = item.id;

    // Remove selection on mouseup
    item.addEventListener("mouseup", () => {
      item.classList.remove("selected");
      //console.log(`[${selector}] mouseup → removed class "selected"`);
    });

    // Trigger action on mousedown
    item.addEventListener("mousedown", e => {
      e.preventDefault();

      // Remove "selected" from all other buttons in this group
      document.querySelectorAll(`${selector} a`).forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");

      const func = actionFuncs[id];
      if (func) func();
      else console.warn(`No action function defined for: ${id}`);
    });
  });
}

// Apply to both action areas
bindActionButtons("#actions");
bindActionButtons("#toolbar");

// wire checkbox / radio interactions as simple placeholders --- useless for now
document.querySelectorAll("#commands-pane input[type='checkbox'], #commands-pane input[type='radio']").forEach(el => {
  el.addEventListener("change", (e) => {
    console.log(`UI option changed: ${e.target.id || e.target.name} -> ${e.target.checked || e.target.value}`);
  });
});
const divider = document.getElementById("divider");
const app = document.getElementById("app");
const detailsPane = document.getElementById("splitted");
const rightColumn = document.getElementById("RightPane")
const restoreBtn = document.querySelector(".RestoreRightPane");
let isResizing = false;
let startX = 0;
let startWidth = 0;

divider.addEventListener("mousedown", (e) => {
  isResizing = true;
  startX = e.clientX;
  startWidth = rightColumn.offsetWidth;
  document.body.style.userSelect = "none";
});
const gridAppLeft = "240px 1fr"
const gridAppGap = "8px"

// The restore button (the floating tab)
restoreBtn.addEventListener("click", showDetails);
// When showing the details pane
async function showDetails() {
  detailsPane.classList.remove("hidden");
  restoreBtn.classList.add("hidden");

  const savedWidth = localStorage.getItem("rightWidth") || "340px";
  app.style.gridTemplateColumns = `${gridAppLeft} ${gridAppGap} ${savedWidth}`;
}
// =============================
// Nana File Explorer UI Script
// =============================

// Everything runs after the DOM is ready


// === Element references ===
const body = document.body;
const leftPane = document.querySelector("#LeftPane");
const rightPane = document.querySelector("#RightPane");
const resizeLeft = document.querySelector("#resizeLeftPane");
const resizeRight = document.querySelector("#resizeRightPane");
const restoreButton = document.querySelector(".RestoreRightPane");
const vscodePaneWidth = 50; // fixed width of #VScodeVeryLeftPane

// === Config ===
const MIN_WIDTH = 100;
const MAX_WIDTH = 600;

// === Helper ===
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ================================
// ========== RESIZING ============
// ================================

let activeSide = null; // "left" or "right"

function startResize(e, side) {
  e.preventDefault();
  isResizing = true;
  activeSide = side;
  body.style.cursor = "col-resize";
  body.style.userSelect = "none";
}

function stopResize() {
  if (!isResizing) return;
  isResizing = false;
  activeSide = null;
  body.style.cursor = "";
  body.style.userSelect = "";
}

function onMouseMove(e) {
  if (!isResizing) return;

  const rect = body.getBoundingClientRect();

  if (activeSide === "left") {
    const newWidth = clamp(e.clientX - rect.left - vscodePaneWidth, MIN_WIDTH, MAX_WIDTH);
    leftPane.style.width = `${newWidth}px`;
  }

  if (activeSide === "right") {
    const newWidth = clamp(rect.right - e.clientX, MIN_WIDTH, MAX_WIDTH);
    rightPane.style.width = `${newWidth}px`;
  }
}

// === Event bindings for resizing ===
resizeLeft.addEventListener("mousedown", e => startResize(e, "left"));
resizeRight.addEventListener("mousedown", e => startResize(e, "right"));
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mouseup", stopResize);

// ================================
// === COLLAPSE / RESTORE RIGHT ===
// ================================

let rightPaneVisible = true;
const savedWidth = rightPane.style.width || "250px";

function toggleRightPane() {
  if (rightPaneVisible) {
    // Hide
    rightPane.style.width = "0";
    rightPane.style.opacity = "0";
    restoreButton.classList.remove("hidden");
    rightPaneVisible = false;
  } else {
    // Restore
    rightPane.style.width = savedWidth;
    rightPane.style.opacity = "1";
    restoreButton.classList.add("hidden");
    rightPaneVisible = true;
  }
}

restoreButton.addEventListener("click", toggleRightPane);

// Example keyboard toggle (optional)
// Press Ctrl+= to toggle right pane visibility
window.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "=") {
    e.preventDefault();
    toggleRightPane();
  }
});

// ================================
// === OPTIONAL: SAVE SIZES ===
// ================================
window.addEventListener("beforeunload", () => {
  localStorage.setItem("LeftPaneWidth", leftPane.style.width);
  localStorage.setItem("RightPaneWidth", rightPane.style.width);
});

const lw = localStorage.getItem("LeftPaneWidth");
const rw = localStorage.getItem("RightPaneWidth");
if (lw) leftPane.style.width = lw;
if (rw) rightPane.style.width = rw;


