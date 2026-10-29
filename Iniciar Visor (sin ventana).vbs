Option Explicit
' Abre el Visor de Datos sin mostrar ninguna ventana de consola.
Dim fso, shell, dir, rest, pos, wslRoot, logFile, cmd, rc, log

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

dir = fso.GetParentFolderName(WScript.ScriptFullName)

If LCase(Left(dir, 7)) = "\\wsl$\" Then
  rest = Mid(dir, 8)
  pos = InStr(rest, "\")
  If pos > 0 Then rest = Mid(rest, pos + 1)
  wslRoot = "/" & Replace(rest, "\", "/")
Else
  wslRoot = Replace(dir, "\", "/")
End If

logFile = shell.ExpandEnvironmentStrings("%TEMP%") & "\visor-datos-launcher.log"
cmd = "cmd /c wsl.exe -- bash """ & wslRoot & "/scripts/start.sh"" > """ & logFile & """ 2>&1"
rc = shell.Run(cmd, 0, True)

If rc = 0 Then
  shell.Run "http://127.0.0.1:8000", 1, False
Else
  log = ""
  On Error Resume Next
  log = fso.OpenTextFile(logFile, 1).ReadAll
  On Error GoTo 0
  MsgBox "No se pudo iniciar el Visor de Datos." & vbCrLf & vbCrLf & log, 16, "Visor de Datos"
End If
