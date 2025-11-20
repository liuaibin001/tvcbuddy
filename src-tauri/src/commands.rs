use nanoid;
use reqwest;
use serde_json::Value;
use std::path::PathBuf;
use tauri_plugin_updater::UpdaterExt;
use uuid::Uuid;

// Application configuration directory
const APP_CONFIG_DIR: &str = ".ccconfig";

pub async fn initialize_app_config() -> Result<(), String> {
    println!("initialize_app_config called");

    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);

    println!(
        "Checking if app config directory exists: {}",
        app_config_path.display()
    );

    // Create config directory if it doesn't exist
    if !app_config_path.exists() {
        println!("App config directory does not exist, creating...");
        std::fs::create_dir_all(&app_config_path)
            .map_err(|e| format!("Failed to create app config directory: {}", e))?;
        println!(
            "App config directory created: {}",
            app_config_path.display()
        );
    } else {
        println!("App config directory already exists");
    }

    // Check if we need to backup Claude configs
    let claude_dir = home_dir.join(".claude");
    println!(
        "Checking if Claude directory exists: {}",
        claude_dir.display()
    );

    if claude_dir.exists() {
        // Check if we already have a backup
        let backup_dir = app_config_path.join("claude_backup");
        if backup_dir.exists() {
            println!("Claude backup already exists, skipping backup");
        } else {
            println!("Claude directory exists but no backup found, backing up...");
            if let Err(e) = backup_claude_configs_internal(&app_config_path, &claude_dir) {
                return Err(format!("Failed to backup Claude configs: {}", e));
            }
            println!("Claude configs backed up successfully");
        }
    } else {
        println!("Claude directory does not exist, skipping backup");
    }

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ConfigFile {
    pub path: String,
    pub content: Value,
    pub exists: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ConfigStore {
    pub id: String,
    pub title: String,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    pub settings: Value,
    pub using: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct McpServer {
    #[serde(flatten)]
    pub config: serde_json::Value,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct StoresData {
    pub configs: Vec<ConfigStore>,
    pub distinct_id: Option<String>,
    pub notification: Option<NotificationSettings>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct NotificationSettings {
    pub enable: bool,
    pub enabled_hooks: Vec<String>,
}

#[tauri::command]
pub async fn read_config_file(config_type: String) -> Result<ConfigFile, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;

    let path = match config_type.as_str() {
        "user" => home_dir.join(".claude/settings.json"),
        "enterprise_macos" => {
            PathBuf::from("/Library/Application Support/ClaudeCode/managed-settings.json")
        }
        "enterprise_linux" => PathBuf::from("/etc/claude-code/managed-settings.json"),
        "enterprise_windows" => PathBuf::from("C:\\ProgramData\\ClaudeCode\\managed-settings.json"),
        "mcp_macos" => PathBuf::from("/Library/Application Support/ClaudeCode/managed-mcp.json"),
        "mcp_linux" => PathBuf::from("/etc/claude-code/managed-mcp.json"),
        "mcp_windows" => PathBuf::from("C:\\ProgramData\\ClaudeCode\\managed-mcp.json"),
        _ => return Err("Invalid configuration type".to_string()),
    };

    let path_str = path.to_string_lossy().to_string();

    if path.exists() {
        let content =
            std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

        let json_content: Value =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

        Ok(ConfigFile {
            path: path_str,
            content: json_content,
            exists: true,
        })
    } else {
        Ok(ConfigFile {
            path: path_str,
            content: Value::Object(serde_json::Map::new()),
            exists: false,
        })
    }
}

#[tauri::command]
pub async fn write_config_file(config_type: String, content: Value) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;

    let path = match config_type.as_str() {
        "user" => home_dir.join(".claude/settings.json"),
        _ => return Err("Cannot write to enterprise configuration files".to_string()),
    };

    let json_content = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    std::fs::write(&path, json_content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn list_config_files() -> Result<Vec<String>, String> {
    let mut configs = vec![];

    // User settings
    if let Some(home) = dirs::home_dir() {
        let user_settings = home.join(".claude/settings.json");
        if user_settings.exists() {
            configs.push("user".to_string());
        }
    }

    // Enterprise settings (read-only)
    if cfg!(target_os = "macos") {
        let enterprise_path =
            PathBuf::from("/Library/Application Support/ClaudeCode/managed-settings.json");
        if enterprise_path.exists() {
            configs.push("enterprise_macos".to_string());
        }

        let mcp_path = PathBuf::from("/Library/Application Support/ClaudeCode/managed-mcp.json");
        if mcp_path.exists() {
            configs.push("mcp_macos".to_string());
        }
    } else if cfg!(target_os = "linux") {
        let enterprise_path = PathBuf::from("/etc/claude-code/managed-settings.json");
        if enterprise_path.exists() {
            configs.push("enterprise_linux".to_string());
        }

        let mcp_path = PathBuf::from("/etc/claude-code/managed-mcp.json");
        if mcp_path.exists() {
            configs.push("mcp_linux".to_string());
        }
    } else if cfg!(target_os = "windows") {
        let enterprise_path = PathBuf::from("C:\\ProgramData\\ClaudeCode\\managed-settings.json");
        if enterprise_path.exists() {
            configs.push("enterprise_windows".to_string());
        }

        let mcp_path = PathBuf::from("C:\\ProgramData\\ClaudeCode\\managed-mcp.json");
        if mcp_path.exists() {
            configs.push("mcp_windows".to_string());
        }
    }

    Ok(configs)
}

#[tauri::command]
pub async fn check_app_config_exists() -> Result<bool, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    Ok(app_config_path.exists())
}

#[tauri::command]
pub async fn create_app_config_dir() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);

    std::fs::create_dir_all(&app_config_path)
        .map_err(|e| format!("Failed to create app config directory: {}", e))?;

    Ok(())
}

fn backup_claude_configs_internal(
    app_config_path: &std::path::Path,
    claude_dir: &std::path::Path,
) -> Result<(), String> {
    // Create backup directory
    let backup_dir = app_config_path.join("claude_backup");

    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    // Copy all files from .claude directory to backup
    for entry in std::fs::read_dir(claude_dir)
        .map_err(|e| format!("Failed to read Claude directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let source_path = entry.path();
        let file_name = source_path.file_name().ok_or("Invalid file name")?;
        let dest_path = backup_dir.join(file_name);

        if source_path.is_file() {
            std::fs::copy(&source_path, &dest_path)
                .map_err(|e| format!("Failed to copy file {}: {}", source_path.display(), e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn backup_claude_configs() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_dir = home_dir.join(".claude");
    let app_config_path = home_dir.join(APP_CONFIG_DIR);

    if !claude_dir.exists() {
        return Err("Claude configuration directory does not exist".to_string());
    }

    // Ensure app config directory exists
    std::fs::create_dir_all(&app_config_path)
        .map_err(|e| format!("Failed to create app config directory: {}", e))?;

    backup_claude_configs_internal(&app_config_path, &claude_dir)
}

// Store management functions

#[tauri::command]
pub async fn get_stores() -> Result<Vec<ConfigStore>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    if !stores_file.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&stores_file)
        .map_err(|e| format!("Failed to read stores file: {}", e))?;

    let mut stores_data: StoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stores file: {}", e))?;

    // Add default notification settings if they don't exist
    if stores_data.notification.is_none() {
        stores_data.notification = Some(NotificationSettings {
            enable: true,
            enabled_hooks: vec!["Notification".to_string()],
        });

        // Write back to stores file with notification settings added
        let json_content = serde_json::to_string_pretty(&stores_data)
            .map_err(|e| format!("Failed to serialize stores: {}", e))?;

        std::fs::write(&stores_file, json_content)
            .map_err(|e| format!("Failed to write stores file: {}", e))?;

        println!("Added default notification settings to existing stores.json");
    }

    let mut stores_vec = stores_data.configs;
    // Sort by createdAt in ascending order (oldest first)
    stores_vec.sort_by(|a, b| a.created_at.cmp(&b.created_at));

    Ok(stores_vec)
}

#[tauri::command]
pub async fn create_config(
    id: String,
    title: String,
    settings: Value,
) -> Result<ConfigStore, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    // Ensure app config directory exists
    std::fs::create_dir_all(&app_config_path)
        .map_err(|e| format!("Failed to create app config directory: {}", e))?;

    // Read existing stores
    let mut stores_data = if stores_file.exists() {
        let content = std::fs::read_to_string(&stores_file)
            .map_err(|e| format!("Failed to read stores file: {}", e))?;

        serde_json::from_str::<StoresData>(&content)
            .map_err(|e| format!("Failed to parse stores file: {}", e))?
    } else {
        StoresData {
            configs: vec![],
            distinct_id: None,
            notification: Some(NotificationSettings {
                enable: true,
                enabled_hooks: vec!["Notification".to_string()],
            }),
        }
    };

    // Determine if this should be the active store (true if no other stores exist)
    let should_be_active = stores_data.configs.is_empty();

    // If this is the first config being created and there's an existing settings.json, create an Original Config store
    if should_be_active {
        let claude_settings_path = home_dir.join(".claude/settings.json");
        if claude_settings_path.exists() {
            // Read existing settings
            let settings_content = std::fs::read_to_string(&claude_settings_path)
                .map_err(|e| format!("Failed to read existing Claude settings: {}", e))?;

            let settings_json: Value = serde_json::from_str(&settings_content)
                .map_err(|e| format!("Failed to parse existing Claude settings: {}", e))?;

            // Create an Original Config store with existing settings
            let original_store = ConfigStore {
                id: nanoid::nanoid!(6), // Generate a 6-character ID
                title: "Original Config".to_string(),
                created_at: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|e| format!("Failed to get timestamp: {}", e))?
                    .as_secs(),
                settings: settings_json,
                using: false, // Original Config should not be active by default
            };

            // Add the Original Config store to the collection
            stores_data.configs.push(original_store);
            println!("Created Original Config store from existing settings.json");
        }
    }

    // If this is the first store (and therefore active), write its settings to the user's actual settings.json with partial update
    if should_be_active {
        let user_settings_path = home_dir.join(".claude/settings.json");

        // Create .claude directory if it doesn't exist
        if let Some(parent) = user_settings_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
        }

        // Read existing settings if file exists, otherwise start with empty object
        let mut existing_settings = if user_settings_path.exists() {
            let content = std::fs::read_to_string(&user_settings_path)
                .map_err(|e| format!("Failed to read existing settings: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse existing settings: {}", e))?
        } else {
            serde_json::Value::Object(serde_json::Map::new())
        };

        // Merge the new settings into existing settings (partial update)
        if let Some(settings_obj) = settings.as_object() {
            if let Some(existing_obj) = existing_settings.as_object_mut() {
                // Update only the keys present in the stored settings
                for (key, value) in settings_obj {
                    existing_obj.insert(key.clone(), value.clone());
                }
            } else {
                // If existing settings is not an object, replace it entirely
                existing_settings = settings.clone();
            }
        } else {
            // If stored settings is not an object, replace existing entirely
            existing_settings = settings.clone();
        }

        // Write the merged settings back to file
        let json_content = serde_json::to_string_pretty(&existing_settings)
            .map_err(|e| format!("Failed to serialize merged settings: {}", e))?;

        std::fs::write(&user_settings_path, json_content)
            .map_err(|e| format!("Failed to write user settings: {}", e))?;
    }

    // Create new store
    let new_store = ConfigStore {
        id: id.clone(),
        title: title.clone(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to get timestamp: {}", e))?
            .as_secs(),
        settings,
        using: should_be_active,
    };

    // Add store to collection
    stores_data.configs.push(new_store.clone());

    // Write back to stores file
    let json_content = serde_json::to_string_pretty(&stores_data)
        .map_err(|e| format!("Failed to serialize stores: {}", e))?;

    std::fs::write(&stores_file, json_content)
        .map_err(|e| format!("Failed to write stores file: {}", e))?;

    // Automatically unlock CC extension when creating new config
    if let Err(e) = unlock_cc_ext().await {
        eprintln!("Warning: Failed to unlock CC extension: {}", e);
    }

    Ok(new_store)
}

#[tauri::command]
pub async fn delete_config(store_id: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    if !stores_file.exists() {
        return Err("Stores file does not exist".to_string());
    }

    // Read existing stores
    let content = std::fs::read_to_string(&stores_file)
        .map_err(|e| format!("Failed to read stores file: {}", e))?;

    let mut stores_data: StoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stores file: {}", e))?;

    // Find and remove store by ID
    let original_len = stores_data.configs.len();
    stores_data.configs.retain(|store| store.id != store_id);

    if stores_data.configs.len() == original_len {
        return Err("Store not found".to_string());
    }

    // Write back to file
    let json_content = serde_json::to_string_pretty(&stores_data)
        .map_err(|e| format!("Failed to serialize stores: {}", e))?;

    std::fs::write(&stores_file, json_content)
        .map_err(|e| format!("Failed to write stores file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn set_using_config(store_id: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    if !stores_file.exists() {
        return Err("Stores file does not exist".to_string());
    }

    // Read existing stores
    let content = std::fs::read_to_string(&stores_file)
        .map_err(|e| format!("Failed to read stores file: {}", e))?;

    let mut stores_data: StoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stores file: {}", e))?;

    // Find the store and check if it exists
    let store_found = stores_data.configs.iter().any(|store| store.id == store_id);
    if !store_found {
        return Err("Store not found".to_string());
    }

    // Set all stores to not using, then set the selected one to using
    let mut selected_store_settings: Option<Value> = None;
    for store in &mut stores_data.configs {
        if store.id == store_id {
            store.using = true;
            selected_store_settings = Some(store.settings.clone());
        } else {
            store.using = false;
        }
    }

    // Write the selected store's settings to the user's actual settings.json with partial update
    if let Some(settings) = selected_store_settings {
        let user_settings_path = home_dir.join(".claude/settings.json");

        // Create .claude directory if it doesn't exist
        if let Some(parent) = user_settings_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
        }

        // Read existing settings if file exists, otherwise start with empty object
        let mut existing_settings = if user_settings_path.exists() {
            let content = std::fs::read_to_string(&user_settings_path)
                .map_err(|e| format!("Failed to read existing settings: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse existing settings: {}", e))?
        } else {
            serde_json::Value::Object(serde_json::Map::new())
        };

        // Merge the new settings into existing settings (partial update)
        if let Some(settings_obj) = settings.as_object() {
            if let Some(existing_obj) = existing_settings.as_object_mut() {
                // Update only the keys present in the stored settings
                for (key, value) in settings_obj {
                    existing_obj.insert(key.clone(), value.clone());
                }
            } else {
                // If existing settings is not an object, replace it entirely
                existing_settings = settings.clone();
            }
        } else {
            // If stored settings is not an object, replace existing entirely
            existing_settings = settings.clone();
        }

        // Write the merged settings back to file
        let json_content = serde_json::to_string_pretty(&existing_settings)
            .map_err(|e| format!("Failed to serialize merged settings: {}", e))?;

        std::fs::write(&user_settings_path, json_content)
            .map_err(|e| format!("Failed to write user settings: {}", e))?;
    }

    // Write back to stores file
    let json_content = serde_json::to_string_pretty(&stores_data)
        .map_err(|e| format!("Failed to serialize stores: {}", e))?;

    std::fs::write(&stores_file, json_content)
        .map_err(|e| format!("Failed to write stores file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn reset_to_original_config() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    // Set all stores to not using
    if stores_file.exists() {
        let content = std::fs::read_to_string(&stores_file)
            .map_err(|e| format!("Failed to read stores file: {}", e))?;

        let mut stores_data: StoresData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse stores file: {}", e))?;

        // Set all stores to not using
        for store in &mut stores_data.configs {
            store.using = false;
        }

        // Write back to stores file
        let json_content = serde_json::to_string_pretty(&stores_data)
            .map_err(|e| format!("Failed to serialize stores: {}", e))?;

        std::fs::write(&stores_file, json_content)
            .map_err(|e| format!("Failed to write stores file: {}", e))?;
    }

    // Clear env field in settings.json
    let user_settings_path = home_dir.join(".claude/settings.json");

    // Create .claude directory if it doesn't exist
    if let Some(parent) = user_settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
    }

    // Read existing settings if file exists, otherwise start with empty object
    let mut existing_settings = if user_settings_path.exists() {
        let content = std::fs::read_to_string(&user_settings_path)
            .map_err(|e| format!("Failed to read existing settings: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse existing settings: {}", e))?
    } else {
        serde_json::Value::Object(serde_json::Map::new())
    };

    // Set env to empty object
    if let Some(existing_obj) = existing_settings.as_object_mut() {
        existing_obj.insert("env".to_string(), serde_json::json!({}));
    }

    // Write the merged settings back to file
    let json_content = serde_json::to_string_pretty(&existing_settings)
        .map_err(|e| format!("Failed to serialize merged settings: {}", e))?;

    std::fs::write(&user_settings_path, json_content)
        .map_err(|e| format!("Failed to write user settings: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_current_store() -> Result<Option<ConfigStore>, String> {
    let stores = get_stores().await?;
    Ok(stores.into_iter().find(|store| store.using))
}

#[tauri::command]
pub async fn get_store(store_id: String) -> Result<ConfigStore, String> {
    let stores = get_stores().await?;
    stores
        .into_iter()
        .find(|store| store.id == store_id)
        .ok_or_else(|| format!("Store with id '{}' not found", store_id))
}

#[tauri::command]
pub async fn update_config(
    store_id: String,
    title: String,
    settings: Value,
) -> Result<ConfigStore, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    if !stores_file.exists() {
        return Err("Stores file does not exist".to_string());
    }

    // Read existing stores
    let content = std::fs::read_to_string(&stores_file)
        .map_err(|e| format!("Failed to read stores file: {}", e))?;

    let mut stores_data: StoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stores file: {}", e))?;

    // Find the store by ID
    let store_index = stores_data
        .configs
        .iter()
        .position(|store| store.id == store_id)
        .ok_or_else(|| format!("Store with id '{}' not found", store_id))?;

    // // Check if new title conflicts with existing stores (excluding current one)
    // for existing_store in &stores_data.configs {
    //     if existing_store.id != store_id && existing_store.title == title {
    //         return Err("Store with this title already exists".to_string());
    //     }
    // }

    // Update the store
    let store = &mut stores_data.configs[store_index];
    store.title = title.clone();
    store.settings = settings.clone();

    // If this store is currently in use, also update the user's settings.json with partial update
    if store.using {
        let user_settings_path = home_dir.join(".claude/settings.json");

        // Create .claude directory if it doesn't exist
        if let Some(parent) = user_settings_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
        }

        // Read existing settings if file exists, otherwise start with empty object
        let mut existing_settings = if user_settings_path.exists() {
            let content = std::fs::read_to_string(&user_settings_path)
                .map_err(|e| format!("Failed to read existing settings: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse existing settings: {}", e))?
        } else {
            serde_json::Value::Object(serde_json::Map::new())
        };

        // Merge the new settings into existing settings (partial update)
        if let Some(settings_obj) = settings.as_object() {
            if let Some(existing_obj) = existing_settings.as_object_mut() {
                // Update only the keys present in the stored settings
                for (key, value) in settings_obj {
                    existing_obj.insert(key.clone(), value.clone());
                }
            } else {
                // If existing settings is not an object, replace it entirely
                existing_settings = settings.clone();
            }
        } else {
            // If stored settings is not an object, replace existing entirely
            existing_settings = settings.clone();
        }

        // Write the merged settings back to file
        let json_content = serde_json::to_string_pretty(&existing_settings)
            .map_err(|e| format!("Failed to serialize merged settings: {}", e))?;

        std::fs::write(&user_settings_path, json_content)
            .map_err(|e| format!("Failed to write user settings: {}", e))?;
    }

    // Write back to stores file
    let json_content = serde_json::to_string_pretty(&stores_data)
        .map_err(|e| format!("Failed to serialize stores: {}", e))?;

    std::fs::write(&stores_file, json_content)
        .map_err(|e| format!("Failed to write stores file: {}", e))?;

    // Automatically unlock CC extension when updating config
    if let Err(e) = unlock_cc_ext().await {
        eprintln!("Warning: Failed to unlock CC extension: {}", e);
    }

    Ok(stores_data.configs[store_index].clone())
}

#[tauri::command]
pub async fn open_config_path() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);

    // Ensure the directory exists
    if !app_config_path.exists() {
        std::fs::create_dir_all(&app_config_path)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Open the directory in the system's file manager
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&app_config_path)
            .spawn()
            .map_err(|e| format!("Failed to open config directory: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&app_config_path)
            .spawn()
            .map_err(|e| format!("Failed to open config directory: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&app_config_path)
            .spawn()
            .map_err(|e| format!("Failed to open config directory: {}", e))?;
    }

    Ok(())
}

// MCP Server management functions

#[tauri::command]
pub async fn get_global_mcp_servers() -> Result<std::collections::HashMap<String, McpServer>, String>
{
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_json_path = home_dir.join(".claude.json");

    if !claude_json_path.exists() {
        return Ok(std::collections::HashMap::new());
    }

    let content = std::fs::read_to_string(&claude_json_path)
        .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

    let json_value: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse .claude.json: {}", e))?;

    let mcp_servers_obj = json_value
        .get("mcpServers")
        .and_then(|servers| servers.as_object())
        .cloned()
        .unwrap_or_else(serde_json::Map::new);

    let mut result = std::collections::HashMap::new();
    for (name, config) in mcp_servers_obj {
        let mcp_server = McpServer {
            config: config.clone(),
        };
        result.insert(name.clone(), mcp_server);
    }

    Ok(result)
}

#[tauri::command]
pub async fn check_mcp_server_exists(server_name: String) -> Result<bool, String> {
    let mcp_servers = get_global_mcp_servers().await?;
    Ok(mcp_servers.contains_key(&server_name))
}

#[tauri::command]
pub async fn update_global_mcp_server(
    server_name: String,
    server_config: Value,
) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_json_path = home_dir.join(".claude.json");

    // Read existing .claude.json or create new structure
    let mut json_value = if claude_json_path.exists() {
        let content = std::fs::read_to_string(&claude_json_path)
            .map_err(|e| format!("Failed to read .claude.json: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse .claude.json: {}", e))?
    } else {
        Value::Object(serde_json::Map::new())
    };

    // Update mcpServers object
    let mcp_servers = json_value
        .as_object_mut()
        .unwrap()
        .entry("mcpServers".to_string())
        .or_insert_with(|| Value::Object(serde_json::Map::new()))
        .as_object_mut()
        .unwrap();

    // Update the specific server
    mcp_servers.insert(server_name, server_config);

    // Write back to file
    let json_content = serde_json::to_string_pretty(&json_value)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    std::fs::write(&claude_json_path, json_content)
        .map_err(|e| format!("Failed to write .claude.json: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_global_mcp_server(server_name: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_json_path = home_dir.join(".claude.json");

    if !claude_json_path.exists() {
        return Err("Claude configuration file does not exist".to_string());
    }

    // Read existing .claude.json
    let content = std::fs::read_to_string(&claude_json_path)
        .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

    let mut json_value: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse .claude.json: {}", e))?;

    // Check if mcpServers exists
    let mcp_servers = json_value
        .as_object_mut()
        .unwrap()
        .get_mut("mcpServers")
        .and_then(|servers| servers.as_object_mut());

    let mcp_servers = match mcp_servers {
        Some(servers) => servers,
        None => return Err("No mcpServers found in .claude.json".to_string()),
    };

    // Check if the server exists
    if !mcp_servers.contains_key(&server_name) {
        return Err(format!("MCP server '{}' not found", server_name));
    }

    // Remove the server
    mcp_servers.remove(&server_name);

    // If mcpServers is now empty, we can optionally remove the entire mcpServers object
    if mcp_servers.is_empty() {
        json_value.as_object_mut().unwrap().remove("mcpServers");
    }

    // Write back to file
    let json_content = serde_json::to_string_pretty(&json_value)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    std::fs::write(&claude_json_path, json_content)
        .map_err(|e| format!("Failed to write .claude.json: {}", e))?;

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub body: Option<String>,
    pub date: Option<String>,
}

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    println!("🔍 Checking for updates...");
    println!("📱 App version: {}", app.package_info().version);
    println!("🏷️  App identifier: {}", app.package_info().name);

    match app.updater() {
        Ok(updater) => {
            println!("✅ Updater initialized successfully");
            println!("📡 Checking update endpoint: https://github.com/liuaibin001/tvcbuddy/releases/latest/download/latest.json");

            match updater.check().await {
                Ok(Some(update)) => {
                    println!("🎉 Update available!");
                    println!("📦 Current version: {}", update.current_version);
                    println!("🚀 New version: {}", update.version);
                    println!("📝 Release notes: {:?}", update.body);
                    println!("📅 Release date: {:?}", update.date);
                    println!("🎯 Target platform: {:?}", update.target);

                    Ok(UpdateInfo {
                        available: true,
                        version: Some(update.version.clone()),
                        body: update.body.clone(),
                        date: update.date.map(|d| d.to_string()),
                    })
                }
                Ok(None) => {
                    println!("✅ No updates available - you're on the latest version");

                    Ok(UpdateInfo {
                        available: false,
                        version: None,
                        body: None,
                        date: None,
                    })
                }
                Err(e) => {
                    println!("❌ Error checking for updates: {}", e);
                    Err(format!("Failed to check for updates: {}", e))
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to initialize updater: {}", e);
            Err(format!("Failed to get updater: {}", e))
        }
    }
}

#[tauri::command]
pub async fn rebuild_tray_menu_command(app: tauri::AppHandle) -> Result<(), String> {
    crate::tray::rebuild_tray_menu(app).await
}

#[tauri::command]
pub async fn unlock_cc_ext() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_config_path = home_dir.join(".claude/config.json");

    // Ensure .claude directory exists
    if let Some(parent) = claude_config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
    }

    if claude_config_path.exists() {
        // File exists, check if primaryApiKey key exists
        let content = std::fs::read_to_string(&claude_config_path)
            .map_err(|e| format!("Failed to read config.json: {}", e))?;

        let mut json_value: Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config.json: {}", e))?;

        // Check if primaryApiKey exists
        if json_value.get("primaryApiKey").is_none() {
            // Add primaryApiKey to existing config
            if let Some(obj) = json_value.as_object_mut() {
                obj.insert(
                    "primaryApiKey".to_string(),
                    Value::String("xxx".to_string()),
                );
            }

            // Write back to file
            let json_content = serde_json::to_string_pretty(&json_value)
                .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

            std::fs::write(&claude_config_path, json_content)
                .map_err(|e| format!("Failed to write config.json: {}", e))?;

            println!("Added primaryApiKey to existing config.json");
        } else {
            println!("primaryApiKey already exists in config.json, no action needed");
        }
    } else {
        // File doesn't exist, create it with primaryApiKey
        let config = serde_json::json!({
            "primaryApiKey": "xxx"
        });

        let json_content = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

        std::fs::write(&claude_config_path, json_content)
            .map_err(|e| format!("Failed to write config.json: {}", e))?;

        println!("Created new config.json with primaryApiKey");
    }

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct UsageData {
    pub input_tokens: Option<u64>,
    pub cache_read_input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ProjectUsageRecord {
    pub uuid: String,
    pub timestamp: String,
    pub model: Option<String>,
    pub usage: Option<UsageData>,
}

#[tauri::command]
pub async fn read_project_usage_files() -> Result<Vec<ProjectUsageRecord>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let projects_dir = home_dir.join(".claude/projects");

    println!(
        "🔍 Looking for projects directory: {}",
        projects_dir.display()
    );

    if !projects_dir.exists() {
        println!("❌ Projects directory does not exist");
        return Ok(vec![]);
    }

    println!("✅ Projects directory exists");

    let mut all_records = Vec::new();
    let mut files_processed = 0;
    let mut lines_processed = 0;

    // Recursively find all .jsonl files in the projects directory and subdirectories
    fn find_jsonl_files(
        dir: &std::path::Path,
        files: &mut Vec<std::path::PathBuf>,
    ) -> Result<(), String> {
        let entries = std::fs::read_dir(dir)
            .map_err(|e| format!("Failed to read directory {}: {}", dir.display(), e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() && path.extension().map(|ext| ext == "jsonl").unwrap_or(false) {
                files.push(path);
            } else if path.is_dir() {
                // Recursively search subdirectories
                if let Err(e) = find_jsonl_files(&path, files) {
                    println!("Warning: {}", e);
                }
            }
        }
        Ok(())
    }

    let mut jsonl_files = Vec::new();
    find_jsonl_files(&projects_dir, &mut jsonl_files)?;

    for path in jsonl_files {
        files_processed += 1;
        // println!("📄 Processing file: {}", path.display());

        // Read the JSONL file
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read file {}: {}", path.display(), e))?;

        // Process each line in the JSONL file
        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }

            lines_processed += 1;

            // Parse the JSON line
            let json_value: Value = serde_json::from_str(line)
                .map_err(|e| format!("Failed to parse JSON line: {}", e))?;

            // Extract the required fields
            let uuid = json_value
                .get("uuid")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let timestamp = json_value
                .get("timestamp")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Extract model field (optional) - check both top-level and nested in message field
            let model = if let Some(model_str) = json_value.get("model").and_then(|v| v.as_str()) {
                Some(model_str.to_string())
            } else if let Some(message_obj) = json_value.get("message") {
                message_obj
                    .get("model")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            } else {
                None
            };

            // Extract usage data (optional) - check both top-level and nested in message field
            let usage = if let Some(usage_obj) = json_value.get("usage") {
                Some(UsageData {
                    input_tokens: usage_obj.get("input_tokens").and_then(|v| v.as_u64()),
                    cache_read_input_tokens: usage_obj
                        .get("cache_read_input_tokens")
                        .and_then(|v| v.as_u64()),
                    output_tokens: usage_obj.get("output_tokens").and_then(|v| v.as_u64()),
                })
            } else if let Some(message_obj) = json_value.get("message") {
                if let Some(usage_obj) = message_obj.get("usage") {
                    Some(UsageData {
                        input_tokens: usage_obj.get("input_tokens").and_then(|v| v.as_u64()),
                        cache_read_input_tokens: usage_obj
                            .get("cache_read_input_tokens")
                            .and_then(|v| v.as_u64()),
                        output_tokens: usage_obj.get("output_tokens").and_then(|v| v.as_u64()),
                    })
                } else {
                    None
                }
            } else {
                None
            };

            // Only include records with valid uuid, timestamp, and valid usage data
            if !uuid.is_empty() && !timestamp.is_empty() {
                // Check if usage data exists and has meaningful token values
                if let Some(ref usage_data) = usage {
                    let input_tokens = usage_data.input_tokens.unwrap_or(0);
                    let output_tokens = usage_data.output_tokens.unwrap_or(0);

                    // Only include if input_tokens + output_tokens > 0
                    if input_tokens + output_tokens > 0 {
                        all_records.push(ProjectUsageRecord {
                            uuid,
                            timestamp,
                            model,
                            usage,
                        });
                    }
                }
            }
        }
    }

    println!(
        "📊 Summary: Processed {} files, {} lines, found {} records",
        files_processed,
        lines_processed,
        all_records.len()
    );
    Ok(all_records)
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct MemoryFile {
    pub path: String,
    pub content: String,
    pub exists: bool,
}

#[tauri::command]
pub async fn read_claude_memory() -> Result<MemoryFile, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_md_path = home_dir.join(".claude/CLAUDE.md");

    let path_str = claude_md_path.to_string_lossy().to_string();

    if claude_md_path.exists() {
        let content = std::fs::read_to_string(&claude_md_path)
            .map_err(|e| format!("Failed to read CLAUDE.md file: {}", e))?;

        Ok(MemoryFile {
            path: path_str,
            content,
            exists: true,
        })
    } else {
        Ok(MemoryFile {
            path: path_str,
            content: String::new(),
            exists: false,
        })
    }
}

#[tauri::command]
pub async fn write_claude_memory(content: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_md_path = home_dir.join(".claude/CLAUDE.md");

    // Ensure .claude directory exists
    if let Some(parent) = claude_md_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
    }

    std::fs::write(&claude_md_path, content)
        .map_err(|e| format!("Failed to write CLAUDE.md file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn install_and_restart(app: tauri::AppHandle) -> Result<(), String> {
    println!("🚀 Starting update installation process...");

    match app.updater() {
        Ok(updater) => {
            println!("✅ Updater ready for installation");
            println!("📡 Re-checking for updates to get download info...");

            match updater.check().await {
                Ok(Some(update)) => {
                    println!("📥 Starting download and installation...");
                    println!("🎯 Update version: {}", update.version);
                    println!("🎯 Update target: {:?}", update.target);

                    // Download and install the update
                    match update
                        .download_and_install(
                            |chunk_length, content_length| {
                                let progress = if let Some(total) = content_length {
                                    (chunk_length as f64 / total as f64) * 100.0
                                } else {
                                    0.0
                                };
                                println!(
                                    "⬇️  Download progress: {:.1}% ({} bytes)",
                                    progress, chunk_length
                                );
                            },
                            || {
                                println!("✅ Download completed! Preparing to restart...");
                            },
                        )
                        .await
                    {
                        Ok(_) => {
                            println!("🔄 Update installed successfully! Restarting application in 500ms...");

                            // Schedule restart after a short delay to allow the response to be sent
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                                println!("🔄 Restarting now!");
                                app_handle.restart();
                            });
                            Ok(())
                        }
                        Err(e) => {
                            println!("❌ Failed to install update: {}", e);
                            Err(format!("Failed to install update: {}", e))
                        }
                    }
                }
                Ok(None) => {
                    println!("ℹ️  No update available for installation");
                    Err("No update available".to_string())
                }
                Err(e) => {
                    println!("❌ Error checking for updates before installation: {}", e);
                    Err(format!("Failed to check for updates: {}", e))
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to get updater for installation: {}", e);
            Err(format!("Failed to get updater: {}", e))
        }
    }
}

// Get or create distinct_id from stores.json
async fn get_or_create_distinct_id() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    // Ensure app config directory exists
    std::fs::create_dir_all(&app_config_path)
        .map_err(|e| format!("Failed to create app config directory: {}", e))?;

    // Read existing stores.json or create new one
    let mut stores_data = if stores_file.exists() {
        let content = std::fs::read_to_string(&stores_file)
            .map_err(|e| format!("Failed to read stores file: {}", e))?;

        serde_json::from_str::<StoresData>(&content)
            .map_err(|e| format!("Failed to parse stores file: {}", e))?
    } else {
        StoresData {
            configs: vec![],
            distinct_id: None,
            notification: Some(NotificationSettings {
                enable: true,
                enabled_hooks: vec!["Notification".to_string()],
            }),
        }
    };

    // Return existing distinct_id or create new one
    if let Some(ref id) = stores_data.distinct_id {
        Ok(id.clone())
    } else {
        // Generate new UUID
        let new_id = Uuid::new_v4().to_string();
        stores_data.distinct_id = Some(new_id.clone());

        // Write back to stores.json
        let json_content = serde_json::to_string_pretty(&stores_data)
            .map_err(|e| format!("Failed to serialize stores data: {}", e))?;

        std::fs::write(&stores_file, json_content)
            .map_err(|e| format!("Failed to write stores file: {}", e))?;

        println!("Created new distinct_id: {}", new_id);
        Ok(new_id)
    }
}

// Get operating system name in PostHog format
fn get_os_name() -> &'static str {
    #[cfg(target_os = "macos")]
    return "macOS";
    #[cfg(target_os = "windows")]
    return "Windows";
    #[cfg(target_os = "linux")]
    return "Linux";
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return "Unknown";
}

// Get operating system version
fn get_os_version() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .map_err(|e| format!("Failed to get macOS version: {}", e))?;

        let version = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse macOS version: {}", e))?;

        Ok(version.trim().to_string())
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("cmd")
            .args(&["/C", "ver"])
            .output()
            .map_err(|e| format!("Failed to get Windows version: {}", e))?;

        let version_str = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse Windows version: {}", e))?;

        // Extract version number from "Microsoft Windows [Version 10.0.19045.2364]"
        if let Some(start) = version_str.find("Version ") {
            let version_part = &version_str[start + 8..];
            let version = version_part.trim_end_matches("]").trim().to_string();
            Ok(version)
        } else {
            Ok("Unknown".to_string())
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::fs;
        // Try to read from /etc/os-release first
        if let Ok(content) = fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("VERSION_ID=") {
                    let version = line
                        .split('=')
                        .nth(1)
                        .unwrap_or("Unknown")
                        .trim_matches('"');
                    return Ok(version.to_string());
                }
            }
        }

        // Fallback to uname
        use std::process::Command;
        let output = Command::new("uname")
            .arg("-r")
            .output()
            .map_err(|e| format!("Failed to get Linux kernel version: {}", e))?;

        let version = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse Linux version: {}", e))?;

        Ok(version.trim().to_string())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    Ok("Unknown".to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ProjectConfig {
    pub path: String,
    pub config: serde_json::Value,
}

#[tauri::command]
pub async fn read_claude_projects() -> Result<Vec<ProjectConfig>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_json_path = home_dir.join(".claude.json");

    if !claude_json_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&claude_json_path)
        .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

    let json_value: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse .claude.json: {}", e))?;

    let projects_obj = json_value
        .get("projects")
        .and_then(|projects| projects.as_object())
        .cloned()
        .unwrap_or_else(serde_json::Map::new);

    let mut result = Vec::new();
    for (path, config) in projects_obj {
        let project_config = ProjectConfig {
            path: path.clone(),
            config: config.clone(),
        };
        result.push(project_config);
    }

    Ok(result)
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct ClaudeConfigFile {
    pub path: String,
    pub content: Value,
    pub exists: bool,
}

#[tauri::command]
pub async fn read_claude_config_file() -> Result<ClaudeConfigFile, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_json_path = home_dir.join(".claude.json");

    let path_str = claude_json_path.to_string_lossy().to_string();

    if claude_json_path.exists() {
        let content = std::fs::read_to_string(&claude_json_path)
            .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

        let json_content: Value =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

        Ok(ClaudeConfigFile {
            path: path_str,
            content: json_content,
            exists: true,
        })
    } else {
        Ok(ClaudeConfigFile {
            path: path_str,
            content: Value::Object(serde_json::Map::new()),
            exists: false,
        })
    }
}

#[tauri::command]
pub async fn write_claude_config_file(content: Value) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let claude_json_path = home_dir.join(".claude.json");

    let json_content = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    std::fs::write(&claude_json_path, json_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn track(
    event: String,
    properties: serde_json::Value,
    app: tauri::AppHandle,
) -> Result<(), String> {
    println!("📊 Tracking event: {}", event);

    // Get distinct_id
    let distinct_id = get_or_create_distinct_id().await?;

    // Get app version
    let app_version = app.package_info().version.to_string();

    // Get OS information
    let os_name = get_os_name();
    let os_version = get_os_version().unwrap_or_else(|_| "Unknown".to_string());

    // Prepare request payload
    let mut payload = serde_json::json!({
        "api_key": "phc_zlfJLeYsreOvash1EhL6IO6tnP00exm75OT50SjnNcy",
        "event": event,
        "properties": {
            "distinct_id": distinct_id,
            "app_version": app_version,
            "$os": os_name,
            "$os_version": os_version
        }
    });

    // Merge additional properties
    if let Some(props_obj) = payload["properties"].as_object_mut() {
        if let Some(additional_props) = properties.as_object() {
            for (key, value) in additional_props {
                props_obj.insert(key.clone(), value.clone());
            }
        }
    }

    // Add timestamp if not provided
    if !payload["properties"]
        .as_object()
        .unwrap()
        .contains_key("timestamp")
    {
        let timestamp = chrono::Utc::now().to_rfc3339();
        payload["properties"]["timestamp"] = serde_json::Value::String(timestamp);
    }

    println!(
        "📤 Sending to PostHog: {}",
        serde_json::to_string_pretty(&payload).unwrap()
    );

    // Send request to PostHog
    let client = reqwest::Client::new();
    let response = client
        .post("https://us.i.posthog.com/capture/")
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to PostHog: {}", e))?;

    if response.status().is_success() {
        println!("✅ Event tracked successfully");
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        println!("❌ Failed to track event: {} - {}", status, error_text);
        Err(format!("PostHog API error: {} - {}", status, error_text))
    }
}

// Hook management functions

/// Get the latest hook command based on the current operating system
fn get_latest_hook_command() -> serde_json::Value {
    if cfg!(target_os = "windows") {
        serde_json::json!({
            "__ccmate__": true,
            "type": "command",
            "command": "powershell -Command \"try { Invoke-RestMethod -Uri http://localhost:59948/claude_code/hooks -Method POST -ContentType 'application/json' -Body $input -ErrorAction Stop } catch { '' }\""
        })
    } else {
        serde_json::json!({
            "__ccmate__": true,
            "type": "command",
            "command": "curl -s -X POST http://localhost:59948/claude_code/hooks -H 'Content-Type: application/json' --data-binary @- 2>/dev/null || echo"
        })
    }
}

/// Update existing ccmate hooks for specified events (doesn't add new ones)
fn update_existing_hooks(
    hooks_obj: &mut serde_json::Map<String, serde_json::Value>,
    events: &[&str],
) -> Result<bool, String> {
    let latest_hook_command = get_latest_hook_command();
    let latest_command_str = latest_hook_command
        .get("command")
        .and_then(|cmd| cmd.as_str())
        .unwrap_or("");

    let mut hook_updated = false;

    for event in events {
        if let Some(event_hooks) = hooks_obj.get_mut(*event).and_then(|h| h.as_array_mut()) {
            // Find and update existing ccmate hooks only
            for entry in event_hooks.iter_mut() {
                if let Some(hooks_array) = entry.get_mut("hooks").and_then(|h| h.as_array_mut()) {
                    for hook in hooks_array.iter_mut() {
                        if hook.get("__ccmate__").is_some() {
                            // Compare only the command string, not the entire JSON object
                            if let Some(existing_command) =
                                hook.get("command").and_then(|cmd| cmd.as_str())
                            {
                                if existing_command != latest_command_str {
                                    // Update only the command field, preserve other properties
                                    hook["command"] =
                                        serde_json::Value::String(latest_command_str.to_string());
                                    hook_updated = true;
                                    println!(
                                        "🔄 Updated {} hook command: {}",
                                        event, latest_command_str
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(hook_updated)
}

/// Update or add ccmate hooks for specified events
fn update_or_add_hooks(
    hooks_obj: &mut serde_json::Map<String, serde_json::Value>,
    events: &[&str],
) -> Result<bool, String> {
    let latest_hook_command = get_latest_hook_command();
    let mut hook_updated = false;

    for event in events {
        if let Some(event_hooks) = hooks_obj.get_mut(*event).and_then(|h| h.as_array_mut()) {
            // Find and update existing ccmate hooks
            for entry in event_hooks.iter_mut() {
                if let Some(hooks_array) = entry.get_mut("hooks").and_then(|h| h.as_array_mut()) {
                    for hook in hooks_array.iter_mut() {
                        if hook.get("__ccmate__").is_some() {
                            // Update the command to the latest version
                            if hook.get("command") != latest_hook_command.get("command") {
                                *hook = latest_hook_command.clone();
                                hook_updated = true;
                            }
                        }
                    }
                }
            }

            // If no ccmate hooks found, add one
            let ccmate_hook_exists = event_hooks.iter().any(|entry| {
                if let Some(hooks_array) = entry.get("hooks").and_then(|h| h.as_array()) {
                    hooks_array
                        .iter()
                        .any(|hook| hook.get("__ccmate__").is_some())
                } else {
                    false
                }
            });

            if !ccmate_hook_exists {
                let ccmate_hook_entry = serde_json::json!({
                    "hooks": [latest_hook_command.clone()]
                });
                event_hooks.push(ccmate_hook_entry);
                hook_updated = true;
            }
        } else {
            // Create event hooks array with ccmate hook
            let ccmate_hook_entry = serde_json::json!({
                "hooks": [latest_hook_command.clone()]
            });
            hooks_obj.insert(
                event.to_string(),
                serde_json::Value::Array(vec![ccmate_hook_entry]),
            );
            hook_updated = true;
        }
    }

    Ok(hook_updated)
}

#[tauri::command]
pub async fn get_notification_settings() -> Result<Option<NotificationSettings>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    if !stores_file.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&stores_file)
        .map_err(|e| format!("Failed to read stores file: {}", e))?;

    let stores_data: StoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stores file: {}", e))?;

    Ok(stores_data.notification)
}

#[tauri::command]
pub async fn update_claude_code_hook() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let settings_path = home_dir.join(".claude/settings.json");

    if !settings_path.exists() {
        // If settings file doesn't exist, just add the hooks
        return add_claude_code_hook().await;
    }

    // Read existing settings
    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    let mut settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    // Ensure hooks object exists
    let hooks_obj = settings
        .as_object_mut()
        .unwrap()
        .entry("hooks".to_string())
        .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()))
        .as_object_mut()
        .unwrap();

    // Update existing hooks for Notification, Stop, and PreToolUse events (only update, don't add new ones)
    let events = ["Notification", "Stop", "PreToolUse"];
    let hook_updated = update_existing_hooks(hooks_obj, &events)?;

    if hook_updated {
        // Write back to settings file
        let json_content = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        // Create .claude directory if it doesn't exist
        if let Some(parent) = settings_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
        }

        std::fs::write(&settings_path, json_content)
            .map_err(|e| format!("Failed to write settings.json: {}", e))?;

        println!("✅ Claude Code hooks updated successfully");
    } else {
        println!("ℹ️  Claude Code hooks are already up to date - no updates needed");
    }

    Ok(())
}

#[tauri::command]
pub async fn add_claude_code_hook() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let settings_path = home_dir.join(".claude/settings.json");

    // Read existing settings or create new structure
    let mut settings = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings.json: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings.json: {}", e))?
    } else {
        serde_json::Value::Object(serde_json::Map::new())
    };

    // Ensure hooks object exists
    let hooks_obj = settings
        .as_object_mut()
        .unwrap()
        .entry("hooks".to_string())
        .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()))
        .as_object_mut()
        .unwrap();

    // Add hooks for Notification, Stop, and PreToolUse events
    let events = ["Notification", "Stop", "PreToolUse"];
    update_or_add_hooks(hooks_obj, &events)?;

    // Write back to settings file
    let json_content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    // Create .claude directory if it doesn't exist
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create .claude directory: {}", e))?;
    }

    std::fs::write(&settings_path, json_content)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    println!("✅ Claude Code hooks added successfully");
    Ok(())
}

