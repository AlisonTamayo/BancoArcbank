$currentDir = Get-Location
Write-Host "Iniciando migración masiva desde $currentDir" -ForegroundColor Cyan

# Definición de repositorios
$repos = @{
    "frontendCajero" = "https://github.com/StephaniRiveraE/arcbank-front-ventanilla";
    "frontendWeb"    = "https://github.com/StephaniRiveraE/arcbank-front-web";
    "sucursales"     = "https://github.com/StephaniRiveraE/arcbank-service-sucursales";
    "ms-transaccion" = "https://github.com/StephaniRiveraE/arcbank-service-transacciones";
    "micro-cuentas"  = "https://github.com/StephaniRiveraE/arcbank-service-cuentas";
    "micro-clientes" = "https://github.com/StephaniRiveraE/arcbank-service-clientes";
    "api-gateway"    = "https://github.com/StephaniRiveraE/arcbank-gateway-server"
}

foreach ($folder in $repos.Keys) {
    $url = $repos[$folder]
    
    if (Test-Path "$currentDir\$folder") {
        Write-Host "`n----------------------------------------"
        Write-Host "Procesando: $folder" -ForegroundColor Yellow
        Write-Host "URL: $url"
        
        Set-Location "$currentDir\$folder"
        
        # Subida de cambios (Fixes)
        git add . | Out-Null
        git commit -m "Fix: CI/CD configuration updates (Build & EKS Debug)" | Out-Null
        
        # Push
        Write-Host "  - Subiendo correcciones..." -ForegroundColor Green
        $pushOutput = git push origin main 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ ÉXITO" -ForegroundColor Green
        }
        else {
            Write-Host "  ❌ ERROR: " -ForegroundColor Red
            Write-Host $pushOutput
        }
        
        Set-Location $currentDir
    }
    else {
        Write-Host "`n⚠️ La carpeta $folder no existe, saltando..." -ForegroundColor Red
    }
}

Write-Host "`n----------------------------------------"
Write-Host "Proceso completado." -ForegroundColor Cyan
