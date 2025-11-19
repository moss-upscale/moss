use log::{error, info};
use tauri::Emitter;
use std::sync::Mutex;
use tauri::path::BaseDirectory;
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

#[tauri::command]
pub async fn upscale_image(
    handle: tauri::AppHandle,
    imageId: String,
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
    // create and register cancellation token for this task
    let token = moss_model::CancellationToken::new();
    {
        let mut guard = state
            .token
            .lock()
            .map_err(|_| "lock poisoned".to_string())?;
        *guard = Some(token.clone());
    }

    let res = tauri::async_runtime::spawn_blocking({
        let input_path = input_path.clone();
        let model_filename = model_filename.clone();
        let token = token.clone();
        let handle = handle.clone();
        let image_id = imageId.clone();

        let output_dir = if output_dir == "." {
            std::path::Path::new(&input_path)
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| output_dir.clone())
        } else {
            output_dir.clone()
        };

        move || -> Result<String, String> {
            use moss_model::{RealEsrgan, SrPipeline};
            use opencv::imgcodecs;
            use std::path::{Path, PathBuf};
            use serde_json::json;

            let resolve_model_path =
                |h: &tauri::AppHandle, filename: &str| -> Result<PathBuf, String> {
                    h.path()
                        .resolve(&format!("models/{}", filename), BaseDirectory::Resource)
                        .map_err(|e| format!("resolve resource path failed: {}", e))
                };

            let in_path = Path::new(&input_path);
            let input_bytes = std::fs::read(in_path)
                .map_err(|e| format!("Failed to read input image: {}", e))?;
            let input_buf = opencv::core::Vector::from_slice(&input_bytes);
            let input_mat = imgcodecs::imdecode(&input_buf, imgcodecs::IMREAD_UNCHANGED)
                .map_err(|e| format!("Failed to decode input image: {}", e))?;

            let model_path_resolved = resolve_model_path(&handle, &model_filename)?;

            let model = RealEsrgan::from_path(&model_path_resolved)
                .map_err(|e| format!("Failed to load model: {}", e))?;
            let mut pipeline = SrPipeline::new(Box::new(model), base_scale);
            let h_for_emit = handle.clone();
            pipeline.set_progress_callback(move |p| {
                let _ = h_for_emit.emit(
                    "processing_progress",
                    json!({ "imageId": image_id, "progress": (p.clamp(0.0, 1.0) * 100.0).round() as i32 }),
                );
            });

            let out_mat = pipeline
                .run_to_scale(input_mat, target_scale.max(1.0), &token)
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

            let out_dir = PathBuf::from(&output_dir);
            if !out_dir.exists() {
                std::fs::create_dir_all(&out_dir)
                    .map_err(|e| format!("Failed to create output dir: {}", e))?;
            }
            let out_path = out_dir.join(out_name);
            let enc_ext = format!(".{}", ext);
            let mut encoded_buf = opencv::core::Vector::<u8>::new();
            imgcodecs::imencode(&enc_ext, &out_mat, &mut encoded_buf, &opencv::core::Vector::new())
                .map_err(|e| format!("Failed to encode output: {}", e))?;
            std::fs::write(&out_path, encoded_buf.as_slice())
                .map_err(|e| format!("Failed to save output: {}", e))?;

            let out_path_str = out_path.to_string_lossy().to_string();

            Ok(out_path_str)
        }
    })
    .await
    .map_err(|e| {
        error!("spawn_blocking join error: {}", e);
        format!("spawn_blocking join error: {}", e)
    })?;

    match res {
        Ok(out) => {
            info!("upscale_image: done -> {}", out);
            // clear token after task finished
            if let Ok(mut guard) = state.token.lock() {
                *guard = None;
            }
            Ok(out)
        }
        Err(e) => {
            error!("upscale_image error: {}", e);
            if let Ok(mut guard) = state.token.lock() {
                *guard = None;
            }
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn cancel_upscale(state: State<'_, ProcessingState>) -> Result<(), String> {
    if let Ok(guard) = state.token.lock() {
        if let Some(tok) = guard.as_ref() {
            tok.cancel();
            return Ok(());
        }
    }
    Err("no active task".to_string())
}
