# Intellishots 🌵

## ⚠️ Platform Support

**Please Read Before Running:**

*   **iOS Only (Recommended):** This project has been developed and optimized for **iOS**.
*   **Android:** Support for Android has **not been tested**. While the code structure is cross-platform, specific native dependencies for the Local AI and filesystem handling may require additional configuration for Android.

It is highly recommended to run this project on an **iOS Simulator** or a physical **iOS Device**.

## Prerequisites

*   **macOS** (Required for building the iOS project)
*   **Xcode** (Installed via the Mac App Store)
*   **Node.js** & **npm/yarn**
*   **CocoaPods** (Usually installed automatically, but required for iOS builds)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-project-name>
    ```

2.  **Install JavaScript dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

## Running the App

Because this app uses native modules (SQLite, Local AI/Cactus SDK, Image Manipulator) that are not included in the standard Expo Go client, you must build a **Development Client**.

**Do not use `npx expo start` initially.** Instead, run the following command to compile the native app and launch it:

```bash
npx expo run:ios
