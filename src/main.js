const { invoke } = window.__TAURI__.core;

let greetInputEl;
let greetMsgEl;
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

// Example: list C:/
async function listFiles() {
  const entries = await readDir("C:/", { recursive: false });
  console.log(entries);
}

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}
window.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#load-files").addEventListener("click", () => {
    const path = document.querySelector("#path-input").value;
    fetchFiles(path, 50); // fetch 50 entries
  });
});

async function fetchFiles(path, limit = null) {
  try {
    const files = await invoke("list_dir", { path, limit });
    console.log("Files:", files);
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
      img.src = "file:///" + file.path; // works if Tauri allows fs access
      img.style.maxWidth = "150px";
      img.style.maxHeight = "150px";
      item.appendChild(img);
    }

    container.appendChild(item);
  });
}

