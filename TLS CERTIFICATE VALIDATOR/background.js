chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "validateTLS" && message.tabId) {
        let debuggee = { tabId: message.tabId };
        chrome.debugger.attach(debuggee, "1.3", () => {
            if (chrome.runtime.lastError) {
                console.error("Debugger attach failed:", chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            chrome.debugger.sendCommand(debuggee, "Network.enable", {}, () => {
                chrome.debugger.onEvent.addListener((source, method, params) => {
                    if (method === "Network.responseReceived" && params.response?.securityDetails) {
                        let securityInfo = params.response.securityDetails;

                        // Validation logic
                        let currentTimestamp = Date.now();
                        let validFrom = securityInfo.validFrom * 1000; // Convert to milliseconds
                        let validTo = securityInfo.validTo * 1000; // Convert to milliseconds
                        let isValidDate = currentTimestamp >= validFrom && currentTimestamp <= validTo;

                        let isHostValid = securityInfo.sanList.includes(params.response.url.split("/")[2]);

                        let isSelfSigned = securityInfo.issuer === securityInfo.subjectName;

                        let isTrustedRoot =
                            securityInfo.certificateTransparencyCompliance === "compliant";

                        // Validation results
                        let validationResult = {
                            valid: isValidDate && isHostValid && !isSelfSigned && isTrustedRoot,
                            details: {
                                validDate: isValidDate ? "Certificate date is valid." : "Certificate date is invalid.",
                                host: isHostValid ? "Certificate matches the host." : "Certificate does not match the host.",
                                selfSigned: isSelfSigned ? "Certificate is self-signed." : "Certificate is not self-signed.",
                                trustedRoot: isTrustedRoot ? "Root is trusted." : "Root is not trusted."
                            },
                            reason: isValidDate && isHostValid && !isSelfSigned && isTrustedRoot
                                ? "The TLS certificate is valid."
                                : "The TLS certificate is invalid. Check details for more information."
                        };

                        // Certificate details
                        let certificateDetails = {
                            issuer: securityInfo.issuer || "Unknown",
                            subject: securityInfo.subjectName || "Unknown",
                            sanList: securityInfo.sanList || [],
                            validFrom: new Date(securityInfo.validFrom * 1000).toUTCString(),
                            validTo: new Date(securityInfo.validTo * 1000).toUTCString(),
                            protocol: securityInfo.protocol || "Unknown",
                            keyExchange: securityInfo.keyExchange || "Unknown",
                            cipher: securityInfo.cipher || "Unknown",
                            certificateTransparencyCompliance: securityInfo.certificateTransparencyCompliance || "Unknown"
                        };

                        sendResponse({
                            success: true,
                            validationResult: validationResult,
                            certificate: certificateDetails
                        });
                        chrome.debugger.detach(debuggee);
                    }
                });

                chrome.debugger.sendCommand(debuggee, "Page.reload");
            });
        });

        return true; // Ensures async response handling
    }
});
