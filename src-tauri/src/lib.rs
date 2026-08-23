mod windows;

use tauri::{
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  AppHandle,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_sql::{Migration, MigrationKind};

// System tray with quick access to both windows and quit.
fn build_tray(app: &AppHandle) -> tauri::Result<()> {
  let show_dashboard = MenuItem::with_id(app, "show_dashboard", "Show Dashboard", true, None::<&str>)?;
  let show_coach = MenuItem::with_id(app, "show_coach", "Show Coach", true, None::<&str>)?;
  let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
  let menu = Menu::with_items(app, &[&show_dashboard, &show_coach, &quit])?;

  TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .tooltip("Posture Coach")
    .menu(&menu)
    .on_menu_event(|app, event| match event.id.as_ref() {
      "show_dashboard" => {
        let _ = windows::show_main(app.clone());
      }
      "show_coach" => {
        let _ = windows::open_popup(app.clone());
      }
      "quit" => app.exit(0),
      _ => {}
    })
    .build(app)?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![Migration {
    version: 1,
    description: "create posture_samples table",
    sql: "CREATE TABLE IF NOT EXISTS posture_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      score INTEGER NOT NULL,
      head_ok INTEGER NOT NULL,
      shoulders_ok INTEGER NOT NULL,
      distance_ok INTEGER NOT NULL
    );",
    kind: MigrationKind::Up,
  }];

  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:posture.db", migrations)
        .build(),
    )
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
    .invoke_handler(tauri::generate_handler![
      windows::open_popup,
      windows::show_main
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      windows::create_popup_window(app.handle())?;
      build_tray(app.handle())?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
