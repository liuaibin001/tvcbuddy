// 完整的网络相关函数 - 请复制到 commands.rs 中替换损坏的部分

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

        println!("[DEBUG] Getting network info via ipconfig...");

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

        println!("[DEBUG] ipconfig output received, parsing...");

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
                    
                    println!("[DEBUG] Found valid adapter: {} (IP: {}, Gateway: {})", name, ip, gw);
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
                
                current_adapter = Some(adapter_name.clone());
                adapter_ip = None;
                adapter_gateway = None;
                adapter_dns.clear();
                
                println!("[DEBUG] Found adapter: {} (parsed from: {})", adapter_name, trimmed);
                continue;
            }

            // Parse IPv4 address
            if trimmed.to_lowercase().contains("ipv4") && trimmed.contains(':') {
                if let Some(ip_part) = trimmed.split(':').nth(1) {
                    let ip = ip_part.trim().trim_end_matches("(Preferred)").trim().trim_end_matches("(首选)").trim();
                    // Validate IPv4 format
                    if ip.split('.').count() == 4 && ip.chars().all(|c| c.is_numeric() || c == '.') {
                        adapter_ip = Some(ip.to_string());
                        println!("[DEBUG]   - IPv4: {}", ip);
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
                        println!("[DEBUG]   - Gateway: {}", gw);
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
                        println!("[DEBUG]   - DNS: {}", dns);
                    }
                }
            } else if !adapter_dns.is_empty() && trimmed.split('.').count() == 4 && 
                      trimmed.chars().all(|c| c.is_numeric() || c == '.') {
                // Additional DNS server on separate line
                adapter_dns.push(trimmed.to_string());
                println!("[DEBUG]   - DNS: {}", trimmed);
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
                
                println!("[DEBUG] Using last adapter: {} (IP: {}, Gateway: {})", name, ip, gw);
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
            
            println!("[SUCCESS] Network info retrieved: {:?}", info);
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
pub async fn set_system_network_node(
    interface_alias: String,
    ip: String,
    prefix_length: u8,
    gateway: String,
    dns: String,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        println!("[DEBUG] ========== Starting network node switch ==========");
        println!("[DEBUG] Interface: {}", interface_alias);
        println!("[DEBUG] IP: {}", ip);
        println!("[DEBUG] Prefix Length: {}", prefix_length);
        println!("[DEBUG] Gateway: {}", gateway);
        println!("[DEBUG] DNS: {}", dns);

        // Check admin privileges first
        println!("[DEBUG] Checking administrator privileges...");
        let check_admin = Command::new("net")
            .args(&["session"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        println!("[DEBUG] Admin check result: {}", check_admin);

        if !check_admin {
            let err_msg = "Administrator privileges are required to change network settings.";
            println!("[ERROR] {}", err_msg);
            return Err(err_msg.to_string());
        }

        // Calculate subnet mask from prefix length
        let subnet_mask = match prefix_length {
            24 => "255.255.255.0",
            16 => "255.255.0.0",
            8 => "255.0.0.0",
            _ => "255.255.255.0", // Default to /24
        };

        println!("[DEBUG] Using netsh commands instead of PowerShell...");
        
        // Step 1: Set IP address with static configuration
        println!("[DEBUG] Step 1: Setting IP address...");
        let set_ip_output = Command::new("netsh")
            .args(&[
                "interface",
                "ipv4",
                "set",
                "address",
                "name=",
                &interface_alias,
                "source=static",
                &format!("addr={}", ip),
                &format!("mask={}", subnet_mask),
                &format!("gateway={}", gateway),
                "gwmetric=1"
            ])
            .output()
            .map_err(|e| {
                let err_msg = format!("Failed to execute netsh (set IP): {}", e);
                println!("[ERROR] {}", err_msg);
                err_msg
            })?;

        let set_ip_stdout = String::from_utf8_lossy(&set_ip_output.stdout);
        let set_ip_stderr = String::from_utf8_lossy(&set_ip_output.stderr);
        
        println!("[DEBUG] Set IP exit code: {}", set_ip_output.status.code().unwrap_or(-1));
        if !set_ip_stdout.is_empty() {
            println!("[DEBUG] Set IP STDOUT: {}", set_ip_stdout);
        }
        if !set_ip_stderr.is_empty() {
            println!("[DEBUG] Set IP STDERR: {}", set_ip_stderr);
        }

        if !set_ip_output.status.success() {
            let err_msg = format!(
                "Failed to set IP address (exit code: {}): {}",
                set_ip_output.status.code().unwrap_or(-1),
                set_ip_stderr
            );
            println!("[ERROR] {}", err_msg);
            return Err(err_msg);
        }

        // Step 2: Set DNS servers
        println!("[DEBUG] Step 2: Setting DNS servers...");
        let dns_servers: Vec<&str> = dns.split(',').collect();
        
        // Set primary DNS
        if let Some(primary_dns) = dns_servers.first() {
            let set_dns_output = Command::new("netsh")
                .args(&[
                    "interface",
                    "ipv4",
                    "set",
                    "dns",
                    "name=",
                    &interface_alias,
                    "source=static",
                    &format!("addr={}", primary_dns),
                    "register=primary"
                ])
                .output()
                .map_err(|e| {
                    let err_msg = format!("Failed to execute netsh (set DNS): {}", e);
                    println!("[ERROR] {}", err_msg);
                    err_msg
                })?;

            let set_dns_stdout = String::from_utf8_lossy(&set_dns_output.stdout);
            let set_dns_stderr = String::from_utf8_lossy(&set_dns_output.stderr);
            
            println!("[DEBUG] Set DNS exit code: {}", set_dns_output.status.code().unwrap_or(-1));
            if !set_dns_stdout.is_empty() {
                println!("[DEBUG] Set DNS STDOUT: {}", set_dns_stdout);
            }
            if !set_dns_stderr.is_empty() {
                println!("[DEBUG] Set DNS STDERR: {}", set_dns_stderr);
            }

            if !set_dns_output.status.success() {
                let err_msg = format!(
                    "Failed to set DNS (exit code: {}): {}",
                    set_dns_output.status.code().unwrap_or(-1),
                    set_dns_stderr
                );
                println!("[ERROR] {}", err_msg);
                return Err(err_msg);
            }
        }

        // Add additional DNS servers if present
        for (index, dns_server) in dns_servers.iter().skip(1).enumerate() {
            println!("[DEBUG] Adding alternate DNS server #{}: {}", index + 1, dns_server);
            let _ = Command::new("netsh")
                .args(&[
                    "interface",
                    "ipv4",
                    "add",
                    "dns",
                    "name=",
&interface_alias,
                    &format!("addr={}", dns_server),
                    &format!("index={}", index + 2)
                ])
                .output();
        }

        println!("[SUCCESS] Network node switched successfully!");
        println!("[DEBUG] ========== Network node switch completed ==========");
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Network management is only supported on Windows".to_string())
    }
}
