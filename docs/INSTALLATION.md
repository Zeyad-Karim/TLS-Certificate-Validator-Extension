# Installation & Troubleshooting

## Requirements

- Google Chrome or another Chromium-based browser that supports Manifest V3 and `chrome.debugger`.
- Permission to load unpacked extensions in the browser.

No package manager, build step, or third-party JavaScript dependency is required.

## Install from Source

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the repository's `extension/` directory.
6. Chrome should display **TLS Certificate Validator** in the extension list.
7. Optionally pin it from the extensions menu for quicker access.

## Updating a Local Installation

After pulling new changes from GitHub:

1. Return to `chrome://extensions/`.
2. Find **TLS Certificate Validator**.
3. Click the reload button on its extension card.
4. Re-open the popup and test on an HTTPS site.

## Using the Extension

1. Navigate to a normal HTTPS page, for example `https://example.com`.
2. Open the extension popup.
3. Click **Inspect certificate**.
4. The active page reloads once.
5. The popup displays the captured TLS assessment and connection details.

## Why the Page Reloads

The extension attaches through `chrome.debugger`, enables the Chrome DevTools Protocol Network domain, and then reloads the page so it can capture the main document's `Network.responseReceived` event with fresh `securityDetails`.

## Common Problems

### "Another debugger is already attached"

Chrome generally allows only one debugger client for a target. Close DevTools or any other extension/tool that is debugging the same tab, then try again.

### Chrome-internal pages do not work

Pages such as `chrome://extensions/`, the Chrome Web Store, browser settings, and some privileged pages cannot be inspected by normal extensions. Use a regular HTTPS website.

### The result times out

A timeout can occur if the page does not produce a usable main-document TLS response within the inspection window. Check the network connection, reload the tab manually, and retry.

### The extension says the page is not HTTPS

The validator is intentionally limited to HTTPS pages. If the URL starts with `http://`, there is no TLS certificate for the page connection to inspect.

### Changes are not showing up

When developing locally, reload the unpacked extension from `chrome://extensions/` after editing extension files. You may also need to close and re-open the popup.
