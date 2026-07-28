mod mpv;

use mpv::MpvInstance;
use tauri::State;

struct AppState {
    mpv: MpvInstance,
}

#[tauri::command]
fn play(url: String, state: State<AppState>) -> Result<(), String> {
    state.mpv.loadfile(&url)
}

#[tauri::command]
fn toggle_pause(state: State<AppState>) -> Result<(), String> {
    state.mpv.toggle_pause()
}

#[tauri::command]
fn set_pause(paused: bool, state: State<AppState>) -> Result<(), String> {
    state.mpv.set_pause(paused)
}

#[tauri::command]
fn seek(position: f64, state: State<AppState>) -> Result<(), String> {
    state.mpv.seek(position)
}

#[tauri::command]
fn set_volume(volume: i32, state: State<AppState>) -> Result<(), String> {
    state.mpv.set_volume(volume)
}

#[tauri::command]
fn get_time_pos(state: State<AppState>) -> Result<f64, String> {
    state.mpv.get_time_pos()
}

#[tauri::command]
fn get_duration(state: State<AppState>) -> Result<f64, String> {
    state.mpv.get_duration()
}

#[tauri::command]
fn get_paused(state: State<AppState>) -> Result<bool, String> {
    state.mpv.get_paused()
}

#[tauri::command]
fn stop_playback(state: State<AppState>) -> Result<(), String> {
    state.mpv.stop()
}

#[tauri::command]
fn launch_mpv(state: State<AppState>) -> Result<(), String> {
    state.mpv.launch()
}

#[tauri::command]
fn quit_mpv(state: State<AppState>) -> Result<(), String> {
    state.mpv.quit()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mpv = MpvInstance::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState { mpv })
        .invoke_handler(tauri::generate_handler![
            play,
            toggle_pause,
            set_pause,
            seek,
            set_volume,
            get_time_pos,
            get_duration,
            get_paused,
            stop_playback,
            launch_mpv,
            quit_mpv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
