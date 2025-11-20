# 网络信息诊断脚本
# 用于测试和调试网络适配器检测

Write-Host "==== 网络适配器诊断工具 ====" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = 'Continue'

try {
    Write-Host "[1] 获取所有网络适配器配置..." -ForegroundColor Yellow
    $allAdapters = Get-NetIPConfiguration
    
    Write-Host "找到 $($allAdapters.Count) 个网络适配器" -ForegroundColor Green
    Write-Host ""
    
    foreach ($adapter in $allAdapters) {
        $hasGateway = $adapter.IPv4DefaultGateway -ne $null
        $hasIPv4 = $adapter.IPv4Address -ne $null
        $status = $adapter.NetAdapter.Status
        
        Write-Host "适配器: $($adapter.InterfaceAlias)" -ForegroundColor White
        Write-Host "  状态: $status" -ForegroundColor $(if ($status -eq "Up") { "Green" } else { "Gray" })
        Write-Host "  有IPv4地址: $hasIPv4" -ForegroundColor $(if ($hasIPv4) { "Green" } else { "Red" })
        
        if ($hasIPv4) {
            Write-Host "    IP: $($adapter.IPv4Address.IPAddress)" -ForegroundColor Cyan
            Write-Host "    前缀长度: $($adapter.IPv4Address.PrefixLength)" -ForegroundColor Cyan
        }
        
        Write-Host "  有默认网关: $hasGateway" -ForegroundColor $(if ($hasGateway) { "Green" } else { "Red" })
        
        if ($hasGateway) {
            Write-Host "    网关: $($adapter.IPv4DefaultGateway.NextHop)" -ForegroundColor Cyan
        }
        
        if ($adapter.DNSServer) {
            $dnsServers = $adapter.DNSServer.ServerAddresses -join ", "
            Write-Host "  DNS服务器: $dnsServers" -ForegroundColor Cyan
        } else {
            Write-Host "  DNS服务器: 无" -ForegroundColor Red
        }
        
        Write-Host ""
    }
    
    Write-Host "[2] 尝试查找首选网络适配器..." -ForegroundColor Yellow
    
    # 策略1: 有网关且状态为Up
    $adapter = Get-NetIPConfiguration | Where-Object { 
        $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" 
    } | Select-Object -First 1
    
    if ($adapter) {
        Write-Host "找到符合条件的适配器 (有网关): $($adapter.InterfaceAlias)" -ForegroundColor Green
    } else {
        Write-Host "未找到有网关的适配器，尝试回退策略..." -ForegroundColor Yellow
        
        # 策略2: 有IPv4且状态为Up
        $adapter = Get-NetIPConfiguration | Where-Object { 
            $_.IPv4Address -ne $null -and $_.NetAdapter.Status -eq "Up" 
        } | Select-Object -First 1
        
        if ($adapter) {
            Write-Host "找到符合条件的适配器 (有IPv4): $($adapter.InterfaceAlias)" -ForegroundColor Yellow
        } else {
            Write-Host "未找到任何符合条件的适配器!" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "[3] 构建网络信息JSON..." -ForegroundColor Yellow
    
    $ip = $adapter.IPv4Address.IPAddress
    $prefix = $adapter.IPv4Address.PrefixLength
    
    if ($adapter.IPv4DefaultGateway) {
        $gateway = $adapter.IPv4DefaultGateway.NextHop
    } else {
        $gateway = "0.0.0.0"
        Write-Host "  警告: 未找到默认网关，使用 0.0.0.0" -ForegroundColor Yellow
    }
    
    if ($adapter.DNSServer) {
        # 只选择IPv4格式的DNS
        $dns = ($adapter.DNSServer.ServerAddresses | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' }) -join ","
        if ([string]::IsNullOrEmpty($dns)) {
            $dns = "8.8.8.8"
            Write-Host "  警告: 未找到有效的IPv4 DNS，使用回退值 8.8.8.8" -ForegroundColor Yellow
        }
    } else {
        $dns = "8.8.8.8"
        Write-Host "  警告: 未找到DNS服务器，使用回退值 8.8.8.8" -ForegroundColor Yellow
    }
    
    $result = @{
        interface_alias = $adapter.InterfaceAlias
        local_ip = $ip
        prefix_length = [int]$prefix
        gateway = $gateway
        dns = $dns
    }
    
    $json = $result | ConvertTo-Json -Compress
    
    Write-Host ""
    Write-Host "==== 最终JSON输出 ====" -ForegroundColor Green
    Write-Host $json -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "==== 格式化输出 ====" -ForegroundColor Green
    $result | ConvertTo-Json | Write-Host -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "发生错误: $_" -ForegroundColor Red
    Write-Host "错误详情: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==== 诊断完成 ====" -ForegroundColor Green
