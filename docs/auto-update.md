# Auto Update Setup

VomiShield uses the Tauri v2 updater plugin. The application checks for updates
when the main window opens, lets the user install a detected update, then
relaunches into the new version.

Signing keys were generated locally:

- Private key: `C:\Users\Administrator\.tauri\vomishield.key`
- Public key: `C:\Users\Administrator\.tauri\vomishield.key.pub`
- Update endpoint:
  `https://github.com/1521620063/VomiShield/releases/latest/download/latest.json`

Before publishing release builds:

1. Keep `C:\Users\Administrator\.tauri\vomishield.key` backed up somewhere
   private. If this key is lost, existing installs cannot receive future
   updates.
2. Set the signing key content when running a release build:

   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\vomishield.key" -Raw
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
   npm run tauri build -- --ci
   ```

3. Upload the generated updater artifacts and `latest.json` to a GitHub Release.

The release endpoint must serve metadata that points to the signed installer
artifacts created by `bundle.createUpdaterArtifacts`.

For a Windows-only release, `latest.json` can look like this:

```json
{
  "version": "1.0.1",
  "notes": "Release notes",
  "pub_date": "2026-07-03T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "CONTENT_FROM_VomiShield_1.0.1_x64-setup.exe.sig",
      "url": "https://github.com/1521620063/VomiShield/releases/latest/download/VomiShield_1.0.1_x64-setup.exe"
    }
  }
}
```
