# Android 构建说明

- 安装 Node.js 与 Android SDK（含平台工具与至少一个模拟器）
- 进入 `my-rn-app` 目录安装依赖：`npm install`
- 预生成原生工程：`npm run prebuild`
- 运行到安卓：`npm run android`

如需打包 APK：
- 安装 Expo CLI 与 EAS（可选），或使用 `gradlew assembleRelease` 在生成的 `android` 项目中打包
