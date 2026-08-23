mod windows;

use tauri_plugin_sql::{Migration, MigrationKind};

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
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      windows::create_popup_window(app)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
