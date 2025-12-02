use std::fs::File;
use std::io::Read;
use std::path::Path;
use walkdir::WalkDir;

const READ_HEAD_BYTES: usize = 16 * 1024;

pub fn detect_image_magic(path: &Path) -> bool {
    let mut file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return false,
    };
    let mut buf = vec![0u8; READ_HEAD_BYTES];
    let n = match file.read(&mut buf) {
        Ok(n) => n,
        Err(_) => return false,
    };
    if n == 0 {
        return false;
    }
    if let Some(kind) = infer::get(&buf[..n]) {
        return kind.mime_type().starts_with("image/");
    }
    false
}

pub fn walk_and_collect_images(root: &Path) -> Vec<String> {
    let mut out = Vec::new();
    for entry in WalkDir::new(root).follow_links(false).into_iter() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let p = entry.path();
        if p.is_file() && detect_image_magic(p) {
            out.push(p.to_string_lossy().to_string());
        }
    }
    out
}
