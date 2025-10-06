// main.js - uses Tauri invoke (window.__TAURI__.core.invoke)
const { invoke } = window.__TAURI__.core;

let containerDrives, containerFiles;
let selectedFiles = [];
let lastSelectedIndex = null;

// small helper: format bytes nicely
function fmtBytes(bytes) {
  if (!bytes && bytes !== 0) return "Unknown";
  const units = ["B","KB","MB","GB","TB"];
  let i=0; let v=bytes;
  while (v >= 1024 && i < units.length-1) { v/=1024; i++; }
  return `${Math.round(v)} ${units[i]}`;
}

// attach selection / dblclick behaviour
function attachSelectionHandler(item, entry, index, itemsContainer, onDouble) {
  item.dataset.index = index;
  item.dataset.name = entry.name;

  item.addEventListener("click", (e) => {
    e.stopPropagation();
    const items = Array.from(itemsContainer.querySelectorAll(".file-item, .drive-card"));

    // SHIFT range
    if (e.shiftKey && lastSelectedIndex !== null) {
      const [start, end] = [lastSelectedIndex, index].sort((a,b)=>a-b);
      items.forEach((el, i) => {
        if (i >= start && i <= end) el.classList.add("selected"); else el.classList.remove("selected");
      });
      selectedFiles = items.filter(el => el.classList.contains("selected")).map(el => el.dataset.name);
    }
    // CTRL / CMD toggle
    else if (e.ctrlKey || e.metaKey) {
      const was = item.classList.contains("selected");
      item.classList.toggle("selected");
      if (was) selectedFiles = selectedFiles.filter(n => n !== entry.name);
      else selectedFiles.push(entry.name);
      lastSelectedIndex = index;
    }
    // single select
    else {
      items.forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedFiles = [entry.name];
      lastSelectedIndex = index;
    }
    // debug log
    // console.log("Selected:", selectedFiles);
  });

  if (onDouble) {
    item.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      onDouble(entry);
    });
  }
}

// Renders drives (expects array of objects:
// { name, path, free (optional bytes), total (optional bytes), avatar (optional url) })
function renderDrives(drives) {
  containerDrives.innerHTML = "";
  drives.forEach((drive, i) => {
    const card = document.createElement("div");
    card.className = "drive-card file-item"; // also share file-item styles for selection
    card.dataset.path = drive.path;
    card.dataset.name = drive.name;

    const avatar = document.createElement("div");
    avatar.className = "drive-avatar";
    if (drive.avatar) {
      const img = document.createElement("img");
      img.src = drive.avatar;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      avatar.appendChild(img);
    } else {
      avatar.textContent = drive.name.charAt(0).toUpperCase();
    }

    const meta = document.createElement("div");
    meta.className = "drive-meta";
    const title = document.createElement("h3");
    title.className = "drive-title";
    title.textContent = drive.name;
    const row = document.createElement("div");
    row.className = "progress-row";
    const progress = document.createElement("div");
    progress.className = "progress";
    const fill = document.createElement("div");
    fill.className = "fill";

    // compute ratio if values available; otherwise use mock or 30%
    let pct = 0.3;
    if (typeof drive.free === "number" && typeof drive.total === "number" && drive.total > 0) {
      pct = Math.max(0, Math.min(1, (drive.total - drive.free) / drive.total));
      fill.style.width = `${Math.round(pct * 100)}%`;
    } else if (typeof drive.free === "number" && typeof drive.total !== "number") {
      // if only free provided (bytes): show used as 30% as placeholder
      fill.style.width = `30%`;
    } else if (typeof drive.pct === "number") {
      fill.style.width = `${Math.round(drive.pct*100)}%`;
    } else {
      fill.style.width = `${Math.round(pct * 100)}%`;
    }

    progress.appendChild(fill);

    const details = document.createElement("div");
    details.className = "drive-details";
    let detailsText = "";
    if (typeof drive.free === "number" && typeof drive.total === "number") {
      detailsText = `${fmtBytes(drive.free)} free of ${fmtBytes(drive.total)}`;
    } else {
      detailsText = drive.label || "Unknown size";
    }
    details.textContent = detailsText;

    row.appendChild(progress);

    meta.appendChild(title);
    meta.appendChild(row);
    meta.appendChild(details);

    const side = document.createElement("div");
    side.className = "drive-side";
    const smallIcon = document.createElement("div");
    smallIcon.className = "small-drive-icon";
    smallIcon.textContent = "💾";
    side.appendChild(smallIcon);

    // append: avatar | meta | side
    card.appendChild(avatar);
    card.appendChild(meta);
    card.appendChild(side);

    // selection and dblclick open
    attachSelectionHandler(card, drive, i, containerDrives, async (entry) => {
      // on double-click open drive path
      try { await fetchFiles(entry.path); }
      catch(e){ console.error("open drive failed:", e); }
    });

    containerDrives.appendChild(card);
  });
}

