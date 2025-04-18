document.addEventListener("DOMContentLoaded", () => {
    let validateBtn = document.getElementById("validateBtn");

    validateBtn.addEventListener("click", () => {
        document.getElementById("status").textContent = "Validating...";

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs.length) {
                document.getElementById("result").innerHTML = `<p class="error">Error: No active tab found!</p>`;
                document.getElementById("status").textContent = "Validation failed.";
                return;
            }

            let activeTabId = tabs[0].id;

            chrome.runtime.sendMessage({ action: "validateTLS", tabId: activeTabId }, (response) => {
                let resultDiv = document.getElementById("result");

                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    resultDiv.innerHTML = `<p class="error">Error: ${chrome.runtime.lastError.message}</p>`;
                    document.getElementById("status").textContent = "Validation failed.";
                    return;
                }

                if (!response) {
                    resultDiv.innerHTML = `<p class="error">Error: No response received from background script.</p>`;
                    document.getElementById("status").textContent = "Validation failed.";
                    return;
                }

                if (!response.success) {
                    resultDiv.innerHTML = `<p class="error">Error: ${response.error || "Unexpected error!"}</p>`;
                    document.getElementById("status").textContent = "Validation failed.";
                    return;
                }

                let validation = response.validationResult;
                let certificate = response.certificate;
                let details = validation.details;

                resultDiv.innerHTML = `
                    <p><strong>Validation Result:</strong> ${
                        validation.valid
                            ? '<span class="success">Valid</span>'
                            : '<span class="error">Invalid</span>'
                    }</p>
                    <p><strong>Reason:</strong> ${validation.reason}</p>
                    <ul>
                        <li>${details.validDate}</li>
                        <li>${details.host}</li>
                        <li>${details.selfSigned}</li>
                        <li>${details.trustedRoot}</li>
                    </ul>
                    <h3>Certificate Details:</h3>
                    <p><strong>Issuer:</strong> ${certificate.issuer}</p>
                    <p><strong>Subject:</strong> ${certificate.subject}</p>
                    <p><strong>Valid From:</strong> ${certificate.validFrom}</p>
                    <p><strong>Valid To:</strong> ${certificate.validTo}</p>
                    <p><strong>Protocol:</strong> ${certificate.protocol}</p>
                    <p><strong>Key Exchange:</strong> ${certificate.keyExchange}</p>
                    <p><strong>Cipher:</strong> ${certificate.cipher}</p>
                    <p><strong>Transparency:</strong> ${certificate.certificateTransparencyCompliance}</p>
                    <p><strong>SAN List:</strong> ${certificate.sanList.join(", ") || "None"}</p>
                `;
                document.getElementById("status").textContent = "Validation complete.";
            });
        });
    });
});
