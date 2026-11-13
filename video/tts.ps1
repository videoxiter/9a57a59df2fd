param(
  [Parameter(Mandatory=$true)][string]$TextFile,
  [Parameter(Mandatory=$true)][string]$OutWav,
  [string]$Voice = "Microsoft Irina Desktop",
  [int]$Rate = 2
)
Add-Type -AssemblyName System.Speech
$text = [System.IO.File]::ReadAllText((Resolve-Path $TextFile), [System.Text.Encoding]::UTF8)
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$s.Rate = $Rate
$s.SetOutputToWaveFile($OutWav)
$s.Speak($text)
$s.Dispose()
if (Test-Path $OutWav) { Write-Output "OK" } else { Write-Output "FAIL" }
