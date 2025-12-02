use log::LevelFilter;

mod commands;
mod images;
mod window;

fn log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_log::{Target, TargetKind};
    tauri_plugin_log::Builder::new()
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
        ])
        .level(if cfg!(debug_assertions) {
            LevelFilter::Debug
        } else {
            LevelFilter::Info
        })
        .max_file_size(1024 * 1024 * 10)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .build()
}

fn prevent_default_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    if cfg!(debug_assertions) {
        tauri_plugin_prevent_default::debug()
    } else {
        tauri_plugin_prevent_default::init()
    }
}

pub fn run() {
    use log::info;
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(log_plugin())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                win.set_focus().unwrap();
            }
        }))
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(prevent_default_plugin())
        .manage(commands::ProcessingState::default())
        .invoke_handler(tauri::generate_handler![
            commands::is_image_file,
            commands::list_images,
            commands::check_model_available,
            commands::download_model,
            commands::upscale_image,
            commands::cancel_upscale,
            commands::open_settings_window,
        ])
        .setup(|app| {
            info!("moss app starting");
            let handle = app.handle();
            window::init_main_window(handle)?;
            window::init_settings_window(handle)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
