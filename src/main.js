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

async function listDrives() {
  console.log("listDrives called"); // DEBUG
  try {
    const drives = await invoke("list_drives");
    console.log("Files from Rust:", drives);
    renderFiles(drives);
  } catch (err) {
    console.error("Error fetching files:", err);
  }
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
    item.addEventListener("click", (e) => {
      const index = parseInt(item.dataset.index);

      if (e.shiftKey && lastSelectedIndex !== null) {
        // select range
        const [start, end] = [lastSelectedIndex, index].sort((a, b) => a - b);
        for (let i = start; i <= end; i++) {
          const el = container.querySelector(`.file-item[data-index='${i}']`);
          if (!selectedFiles.includes(el.dataset.name)) selectedFiles.push(el.dataset.name);
          el.classList.add("selected");
        }
      } else if (e.ctrlKey || e.metaKey) {
        // toggle select
        if (selectedFiles.includes(file.name)) {
          selectedFiles = selectedFiles.filter(n => n !== file.name);
          item.classList.remove("selected");
        } else {
          selectedFiles.push(file.name);
          item.classList.add("selected");
        }
        lastSelectedIndex = index;
      } else {
        // single select
        container.querySelectorAll(".file-item.selected").forEach(el => el.classList.remove("selected"));
        selectedFiles = [file.name];
        item.classList.add("selected");
        lastSelectedIndex = index;
      }

      console.log("Selected files:", selectedFiles);
    });

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