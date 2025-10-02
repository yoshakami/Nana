const { invoke } = window.__TAURI__.core;

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
    fetchFiles(path, 50);
  });
});
