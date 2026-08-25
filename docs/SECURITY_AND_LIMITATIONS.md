# Security & Limitations

## Security Model

TLS Certificate Validator is a local browser extension. The current implementation does not include a remote backend, telemetry, analytics, or third-party runtime code. Captured TLS metadata is processed in the extension service worker and displayed in the popup.

## Requested Permissions

### `activeTab`

Temporary access is granted only after the user invokes the extension on the active tab. This avoids persistent access to every website.

### `debugger`

Chrome requires this permission for `chrome.debugger`. It is powerful and therefore produces a browser permission warning. The extension uses it only to enable CDP network inspection, reload the active page, capture the main document's TLS metadata, and then detach.

## Important Limitations

### Not an independent trust-chain validator

The extension consumes security information reported by Chrome. It does not independently reconstruct the certificate chain or maintain its own root CA trust store.

### No revocation checking of its own

The extension does not directly query OCSP responders or download CRLs.

### Certificate Transparency is not root trust

CT compliance tells you whether Chrome reports that the request complied with Certificate Transparency policy. It does not, by itself, prove that the certificate chains to a trusted root.

### Self-signed detection is heuristic

The project flags a certificate when issuer and subject names match. That is a useful indicator, but not a cryptographic verification of a self-signature.

### Main document only

The assessment is based on the main `Document` response. Subresources can use other origins and TLS connections that are not included in the summary.

### Page reload is required

The current capture flow enables the Network domain and reloads the page to obtain a fresh main-document response. This can be disruptive on pages with unsaved state.

### Debugger conflicts

Chrome may reject the attachment when DevTools or another debugger client is already attached to the tab.

### Browser-restricted pages

Chrome internal pages, the Chrome Web Store, and other privileged targets may not be inspectable.

## DOM Safety

Certificate fields can contain externally controlled text. The popup renders captured values with DOM nodes and `textContent` instead of injecting them into an HTML template. This prevents certificate strings from being interpreted as popup markup.

## Privacy

The extension does not intentionally transmit inspected URLs, certificate metadata, or results to any external service. Network activity triggered by the inspected page itself is outside the extension's control.

## Appropriate Use

Use this project for education, demonstrations, debugging, portfolio review, and lightweight inspection. Do not use its pass/fail result as the sole basis for high-stakes security decisions.
