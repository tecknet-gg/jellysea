use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

pub struct MpvInstance {
    process: Mutex<Option<Child>>,
    socket_path: String,
}

impl MpvInstance {
    pub fn new() -> Self {
        let socket_path = format!(
            "/tmp/jellysea-mpv-{}.sock",
            std::process::id()
        );
        MpvInstance {
            process: Mutex::new(None),
            socket_path,
        }
    }

    fn send_command(&self, command: &Value) -> Result<Value, String> {
        let stream = UnixStream::connect(&self.socket_path)
            .map_err(|e| format!("Failed to connect to MPV: {}", e))?;

        let mut line = command.to_string();
        line.push('\n');

        let mut writer = stream.try_clone().map_err(|e| format!("Clone error: {}", e))?;
        writer
            .write_all(line.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;

        let mut reader = BufReader::new(stream);
        let mut response = String::new();
        reader
            .read_line(&mut response)
            .map_err(|e| format!("Read error: {}", e))?;

        serde_json::from_str(&response).map_err(|e| format!("JSON parse error: {}", e))
    }

    pub fn launch(&self) -> Result<(), String> {
        let child = Command::new("mpv")
            .args(&[
                "--idle",
                "--no-terminal",
                "--no-osc",
                "--no-osd-bar",
                "--keep-open=yes",
                &format!("--input-ipc-server={}", self.socket_path),
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to launch MPV: {}", e))?;

        // Wait for socket to be ready
        for _ in 0..50 {
            if std::path::Path::new(&self.socket_path).exists() {
                break;
            }
            std::thread::sleep(Duration::from_millis(100));
        }

        let mut proc = self.process.lock().map_err(|e| format!("Lock error: {}", e))?;
        *proc = Some(child);

        Ok(())
    }

    pub fn loadfile(&self, url: &str) -> Result<(), String> {
        self.send_command(&json!({
            "command": ["loadfile", url, "replace"]
        }))?;
        Ok(())
    }

    pub fn toggle_pause(&self) -> Result<(), String> {
        self.send_command(&json!({
            "command": ["cycle", "pause"]
        }))?;
        Ok(())
    }

    pub fn set_pause(&self, paused: bool) -> Result<(), String> {
        self.send_command(&json!({
            "command": ["set_property", "pause", paused]
        }))?;
        Ok(())
    }

    pub fn seek(&self, position: f64) -> Result<(), String> {
        self.send_command(&json!({
            "command": ["seek", position, "absolute"]
        }))?;
        Ok(())
    }

    pub fn set_volume(&self, volume: i32) -> Result<(), String> {
        let vol = volume.max(0).min(100);
        self.send_command(&json!({
            "command": ["set_property", "volume", vol]
        }))?;
        Ok(())
    }

    pub fn get_time_pos(&self) -> Result<f64, String> {
        let resp = self.send_command(&json!({
            "command": ["get_property", "time-pos"]
        }))?;
        resp.get("data")
            .and_then(|v| v.as_f64())
            .ok_or_else(|| "No time-pos in response".to_string())
    }

    pub fn get_duration(&self) -> Result<f64, String> {
        let resp = self.send_command(&json!({
            "command": ["get_property", "duration"]
        }))?;
        resp.get("data")
            .and_then(|v| v.as_f64())
            .ok_or_else(|| "No duration in response".to_string())
    }

    pub fn get_paused(&self) -> Result<bool, String> {
        let resp = self.send_command(&json!({
            "command": ["get_property", "pause"]
        }))?;
        resp.get("data")
            .and_then(|v| v.as_bool())
            .ok_or_else(|| "No pause in response".to_string())
    }

    pub fn stop(&self) -> Result<(), String> {
        self.send_command(&json!({
            "command": ["stop"]
        }))?;
        Ok(())
    }

    pub fn quit(&self) -> Result<(), String> {
        self.send_command(&json!({
            "command": ["quit"]
        }))?;
        let mut proc = self.process.lock().map_err(|e| format!("Lock error: {}", e))?;
        if let Some(ref mut child) = *proc {
            let _ = child.wait();
        }
        *proc = None;
        let _ = std::fs::remove_file(&self.socket_path);
        Ok(())
    }
}
