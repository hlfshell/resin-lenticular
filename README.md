# resin-lenticular

Create lenticular artwork and matching transparent depth maps from two or more images. Align, crop, and resize your images, then generate print files or a calibration sheet.

Runs entirely in your browser. Supports Chrome and Firefox. Defaults to 1440 PPI and 40 LPI.

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
