# Circulation Builder for Bombay High Court

**English** · [मराठी](README.mr.md) · [हिन्दी](README.hi.md)

Prepare a circulation slip on your own computer, check it in a live preview, and print it on
one A4 page.

> **Independent tool.** Circulation Builder is not an official application of the Bombay High Court.
> It is not affiliated with or endorsed by the High Court, its Registry or any Bar Association.
> It prepares a request for circulation. It does not file a matter, look up court status,
> confirm registration or guarantee a listing.

## What it does

- Builds the slip from what you type: case reference, circulation category, names of parties,
  the date sought for listing, a short synopsis, the advocate's name and the date of the slip.
- Supports three kinds of case reference: a registered case, a stamp/lodging case, and an
  e-Filing reference.
- Suggests the case reference from the case type, number and year, and lets you correct it.
  You confirm the printed reference against your own case record before printing.
- Keeps the court case type and the circulation category as two separate choices. The case type
  comes from a searchable list of 353 types. The category is one of 26: the 25 printed on the
  proforma, and Criminal Matters.
- Can mark a slip **FRESH MATTER** at the top right.
- Prints your words exactly as entered. It does not draft, shorten or rewrite the synopsis.
- Refuses to print when the synopsis, or the slip as a whole, would not fit on one A4 page.

## Scope

This version follows the circulation-slip proforma of the Bench at Nagpur. Other Benches are not
covered yet.

The list of case types is a local snapshot of the type selector on the official Bombay High Court
website, checked on 5 October 2026. It is not a live court query.

## Install on a Mac

The desktop application is built for Apple silicon Macs running macOS 13 or later.

1. Download `Circulation-Builder-0.1.0-arm64.dmg` from the [latest release](https://github.com/Wolfgangrush/circulation-builder/releases/latest).
2. Open it and drag **Circulation Builder** into **Applications**.
3. Open it from Applications.

The application is signed with an Apple Developer ID and notarised by Apple, so it opens without
a security warning.

## Privacy

Nothing you type is stored or sent anywhere. There are no accounts, no analytics and no
telemetry, and the desktop application refuses every network request made from its own window.
The full policy is in [PRIVACY.md](PRIVACY.md) and inside the application under
**Privacy policy**.

## Run from source

You need Node.js 22.12 or later.

```bash
npm install
npm run dev            # the form in your browser
npm run desktop:open   # the desktop application
```

## Tests

```bash
npm test               # unit tests
npm run test:e2e       # browser tests, desktop and phone sizes
npm run test:desktop   # starts the real desktop application
npm run build          # type check and production build
```

All examples in the tests are synthetic. Please keep it that way: never put a real matter, party
or client into a test, an issue or a pull request.

## Build the Mac application

An unsigned build for your own use:

```bash
npm run package:mac
```

A signed and notarised build needs your own Apple Developer ID certificate and a `notarytool`
keychain profile:

```bash
CB_SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" \
CB_NOTARY_PROFILE="your-notary-profile" \
npm run release:mac
```

The release script copies the project to a temporary folder before signing, because macOS will
not sign an application that sits inside a folder synced by iCloud Drive or OneDrive.

To rebuild the icon from `build/icon.svg`:

```bash
npm run icons
```

## Before you rely on a slip

- Check the printed case reference against your case record.
- Check the current practice of the Registry. Forms and cut-off times change.
- An e-Filing number is not proof of registration, acceptance, grant or listing.
- Read the slip before you sign it. You are its author.

## Licence

MIT. See [LICENSE](LICENSE). Third-party software is listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Copyright © 2026 wolfgang_rush & Rushikesh R. Mahajan
