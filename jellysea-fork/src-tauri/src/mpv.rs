use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

#[cfg(unix)]
use std::os::unix::net::UnixStream;

#[cfg(windows)]
use std::io::Read;

pub struct MpvInstance {
    process: Mutex<Option<Child>>,
    socket_path: String,
}

impl MpvInstance {
    pub fn new() -> Self {
        let socket_path = if cfg!(windows) {
            format!(r"\\.\pipe\jellysea-mpv-{}", std::process::id())
        } else {
            format!("/tmp/jellysea-mpv-{}.sock", std::process::id())
        };
        MpvInstance {
            process: Mutex::new(None),
            socket_path,
        }
    }

    fn send_command(&self, command: &Value) -> Result<Value, String> {
        #[cfg(unix)]
        {
            let stream = UnixStream::connect(&self.socket_path)
                .map_err(|e| format!("Failed to connect to MPV: {}", e))?;

            let mut line = command.to_string();
            line.push('\n');

            let mut writer = stream
                .try_clone()
                .map_err(|e| format!("Clone error: {}", e))?;
            writer
                .write_all(line.as_bytes())
                .map_err(|e| format!("Write error: {}", e))?;
            writer.flush().map_err(|e| format!("Flush error: {}", e))?;

            let mut reader = BufReader::new(stream);
            let mut response = String::new();
            reader
                .read_line(&mut response)
                .map_err(|e| format!("Read error: {}", e))?;

            serde_json::from_str(&response).map_err(|e| format!("JSON parse error: {}", e))
        }
        #[cfg(windows)]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            use std::ptr;

            let name: Vec<u16> = OsStr::new(&self.socket_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let handle = unsafe {
                CreateFileW(
                    name.as_ptr(),
                    GENERIC_READ | GENERIC_WRITE,
                    0,
                    ptr::null_mut(),
                    OPEN_EXISTING,
                    0,
                    ptr::null_mut(),
                )
            };

            if handle == INVALID_HANDLE_VALUE {
                return Err("Failed to open MPV pipe".to_string());
            }

            let mut line = command.to_string();
            line.push('\n');
            let bytes = line.as_bytes();

            let mut written = 0;
            unsafe {
                WriteFile(
                    handle,
                    bytes.as_ptr() as *const _,
                    bytes.len() as u32,
                    &mut written,
                    ptr::null_mut(),
                );
            }

            let mut buf = [0u8; 65536];
            let mut read = 0;
            unsafe {
                ReadFile(
                    handle,
                    buf.as_mut_ptr() as *mut _,
                    buf.len() as u32,
                    &mut read,
                    ptr::null_mut(),
                );
                CloseHandle(handle);
            }

            let response =
                String::from_utf8_lossy(&buf[..read as usize]).to_string();
            serde_json::from_str(&response).map_err(|e| format!("JSON parse error: {}", e))
        }
    }

    pub fn launch(&self) -> Result<(), String> {
        let ipc_arg = format!("--input-ipc-server={}", self.socket_path);
        let args: Vec<&str> = vec![
            "--idle",
            "--no-terminal",
            "--no-osc",
            "--no-osd-bar",
            "--keep-open=yes",
            &ipc_arg,
        ];

        let child = Command::new("mpv")
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to launch MPV: {}", e))?;

        // Wait for socket/pipe to be ready
        for _ in 0..50 {
            if cfg!(unix) && std::path::Path::new(&self.socket_path).exists() {
                break;
            }
            #[cfg(windows)]
            {
                use std::ffi::OsStr;
                use std::os::windows::ffi::OsStrExt;
                let name: Vec<u16> = OsStr::new(&self.socket_path)
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();
                unsafe {
                    let h = CreateFileW(
                        name.as_ptr(),
                        GENERIC_READ,
                        0,
                        std::ptr::null_mut(),
                        OPEN_EXISTING,
                        0,
                        std::ptr::null_mut(),
                    );
                    if h != INVALID_HANDLE_VALUE {
                        CloseHandle(h);
                        break;
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(100));
        }

        let mut proc = self
            .process
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
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
        let mut proc = self
            .process
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        if let Some(ref mut child) = *proc {
            let _ = child.wait();
        }
        *proc = None;
        #[cfg(unix)]
        {
            let _ = std::fs::remove_file(&self.socket_path);
        }
        Ok(())
    }
}

#[cfg(windows)]
extern "system" {
    fn CreateFileW(
        lpFileName: *const u16,
        dwDesiredAccess: u32,
        dwShareMode: u32,
        lpSecurityAttributes: *mut std::ffi::c_void,
        dwCreationDisposition: u32,
        dwFlagsAndAttributes: u32,
        hTemplateFile: *mut std::ffi::c_void,
    ) -> isize;
    fn WriteFile(
        hFile: isize,
        lpBuffer: *const std::ffi::c_void,
        nNumberOfBytesToWrite: u32,
        lpNumberOfBytesWritten: *mut u32,
        lpOverlapped: *mut std::ffi::c_void,
    ) -> i32;
    fn ReadFile(
        hFile: isize,
        lpBuffer: *mut std::ffi::c_void,
        nNumberOfBytesToRead: u32,
        lpNumberOfBytesRead: *mut u32,
        lpOverlapped: *mut std::ffi::c_void,
    ) -> i32;
    fn CloseHandle(hObject: isize) -> i32;
}

#[cfg(windows)]
const GENERIC_READ: u32 = 0x80000000;
#[cfg(windows)]
const GENERIC_WRITE: u32 = 0x40000000;
#[cfg(windows)]
const OPEN_EXISTING: u32 = 3;
#[cfg(windows)]
const INVALID_HANDLE_VALUE: isize = -1;
