cd c:\git\nana
cargo tauri android init
cargo tauri android build 
"C:\Users\yoshi\AppData\Local\Android\Sdk\build-tools\36.1.0\apksigner.bat" sign --ks "C:\Users\yoshi\.android\debug.keystore" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android app-universal-release-unsigned.apk
echo ""
echo ""
echo ""
echo "You should open your phone and accept USB Install"
echo ""
echo ""
echo ""
adb install "C:\Git\Nana\src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"