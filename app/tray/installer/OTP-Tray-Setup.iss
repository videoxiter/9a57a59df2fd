; Инсталлятор приложения «ОТП» (Windows).
; Собирается Inno Setup 6: ISCC.exe OTP-Tray-Setup.iss
; Ставится в профиль пользователя (без прав администратора), создаёт ярлыки
; и автозапуск, после установки запускает приложение.

#define AppName "ОТП — учёт рабочего времени"
#define AppShort "OTP Tray"
#define AppVersion "3.1"
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
; приложение трей-ное, у него нет окна, поэтому стандартное «закройте приложение»
; работать не может — закрываем процесс сами в PrepareToInstall
CloseApplications=no
OutputDir=..\..\..\dist
OutputBaseFilename=OTP-Tray-Setup-{#AppVersion}
SetupIconFile=..\..\assets\app.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "Создать значок на рабочем столе"; GroupDescription: "Дополнительно:"
Name: "autostart"; Description: "Запускать приложение при входе в Windows"; GroupDescription: "Дополнительно:"; Flags: checkedonce

[Files]
; сборка папочная (--onedir): приложение не распаковывает себя в %TEMP%,
; поэтому антивирус не может «съесть» python313.dll
Source: "..\dist\OtpTray\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\README-СОТРУДНИК.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\ОТП"; Filename: "{app}\{#AppExe}"
Name: "{group}\Инструкция (Markdown)"; Filename: "{app}\README-СОТРУДНИК.md"
Name: "{userstartup}\ОТП"; Filename: "{app}\{#AppExe}"; Tasks: autostart
Name: "{userdesktop}\ОТП"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; \
    ValueName: "OtpTray"; ValueData: """{app}\{#AppExe}"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; запуск через cmd start: процесс отвязывается от установщика и не гаснет
; после его завершения (прямой запуск иногда не переживал выход установщика)
Filename: "{cmd}"; Parameters: "/c start """" ""{app}\{#AppExe}"""; WorkingDir: "{app}"; Flags: nowait

[Code]
var
  ResultCode: Integer;

{ Перед копированием файлов закрываем запущенное приложение.
  Оно трей-ное: у него нет окна, и стандартное «закройте приложение» не срабатывает
  (пользователь жмёт «ОК», а процесс остаётся). }
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM {#AppExe}', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(800);
end;

{ После установки приложение запускает запись [Run] выше — она работает
  и при обычной, и при тихой установке. }

{ Не даём ставить в Program Files без прав администратора. }
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
