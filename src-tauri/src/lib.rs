// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod api;

use serde_json::Value;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn query_pre_data(cust_no: &str) -> Result<Value, String> {
    db::query_database(cust_no)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn send_api_request(url: &str, payload: &Value) -> Result<Value, String> {
    api::send_http_request(url, payload)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn query_post_data(cust_no: &str) -> Result<Value, String> {
    db::query_database(cust_no)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            query_pre_data,
            send_api_request,
            query_post_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
