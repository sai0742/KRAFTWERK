const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    browserName: 'chromium',
    locale: 'en-GB',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      // Exercise real autoplay restrictions, not headless Chromium's permissive default.
      ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'],
      args: [
        '--autoplay-policy=user-gesture-required',
        '--enable-webgl',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--no-sandbox'
      ]
    }
  },
  webServer: {
    command: 'python3 -m http.server 8000 --bind 0.0.0.0',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI
  }
});
