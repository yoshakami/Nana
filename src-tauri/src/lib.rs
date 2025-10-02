use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
struct FileEntry {
    name: String,
    is_dir: bool,
    path: String,
}

#[tauri::command]
fn list_dir(path: String, limit: Option<usize>) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir = PathBuf::from(path);

    if !dir.exists() {
        return Err("Path does not exist".into());
    }

    let read_dir = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for (i, entry) in read_dir.enumerate() {
        if let Ok(entry) = entry {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            entries.push(FileEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                is_dir: metadata.is_dir(),
                path: entry.path().to_string_lossy().to_string(),
            });

            if let Some(max) = limit {
                if i + 1 >= max {
                    break;
                }
            }
        }
    }

    Ok(entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![list_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
