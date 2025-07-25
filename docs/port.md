# Running the Server on a Custom Port

The server listens on port `3000` by default and will automatically move to the
next available port if that one is already in use. You can override the starting
port using either an environment variable or a command line argument.

## Using an Environment Variable

Set the `PORT` environment variable when starting the server:

```bash
PORT=5000 npm start
```

## Using a Command Line Argument

You can also specify the port directly after the script name:

```bash
node server.js 5000
```

`npm start` passes any additional arguments to `node`, so the following works as
well:

```bash
npm start 5000
```

The server will check the command line argument first. If no argument is given,
it falls back to the `PORT` environment variable and finally to the default
`3000`. Whichever port it ends up using, it will open your browser to that
address once the server is ready.
