import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy policy · ArthOS", description: "What ArthOS collects, why, and how to delete it." };

const CONTACT = "samp231004@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="9 November 2026">
      <section>
        <p>
          ArthOS is a personal finance app (website and Android app) made by Samarth Patel. This policy explains what information ArthOS handles, why, and the
          choices you have. The short version: <strong>you decide what goes in, it&apos;s used only to run ArthOS for you, it&apos;s never sold, and you can delete it
          any time.</strong>
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name and email address, and a hashed password (or your Google account ID if you sign in with Google).</li>
          <li><strong>What you enter:</strong> income, expenses, budgets, savings settings and investments you add, type in, scan or import.</li>
          <li><strong>Preferences:</strong> currency, timezone and save-first rule.</li>
        </ul>
        <p className="mt-3">ArthOS does not ask for bank or broker logins, does not read your SMS inbox, and has no ads or third-party analytics or tracking.</p>
      </section>

      <section>
        <h2>What stays on your device</h2>
        <ul>
          <li><strong>Screenshots and receipts</strong> you scan are read on your device (Google ML Kit on Android, Tesseract in the browser). The image is never uploaded; only the extracted text is sent to ArthOS to fill in the form, and nothing is saved until you confirm.</li>
          <li><strong>Broker files and CAS statements</strong> you import are opened and matched on your device and are never uploaded. Only the holdings you confirm are saved to your account. A PDF password you type is used only on your device to open the file.</li>
          <li><strong>Widget and notification settings</strong> are stored on your phone.</li>
        </ul>
      </section>

      <section>
        <h2>How it&apos;s used</h2>
        <p>Only to provide ArthOS to you: show your budgets, insights and portfolio, sync between the app and the website, and send the alerts you&apos;ve chosen. We don&apos;t sell, rent or share your data for advertising.</p>
      </section>

      <section>
        <h2>Who processes it</h2>
        <ul>
          <li><strong>MongoDB Atlas</strong> (database) and <strong>Render</strong> (server) store and run your account data.</li>
          <li><strong>Vercel</strong> hosts the website.</li>
          <li><strong>Google</strong> handles sign-in if you choose &ldquo;Continue with Google&rdquo;.</li>
          <li>Market prices come from public sources (NSE/Yahoo Finance, AMFI/mfapi.in). No personal data is sent to them.</li>
        </ul>
        <p className="mt-3">Insights are produced by ArthOS&apos;s own rules. Your data is not sent to any AI provider.</p>
      </section>

      <section>
        <h2>Security</h2>
        <p>All traffic is encrypted over HTTPS. Passwords are hashed with bcrypt and never stored in plain text. Every request is tied to your signed-in account, so no one else can read your records.</p>
      </section>

      <section>
        <h2>Keeping and deleting your data</h2>
        <p>
          Your data is kept while your account exists. You can delete your account and everything in it at any time: in the app (Settings → Delete account), on
          the website (Settings → Delete account), or by following the steps on <Link href="/delete-account" className="text-fg underline">the account deletion page</Link>.
          Deletion is immediate and permanent. Demo accounts delete themselves automatically after 24 hours.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>ArthOS is meant for adults managing their own money and isn&apos;t directed at children under 18.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the new version will be posted here with a new date. Questions or requests: <a href={`mailto:${CONTACT}`} className="text-fg underline">{CONTACT}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
