use tauri::{WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const MAIN_WINDOW_LABEL: &str = "main";

pub fn init_main_window(app: &tauri::App) -> tauri::Result<WebviewWindow> {
    let mut builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("moss")
        .inner_size(1360.0, 860.0)
        .min_inner_size(1200.0, 720.0)
        .visible(false);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .transparent(true)
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
    }

    builder.build()
}
