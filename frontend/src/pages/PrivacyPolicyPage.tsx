import { useCookieConsent } from '../contexts/CookieConsentContext';
import styles from './PrivacyPolicyPage.module.css';

const sections = [
  { id: 'data-we-collect', label: '1. Data We Collect' },
  { id: 'how-we-use-data', label: '2. How We Use Your Data' },
  { id: 'protection-of-minors', label: '3. Protection of Minors\' Data' },
  { id: 'data-sharing', label: '4. Data Sharing & Third Parties' },
  { id: 'international-transfers', label: '5. International Data Transfers' },
  { id: 'data-retention', label: '6. Data Retention' },
  { id: 'your-rights', label: '7. Your Rights' },
  { id: 'cookies', label: '8. Cookies & Tracking' },
  { id: 'data-security', label: '9. Data Security' },
  { id: 'breach-notification', label: '10. Data Breach Notification' },
  { id: 'contact', label: '11. Contact Information' },
  { id: 'changes', label: '12. Changes to This Policy' },
];

export default function PrivacyPolicyPage() {
  const { openPreferencesModal } = useCookieConsent();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: April 6, 2026</p>
          <button className={styles.printBtn} onClick={() => window.print()}>
            Print this page
          </button>
        </header>

        <nav className={styles.toc} aria-label="Table of contents">
          <h2 className={styles.tocTitle}>Contents</h2>
          <ol className={styles.tocList}>
            {sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={styles.tocLink}>{s.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.content}>
          {/* Section 1 */}
          <section id="data-we-collect">
            <h2 className={styles.sectionTitle}>1. Data We Collect</h2>

            <h3 className={styles.subTitle}>Visitor Data</h3>
            <p>When you visit our website, we may collect information about pages visited, session duration, browser type, device information, and IP address. This data is collected through cookies and similar technologies, subject to your consent preferences.</p>

            <h3 className={styles.subTitle}>Donor Data</h3>
            <p>When you make a donation, we collect your name, email address, donation amount, and payment method type. We do <strong>not</strong> store credit card numbers or full payment details -- these are processed directly by our payment processor.</p>

            <h3 className={styles.subTitle}>Staff / Employee Data</h3>
            <p>For staff and authorized users, we collect names, email addresses, roles, and login credentials (passwords are stored using industry-standard one-way hashing and are never stored in plain text).</p>

            <h3 className={styles.subTitle}>Resident Data</h3>
            <p>Case records, personal histories, counseling notes, and related information about residents in our care are classified as <strong>highly sensitive personal information</strong>. Collection and processing of this data is governed by strict legal mandates and internal policies described in Section 3 below.</p>
          </section>

          {/* Section 2 */}
          <section id="how-we-use-data">
            <h2 className={styles.sectionTitle}>2. How We Use Your Data</h2>
            <p>We process personal data only with a lawful basis, as follows:</p>
            <ul className={styles.list}>
              <li><strong>Donor data:</strong> Contract performance (processing your donation) and consent (communications and newsletters).</li>
              <li><strong>Staff data:</strong> Contract performance (employment relationship) and legal obligation (federal and Guam reporting requirements).</li>
              <li><strong>Resident data:</strong> Legal obligation (child welfare regulations under Guam and federal law) and legitimate interest (child welfare and protection).</li>
              <li><strong>Visitor data:</strong> Consent (analytics cookies) and legitimate interest (essential site functionality and security).</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="protection-of-minors">
            <h2 className={styles.sectionTitle}>3. Protection of Minors' Data</h2>
            <p>Beacon of Hope is dedicated to the protection of children and their personal information. This section describes the special safeguards we apply to data related to the minors in our care.</p>
            <ul className={styles.list}>
              <li>Resident data -- including names, case histories, counseling notes, and health records -- is classified as <strong>highly sensitive personal information</strong> under GDPR Article 9 and applicable U.S. federal and Guam territorial privacy laws.</li>
              <li>Access is restricted to authorized staff members who have a direct case relationship with the resident.</li>
              <li>Resident data is <strong>never</strong> shared with third parties except as required by law (e.g., mandatory reporting obligations under Guam and federal child welfare statutes).</li>
              <li>Resident data is <strong>never</strong> used in marketing materials, public reports, or impact dashboards in any identifiable form. All public-facing statistics are aggregated and anonymized.</li>
              <li>Legal basis for processing without parental consent: regulatory mandate for accredited child welfare organizations acting <em>in loco parentis</em> under applicable law.</li>
              <li>Data is anonymized or securely deleted when a resident turns 18 or exits the program, subject to applicable retention requirements.</li>
              <li>If you believe that a minor's data has been inadvertently disclosed, please contact us immediately at <a href="mailto:privacy@beaconofhope.org">privacy@beaconofhope.org</a>. We commit to investigating and remediating within 48 hours.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="data-sharing">
            <h2 className={styles.sectionTitle}>4. Data Sharing & Third Parties</h2>
            <p>We work with the following service providers to operate our platform:</p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Purpose</th>
                    <th>Data Shared</th>
                    <th>Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Microsoft Azure</td>
                    <td>Backend hosting & database</td>
                    <td>All stored application data, server-side logs</td>
                    <td><a href="https://privacy.microsoft.com/en-us/privacystatement" target="_blank" rel="noopener noreferrer">Link</a></td>
                  </tr>
                  <tr>
                    <td>Vercel</td>
                    <td>Frontend hosting</td>
                    <td>Static assets, access logs</td>
                    <td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Link</a></td>
                  </tr>
                  <tr>
                    <td>Stripe</td>
                    <td>Payment processing</td>
                    <td>Donor email, donation amount, payment details</td>
                    <td><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Link</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p><strong>Your data is never sold.</strong> Resident data is never shared with any third party except as required by law. Data Processing Agreements (DPAs) are in place with all processors; copies are available on request at <a href="mailto:privacy@beaconofhope.org">privacy@beaconofhope.org</a>.</p>
          </section>

          {/* Section 5 */}
          <section id="international-transfers">
            <h2 className={styles.sectionTitle}>5. International Data Transfers</h2>
            <ul className={styles.list}>
              <li>Primary data storage: Microsoft Azure (PostgreSQL).</li>
              <li>Backend hosted on Microsoft Azure (West US 2 region).</li>
              <li>Frontend hosted on Vercel (global CDN).</li>
              <li>Legal mechanism for cross-border transfers: Standard Contractual Clauses (SCCs) where applicable.</li>
              <li>Beacon of Hope honors the more protective standard -- either GDPR or applicable U.S. privacy law -- for all users regardless of location.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="data-retention">
            <h2 className={styles.sectionTitle}>6. Data Retention</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data Type</th>
                    <th>Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Donor financial records</td>
                    <td>7 years (tax compliance)</td>
                  </tr>
                  <tr>
                    <td>Resident case records</td>
                    <td>Duration of stay + 5 years (child welfare compliance)</td>
                  </tr>
                  <tr>
                    <td>Staff account data</td>
                    <td>Duration of employment + 1 year</td>
                  </tr>
                  <tr>
                    <td>Website usage data</td>
                    <td>2 years</td>
                  </tr>
                  <tr>
                    <td>Cookie consent records</td>
                    <td>3 years</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>After the applicable retention period, data is either anonymized or securely deleted. Legal holds may extend retention when required by law.</p>
          </section>

          {/* Section 7 */}
          <section id="your-rights">
            <h2 className={styles.sectionTitle}>7. Your Rights</h2>

            <h3 className={styles.subTitle}>GDPR Rights (EU Data Subjects)</h3>
            <p>Under the General Data Protection Regulation, you have the right to:</p>
            <ul className={styles.list}>
              <li><strong>Access</strong> -- request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification</strong> -- request correction of inaccurate data.</li>
              <li><strong>Erasure</strong> -- request deletion of your data ("right to be forgotten").</li>
              <li><strong>Restriction</strong> -- request that we limit processing of your data.</li>
              <li><strong>Data Portability</strong> -- receive your data in a structured, machine-readable format.</li>
              <li><strong>Object</strong> -- object to processing based on legitimate interest.</li>
            </ul>

            <h3 className={styles.subTitle}>U.S. Privacy Rights</h3>
            <p>Under applicable U.S. federal and territorial law, you have the right to:</p>
            <ul className={styles.list}>
              <li><strong>Be informed</strong> -- know how your data is being collected and processed.</li>
              <li><strong>Access</strong> -- obtain a copy of your personal data.</li>
              <li><strong>Correction</strong> -- have inaccurate data corrected.</li>
              <li><strong>Deletion</strong> -- request deletion of your data, subject to legal retention requirements.</li>
              <li><strong>Opt-out</strong> -- opt out of the sale or sharing of your personal data (we do not sell your data).</li>
            </ul>

            <p>To exercise any of these rights, email <a href="mailto:privacy@beaconofhope.org">privacy@beaconofhope.org</a>. We will respond within 30 days.</p>
            <p><strong>Note on erasure:</strong> We will delete your personal information upon request but retain anonymized financial records as required for tax compliance.</p>
          </section>

          {/* Section 8 */}
          <section id="cookies">
            <h2 className={styles.sectionTitle}>8. Cookies & Tracking</h2>
            <p>We use the following categories of cookies:</p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Cookies</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Necessary</td>
                    <td>boh_cookie_consent, BeaconAuth</td>
                    <td>Consent record, authentication</td>
                    <td>365 days / Session</td>
                  </tr>
                  <tr>
                    <td>Analytics</td>
                    <td>_ga, _gid (if enabled)</td>
                    <td>Anonymized usage statistics</td>
                    <td>2 years / 24 hours</td>
                  </tr>
                  <tr>
                    <td>Functional</td>
                    <td>boh_theme</td>
                    <td>UI preferences (theme, display)</td>
                    <td>365 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>Non-essential cookies are blocked until you provide consent. You can manage your preferences at any time by clicking the button below or the "Cookie Settings" link in our footer.</p>
            <button
              className={styles.managePrefsBtn}
              onClick={openPreferencesModal}
            >
              Manage Cookie Preferences
            </button>
          </section>

          {/* Section 9 */}
          <section id="data-security">
            <h2 className={styles.sectionTitle}>9. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data, including:</p>
            <ul className={styles.list}>
              <li>Encryption of data in transit using TLS (Transport Layer Security).</li>
              <li>Role-based access controls limiting data access to authorized personnel.</li>
              <li>Regular security reviews and access audits.</li>
              <li>Secure password storage using industry-standard hashing algorithms.</li>
              <li>Content Security Policy (CSP) headers to protect against cross-site scripting.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section id="breach-notification">
            <h2 className={styles.sectionTitle}>10. Data Breach Notification</h2>
            <p>In the event of a personal data breach, Beacon of Hope commits to:</p>
            <ul className={styles.list}>
              <li>Notifying the relevant supervisory authority within 72 hours of discovery, as required by GDPR and applicable U.S. law.</li>
              <li>Promptly notifying affected data subjects when the breach is likely to result in a risk to their rights and freedoms.</li>
              <li>Following a structured response process: detect, contain, assess, notify, and remediate.</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section id="contact">
            <h2 className={styles.sectionTitle}>11. Contact Information</h2>
            <ul className={styles.contactList}>
              <li><strong>Data Protection Officer:</strong> <a href="mailto:dpo@beaconofhope.org">dpo@beaconofhope.org</a></li>
              <li><strong>General Privacy Inquiries:</strong> <a href="mailto:privacy@beaconofhope.org">privacy@beaconofhope.org</a></li>
              <li><strong>Federal Trade Commission (FTC):</strong> <a href="https://www.ftc.gov/" target="_blank" rel="noopener noreferrer">www.ftc.gov</a></li>
            </ul>
          </section>

          {/* Section 12 */}
          <section id="changes">
            <h2 className={styles.sectionTitle}>12. Changes to This Policy</h2>
            <p>The "Last updated" date at the top of this policy reflects the current version. Material changes will be announced via a banner on our website. If we make significant changes to how we handle your data, we will re-request your cookie consent.</p>
            <p><strong>Version 1.0</strong> -- Initial privacy policy (April 2026).</p>
          </section>
        </div>
      </div>
    </div>
  );
}
