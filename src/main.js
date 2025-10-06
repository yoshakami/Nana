const { invoke } = window.__TAURI__.core;

async function fetchFiles(path, limit = null) {
  console.log("fetchFiles called with:", path, limit); // DEBUG
  try {
    const files = await invoke("list_dir", { path, limit });
    console.log("Files from Rust:", files);
    renderFiles(files);
  } catch (err) {
    console.error("Error fetching files:", err);
  }
}
function attachSelectionHandler(item, fileOrDrive, index, container) {
  item.addEventListener("click", (e) => {
    e.stopPropagation();

    const items = Array.from(container.querySelectorAll(".file-item"));

    // SHIFT + click (range selection)
    if (e.shiftKey && lastSelectedIndex !== null) {
      const [start, end] = [lastSelectedIndex, index].sort((a, b) => a - b);
      items.forEach((el, i) => {
        if (i >= start && i <= end) el.classList.add("selected");
        else el.classList.remove("selected");
      });
      selectedFiles = items
        .filter((el) => el.classList.contains("selected"))
        .map((el) => el.dataset.name);
    }

    // CTRL or CMD toggle
    else if (e.ctrlKey || e.metaKey) {
      const alreadySelected = item.classList.contains("selected");
      item.classList.toggle("selected");
      if (alreadySelected) {
        selectedFiles = selectedFiles.filter((n) => n !== fileOrDrive.name);
      } else {
        selectedFiles.push(fileOrDrive.name);
      }
      lastSelectedIndex = index;
    }

    // single select
    else {
      items.forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedFiles = [fileOrDrive.name];
      lastSelectedIndex = index;
    }

    console.log("Selected:", selectedFiles);
  });
}

async function listDrives() {
  console.log("listDrives called");
  try {
    const drives = await invoke("list_drives");
    const driveEntries = drives.map((path) => ({
      name: path.replace(/\\$/, ""), // remove trailing \
      is_dir: true,
      path,
      free: Math.random() * 0.8 + 0.2, // mock 20–100% free
    }));
    renderDrives(driveEntries);
  } catch (err) {
    console.error("Error fetching drives:", err);
  }
}
function renderDrives(drives) {
  const container = document.querySelector("#file-list");
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


window.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#load-files").addEventListener("click", () => {
    const path = document.querySelector("#path-input").value;
    console.log("Load files clicked, path =", path); // DEBUG
    fetchFiles(path, 50);
  });
});

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
}// Define all actions in a local map
const actions = {
  copyFile,
  deleteFile,
  makeHardlink,
  moveFile,
  setReadonly,
  createSymlink,
  createJunction,
  fetchFiles,
};

// Wire buttons dynamically
document.querySelectorAll("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const actionName = btn.dataset.action;
    const actionFn = actions[actionName];
    if (!actionFn) {
      console.warn(`No function found for action: ${actionName}`);
      return;
    }

    // Collect arguments from data-args (comma-separated)
    let args = [];
    if (btn.dataset.args) {
      args = btn.dataset.args.split(",").map(a => a.trim());
    }

    try {
      const res = await actionFn(...args);
      console.log(`Action ${actionName} result:`, res);
    } catch (err) {
      console.error(`Action ${actionName} failed:`, err);
    }
  });
});
let selectedFiles = [];
let lastSelectedIndex = null;

function renderFiles(files) {
  const container = document.querySelector("#file-list");
  container.innerHTML = "";

  files.forEach((file, idx) => {
    const item = document.createElement("div");
    item.classList.add("file-item");
    item.dataset.index = idx;
    item.dataset.name = file.name;

    // show icon or image
    if (file.is_dir) {
      item.textContent = `[DIR] ${file.name}`;
    } else {
      item.textContent = file.name;
      if (/\.(png|jpg|jpeg|gif)$/i.test(file.name)) {
        const img = document.createElement("img");
        img.src = "file:///" + file.path; // or use readBinaryFile -> Blob for Tauri 2
        item.prepend(img);
      }
    }

    // click logic
    attachSelectionHandler(item, file, idx, container);
    container.appendChild(item);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  listDrives(); // automatically list drives on load
});

/*
// Expose functions to global scope so HTML can call them
window.copyFile = copyFile;
window.deleteFile = deleteFile;
window.makeHardlink = makeHardlink;
window.moveFile = moveFile;
window.setReadonly = setReadonly;
window.createSymlink = createSymlink;
window.createJunction = createJunction;
window.fetchFiles = fetchFiles; // if you want to call from HTML too
*/