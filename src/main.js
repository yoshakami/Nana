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


function renderFiles(files) {
  const container = document.querySelector("#file-list");
  container.innerHTML = "";

  files.forEach((file) => {
    const item = document.createElement("div");
    item.textContent = file.is_dir ? `[DIR] ${file.name}` : file.name;

    // If it's an image, display preview
    if (!file.is_dir && /\.(png|jpg|jpeg|gif)$/i.test(file.name)) {
      const img = document.createElement("img");
      // ⚠️ "file:///" often blocked in Tauri 2 sandbox
      // safer approach is to read file via @tauri-apps/plugin-fs (readBinaryFile -> Blob)
      img.src = "file:///" + file.path;
      img.style.maxWidth = "150px";
      img.style.maxHeight = "150px";
      item.appendChild(img);
    }

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
import { invoke } from "@tauri-apps/api/tauri"; // or window.__TAURI__.core.invoke depending on setup

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
