$ErrorActionPreference = 'Stop'
Write-Host "Starting stable tunnel manager..."

while ($true) {
    Write-Host "Starting localhost.run..."
    $process = Start-Process -FilePath "ssh" -ArgumentList "-4 -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run" -NoNewWindow -PassThru -RedirectStandardOutput "tunnel.log" -RedirectStandardError "tunnel_err.log"
    
    # Wait for the url to appear in the log
    $url = $null
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path "tunnel.log") {
            $content = Get-Content "tunnel.log" -Raw
            if ($content -match "(https://[a-zA-Z0-9-]+\.lhr\.life)") {
                $url = $matches[1]
                break
            }
        }
    }
    
    if ($url) {
        Write-Host "Got URL: $url"
        # Update .env
        (Get-Content .env) -replace '^PUBLIC_BACKEND_URL=.*', "PUBLIC_BACKEND_URL=$url" | Set-Content .env
        Write-Host "Updated .env with new URL"
        
        # Kill Uvicorn so the loop restarts it
        Write-Host "Restarting Uvicorn to pick up new URL..."
        try { taskkill /F /IM python.exe 2>$null } catch {}
        
        # Monitor tunnel health instead of just waiting for exit
        $fails = 0
        while (!$process.HasExited) {
            Start-Sleep -Seconds 10
            try {
                $response = Invoke-WebRequest -Uri "$url/health" -Method GET -TimeoutSec 5 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    $fails = 0
                } else {
                    $fails++
                }
            } catch {
                $fails++
            }
            if ($fails -ge 3) {
                Write-Host "Tunnel health check failed 3 times. Killing tunnel..."
                break
            }
        }
        
        if (!$process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Tunnel dropped or crashed. Restarting in 2s..."
    } else {
        Write-Host "Failed to get URL. Retrying..."
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Seconds 2
}
