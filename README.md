# labelcraft

Design labels and print them to NIIMBOT label printers straight from your browser.

**Live:** https://anthonyda.github.io/labelcraft/

> **Not affiliated with NIIMBOT.** This is an independent project. It is not
> made, endorsed or supported by NIIMBOT. Printer communication uses the
> open-source [niimbluelib](https://github.com/MultiMote/niimbluelib) library.

## Browser support

Printing needs Web Bluetooth or Web Serial: Chrome, Edge or Opera on desktop,
or Chrome on Android. Other browsers can open the editor but cannot print.

## Development

```sh
npm install
npm run dev        # dev server
npm run lint       # oxlint + prettier check
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright, Chromium)
npm run build      # production build in dist/
```

Pushes to `main` are linted, tested, built and deployed to GitHub Pages.

## License

[MIT](LICENSE)
