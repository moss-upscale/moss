use log::{error, info};
use serde_json::json;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::path::BaseDirectory;
use tauri::Emitter;
use tauri::Manager;
use tauri::State;

pub struct ProcessingState {
    pub token: Mutex<Option<moss_model::CancellationToken>>,
}

impl Default for ProcessingState {
    fn default() -> Self {
        Self {
            token: Mutex::new(None),
        }
    }
}

impl ProcessingState {
    fn set_token(&self, token: moss_model::CancellationToken) -> Result<(), String> {
        let mut guard = self.token.lock().map_err(|_| "lock poisoned".to_string())?;
        *guard = Some(token);
        Ok(())
    }

    fn clear_token(&self) {
        if let Ok(mut guard) = self.token.lock() {
            *guard = None;
        }
    }

    fn cancel(&self) -> bool {
        if let Ok(guard) = self.token.lock() {
            if let Some(tok) = guard.as_ref() {
                tok.cancel();
                return true;
            }
        }
        false
    }
}

const EVENT_PROGRESS: &str = "processing_progress";
const EVENT_MODEL_DOWNLOAD_PROGRESS: &str = "model_download_progress";

fn resolve_output_dir(input_path: &str, output_dir: &str) -> String {
    if output_dir == "." {
        Path::new(input_path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| output_dir.to_string())
    } else {
        output_dir.to_string()
    }
}

fn model_download_url(filename: &str) -> String {
    format!(
        "https://huggingface.co/MossUpscayl/moss-useage-models/resolve/main/{}?download=true",
        filename
    )
}

fn download_model_to_with_progress(
    handle: &tauri::AppHandle,
    model_filename: &str,
    url: &str,
    dest: &Path,
) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create model dir: {}", e))?;
    }
    let mut resp =
        reqwest::blocking::get(url).map_err(|e| format!("Download request failed: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Download failed: HTTP {}", resp.status()));
    }
    let total = resp
        .headers()
        .get(reqwest::header::CONTENT_LENGTH)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);
    let mut file = fs::File::create(dest).map_err(|e| format!("Create file failed: {}", e))?;
    let mut downloaded: u64 = 0;
    let mut buf = [0u8; 8192];
    loop {
        let n = resp
            .read(&mut buf)
            .map_err(|e| format!("Read failed: {}", e))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])
            .map_err(|e| format!("Write file failed: {}", e))?;
        downloaded += n as u64;
        if total > 0 {
            let percent = ((downloaded as f64 / total as f64) * 100.0).round() as i32;
            let _ = handle.emit(
                EVENT_MODEL_DOWNLOAD_PROGRESS,
                json!({
                    "modelFilename": model_filename,
                    "progress": percent,
                    "downloaded": downloaded,
                    "total": total
                }),
            );
        } else {
            let _ = handle.emit(
                EVENT_MODEL_DOWNLOAD_PROGRESS,
                json!({
                    "modelFilename": model_filename,
                    "progress": null,
                    "downloaded": downloaded,
                    "total": null
                }),
            );
        }
    }
    let _ = handle.emit(
        EVENT_MODEL_DOWNLOAD_PROGRESS,
        json!({
            "modelFilename": model_filename,
            "progress": 100,
            "downloaded": downloaded,
            "total": total
        }),
    );
    Ok(())
}

fn resolve_model_path(handle: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let res_path = handle
        .path()
        .resolve(&format!("models/{}", filename), BaseDirectory::Resource)
        .map_err(|e| format!("resolve resource path failed: {}", e))?;

    info!("resolve model path: {}", res_path.to_string_lossy());

    if res_path.exists() {
        return Ok(res_path);
    }

    let base_dir = handle
        .path()
        .resolve("models", BaseDirectory::AppData)
        .map_err(|e| format!("resolve app data path failed: {}", e))?;
    let user_path = base_dir.join(filename);
    if user_path.exists() {
        return Ok(user_path);
    }
    let url = model_download_url(filename);
    info!("model not found locally; downloading -> {}", url);
    download_model_to_with_progress(handle, filename, &url, &user_path)?;
    Ok(user_path)
}

fn resource_model_path(handle: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    handle
        .path()
        .resolve(&format!("models/{}", filename), BaseDirectory::Resource)
        .map_err(|e| format!("resolve resource path failed: {}", e))
}

fn user_models_base_dir(handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    handle
        .path()
        .resolve("models", BaseDirectory::AppData)
        .map_err(|e| format!("resolve app data path failed: {}", e))
}

