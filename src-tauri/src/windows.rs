// Window creation + positioning for the always-on-top popup card.
// All window geometry lives here, never inline in main.rs / lib.rs.

use tauri::{App, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

// Popup card dimensions and screen-edge margin (logical pixels).
const POPUP_WIDTH: f64 = 320.0;
const POPUP_HEIGHT: f64 = 480.0;
const SCREEN_EDGE_MARGIN: f64 = 20.0;

const POPUP_LABEL: &str = "popup";
const POPUP_URL: &str = "popup.html";
const POPUP_TITLE: &str = "Posture Coach — Popup";

// Creates the frameless, always-on-top popup window, pinned to the bottom-right.
// It stays loaded and detecting; the frontend shows/hides it based on posture.
pub fn create_popup_window(app: &App) -> tauri::Result<()> {
    let popup = WebviewWindowBuilder::new(app, POPUP_LABEL, WebviewUrl::App(POPUP_URL.into()))
        .title(POPUP_TITLE)
        .inner_size(POPUP_WIDTH, POPUP_HEIGHT)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .visible(true)
        .build()?;

    position_popup_bottom_right(&popup)?;
    Ok(())
}

// Positions the popup at the bottom-right of the primary monitor, inset by the margin.
fn position_popup_bottom_right(popup: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = popup.primary_monitor()? else {
        return Ok(());
    };

    let scale_factor = monitor.scale_factor();
    let monitor_size = monitor.size();
    let margin_physical = SCREEN_EDGE_MARGIN * scale_factor;
    let popup_width_physical = POPUP_WIDTH * scale_factor;
    let popup_height_physical = POPUP_HEIGHT * scale_factor;

    let x = (monitor_size.width as f64 - popup_width_physical - margin_physical) as i32;
    let y = (monitor_size.height as f64 - popup_height_physical - margin_physical) as i32;

    popup.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}
