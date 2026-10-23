# Ecosystem Journal desktop

Thin Electron shell for https://tradersecosystem.com. The web app is not bundled. Web deployments take effect on the next navigation/reload; an already open page is not forcibly reloaded while somebody is writing. Desktop code lives in this separate Git repository, outside the Netlify project.

## Run and build on Windows

Install Node.js 22 LTS and Git, then:

```powershell
npm ci
npm test
npm run dev
npm run dist -- --publish never
```

Installer: `release/EcosystemJournal-Setup-1.0.0.exe`. NSIS installs for the current user with Start menu and desktop shortcuts. No administrator elevation is requested. Local builds are unsigned unless signing credentials are configured, so Windows can show an unknown-publisher warning. Do not tell users to disable security protections; sign public releases when a Windows signing certificate is available.

The only website target is `SITE_URL` in `src/config.cjs`. Keep its host consistent with Supabase redirect settings if it changes. No Supabase keys or application secrets are packaged. The live web application handles authentication and data access.

## Google sign-in: required web deployment and Supabase setting

The web repository contains the implementation: `src/lib/desktopBridge.ts`, `src/components/DesktopBridge.tsx`, the desktop branch in `googleSignIn.ts`, and PKCE mode in `supabase.ts`. Deploy those web changes before testing desktop Google sign-in.

Add this exact URL in **Supabase → Authentication → URL Configuration → Redirect URLs**:

```text
ecosystemjournal://auth/callback
```

Keep the existing web redirects. Do not add this custom URL to Google Cloud: Google's authorized redirect remains the existing Supabase HTTPS `/auth/v1/callback` endpoint. The app starts Supabase PKCE in its own web storage, opens the authorization URL in the default browser, receives a short-lived authorization code through the protocol, then exchanges it using the verifier that stayed inside the desktop window. Access/refresh tokens are never placed in the custom URL or sent through IPC. A pending login expires after ten minutes. Start again from the app if it expires. Development registration uses Electron plus this project path; installed builds register their own executable.

Email/password stays in the window. Password reset can remain in the browser. Google acceptance cannot be verified without the deployed web bridge, allowed redirect URL and an interactive account sign-in.

## Release repository and updates

Create a **public** GitHub repository named `Sammyuke/Sammyuke-Ecosystem-Journal-Desktop`, without connecting it to Netlify. This name is used by `build.publish` and by the website download section; update both if you choose another name.

```powershell
git branch -M main
git add .
git commit -m "Build Ecosystem Journal desktop"
git remote add origin https://github.com/Sammyuke/Sammyuke-Ecosystem-Journal-Desktop.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

For the next version:

```powershell
npm version patch
git push origin main --follow-tags
```

The tag must match package.json. GitHub Actions builds Windows x64 and signed Mac x64/arm64 packages and publishes installers, blockmaps and update manifests. The standard `GITHUB_TOKEN` is supplied only to CI, never the app. Keep all generated `.yml`, `.zip`, `.dmg`, `.exe` and `.blockmap` release files: the updater needs more than the installer. Releases must be published, not drafts. The app checks at startup and every four hours, downloads silently, and offers **Restart to update** with Later as the default. Unfinished edits should be saved first.

## Mac distribution

Build Mac packages on macOS (the Actions job does this); Windows cannot validate Mac installation. Configure these GitHub Actions repository secrets:

- `MAC_CSC_LINK`: base64 Developer ID Application `.p12` certificate
- `MAC_CSC_KEY_PASSWORD`: its password
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`: notarization credentials
- Optional Windows signing: `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`

The Mac release job intentionally stops if Apple credentials are absent, rather than publishing an installer that users cannot normally open. Both DMG and ZIP are built; ZIP is required for Mac auto-update. The app uses native traffic lights, a translucent header, dark loading surface and the same live website. Microphone entitlement and usage explanation are included. A Mac is still required to verify native permission prompts, visual behavior and updates.

## Clean-machine acceptance checklist

1. On a clean Windows 10/11 x64 account, install the EXE without admin rights. Confirm both shortcuts and one running instance when opened twice.
2. Resize/move, quit and reopen. Disconnect a monitor and confirm the window remains reachable.
3. Disconnect the network and relaunch. Confirm the branded Retry screen; reconnect and retry.
4. Sign in with email/password; then log out and test Google through the default browser. Confirm only the initiating app accepts the callback. Test cancellation and an expired callback.
5. Dictate a journal entry. Camera/location/notification requests must remain denied. Microphone is allowed only for the journal origin.
6. Start a payment using a test account/Paystack test flow. The approved payment popup stays in the app. External bank/3DS domains open in the browser; if your payment method requires a new embedded domain, review and add that exact origin rather than allowing all domains. Do not make a live charge just to test.
7. Publish the next version, open the old version and choose Restart to update. Check preserved login, window position and the new version. Also run the newer installer over the older installation.
8. Repeat authentication, microphone and signed update checks on Intel and Apple-silicon Macs before advertising those builds as verified.

Desktop policy tests cover origin spoofing, blocked schemes, audio-only permissions and code-only callbacks. They do not replace the interactive clean-machine checks above.
