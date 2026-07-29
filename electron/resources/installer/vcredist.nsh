!macro customInstall
  ; Check for Visual C++ 2015-2022 Redistributable (x64)
  ; Registry key written by the official vcredist installer
  ReadRegDword $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    ReadRegDword $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${EndIf}

  ${If} $0 != 1
    DetailPrint "Microsoft Visual C++ 2015-2022 Redistributable (x64) not found."
    IfFileExists "$INSTDIR\resources\vc_redist.x64.exe" 0 skipVcRedist
    DetailPrint "Installing Microsoft Visual C++ Runtime (this may take a moment)..."
    ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart' $1
    ${If} $1 == 0
      DetailPrint "Visual C++ Runtime installed successfully."
    ${Else}
      DetailPrint "Visual C++ Runtime installer exited with code $1."
      DetailPrint "The runtime may already be installed. You can download it from:"
      DetailPrint "https://aka.ms/vs/17/release/vc_redist.x64.exe"
    ${EndIf}
    skipVcRedist:
  ${Else}
    DetailPrint "Microsoft Visual C++ Runtime is already installed."
  ${EndIf}
!macroend
