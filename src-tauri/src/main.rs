#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::process::Command;
use std::thread;
use std::time::Duration;
use std::net::TcpStream;

fn start_nitro_server() {
  thread::spawn(|| {
    let mut child = Command::new("node")
      .arg(".output/server/index.mjs")
      .env("NITRO_PORT", "50555")
      .env("NODE_ENV", "production")
      .spawn()
      .expect("failed to start Nuxt server");

    let _ = child.wait();
  });
}

fn wait_for_server() {
  loop {
    if TcpStream::connect("127.0.0.1:50555").is_ok() {
      break;
    }
    thread::sleep(Duration::from_millis(500));
  }
}

fn main() {
  #[cfg(not(debug_assertions))]
  {
    start_nitro_server();
    wait_for_server();
  }

  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
