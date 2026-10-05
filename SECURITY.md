# Security

## How the application is built

Circulation Builder is a local tool. It has no server, no account system, no analytics and no
update service.

- The desktop window runs with the Electron sandbox on, context isolation on and Node integration off.
- The desktop shell cancels every network request made from its own window. It loads only the
  files shipped inside the application.
- Only links to the official Bombay High Court website are opened, and they open in your own
  web browser, not inside the application.
- What you type stays in the window's working memory. It is not written to disk by the application.
  See [PRIVACY.md](PRIVACY.md).

These points are checked by the automated tests in `tests/desktop/`, which start the real desktop
shell, try to reach a local test server from its window, and search the application's data folder
for text typed into the form.

## Supported versions

Security fixes are made to the latest released version.

## Reporting a vulnerability

Please report a suspected vulnerability privately, by email to wolfgangrush@gmail.com, or through
GitHub's private vulnerability reporting on the project's repository. Please do not open a public
issue for a security problem.

Never include the details of a real matter, a client or a party in a report. A synthetic example
is always enough to reproduce a problem.
