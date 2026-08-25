document.addEventListener("DOMContentLoaded", () => {
  const validateButton = document.getElementById("validateBtn");
  const buttonText = document.getElementById("buttonText");
  const statusPanel = document.getElementById("statusPanel");
  const statusTitle = document.getElementById("statusTitle");
  const statusText = document.getElementById("statusText");
  const resultContainer = document.getElementById("result");

  validateButton.addEventListener("click", () => {
    setLoading(true);
    setStatus(
      "loading",
      "Inspecting TLS details",
      "Reloading the page and waiting for the main HTTPS response…"
    );
    clearResults();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab?.id) {
        showError("No active tab was found.");
        return;
      }

      if (!activeTab.url?.startsWith("https://")) {
        showError("Open a regular HTTPS webpage before running the inspection.");
        return;
      }

      chrome.runtime.sendMessage(
        { action: "validateTLS", tabId: activeTab.id },
        (response) => {
          if (chrome.runtime.lastError) {
            showError(chrome.runtime.lastError.message);
            return;
          }

          if (!response?.success) {
            showError(response?.error || "No TLS result was returned.");
            return;
          }

          renderResult(response);
          setLoading(false);
        }
      );
    });
  });

  function setLoading(isLoading) {
    validateButton.disabled = isLoading;
    buttonText.textContent = isLoading ? "Inspecting…" : "Inspect certificate";
  }

  function setStatus(level, title, text) {
    statusPanel.className = `status-panel status-panel--${level}`;
    statusTitle.textContent = title;
    statusText.textContent = text;
  }

  function clearResults() {
    resultContainer.replaceChildren();
    resultContainer.hidden = true;
  }

  function showError(message) {
    setLoading(false);
    setStatus("fail", "Inspection failed", "Chrome could not return TLS details for this tab.");

    const card = element("div", "error-card");
    card.append(
      element("strong", null, "Unable to inspect this page"),
      element("p", null, friendlyError(message))
    );

    resultContainer.replaceChildren(card);
    resultContainer.hidden = false;
  }

  function renderResult(response) {
    const validation = response.validationResult;
    const certificate = response.certificate;

    setStatus(
      validation.level,
      validation.level === "pass"
        ? "No issues detected"
        : validation.level === "warning"
          ? "Inspection completed with a warning"
          : "Issues detected",
      validation.summary
    );

    const summary = element("section", `result-summary result-summary--${validation.level}`);
    const topLine = element("div", "result-summary__topline");
    topLine.append(
      element("h2", null, "TLS assessment"),
      element("span", `badge badge--${validation.level}`, levelLabel(validation.level))
    );
    summary.append(
      topLine,
      element("p", null, validation.summary),
      element("p", "result-host", response.page?.hostname || "Unknown host")
    );

    const checksCard = element("section", "result-card");
    checksCard.append(element("h3", null, "Checks"));
    const checkList = element("div", "check-list");

    for (const check of validation.checks || []) {
      const item = element("div", `check-item check-item--${check.status}`);
      item.append(
        element("span", "check-icon", checkIcon(check.status)),
        (() => {
          const content = element("div");
          content.append(
            element("strong", null, check.label),
            element("p", null, check.message)
          );
          return content;
        })()
      );
      checkList.append(item);
    }

    checksCard.append(checkList);

    const detailsCard = element("section", "result-card");
    detailsCard.append(element("h3", null, "Certificate & connection"));
    const details = element("dl", "detail-list");

    const detailRows = [
      ["Issuer", certificate.issuer],
      ["Subject", certificate.subject],
      ["Valid from", certificate.validFrom],
      ["Valid to", certificate.validTo],
      ["Protocol", certificate.protocol],
      ["Cipher", certificate.cipher],
      ["Key exchange", certificate.keyExchange],
      ["Key exchange group", certificate.keyExchangeGroup],
      ["Chrome security", certificate.browserSecurityState],
      ["CT policy", certificate.certificateTransparencyCompliance],
      ["Encrypted ClientHello", certificate.encryptedClientHello]
    ];

    for (const [label, value] of detailRows) {
      const row = element("div", "detail-row");
      row.append(element("dt", null, label), element("dd", null, value || "Unknown"));
      details.append(row);
    }

    const sanRow = element("div", "detail-row");
    sanRow.append(element("dt", null, "SANs"));
    const sanValue = element("dd");
    const sanList = element("ul", "san-list");
    const sans = Array.isArray(certificate.sanList) ? certificate.sanList : [];

    if (sans.length) {
      for (const san of sans) {
        sanList.append(element("li", null, san));
      }
    } else {
      sanList.append(element("li", null, "None reported"));
    }

    sanValue.append(sanList);
    sanRow.append(sanValue);
    details.append(sanRow);

    detailsCard.append(details);
    resultContainer.replaceChildren(summary, checksCard, detailsCard);
    resultContainer.hidden = false;
  }

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function checkIcon(status) {
    if (status === "pass") return "✓";
    if (status === "warning") return "!";
    return "×";
  }

  function levelLabel(level) {
    if (level === "pass") return "Pass";
    if (level === "warning") return "Warning";
    return "Review";
  }

  function friendlyError(message) {
    const text = String(message || "Unknown error.");

    if (text.toLowerCase().includes("another debugger")) {
      return "Another debugger is already attached to this tab. Close DevTools or the other debugger and try again.";
    }

    if (text.toLowerCase().includes("cannot access") || text.toLowerCase().includes("chrome://")) {
      return "Chrome does not allow the extension to inspect this page. Try a normal HTTPS website instead.";
    }

    return text;
  }
});
