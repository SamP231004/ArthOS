import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Delete your account · ArthOS", description: "How to delete your ArthOS account and all its data." };

const CONTACT = "samp231004@gmail.com";

export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your ArthOS account" updated="9 November 2026">
      <section>
        <p>
          You can delete your ArthOS account at any time. Deleting it <strong>immediately and permanently erases</strong> your account and everything in it, on both the
          Android app and the website.
        </p>
      </section>

      <section>
        <h2>In the Android app</h2>
        <ul>
          <li>Open ArthOS and tap the <strong>⚙ Settings</strong> icon (top right).</li>
          <li>Scroll to the bottom and tap <strong>Delete account</strong>.</li>
          <li>Confirm with <strong>Delete forever</strong>.</li>
        </ul>
      </section>

      <section>
        <h2>On the website</h2>
        <ul>
          <li><Link href="/login" className="text-fg underline">Sign in</Link> and open <strong>Settings</strong>.</li>
          <li>Under <strong>Account</strong>, choose <strong>Delete account</strong> and confirm.</li>
        </ul>
      </section>

      <section>
        <h2>Can&apos;t sign in?</h2>
        <p>
          Email <a href={`mailto:${CONTACT}?subject=Delete%20my%20ArthOS%20account`} className="text-fg underline">{CONTACT}</a> from the address you signed up with,
          asking to delete your account. It will be deleted within 7 days and you&apos;ll get a confirmation.
        </p>
      </section>

      <section>
        <h2>What gets deleted</h2>
        <ul>
          <li>Your profile: name, email, password hash or Google ID, and settings.</li>
          <li>All income, expenses, budgets and savings history.</li>
          <li>All investments and their transactions, including imported ones.</li>
          <li>Categories ArthOS learned from you.</li>
        </ul>
        <p className="mt-3">
          Nothing is kept after deletion, apart from routine server logs that hold no financial data and are rotated automatically. Widget data and notification
          settings live only on your phone and are removed when you uninstall the app.
        </p>
      </section>
    </LegalPage>
  );
}