#[tauri::command]
pub async fn check_model_available(
    handle: tauri::AppHandle,
    model_filename: String,
) -> Result<bool, String> {
    let candidates = [
        resource_model_path(&handle, &model_filename)?,
        user_models_base_dir(&handle)?.join(&model_filename),
    ];
    if let Some(found) = candidates.into_iter().find(|p| p.exists()) {
        info!("model available locally -> {}", found.to_string_lossy());
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn download_model(
    handle: tauri::AppHandle,
    model_filename: String,
) -> Result<String, String> {
    let base = user_models_base_dir(&handle)?;
    let target = base.join(&model_filename);
    if target.exists() {
        return Ok(target.to_string_lossy().to_string());
    }
    let res = tauri::async_runtime::spawn_blocking({
        let handle = handle.clone();
        let model_filename = model_filename.clone();
        let url = model_download_url(&model_filename);
        let target = target.clone();
        move || {
            download_model_to_with_progress(&handle, &model_filename, &url, &target)?;
            Ok::<String, String>(target.to_string_lossy().to_string())
        }
    })
    .await
    .map_err(|e| format!("spawn_blocking join error: {}", e))?;
    res
}

fn perform_upscale(
    handle: &tauri::AppHandle,
    image_id: &str,
    input_path: &str,
    model_filename: &str,
    base_scale: f64,
    target_scale: f64,
    output_dir: &str,
    token: &moss_model::CancellationToken,
) -> Result<String, String> {
    use moss_model::{RealEsrgan, SrPipeline};
    use opencv::imgcodecs;
    use serde_json::json;
    use std::path::{Path, PathBuf};

    let resolve_path = |h: &tauri::AppHandle, filename: &str| -> Result<PathBuf, String> {
        resolve_model_path(h, filename)
    };

    let in_path = Path::new(input_path);
    let input_bytes =
        fs::read(in_path).map_err(|e| format!("Failed to read input image: {}", e))?;
    let input_buf = opencv::core::Vector::from_slice(&input_bytes);
    let input_mat = imgcodecs::imdecode(&input_buf, imgcodecs::IMREAD_UNCHANGED)
        .map_err(|e| format!("Failed to decode input image: {}", e))?;

    let model_path_resolved = resolve_path(handle, model_filename)?;

    let model = RealEsrgan::from_path(&model_path_resolved)
        .map_err(|e| format!("Failed to load model: {}", e))?;
    let mut pipeline = SrPipeline::new(Box::new(model), base_scale);
    let h_for_emit = handle.clone();
    let image_id = image_id.to_string();
    pipeline.set_progress_callback(move |p| {
        let _ = h_for_emit.emit(
            EVENT_PROGRESS,
            json!({ "imageId": image_id, "progress": (p.clamp(0.0, 1.0) * 100.0).round() as i32 }),
        );
    });

    let out_mat = pipeline
        .run_to_scale(input_mat, target_scale.max(1.0), token)
        .map_err(|e| format!("Upscale failed: {}", e))?;

    let name = in_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let ext = in_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_else(|| "png".to_string());
    let suffix = format!("_x{}", target_scale as i32);
    let out_name = format!("{}{}.{ext}", name, suffix);

    let out_dir = PathBuf::from(output_dir);
    if !out_dir.exists() {
        fs::create_dir_all(&out_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;
    }
    let out_path = out_dir.join(out_name);
    let enc_ext = format!(".{}", ext);
    let mut encoded_buf = opencv::core::Vector::<u8>::new();
    imgcodecs::imencode(
        &enc_ext,
        &out_mat,
        &mut encoded_buf,
        &opencv::core::Vector::new(),
    )
    .map_err(|e| format!("Failed to encode output: {}", e))?;
    fs::write(&out_path, encoded_buf.as_slice())
        .map_err(|e| format!("Failed to save output: {}", e))?;

    Ok(out_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn upscale_image(
    handle: tauri::AppHandle,
    image_id: String,
    input_path: String,
    model_filename: String,
    base_scale: f64,
    target_scale: f64,
    output_dir: String,
    state: State<'_, ProcessingState>,
) -> Result<String, String> {
    info!(
        "upscale_image: enter | input_path={}, model_filename={}, base_scale={}, target_scale={}, output_dir={}",
        input_path, model_filename, base_scale, target_scale, output_dir
    );
    let token = moss_model::CancellationToken::new();
    state.set_token(token.clone())?;

    let res = tauri::async_runtime::spawn_blocking({
        let handle = handle.clone();
        let image_id = image_id.clone();
        let input_path = input_path.clone();
        let model_filename = model_filename.clone();
        let token = token.clone();
        let output_dir = resolve_output_dir(&input_path, &output_dir);
        move || {
            perform_upscale(
                &handle,
                &image_id,
                &input_path,
                &model_filename,
                base_scale,
                target_scale,
                &output_dir,
                &token,
            )
        }
    })
    .await
    .map_err(|e| {
        error!("spawn_blocking join error: {}", e);
        format!("spawn_blocking join error: {}", e)
    })?;

    state.clear_token();
    match res {
        Ok(out) => {
            info!("upscale_image: done -> {}", out);
            Ok(out)
        }
        Err(e) => {
            error!("upscale_image error: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn cancel_upscale(state: State<'_, ProcessingState>) -> Result<(), String> {
    if state.cancel() {
        Ok(())
    } else {
        Err("no active task".to_string())
    }
}
