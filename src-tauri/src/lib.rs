use log::LevelFilter;
use tauri_plugin_decorum::WebviewWindowExt;

mod commands;
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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                win.set_focus().unwrap();
            }
        }))
        .plugin(prevent_default_plugin())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(commands::ProcessingState::default())
        .invoke_handler(tauri::generate_handler![
            commands::upscale_image,
            commands::cancel_upscale
        ])
        .setup(|app| {
            info!("moss app starting");
            let main_window = window::init_main_window(app).unwrap();

            main_window.create_overlay_titlebar().unwrap();
            #[cfg(target_os = "macos")]
            {
                main_window.set_traffic_lights_inset(16.0, 20.0).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
