# How to Deploy Auditor Tool to Windows

Since the development environment is Linux and `wine` is not installed, we cannot cross-compile a Windows `.exe` directly here. The best path is to transfer the source code and build it natively on Windows.

## Prerequisite on Windows
1.  **Install Node.js**: Download and install [Node.js (LTS)](https://nodejs.org/) on your Windows machine.
2.  **Git**: (Optional) If you want to clone, otherwise we use the archive.

## Step 1: Download Source Code
I have created a compressed archive of the source code for you at:
`/home/ubuntu/projects/zepor/apps/auditor-tool-source.tar.gz`

**Action**:
- Use `scp` or your SSH client's file transfer tool (like WinSCP) to download this file to your Windows computer.
- Command example (run this on Windows PowerShell):
  ```powershell
  scp ubuntu@<YOUR_SERVER_IP>:/home/ubuntu/projects/zepor/apps/auditor-tool-source.tar.gz .
  ```

## Step 2: Extract and Setup
1.  **Extract** the `auditor-tool-source.tar.gz` file on Windows.
2.  Open **Command Prompt** or **PowerShell** and navigate to the extracted `auditor-tool` folder.
    ```powershell
    cd path\to\auditor-tool
    ```
3.  **Install Dependencies**:
    ```powershell
    npm install
    ```

## Step 3: Build and Install
You have two options:

### Option A: Run in Development Mode (Fastest)
To just run the app immediately:
```powershell
npm run dev
```

### Option B: Build a Windows Installer (.exe)
To create a standalone `.exe` installer:
1.  Run the build command:
    ```powershell
    npm run build:win
    ```
2.  Once finished, the installer will be in the `dist` or `out` folder.
3.  Double-click to install the **Zepor Auditor Tool**.

## Troubleshooting
- If you see `electron-vite: not found`, run `npm install` again.
- If you get signing errors, you can ignore them for local testing as we are using self-signing/mock logic.
