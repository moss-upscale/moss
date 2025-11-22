use tauri::{AppHandle, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_decorum::WebviewWindowExt;

pub const MAIN_WINDOW_LABEL: &str = "main";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";

pub fn init_main_window(app: &tauri::App) -> tauri::Result<WebviewWindow> {
    let mut builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("moss")
        .shadow(true)
        .inner_size(1360.0, 860.0)
        .min_inner_size(1200.0, 720.0)
        .visible(false);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
    }

    let win = builder.build()?;
    win.create_overlay_titlebar()?;

    #[cfg(target_os = "macos")]
    win.set_traffic_lights_inset(16.0, 20.0)?;

    Ok(win)
}

pub fn init_settings_window(handle: &AppHandle) -> tauri::Result<WebviewWindow> {
    let mut builder = WebviewWindowBuilder::new(
        handle,
        SETTINGS_WINDOW_LABEL,
        WebviewUrl::App("index.html#/settings".into()),
    )
    .title("Settings")
    .shadow(true)
    .inner_size(640.0, 540.0)
    .min_inner_size(640.0, 540.0)
    .resizable(false)
    .minimizable(false)
    .maximized(false)
    .maximizable(false)
    .visible(true);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
    }

    let win = builder.build()?;
    win.create_overlay_titlebar()?;

    #[cfg(target_os = "macos")]
    win.set_traffic_lights_inset(16.0, 20.0)?;

    Ok(win)
}
