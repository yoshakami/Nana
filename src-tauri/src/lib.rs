// src-tauri/src/lib.rs
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
//use tauri::Manager;

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

#[derive(Serialize)]
pub struct OpResult {
  pub ok: bool,
  pub msg: Option<String>,
}

fn err<E: ToString>(e: E) -> Result<OpResult, String> {
  Err(e.to_string())
}

#[tauri::command]
fn list_drives() -> Vec<String> {
  #[cfg(target_family = "unix")]
  {
    fs::read_to_string("/proc/mounts")
        .unwrap_or_default()
        .lines()
        .filter_map(|line| line.split_whitespace().nth(1)) // second field is mount point
        .map(|s| s.to_string())
        .collect()
  }
  #[cfg(target_family = "windows")]
  {
    (b'A'..=b'Z')
        .map(|c| format!("{}:\\", c as char))
        .filter(|drive| fs::metadata(drive).is_ok())
        .collect()
  }
}

#[tauri::command]
fn copy_path(src: String, dst: String, overwrite: bool) -> Result<OpResult, String> {
  let s = Path::new(&src);
  let d = Path::new(&dst);

  if !s.exists() {
    return err(format!("Source does not exist: {}", src));
  }

  if d.exists() {
    if !overwrite {
      return err(format!("Destination exists: {} (set overwrite=true to replace)", dst));
    } else {
      // remove destination first (file or dir)
      if d.is_dir() {
        fs::remove_dir_all(d).map_err(|e| e.to_string())?;
      } else {
        fs::remove_file(d).map_err(|e| e.to_string())?;
      }
    }
  }

  if s.is_file() {
    fs::copy(s, d).map_err(|e| e.to_string())?;
  } else if s.is_dir() {
    // recursive copy
    fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
      fs::create_dir_all(dst)?;
      for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
          copy_dir_recursive(&src_path, &dst_path)?;
        } else {
          fs::copy(&src_path, &dst_path)?;
        }
      }
      Ok(())
    }
    copy_dir_recursive(s, d).map_err(|e| e.to_string())?;
  } else {
    return err("Source is neither file nor directory".to_string());
  }

  Ok(OpResult { ok: true, msg: None })
}

#[tauri::command]
fn delete_path(path: String) -> Result<OpResult, String> {
  let p = Path::new(&path);
  if !p.exists() {
    return err(format!("Path not found: {}", path));
  }
  if p.is_dir() {
    fs::remove_dir_all(p).map_err(|e| e.to_string())?;
  } else {
    fs::remove_file(p).map_err(|e| e.to_string())?;
  }
  Ok(OpResult { ok: true, msg: None })
}

#[tauri::command]
fn create_hardlink(src: String, dst: String) -> Result<OpResult, String> {
  let s = Path::new(&src);
  let d = Path::new(&dst);
  if !s.exists() {
    return err(format!("Source does not exist: {}", src));
  }
  std::fs::hard_link(s, d).map_err(|e| e.to_string())?;
  Ok(OpResult { ok: true, msg: None })
}

#[tauri::command]
fn move_path(src: String, dst: String, overwrite: bool) -> Result<OpResult, String> {
  let s = Path::new(&src);
  let d = Path::new(&dst);
  if !s.exists() {
    return err(format!("Source does not exist: {}", src));
  }
  if d.exists() {
    if !overwrite {
      return err(format!("Destination exists: {}", dst));
    } else {
      if d.is_dir() {
        fs::remove_dir_all(d).map_err(|e| e.to_string())?;
      } else {
        fs::remove_file(d).map_err(|e| e.to_string())?;
      }
    }
  }
  // try rename first (atomic on same filesystem)
  match fs::rename(s, d) {
    Ok(_) => Ok(OpResult { ok: true, msg: None }),
    Err(rename_err) => {
      // fallback to copy+delete
      if s.is_file() {
        fs::copy(s, d).map_err(|e| e.to_string())?;
        fs::remove_file(s).map_err(|e| e.to_string())?;
        Ok(OpResult { ok: true, msg: Some(format!("Moved via copy (rename failed): {}", rename_err)) })
      } else if s.is_dir() {
        // recursively copy then delete original
        fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
          fs::create_dir_all(dst)?;
          for entry in fs::read_dir(src)? {
            let entry = entry?;
            let file_type = entry.file_type()?;
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());
            if file_type.is_dir() {
              copy_dir_recursive(&src_path, &dst_path)?;
            } else {
              fs::copy(&src_path, &dst_path)?;
            }
          }
          Ok(())
        }
        copy_dir_recursive(s, d).map_err(|e| e.to_string())?;
        fs::remove_dir_all(s).map_err(|e| e.to_string())?;
        Ok(OpResult { ok: true, msg: Some(format!("Moved dir via copy (rename failed): {}", rename_err)) })
      } else {
        err(format!("Rename failed and source is neither file nor dir: {}", rename_err))
      }
    }
  }
}

#[tauri::command]
fn set_readonly(path: String, readonly: bool) -> Result<OpResult, String> {
  let p = Path::new(&path);
  if !p.exists() {
    return err(format!("Path not found: {}", path));
  }
  let mut perms = p.metadata().map_err(|e| e.to_string())?.permissions();
  // cross-platform: std::fs::Permissions only exposes readonly flag
  perms.set_readonly(readonly);
  fs::set_permissions(p, perms).map_err(|e| e.to_string())?;
  Ok(OpResult { ok: true, msg: None })
}

#[tauri::command]
fn create_symlink(src: String, link: String) -> Result<OpResult, String> {
  let s = Path::new(&src);
  let l = Path::new(&link);

  if !s.exists() {
    return err(format!("Target does not exist: {}", src));
  }

  #[cfg(target_family = "unix")]
  {
    std::os::unix::fs::symlink(s, l).map_err(|e| e.to_string())?;
  }
  #[cfg(target_family = "windows")]
  {
    if s.is_dir() {
      std::os::windows::fs::symlink_dir(s, l).map_err(|e| {
        // Windows symlink creation can require privileges; map errors to string
        e.to_string()
      })?;
    } else {
      std::os::windows::fs::symlink_file(s, l).map_err(|e| e.to_string())?;
    }
  }

  Ok(OpResult { ok: true, msg: None })
}

/// Create a Windows NTFS Junction (directory junction).
/// On Windows only: uses `cmd /C mklink /J "link" "target"`.
#[tauri::command]
fn create_ntfs_junction(target: String, link: String) -> Result<OpResult, String> {
  #[cfg(not(target_family = "windows"))]
  {
    return err("NTFS junctions are only supported on Windows".to_string());
  }

  #[cfg(target_family = "windows")]
  {
    //use std::os::windows::prelude::*;
    // Create target parent dir for link if needed
    let link_path = PathBuf::from(&link);
    if let Some(parent) = link_path.parent() {
      std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Use cmd's mklink /J because it creates a junction without requiring the same privileges as symlink
    let output = Command::new("cmd")
      .args(["/C", "mklink", "/J", &link, &target])
      .output()
      .map_err(|e| e.to_string())?;

    if output.status.success() {
      Ok(OpResult { ok: true, msg: None })
    } else {
      let stderr = String::from_utf8_lossy(&output.stderr).to_string();
      let stdout = String::from_utf8_lossy(&output.stdout).to_string();
      err(format!("mklink failed: stdout={} stderr={}", stdout, stderr))
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![list_dir,
            list_drives,
            copy_path,
            delete_path,
            create_hardlink,
            move_path,
            set_readonly,
            create_symlink,
            create_ntfs_junction
        ]) // must be here
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}