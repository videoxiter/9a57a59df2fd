; Инсталлятор приложения «ОТП» (Windows).
; Собирается Inno Setup 6: ISCC.exe OTP-Tray-Setup.iss
; Ставится в профиль пользователя (без прав администратора), создаёт ярлыки
; и автозапуск, после установки запускает приложение.

#define AppName "ОТП — учёт рабочего времени"
#define AppShort "OTP Tray"
#define AppVersion "1.7"
#define AppPublisher "Яковлев Евгений Евгеньевич"
#define AppExe "OtpTray.exe"

[Setup]
AppId={{8E2B6C11-7A4D-4F5E-9B33-0B9C1E7A2D51}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\OtpTray
DefaultGroupName=ОТП
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UsePreviousAppDir=no
OutputDir=..\..\..\dist
OutputBaseFilename=OTP-Tray-Setup-{#AppVersion}
SetupIconFile=..\..\assets\app.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=no

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "Создать значок на рабочем столе"; GroupDescription: "Дополнительно:"
Name: "autostart"; Description: "Запускать приложение при входе в Windows"; GroupDescription: "Дополнительно:"

[Files]
Source: "..\dist\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\README-СОТРУДНИК.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ОТП"; Filename: "{app}\{#AppExe}"
Name: "{group}\Инструкция (Markdown)"; Filename: "{app}\README-СОТРУДНИК.md"
Name: "{userdesktop}\ОТП"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; \
    ValueName: "OtpTray"; ValueData: """{app}\{#AppExe}"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; запуск через cmd start: надёжнее прямого запуска GUI из установщика
Filename: "{cmd}"; Parameters: "/c start """" ""{app}\{#AppExe}"""; WorkingDir: "{app}"; \
    Description: "Запустить ОТП сейчас"; Flags: nowait postinstall

[Code]
{ Не даём ставить в Program Files без прав администратора: там приложение
  не сможет себя обновлять (именно так сломалось автообновление). }
function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = wpSelectDir) and (not IsAdminInstallMode) then
  begin
    if Pos('Program Files', WizardDirValue) > 0 then
    begin
      MsgBox('Папка Program Files защищена Windows.' + #13#10 +
             'Приложение не сможет обновлять себя. Установите его в профиль' + #13#10 +
             'пользователя (путь по умолчанию) — кнопка «Назад».', mbError, MB_OK);
      Result := False;
    end;
  end;
end;