// Render files (expects array of {name,is_dir,path})
function renderFiles(files) {
  containerFiles.innerHTML = "";
  files.forEach((file, idx) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.dataset.path = file.path;
    item.dataset.name = file.name;

    // icon + name
    const icon = document.createElement("div");
    icon.textContent = file.is_dir ? "📁" : "📄";
    icon.style.fontSize = "28px";
    icon.style.marginBottom = "6px";

    const label = document.createElement("div");
    label.textContent = file.name;
    label.style.fontSize = "13px";
    label.style.maxWidth = "100%";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.whiteSpace = "nowrap";

    item.appendChild(icon);
    item.appendChild(label);

    // selection + dblclick open if dir
    attachSelectionHandler(item, file, idx, containerFiles, file.is_dir ? async (entry)=>{ await fetchFiles(entry.path); } : null);

    containerFiles.appendChild(item);
  });
}

// fetchFiles wrapper that uses Tauri invoke
async function fetchFiles(path, limit = null) {
  clearError();
  try {
    const files = await invoke("list_dir", { path, limit });
    // invoke returns array of objects with name/is_dir/path
    renderFiles(files);
  } catch (err) {
    showError(`Error fetching files: ${err}`);
    console.error(err);
  }
}

// list drives wrapper: expects array of strings or objects
async function listDrives() {
  clearError();
  try {
    const drives = await invoke("list_drives"); // might be ["C:\\","D:\\"] or structured
    // normalize to objects: try to keep any info if present
    const entries = drives.map(d => {
      if (typeof d === "string") {
        return { name: String(d).replace(/\\$/,""), path: d, pct: 0.3 };
      } else {
        return d; // already object with free/total
      }
    });
    renderDrives(entries);
  } catch (err) {
    showError(`Error listing drives: ${err}`);
    console.error(err);
  }
}

/* error helpers (small inline UI) */
function showError(msg) {
  let el = document.getElementById("nana-error");
  if (!el) {
    el = document.createElement("div");
    el.id = "nana-error";
    el.style.color = "#f88";
    el.style.margin = "8px 0";
    document.querySelector(".main").prepend(el);
  }
  el.textContent = msg;
}
function clearError(){
  const el = document.getElementById("nana-error");
  if (el) el.textContent = "";
}

window.addEventListener("DOMContentLoaded", () => {
  containerDrives = document.getElementById("drive-list");
  containerFiles = document.getElementById("file-list");

  // initial load
  listDrives();

  // wire search & refresh
  document.getElementById("search").addEventListener("keydown", (e)=>{
    if (e.key === "Enter") {
      const q = e.target.value.trim();
      if (!q) return;
      // Simple search: if query looks like a path, open it; otherwise attempt to list drives
      // (You can implement a real search later)
      if (q.match(/^[A-Za-z]:\\/)) fetchFiles(q);
    }
  });
  document.getElementById("refresh").addEventListener("click", () => listDrives());
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