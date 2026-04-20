# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-smoke.spec.ts >> Admin panel (no DB credentials) >> login page shows sign-in
- Location: e2e/admin-smoke.spec.ts:4:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/pl/0rmfn09d0g5c0h7m772zsbd00000gn/T/cursor-sandbox-cache/e7530d46704d3a6d58044dcc9c66ce14/playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```