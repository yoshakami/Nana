# Nana (WIP)
I'll tell here once the UI is nice and cosy.

developped with Tauri in vanilla HTML, CSS and Javascript.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

Compile me before crates.io removes my dependancies!

this is all the config needed
```
setx WEBVIEW2_BROWSER_EXECUTABLE_FOLDER "C:\Git\Microsoft.WebView2.FixedVersionRuntime.140.0.3485.94.x64"
```

for android, you can only build. dev won't work because of Rust overguarding watchdog. Edit Android.bat to build, and set this config in your terminal (yes, you need to install android studio and get these paths created by the installer)
```
setx ANDROID_HOME "C:\Users\yoshi\AppData\Local\Android\Sdk"
setx ANDROID_SDK_ROOT "C:\Users\yoshi\AppData\Local\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
setc NDK_HOME "C:\Users\yoshi\AppData\Local\Android\Sdk\ndk\26.1.10909125"
```