#[tauri::command]
pub async fn remove_claude_code_hook() -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let settings_path = home_dir.join(".claude/settings.json");

    if !settings_path.exists() {
        return Ok(()); // Settings file doesn't exist, nothing to remove
    }

    // Read existing settings
    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    let mut settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    // Check if hooks object exists
    if let Some(hooks_obj) = settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        let events = ["Notification", "Stop", "PreToolUse"];

        for event in events {
            if let Some(event_hooks) = hooks_obj.get_mut(event).and_then(|h| h.as_array_mut()) {
                // Remove hooks that have __ccmate__ key from nested hooks arrays
                let mut new_event_hooks = Vec::new();
                for entry in event_hooks.iter() {
                    if let Some(hooks_array) = entry.get("hooks").and_then(|h| h.as_array()) {
                        // Filter out hooks that have __ccmate__ key
                        let filtered_hooks: Vec<serde_json::Value> = hooks_array
                            .iter()
                            .filter(|hook| hook.get("__ccmate__").is_none())
                            .cloned()
                            .collect();

                        // Keep the entry only if it still has hooks
                        if !filtered_hooks.is_empty() {
                            let mut new_entry = entry.clone();
                            new_entry["hooks"] = serde_json::Value::Array(filtered_hooks);
                            new_event_hooks.push(new_entry);
                        }
                    } else {
                        // Keep entries that don't have a hooks array
                        new_event_hooks.push(entry.clone());
                    }
                }
                *event_hooks = new_event_hooks;

                // If the event hooks array is empty, remove the entire event entry
                if event_hooks.is_empty() {
                    hooks_obj.remove(event);
                }
            }
        }

        // If hooks object is empty, remove it entirely
        if hooks_obj.is_empty() {
            settings.as_object_mut().unwrap().remove("hooks");
        }
    }

    // Write back to settings file
    let json_content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    std::fs::write(&settings_path, json_content)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    println!("✅ Claude Code hooks removed successfully");
    Ok(())
}

