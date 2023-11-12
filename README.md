# Imperials!

Open source game with mechanics similar to Catan.

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fimperials.app&label=imperials.app)](https://imperials.app)
[![Blog](https://img.shields.io/website?url=https%3A%2F%2Fblog.imperials.app&label=blog)](https://blog.imperials.app)
[![License](https://img.shields.io/badge/license-AGPLv3-red)](./LICENSE)

![screenshot](./blog/content/home.jpg)

## Setup

- Set up MongoDB on your local machine or use a cloud service.
- Set environment variables in `.env` and `.env.local` file in `./ui_next` folder.
- Run `go run cmd/server/main.go`. Use `nodemon --signal SIGINT -e go --exec go run --race cmd/server/main.go` to watch backend changes and restart the server automatically.
- Run `npm run dev` in `./ui_next` to start the frontend.

## License

All code in this repository is licensed under the AGPLv3 license. The copyright for the artwork is owned by the project owners and may not be used without permission.
