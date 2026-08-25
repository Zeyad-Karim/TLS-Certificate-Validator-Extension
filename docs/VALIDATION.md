# Validation Logic

## Purpose

The extension performs a small educational assessment over TLS metadata that Chrome has already collected for the main document response. It is designed to make those signals easier to inspect, not to reproduce a complete browser PKI implementation.

## Inputs

The background service worker reads the main document's `Network.Response.securityDetails` object from the Chrome DevTools Protocol. Relevant fields include:

- `subjectName`
- `sanList`
- `issuer`
- `validFrom`
- `validTo`
- `protocol`
- `keyExchange`
- `keyExchangeGroup`
- `cipher`
- `certificateTransparencyCompliance`
- `encryptedClientHello` when available

The surrounding `Network.Response` also provides Chrome's `securityState`.

## Checks

### 1. Validity Period

The extension converts `validFrom` and `validTo` from epoch seconds to milliseconds and verifies that the current time falls inside the interval.

A failure means the certificate appears expired or not yet valid.

### 2. Hostname vs. Subject Alternative Names

The final HTTPS response hostname is compared with every SAN reported by Chrome.

The matcher supports:

- exact names such as `example.com`; and
- single-label DNS wildcards such as `*.example.com` matching `www.example.com`.

The wildcard intentionally does **not** match multiple labels such as `a.b.example.com` and does not match the bare apex `example.com`.

### 3. Self-Signed Indicator

If the normalized issuer and subject names are identical, the extension flags the certificate as *appearing self-signed*.

This is a heuristic. Matching issuer and subject strings are a useful signal, but they are not a complete cryptographic proof of self-signing.

### 4. Certificate Transparency

The extension reads `certificateTransparencyCompliance` exactly as Chrome reports it:

- `compliant` → pass;
- `not-compliant` → fail; and
- `unknown` → warning.

Certificate Transparency compliance is **not** the same thing as validating that a certificate chains to a trusted root. Earlier versions of this project conflated those concepts; the current implementation keeps them separate.

### 5. Chrome Security State

The main document response's `securityState` must be `secure` for the overall assessment to pass.

This uses Chrome's own view of the captured response rather than claiming that the extension independently built and verified the trust chain.

## Overall Result

The overall assessment passes when:

```text
valid date
AND matching SAN
AND not obviously self-signed
AND CT is not explicitly non-compliant
AND Chrome security state is secure
```

If CT is `unknown` but the core checks pass, the UI reports a warning rather than a clean pass.

## Why This Is Not Full Certificate Validation

A production-grade independent validator may additionally need to build and verify the certificate chain, apply name-constraint and policy processing, validate signatures, consult trust stores, check revocation using OCSP/CRLs, handle platform-specific trust anchors, process certificate extensions, and account for browser policy decisions.

Chrome already performs much of that work for normal page navigation. This extension surfaces a small, understandable subset of the resulting information for learning and inspection.
