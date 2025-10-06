let selectedFiles = [];
let lastSelectedIndex = null;

// placeholder querySelector stub
function placeholderCommand(type) {
  const el = document.querySelector(`#prop-${type}`);
  console.log("Would operate on element:", el);
}

// --- mock drives ---
const mockDrives = [
  { name: "C:", path: "C:\\", free: 0.75, is_dir: true },
  { name: "D:", path: "D:\\", free: 0.45, is_dir: true },
];
renderDrives(mockDrives);

function renderDrives(drives) {
  const container = document.querySelector("#file-list");
  container.innerHTML = "";
  drives.forEach((drive, idx) => {
    const item = document.createElement("div");
    item.classList.add("file-item");
    item.textContent = `💽 ${drive.name}`;
    container.appendChild(item);

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

async function fetchFiles(path) {
  console.log("fetchFiles called with:", path);
  // mock files
  const files = [
    { name: "photo.png", is_dir: false },
    { name: "music.mp3", is_dir: false },
    { name: "Documents", is_dir: true }
  ];
  renderFiles(files);
}

function renderFiles(files) {
  const container = document.querySelector("#file-list");
  container.innerHTML = "";
  files.forEach((file, idx) => {
    const item = document.createElement("div");
    item.classList.add("file-item");
    item.textContent = file.is_dir ? `[DIR] ${file.name}` : file.name;
    container.appendChild(item);

    item.addEventListener("click", () => {
      document.querySelectorAll(".file-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
      updateProperties(file);
      if (!file.is_dir && /\.(png|jpg|jpeg|gif)$/i.test(file.name)) {
        showPreview(file.name);
      } else {
        document.getElementById("preview").innerHTML = `<p>No preview available</p>`;
      }
    });
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

// wire checkbox / radio interactions as simple placeholders
document.querySelectorAll("#commands-pane input[type='checkbox'], #commands-pane input[type='radio']").forEach(el => {
  el.addEventListener("change", (e) => {
    console.log(`UI option changed: ${e.target.id || e.target.name} -> ${e.target.checked || e.target.value}`);
  });
});


window.addEventListener("DOMContentLoaded", () => {
  container = document.querySelector("#file-list");
  listDrives(); // automatically list drives on load
  // ---------- RIGHT PANEL: commands + placeholders ----------

  // toggle the two panes:
  document.getElementById("toggle-details").addEventListener("click", () => {
    document.getElementById("details-pane").classList.toggle("hidden");
  });
  document.getElementById("toggle-commands").addEventListener("click", () => {
    document.getElementById("commands-pane").classList.toggle("hidden");
  });

  // wire the 8 static command buttons to placeholderCommand()
  document.querySelectorAll(".cmd-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.cmd; // name, type, size, modified, added, width, height, length
      placeholderCommand(key);
    });
  });

  document.getElementById("toggle-properties").addEventListener("click", () => {
    document.getElementById("properties-pane").classList.toggle("active");
    document.getElementById("commands-pane").classList.remove("active");
  });

  document.getElementById("toggle-commands").addEventListener("click", () => {
    document.getElementById("commands-pane").classList.toggle("active");
    document.getElementById("properties-pane").classList.remove("active");
  });

  // Handle command clicks
  document.querySelectorAll("#commands-list li").forEach(cmd => {
    cmd.addEventListener("click", () => {
      console.log(`Command triggered: ${cmd.dataset.command}`);
      placeholderCommand(cmd.dataset.command);
    });
  });
});

