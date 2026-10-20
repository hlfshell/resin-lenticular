# resin-lenticular

<img src="docs/assets/vibe-coded.gif" alt="vibe-coded" width="160" height="28">

Create faux-lenticular lens artwork with uv resin / dtf printers.

Runs entirely in your browser.

Hosted at [lenticular.hlfshell.ai](https://lenticular.hlfshell.ai).

## Run

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

## Host

Run `npm run build` and serve `dist/` with a static web server, or use Docker:

```sh
docker build -t resin-lenticular .
docker run --rm -p 8080:8080 resin-lenticular
```

Open http://localhost:8080.

## License

[MIT](LICENSE)