#[tauri::command]
pub async fn update_notification_settings(settings: NotificationSettings) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let app_config_path = home_dir.join(APP_CONFIG_DIR);
    let stores_file = app_config_path.join("stores.json");

    if !stores_file.exists() {
        // Create stores.json with notification settings if it doesn't exist
        let stores_data = StoresData {
            configs: vec![],
            distinct_id: None,
            notification: Some(settings.clone()),
        };

        // Ensure app config directory exists
        std::fs::create_dir_all(&app_config_path)
            .map_err(|e| format!("Failed to create app config directory: {}", e))?;

        let json_content = serde_json::to_string_pretty(&stores_data)
            .map_err(|e| format!("Failed to serialize stores: {}", e))?;

        std::fs::write(&stores_file, json_content)
            .map_err(|e| format!("Failed to write stores file: {}", e))?;

        println!("Created stores.json with notification settings");
        return Ok(());
    }

    // Read existing stores
    let content = std::fs::read_to_string(&stores_file)
        .map_err(|e| format!("Failed to read stores file: {}", e))?;

    let mut stores_data: StoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stores file: {}", e))?;

    // Update notification settings
    stores_data.notification = Some(settings);

    // Write back to stores file
    let json_content = serde_json::to_string_pretty(&stores_data)
        .map_err(|e| format!("Failed to serialize stores: {}", e))?;

    std::fs::write(&stores_file, json_content)
        .map_err(|e| format!("Failed to write stores file: {}", e))?;

    println!("✅ Notification settings updated successfully");
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct CommandFile {
    pub name: String,
    pub content: String,
    pub exists: bool,
}

