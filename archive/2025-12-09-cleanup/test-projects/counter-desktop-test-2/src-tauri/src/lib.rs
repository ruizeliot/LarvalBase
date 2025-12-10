// Counter Desktop App - Skeleton (commands not implemented)
// All commands return errors in skeleton state - this ensures RED state for E2E tests

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            authenticate,
            get_counter,
            increment_counter,
            decrement_counter,
            reset_counter
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Skeleton command - not implemented (returns error for RED state)
#[tauri::command]
fn authenticate(_username: String, _password: String) -> Result<bool, String> {
    Err("authenticate command not implemented".to_string())
}

// Skeleton command - not implemented (returns error for RED state)
#[tauri::command]
fn get_counter() -> Result<i32, String> {
    Err("get_counter command not implemented".to_string())
}

// Skeleton command - not implemented (returns error for RED state)
#[tauri::command]
fn increment_counter() -> Result<i32, String> {
    Err("increment_counter command not implemented".to_string())
}

// Skeleton command - not implemented (returns error for RED state)
#[tauri::command]
fn decrement_counter() -> Result<i32, String> {
    Err("decrement_counter command not implemented".to_string())
}

// Skeleton command - not implemented (returns error for RED state)
#[tauri::command]
fn reset_counter() -> Result<i32, String> {
    Err("reset_counter command not implemented".to_string())
}
