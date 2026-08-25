const DEBUGGER_PROTOCOL_VERSION = "1.3";
const VALIDATION_TIMEOUT_MS = 12000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "validateTLS" || !Number.isInteger(message.tabId)) {
    return false;
  }

  inspectTlsForTab(message.tabId, sendResponse);
  return true;
});

function inspectTlsForTab(tabId, sendResponse) {
  const debuggee = { tabId };
  let settled = false;

  const timeoutId = setTimeout(() => {
    finish({
      success: false,
      error: "Timed out while waiting for TLS details from the main document."
    });
  }, VALIDATION_TIMEOUT_MS);

  function finish(payload) {
    if (settled) {
      return;
    }

    settled = true;
    clearTimeout(timeoutId);
    chrome.debugger.onEvent.removeListener(onDebuggerEvent);

    chrome.debugger.detach(debuggee, () => {
      // Ignore detach errors; the target may already be detached.
      void chrome.runtime.lastError;
      sendResponse(payload);
    });
  }

  function failFromLastError(prefix) {
    const message = chrome.runtime.lastError?.message || "Unknown Chrome API error.";
    finish({ success: false, error: `${prefix}: ${message}` });
  }

  function onDebuggerEvent(source, method, params) {
    if (source.tabId !== tabId || method !== "Network.responseReceived") {
      return;
    }

    if (params?.type !== "Document" || !params.response?.securityDetails) {
      return;
    }

    try {
      const response = params.response;
      const securityDetails = response.securityDetails;
      const pageUrl = new URL(response.url);

      if (pageUrl.protocol !== "https:") {
        finish({
          success: false,
          error: "The final page response is not using HTTPS."
        });
        return;
      }

      finish({
        success: true,
        page: {
          url: response.url,
          hostname: pageUrl.hostname
        },
        validationResult: buildValidationResult(
          pageUrl.hostname,
          response.securityState,
          securityDetails
        ),
        certificate: buildCertificateDetails(response.securityState, securityDetails)
      });
    } catch (error) {
      finish({
        success: false,
        error: error instanceof Error ? error.message : "Unable to process TLS details."
      });
    }
  }

  chrome.debugger.onEvent.addListener(onDebuggerEvent);

  chrome.debugger.attach(debuggee, DEBUGGER_PROTOCOL_VERSION, () => {
    if (chrome.runtime.lastError) {
      failFromLastError("Could not attach to this tab");
      return;
    }

    chrome.debugger.sendCommand(debuggee, "Network.enable", {}, () => {
      if (chrome.runtime.lastError) {
        failFromLastError("Could not enable network inspection");
        return;
      }

      chrome.debugger.sendCommand(debuggee, "Page.reload", { ignoreCache: false }, () => {
        if (chrome.runtime.lastError) {
          failFromLastError("Could not reload the page");
        }
      });
    });
  });
}

function buildValidationResult(hostname, browserSecurityState, securityDetails) {
  const now = Date.now();
  const validFromMs = securityDetails.validFrom * 1000;
  const validToMs = securityDetails.validTo * 1000;
  const isValidDate = now >= validFromMs && now <= validToMs;

  const sanList = Array.isArray(securityDetails.sanList) ? securityDetails.sanList : [];
  const isHostValid = sanList.some((san) => matchesHostname(hostname, san));

  const issuer = normalizeName(securityDetails.issuer);
  const subject = normalizeName(securityDetails.subjectName);
  const isSelfSigned = Boolean(issuer && subject && issuer === subject);

  const ctCompliance = securityDetails.certificateTransparencyCompliance || "unknown";
  const isCtExplicitlyNonCompliant = ctCompliance === "not-compliant";
  const isBrowserSecure = browserSecurityState === "secure";

  const hardChecksPassed =
    isValidDate && isHostValid && !isSelfSigned && !isCtExplicitlyNonCompliant && isBrowserSecure;

  const hasWarning = ctCompliance === "unknown";
  const level = hardChecksPassed ? (hasWarning ? "warning" : "pass") : "fail";

  const checks = [
    {
      id: "validity",
      label: "Validity period",
      status: isValidDate ? "pass" : "fail",
      message: isValidDate
        ? "The certificate is currently within its validity window."
        : "The certificate is expired or not yet valid."
    },
    {
      id: "hostname",
      label: "Hostname",
      status: isHostValid ? "pass" : "fail",
      message: isHostValid
        ? `A certificate SAN matches ${hostname}.`
        : `No certificate SAN matches ${hostname}.`
    },
    {
      id: "self-signed",
      label: "Self-signed indicator",
      status: isSelfSigned ? "fail" : "pass",
      message: isSelfSigned
        ? "Issuer and subject names match, which is a common self-signed indicator."
        : "Issuer and subject names are different."
    },
    {
      id: "certificate-transparency",
      label: "Certificate Transparency",
      status:
        ctCompliance === "compliant"
          ? "pass"
          : ctCompliance === "not-compliant"
            ? "fail"
            : "warning",
      message:
        ctCompliance === "compliant"
          ? "Chrome reports that the request complied with Certificate Transparency policy."
          : ctCompliance === "not-compliant"
            ? "Chrome reports that the request did not comply with Certificate Transparency policy."
            : "Chrome did not report a definitive Certificate Transparency result."
    },
    {
      id: "browser-security",
      label: "Chrome security state",
      status: isBrowserSecure ? "pass" : "fail",
      message: isBrowserSecure
        ? "Chrome reports the main document response as secure."
        : `Chrome reports the main document response as ${browserSecurityState || "unknown"}.`
    }
  ];

  return {
    valid: hardChecksPassed,
    level,
    summary:
      level === "pass"
        ? "No issues were detected by the extension's TLS checks."
        : level === "warning"
          ? "Core checks passed, but one result is inconclusive."
          : "One or more TLS checks failed. Review the details below.",
    checks
  };
}

function buildCertificateDetails(browserSecurityState, securityDetails) {
  return {
    issuer: securityDetails.issuer || "Unknown",
    subject: securityDetails.subjectName || "Unknown",
    sanList: Array.isArray(securityDetails.sanList) ? securityDetails.sanList : [],
    validFrom: formatEpochSeconds(securityDetails.validFrom),
    validTo: formatEpochSeconds(securityDetails.validTo),
    protocol: securityDetails.protocol || "Unknown",
    keyExchange: securityDetails.keyExchange || "Not reported",
    keyExchangeGroup: securityDetails.keyExchangeGroup || "Not reported",
    cipher: securityDetails.cipher || "Unknown",
    certificateTransparencyCompliance:
      securityDetails.certificateTransparencyCompliance || "unknown",
    browserSecurityState: browserSecurityState || "unknown",
    encryptedClientHello:
      typeof securityDetails.encryptedClientHello === "boolean"
        ? securityDetails.encryptedClientHello
          ? "Yes"
          : "No"
        : "Not reported"
  };
}

function matchesHostname(hostname, san) {
  const normalizedHost = normalizeHostname(hostname);
  const normalizedSan = normalizeHostname(san);

  if (!normalizedHost || !normalizedSan) {
    return false;
  }

  if (normalizedHost === normalizedSan) {
    return true;
  }

  if (!normalizedSan.startsWith("*.")) {
    return false;
  }

  const suffix = normalizedSan.slice(2);
  const hostLabels = normalizedHost.split(".");
  const suffixLabels = suffix.split(".");

  return (
    hostLabels.length === suffixLabels.length + 1 &&
    normalizedHost.endsWith(`.${suffix}`)
  );
}

function normalizeHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function formatEpochSeconds(value) {
  const milliseconds = Number(value) * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toUTCString();
}