#[tauri::command]
pub async fn read_claude_commands() -> Result<Vec<CommandFile>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let commands_dir = home_dir.join(".claude/commands");

    if !commands_dir.exists() {
        return Ok(vec![]);
    }

    let mut command_files = Vec::new();

    // Read all .md files in the commands directory
    let entries = std::fs::read_dir(&commands_dir)
        .map_err(|e| format!("Failed to read commands directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map(|ext| ext == "md").unwrap_or(false) {
            let file_name = path
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string();

            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read command file {}: {}", path.display(), e))?;

            command_files.push(CommandFile {
                name: file_name,
                content,
                exists: true,
            });
        }
    }

    // Sort commands alphabetically by name
    command_files.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(command_files)
}

#[tauri::command]
pub async fn write_claude_command(command_name: String, content: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let commands_dir = home_dir.join(".claude/commands");
    let command_file_path = commands_dir.join(format!("{}.md", command_name));

    // Ensure .claude/commands directory exists
    std::fs::create_dir_all(&commands_dir)
        .map_err(|e| format!("Failed to create .claude/commands directory: {}", e))?;

    std::fs::write(&command_file_path, content)
        .map_err(|e| format!("Failed to write command file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_claude_command(command_name: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let commands_dir = home_dir.join(".claude/commands");
    let command_file_path = commands_dir.join(format!("{}.md", command_name));

    if command_file_path.exists() {
        std::fs::remove_file(&command_file_path)
            .map_err(|e| format!("Failed to delete command file: {}", e))?;
    }

    Ok(())
}

// Agent management functions

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct AgentFile {
    pub name: String,
    pub content: String,
    pub exists: bool,
}

#[tauri::command]
pub async fn read_claude_agents() -> Result<Vec<AgentFile>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let agents_dir = home_dir.join(".claude/agents");

    if !agents_dir.exists() {
        return Ok(vec![]);
    }

    let mut agent_files = Vec::new();

    // Read all .md files in the agents directory
    let entries = std::fs::read_dir(&agents_dir)
        .map_err(|e| format!("Failed to read agents directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map(|ext| ext == "md").unwrap_or(false) {
            let file_name = path
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string();

            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read agent file {}: {}", path.display(), e))?;

            agent_files.push(AgentFile {
                name: file_name,
                content,
                exists: true,
            });
        }
    }

    // Sort agents alphabetically by name
    agent_files.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(agent_files)
}

#[tauri::command]
pub async fn write_claude_agent(agent_name: String, content: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let agents_dir = home_dir.join(".claude/agents");
    let agent_file_path = agents_dir.join(format!("{}.md", agent_name));

    // Ensure .claude/agents directory exists
    std::fs::create_dir_all(&agents_dir)
        .map_err(|e| format!("Failed to create .claude/agents directory: {}", e))?;

    std::fs::write(&agent_file_path, content)
        .map_err(|e| format!("Failed to write agent file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_claude_agent(agent_name: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let agents_dir = home_dir.join(".claude/agents");
    let agent_file_path = agents_dir.join(format!("{}.md", agent_name));

    if agent_file_path.exists() {
        std::fs::remove_file(&agent_file_path)
            .map_err(|e| format!("Failed to delete agent file: {}", e))?;
    }

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct CodexStore {
    pub id: String,
    pub title: String,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    pub config: Value,
    pub using: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct CodexStoresData {
    pub configs: Vec<CodexStore>,
}

const CODEX_CONFIG_FILE: &str = "codexcc.json";

async fn read_codex_stores_internal() -> Result<CodexStoresData, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_path = home_dir.join(APP_CONFIG_DIR).join(CODEX_CONFIG_FILE);

    if !config_path.exists() {
        return Ok(CodexStoresData { configs: vec![] });
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read codex config file: {}", e))?;

    let data: CodexStoresData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse codex config file: {}", e))?;

    Ok(data)
}

async fn write_codex_stores_internal(data: &CodexStoresData) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home_dir.join(APP_CONFIG_DIR);
    let config_path = config_dir.join(CODEX_CONFIG_FILE);

    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize codex config data: {}", e))?;

    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write codex config file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_codex_stores() -> Result<Vec<CodexStore>, String> {
    let data = read_codex_stores_internal().await?;
    Ok(data.configs)
}

#[tauri::command]
pub async fn create_codex_store(title: String, config: Value) -> Result<CodexStore, String> {
    let mut data = read_codex_stores_internal().await?;

    let new_store = CodexStore {
        id: nanoid::nanoid!(),
        title,
        created_at: chrono::Utc::now().timestamp_millis() as u64,
        config,
        using: false,
    };

    data.configs.push(new_store.clone());
    write_codex_stores_internal(&data).await?;

    Ok(new_store)
}

#[tauri::command]
pub async fn update_codex_store(
    id: String,
    title: String,
    config: Value,
) -> Result<CodexStore, String> {
    let mut data = read_codex_stores_internal().await?;

    if let Some(store) = data.configs.iter_mut().find(|s| s.id == id) {
        store.title = title;
        store.config = config;

        let updated_store = store.clone();
        write_codex_stores_internal(&data).await?;
        Ok(updated_store)
    } else {
        Err("Store not found".to_string())
    }
}

#[tauri::command]
pub async fn delete_codex_store(id: String) -> Result<(), String> {
    let mut data = read_codex_stores_internal().await?;

    data.configs.retain(|s| s.id != id);
    write_codex_stores_internal(&data).await?;

    Ok(())
}

#[tauri::command]
pub async fn set_using_codex_store(id: String) -> Result<(), String> {
    let mut data = read_codex_stores_internal().await?;
    let mut selected_store: Option<CodexStore> = None;

    for store in &mut data.configs {
        if store.id == id {
            store.using = true;
            selected_store = Some(store.clone());
        } else {
            store.using = false;
        }
    }

    write_codex_stores_internal(&data).await?;

    // If a store was selected, update the .codex directory
    if let Some(store) = selected_store {
        let settings = get_codex_global_settings().await?;

        // Only proceed if Codex is enabled
        if settings.enabled {
            let root_path = std::path::PathBuf::from(&settings.root_path);

            // Ensure .codex directory exists
            if !root_path.exists() {
                std::fs::create_dir_all(&root_path)
                    .map_err(|e| format!("Failed to create codex root directory: {}", e))?;
            }

            let config_obj = store.config.as_object().ok_or("Invalid config format")?;

            // 1. Write auth.json
            if let Some(api_key) = config_obj.get("api_key").and_then(|v| v.as_str()) {
                let auth_content = serde_json::json!({
                    "OPENAI_API_KEY": api_key
                });
                let auth_path = root_path.join("auth.json");
                let auth_json = serde_json::to_string_pretty(&auth_content)
                    .map_err(|e| format!("Failed to serialize auth.json: {}", e))?;
                std::fs::write(auth_path, auth_json)
                    .map_err(|e| format!("Failed to write auth.json: {}", e))?;
            }

            // 2. Write config.toml
            let _platform = config_obj
                .get("platform")
                .and_then(|v| v.as_str())
                .unwrap_or("custom");
            let model = config_obj
                .get("model")
                .and_then(|v| v.as_str())
                .unwrap_or("gpt-5-codex");
            let url = config_obj
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("https://api.lightai.io/v1");
            let name = store.title.clone(); // Use configuration name as provider name

            let config_toml_content = format!(
                r#"model_provider = "{name}"
model = "{model}"
model_reasoning_effort = "high"
disable_response_storage = true
windows_wsl_setup_acknowledged = true

[model_providers.{name}]
name = "{name}"
base_url = "{url}"
wire_api = "responses"
requires_openai_auth = true
"#
            );

            let config_toml_path = root_path.join("config.toml");
            std::fs::write(config_toml_path, config_toml_content)
                .map_err(|e| format!("Failed to write config.toml: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_current_codex_store() -> Result<Option<CodexStore>, String> {
    let data = read_codex_stores_internal().await?;
    Ok(data.configs.into_iter().find(|s| s.using))
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct CodexGlobalSettings {
    pub enabled: bool,
    pub root_path: String,
}

impl Default for CodexGlobalSettings {
    fn default() -> Self {
        let home = dirs::home_dir().unwrap_or_default();
        let root_path = home.join(".codex").to_string_lossy().to_string();

        Self {
            enabled: true,
            root_path,
        }
    }
}

const CODEX_SETTINGS_FILE: &str = "codex_settings.json";

#[tauri::command]
pub async fn get_codex_global_settings() -> Result<CodexGlobalSettings, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_path = home_dir.join(APP_CONFIG_DIR).join(CODEX_SETTINGS_FILE);

    if !config_path.exists() {
        return Ok(CodexGlobalSettings::default());
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read codex settings: {}", e))?;

    let settings: CodexGlobalSettings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse codex settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub async fn update_codex_global_settings(settings: CodexGlobalSettings) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home_dir.join(APP_CONFIG_DIR);
    let config_path = config_dir.join(CODEX_SETTINGS_FILE);

    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize codex settings: {}", e))?;

    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write codex settings: {}", e))?;

    Ok(())
}

#[derive(serde::Serialize)]
pub struct ConnectionStatus {
    pub success: bool,
    pub latency_ms: u64,
    pub message: Option<String>,
}

#[tauri::command]
pub async fn check_codex_connection(
    url: String,
    api_key: Option<String>,
    _model: Option<String>,
) -> Result<ConnectionStatus, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let start = std::time::Instant::now();

    // Try to hit the /models endpoint as a lightweight check
    // Adjust the URL to ensure it ends with /models if it's a base URL
    // Common OpenAI compatible endpoints: {base_url}/models
    let check_url = if url.ends_with("/v1") {
        format!("{}/models", url)
    } else if url.ends_with("/v1/") {
        format!("{}models", url)
    } else {
        // Heuristic: if it doesn't have v1, try appending v1/models, or just models if user provided full path
        // For now, let's assume user provided base URL like https://api.example.com/v1
        if url.ends_with('/') {
            format!("{}models", url)
        } else {
            format!("{}/models", url)
        }
    };

    let mut request = client.get(&check_url);

    if let Some(key) = api_key {
        if !key.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", key));
        }
    }

    match request.send().await {
        Ok(response) => {
            let latency = start.elapsed().as_millis() as u64;
            if response.status().is_success() {
                Ok(ConnectionStatus {
                    success: true,
                    latency_ms: latency,
                    message: None,
                })
            } else {
                Ok(ConnectionStatus {
                    success: false,
                    latency_ms: latency,
                    message: Some(format!("HTTP {}", response.status())),
                })
            }
        }
        Err(e) => Ok(ConnectionStatus {
            success: false,
            latency_ms: 0,
            message: Some(e.to_string()),
        }),
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct NetworkInfo {
    pub interface_alias: String,
    pub local_ip: String,
    pub prefix_length: u8,
    pub gateway: String,
    pub dns: String,
}

#[tauri::command]
pub async fn check_is_admin() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // "net session" returns 0 exit code only if running with admin privileges
        let output = Command::new("net").args(&["session"]).output();

        match output {
            Ok(o) => o.status.success(),
            Err(_) => false,
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[tauri::command]
pub async fn get_system_network_info() -> Result<NetworkInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // Execute ipconfig /all to get detailed network information
        let output = Command::new("ipconfig")
            .arg("/all")
            .output()
            .map_err(|e| format!("Failed to execute ipconfig: {}", e))?;

        if !output.status.success() {
            return Err("ipconfig command failed".to_string());
        }

        // Parse output - ipconfig outputs in system encoding (GBK on Chinese Windows)
        let stdout = if let Ok(s) = String::from_utf8(output.stdout.clone()) {
            s
        } else {
            // Try GBK encoding for Chinese Windows
            encoding_rs::GBK.decode(&output.stdout).0.to_string()
        };

        // Parse ipconfig output
        let mut current_adapter: Option<String> = None;
        let mut adapter_ip: Option<String> = None;
        let mut adapter_gateway: Option<String> = None;
        let mut adapter_dns: Vec<String> = Vec::new();
        let mut found_adapter: Option<(String, String, String, String)> = None;

        for line in stdout.lines() {
            let trimmed = line.trim();

            // Detect adapter name (non-indented lines that end with colon)
            if !line.starts_with(' ') && !line.starts_with('\t') && trimmed.ends_with(':') {

                // Save previous adapter if it has both IP and Gateway
                if let (Some(name), Some(ip), Some(gw)) = (&current_adapter, &adapter_ip, &adapter_gateway) {
                    let dns = if adapter_dns.is_empty() {
                        "8.8.8.8".to_string()
                    } else {
                        adapter_dns.join(",")
                    };

                    found_adapter = Some((name.clone(), ip.clone(), gw.clone(), dns));
                    break; // Use first valid adapter
                }

                // Extract adapter name - remove "以太网适配器", "Ethernet adapter" etc. prefixes
                let adapter_line = trimmed.trim_end_matches(':');
                let adapter_name = if let Some(pos) = adapter_line.rfind(' ') {
                    // Take the part after the last space (e.g., "以太网适配器 以太网" -> "以太网")
                    adapter_line[pos + 1..].trim().to_string()
                } else {
                    adapter_line.to_string()
                };

                current_adapter = Some(adapter_name);
                adapter_ip = None;
                adapter_gateway = None;
                adapter_dns.clear();
                continue;
            }

            // Parse IPv4 address
            if trimmed.to_lowercase().contains("ipv4") && trimmed.contains(':') {
                if let Some(ip_part) = trimmed.split(':').nth(1) {
                    let ip = ip_part.trim().trim_end_matches("(Preferred)").trim().trim_end_matches("(首选)").trim();
                    // Validate IPv4 format
                    if ip.split('.').count() == 4 && ip.chars().all(|c| c.is_numeric() || c == '.') {
                        adapter_ip = Some(ip.to_string());
                    }
                }
            }

            // Parse Default Gateway
            if trimmed.to_lowercase().contains("default gateway") ||
               trimmed.to_lowercase().contains("默认网关") {
                if let Some(gw_part) = trimmed.split(':').nth(1) {
                    let gw = gw_part.trim();
                    if !gw.is_empty() && gw.split('.').count() == 4 {
                        adapter_gateway = Some(gw.to_string());
                    }
                }
            }

            // Parse DNS Servers
            if trimmed.to_lowercase().contains("dns servers") ||
               trimmed.to_lowercase().contains("dns 服务器") {
                if let Some(dns_part) = trimmed.split(':').nth(1) {
                    let dns = dns_part.trim();
                    if !dns.is_empty() && dns.split('.').count() == 4 {
                        adapter_dns.push(dns.to_string());
                    }
                }
            } else if !adapter_dns.is_empty() && trimmed.split('.').count() == 4 &&
                      trimmed.chars().all(|c| c.is_numeric() || c == '.') {
                // Additional DNS server on separate line
                adapter_dns.push(trimmed.to_string());
            }
        }

        // Check last adapter
        if found_adapter.is_none() {
            if let (Some(name), Some(ip), Some(gw)) = (current_adapter, adapter_ip, adapter_gateway) {
                let dns = if adapter_dns.is_empty() {
                    "8.8.8.8".to_string()
                } else {
                    adapter_dns.join(",")
                };

                found_adapter = Some((name, ip, gw, dns));
            }
        }

        if let Some((name, ip, gateway, dns)) = found_adapter {
            let info = NetworkInfo {
                interface_alias: name,
                local_ip: ip,
                prefix_length: 24, // Default to /24, can't easily get from ipconfig
                gateway,
                dns,
            };

            Ok(info)
        } else {
            Err("No active network adapter with IP and Gateway found".to_string())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Network management is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn get_public_ip(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to request public IP: {}", e))?;

    if response.status().is_success() {
        let text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;
        Ok(text.trim().to_string())
    } else {
        Err(format!("Request failed with status: {}", response.status()))
    }
}

#[tauri::command]
pub async fn set_system_network_node(
    interface_alias: String,
    ip: String,
    prefix_length: u8,
    gateway: String,
    dns: String,
) -> Result<NetworkInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // Check admin privileges first
        let check_admin = Command::new("net")
            .args(&["session"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        if !check_admin {
            return Err("Administrator privileges are required to change network settings.".to_string());
        }

        // Calculate subnet mask from prefix length
        let subnet_mask = match prefix_length {
            24 => "255.255.255.0",
            16 => "255.255.0.0",
            8 => "255.0.0.0",
            _ => "255.255.255.0", // Default to /24
        };

        // Step 1: Set IP address with static configuration
        let set_ip_output = Command::new("netsh")
            .args(&[
                "interface",
                "ipv4",
                "set",
                "address",
                &format!("name={}", interface_alias),
                "source=static",
                &format!("addr={}", ip),
                &format!("mask={}", subnet_mask),
                &format!("gateway={}", gateway),
                "gwmetric=1"
            ])
            .output()
            .map_err(|e| format!("Failed to execute netsh (set IP): {}", e))?;

        let set_ip_stderr = String::from_utf8_lossy(&set_ip_output.stderr);

        if !set_ip_output.status.success() {
            return Err(format!(
                "Failed to set IP address (exit code: {}): {}",
                set_ip_output.status.code().unwrap_or(-1),
                set_ip_stderr
            ));
        }

        // Step 2: Set DNS servers
        let dns_servers: Vec<&str> = dns.split(',').collect();

        // Set primary DNS
        if let Some(primary_dns) = dns_servers.first() {
            let set_dns_output = Command::new("netsh")
                .args(&[
                    "interface",
                    "ipv4",
                    "set",
                    "dns",
                    &format!("name={}", interface_alias),
                    "source=static",
                    &format!("addr={}", primary_dns),
                    "register=primary"
                ])
                .output()
                .map_err(|e| format!("Failed to execute netsh (set DNS): {}", e))?;

            let set_dns_stderr = String::from_utf8_lossy(&set_dns_output.stderr);

            if !set_dns_output.status.success() {
                return Err(format!(
                    "Failed to set DNS (exit code: {}): {}",
                    set_dns_output.status.code().unwrap_or(-1),
                    set_dns_stderr
                ));
            }
        }

        // Add additional DNS servers if present
        for (index, dns_server) in dns_servers.iter().skip(1).enumerate() {
            let _ = Command::new("netsh")
                .args(&[
                    "interface",
                    "ipv4",
                    "add",
                    "dns",
                    &format!("name={}", interface_alias),
                    &format!("addr={}", dns_server),
                    &format!("index={}", index + 2)
                ])
                .output();
        }

        // Wait for network to stabilize
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        // Verify network configuration by reading it back
        match get_system_network_info().await {
            Ok(network_info) => Ok(network_info),
            Err(_) => {
                // Still return success with the expected values
                Ok(NetworkInfo {
                    interface_alias,
                    local_ip: ip,
                    prefix_length,
                    gateway,
                    dns,
                })
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Network management is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn check_site_latency(url: String) -> Result<u64, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let start = std::time::Instant::now();
    let response = client.head(&url).send().await;

    // If HEAD fails (some sites block it), try GET
    let result = match response {
        Ok(_) => Ok(()),
        Err(_) => client.get(&url).send().await.map(|_| ()),
    };

    match result {
        Ok(_) => Ok(start.elapsed().as_millis() as u64),
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct SystemEnvConfig {
    pub has_config: bool,
    pub base_url: Option<String>,
    pub auth_token: Option<String>,
    pub main_model: Option<String>,
    pub haiku_model: Option<String>,
    pub sonnet_model: Option<String>,
    pub opus_model: Option<String>,
}

#[tauri::command]
pub fn get_system_env_config() -> SystemEnvConfig {
    let base_url = std::env::var("ANTHROPIC_BASE_URL").ok();
    let auth_token = std::env::var("ANTHROPIC_AUTH_TOKEN").ok();

    let has_config = base_url.is_some() && auth_token.is_some();

    SystemEnvConfig {
        has_config,
        base_url,
        auth_token,
        main_model: std::env::var("ANTHROPIC_MODEL").ok(),
        haiku_model: std::env::var("ANTHROPIC_DEFAULT_HAIKU_MODEL").ok(),
        sonnet_model: std::env::var("ANTHROPIC_DEFAULT_SONNET_MODEL").ok(),
        opus_model: std::env::var("ANTHROPIC_DEFAULT_OPUS_MODEL").ok(),
    }
}
