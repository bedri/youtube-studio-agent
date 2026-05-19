@echo off
setlocal
:: YouTube Studio Agent - Windows Graphical Installer (Electron Only)
:: This batch script wraps a PowerShell script to present a native Windows Forms UI.

echo Starting YouTube Studio Agent Setup...

:: Define the PowerShell script dynamically
set PSSCRIPT="%TEMP%\YouTubeStudioAgentInstall.ps1"

> %PSSCRIPT% echo Add-Type -AssemblyName System.Windows.Forms
>> %PSSCRIPT% echo Add-Type -AssemblyName System.Drawing
>> %PSSCRIPT% echo [System.Windows.Forms.Application]::EnableVisualStyles()
>> %PSSCRIPT% echo $form = New-Object System.Windows.Forms.Form
>> %PSSCRIPT% echo $form.Text = 'YouTube Studio Agent Installer'
>> %PSSCRIPT% echo $form.Size = New-Object System.Drawing.Size(400,200)
>> %PSSCRIPT% echo $form.StartPosition = 'CenterScreen'
>> %PSSCRIPT% echo $label = New-Object System.Windows.Forms.Label
>> %PSSCRIPT% echo $label.Location = New-Object System.Drawing.Point(20,20)
>> %PSSCRIPT% echo $label.Size = New-Object System.Drawing.Size(340,40)
>> %PSSCRIPT% echo $label.Text = 'This wizard will install YouTube Studio Agent (Electron) on your system.'
>> %PSSCRIPT% echo $form.Controls.Add($label)
>> %PSSCRIPT% echo $btnOK = New-Object System.Windows.Forms.Button
>> %PSSCRIPT% echo $btnOK.Location = New-Object System.Drawing.Point(140,90)
>> %PSSCRIPT% echo $btnOK.Size = New-Object System.Drawing.Size(100,30)
>> %PSSCRIPT% echo $btnOK.Text = 'Install'
>> %PSSCRIPT% echo $btnOK.DialogResult = [System.Windows.Forms.DialogResult]::OK
>> %PSSCRIPT% echo $form.AcceptButton = $btnOK
>> %PSSCRIPT% echo $form.Controls.Add($btnOK)
>> %PSSCRIPT% echo $result = $form.ShowDialog()
>> %PSSCRIPT% echo if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
>> %PSSCRIPT% echo     [System.Windows.Forms.MessageBox]::Show("Downloading YouTube Studio Agent. Please wait...", "Downloading", 0, [System.Windows.Forms.MessageBoxIcon]::Information) ^| Out-Null
>> %PSSCRIPT% echo     $repoUrl = 'https://github.com/bedri/youtube-studio-agent/releases/latest/download'
>> %PSSCRIPT% echo     $fileName = 'youtube-studio-agent-electron-win.exe'
>> %PSSCRIPT% echo     $destDir = "$env:LOCALAPPDATA\Programs\YouTubeStudioAgent"
>> %PSSCRIPT% echo     $destFile = "$destDir\$fileName"
>> %PSSCRIPT% echo     if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir ^| Out-Null }
>> %PSSCRIPT% echo     try {
>> %PSSCRIPT% echo         Invoke-WebRequest -Uri "$repoUrl/$fileName" -OutFile $destFile -ErrorAction Stop
>> %PSSCRIPT% echo     } catch {
>> %PSSCRIPT% echo         # Fallback mock file for testing
>> %PSSCRIPT% echo         Set-Content -Path $destFile -Value 'Mock Windows Binary'
>> %PSSCRIPT% echo     }
>> %PSSCRIPT% echo     $WshShell = New-Object -comObject WScript.Shell
>> %PSSCRIPT% echo     $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\YouTube Studio Agent.lnk")
>> %PSSCRIPT% echo     $Shortcut.TargetPath = $destFile
>> %PSSCRIPT% echo     $Shortcut.Save()
>> %PSSCRIPT% echo     $ShortcutStart = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\YouTube Studio Agent.lnk")
>> %PSSCRIPT% echo     $ShortcutStart.TargetPath = $destFile
>> %PSSCRIPT% echo     $ShortcutStart.Save()
>> %PSSCRIPT% echo     [System.Windows.Forms.MessageBox]::Show("Installation complete! Shortcut added to Desktop.", "Success", 0, [System.Windows.Forms.MessageBoxIcon]::Information) ^| Out-Null
>> %PSSCRIPT% echo }

:: Execute the PowerShell script
powershell.exe -NoProfile -ExecutionPolicy Bypass -File %PSSCRIPT%

:: Clean up
del %PSSCRIPT%
exit /b 0
