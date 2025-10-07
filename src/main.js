const { invoke } = window.__TAURI__.core;
let selectedFiles = [];
let lastSelectedIndex = null;
let container;

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
function placeholderCommand(type) {
  const el = document.querySelector(`#prop-${type}`);
  console.log("Would operate on element:", el);
}
// placeholder querySelector function you asked for
function placeholderCommand(key) {
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

// --- mock drives ---
const mockDrives = [
  { name: "C:", path: "C:\\", free: 0.75, is_dir: true },
  { name: "D:", path: "D:\\", free: 0.45, is_dir: true },
];
renderFavourites(mockDrives);

function renderFavourites(drives) {
  let container2 = document.querySelector("#favourites");
  container2.innerHTML = "";
  drives.forEach((drive, idx) => {
    const item = document.createElement("div");
    item.classList.add("file-item");
    item.textContent = `💽 ${drive.name}`;
    container2.appendChild(item);

    item.addEventListener("click", () => {
      document.querySelectorAll(".file-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
    });

    item.addEventListener("dblclick", () => {
      console.log("Opening drive:", drive.path);
      fetchFiles(drive.path);
    });
  });
}

async function fetchFiles(path, limit = null) {
  clearError();
  console.log("fetchFiles called with:", path, limit);
  try {
    const files = await invoke("list_dir", { path, limit });
    renderFiles(files);
  } catch (err) {
    showError(`Error fetching files: ${err}`);
    console.error(err);
  }
}

function attachSelectionHandler(item, fileOrDrive, index, container) {
  item.addEventListener("click", (e) => {
    e.stopPropagation();

    const items = Array.from(container.querySelectorAll(".file-item"));

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

async function copyFile(src, dst) {
  const res = await invoke("copy_path", { src, dst, overwrite: true });
  console.log(res);
}

async function deleteFile(path) {
  const res = await invoke("delete_path", { path });
  console.log(res);
}

async function makeHardlink(src, dst) {
  const res = await invoke("create_hardlink", { src, dst });
  console.log(res);
}

async function moveFile(src, dst) {
  const res = await invoke("move_path", { src, dst, overwrite: true });
  console.log(res);
}

async function setReadonly(path, ro) {
  const res = await invoke("set_readonly", { path, readonly: ro });
  console.log(res);
}

async function createSymlink(target, link) {
  const res = await invoke("create_symlink", { src: target, link });
  console.log(res);
}

async function createJunction(target, link) {
  const res = await invoke("create_ntfs_junction", { target, link });
  console.log(res);
}

function renderFiles(files) {
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

function showPreview(name) {
  document.getElementById("preview").innerHTML = `<img src="mock/${name}" alt="${name}">`;
}

function updateProperties(file) {
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
function showError(msg) {
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
function clearError() {
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
function renderDrives(drives) {
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
const actionFuncs = {
  copyFile,
  deleteFile,
  makeHardlink,
  moveFile,
  setReadonly,
  createSymlink,
  createJunction,
  fetchFiles,
};

window.addEventListener("DOMContentLoaded", () => {
  container = document.querySelector("#file-list");
  console.log(container);
  listDrives(); // automatically list drives on load
  // ---------- RIGHT PANEL: commands + placeholders ----------
  
// wire checkbox / radio interactions as simple placeholders
document.querySelectorAll("#commands-pane input[type='checkbox'], #commands-pane input[type='radio']").forEach(el => {
  el.addEventListener("change", (e) => {
    console.log(`UI option changed: ${e.target.id || e.target.name} -> ${e.target.checked || e.target.value}`);
  });
});

document.querySelectorAll("#actions a").forEach(item => {
  // Give each link the 'action' class
  item.classList.add("action");

  // Click handler for selection highlight
  item.addEventListener("click", () => {
    // Remove 'selected' from all actions
    document.querySelectorAll(".action").forEach(el => el.classList.remove("selected"));

    // Add it to the clicked one
    item.classList.add("selected");
  });
});
  // toggle the two panes:
  /*document.getElementById("toggle-details").addEventListener("click", () => {
    document.getElementById("details-pane").classList.toggle("hidden");
  });
  document.getElementById("toggle-shortcuts").addEventListener("click", () => {
    document.getElementById("commands-pane").classList.toggle("hidden");
  });*/

  // wire the 8 static command buttons to placeholderCommand()
  document.querySelectorAll(".cmd-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.cmd; // name, type, size, modified, added, width, height, length
      placeholderCommand(key);
    });
  });
/*
  document.getElementById("toggle-properties").addEventListener("click", () => {
    document.getElementById("properties-pane").classList.toggle("active");
    document.getElementById("commands-pane").classList.remove("active");
  });

  document.getElementById("toggle-shortcuts").addEventListener("click", () => {
    document.getElementById("commands-pane").classList.toggle("active");
  });*/
  
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
function showDetails() {
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

// Toggle button
/*document.getElementById("toggle-details").addEventListener("click", () => {
  detailsPane.classList.toggle("hidden");
  if (detailsPane.classList.contains("hidden")) {
    app.style.gridTemplateColumns = gridAppLeft;
  } else {
    const savedWidth = localStorage.getItem("rightWidth") || "340px";
    app.style.gridTemplateColumns = `${gridAppLeft} ${gridAppGap} ${savedWidth}`;
  }
});*/
});

