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
async function getSelectedPaths() {
  // this var is accessible from global scope 
  // container = document.querySelector("#file-list");
  // get all div with class .selected
  // direct children of container.
  let a = container.querySelectorAll('.selected')
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
  "add-favourite": () => addFavourite(getSelectedPaths()),
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
    const item = document.createElement("div");
    item.classList.add("file-item");
    switch (drive.type) {
      case 0:
        item.textContent = `💽`
        break;
      case 1:
        item.textContent = `📝`
        break;
      case 2:
        item.textContent = `📁`
        break;
    }

    item.textContent += `${drive.name}`;
    container2.appendChild(item);
    let file = {name: drive.name, path: drive.path}
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
async function addFavourite(paths) {
  if (!paths?.length) return;
  let changed = false;

  paths.forEach(path => {
    // Avoid duplicates
    if (!mockDrives.some(d => d.path === path)) {
      const type = path.endsWith("\\") || path.endsWith("/") ? 0 : 2; // guess type: drive(0) or folder(2)
      const name = path.replace(/\\$/, "").split(/[\\/]/).pop() || path; // last part or drive name
      mockDrives.push({ name, path, type });
      changed = true;
    }
  });

  if (changed) {
    saveFavourites();
    renderFavourites(mockDrives);
    console.log("⭐ Added favourites:", paths);
  } else {
    console.log("⚠️ Already in favourites:", paths);
  }
}

// 🗑️ Remove a favourite by path
async function removeFavourite(path) {
  const index = mockDrives.findIndex(d => d.path === path);
  if (index >= 0) {
    mockDrives.splice(index, 1);
    saveFavourites();
    renderFavourites(mockDrives);
    console.log("🗑️ Removed favourite:", path);
  }
}

console.log(container);
loadFavourites();   // <=== load them right away
listDrives(); // automatically list drives on load
// ---------- RIGHT PANEL: commands + placeholders ----------

// ==== Event binding ====
document.querySelectorAll("#actions a").forEach(item => {
  const id = item.id;
  item.classList.add("action");

  item.addEventListener("mouseup", () => {
    item.classList.remove("selected")
    console.log("remove classlist")
  });
  item.addEventListener("mousedown", e => {
    e.preventDefault();
    document.querySelectorAll(".action").forEach(el => el.classList.remove("selected"));
    item.classList.add("selected");

    const func = actionFuncs[id];
    if (func) func();
    else console.warn("No action function defined for:", id);
  });
});
// wire checkbox / radio interactions as simple placeholders
document.querySelectorAll("#commands-pane input[type='checkbox'], #commands-pane input[type='radio']").forEach(el => {
  el.addEventListener("change", (e) => {
    console.log(`UI option changed: ${e.target.id || e.target.name} -> ${e.target.checked || e.target.value}`);
  });
});
// wire the 8 static command buttons to placeholderCommand()
document.querySelectorAll(".cmd-action-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.cmd; // name, type, size, modified, added, width, height, length
    placeholderCommand(key);
  });
});
// Handle command clicks
document.querySelectorAll("#commands-list li").forEach(cmd => {
  cmd.addEventListener("click", () => {
    console.log(`Command triggered: ${cmd.dataset.command}`);
    placeholderCommand(cmd.dataset.command);
  });
});
const divider = document.getElementById("divider");
const app = document.getElementById("app");
const detailsPane = document.getElementById("splitted");
const rightColumn = document.getElementById("right-column")
const restoreBtn = document.getElementById("restore-button");
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
window.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const newWidth = startWidth + startX - e.clientX;

  if (newWidth < 340) {
    detailsPane.classList.add("hidden");
    restoreBtn.classList.remove("hidden");
    app.style.gridTemplateColumns = gridAppLeft; // collapse layout
  } else {
    detailsPane.classList.remove("hidden");
    restoreBtn.classList.add("hidden");
    app.style.gridTemplateColumns = `${gridAppLeft} ${gridAppGap} ${newWidth}px`;
  }
});
// The restore button (the floating tab)
restoreBtn.addEventListener("click", showDetails);
// When showing the details pane
async function showDetails() {
  detailsPane.classList.remove("hidden");
  restoreBtn.classList.add("hidden");

  const savedWidth = localStorage.getItem("rightWidth") || "340px";
  app.style.gridTemplateColumns = `${gridAppLeft} ${gridAppGap} ${savedWidth}`;
}
window.addEventListener("mouseup", () => {
  if (!isResizing) return;
  document.body.style.userSelect = "";
  isResizing = false;

  if (!detailsPane.classList.contains("hidden")) {
    const cols = app.style.gridTemplateColumns.split(" ");
    localStorage.setItem("rightWidth", cols.pop());
  }
});

// Restore saved width
window.addEventListener("load", () => {
  const savedWidth = localStorage.getItem("rightWidth");
  if (savedWidth) {
    app.style.gridTemplateColumns = `${gridAppLeft} ${gridAppGap} ${savedWidth}`;
  }
});

