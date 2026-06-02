import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ChevronRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-bold text-[#0b1739]">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
  </div>
);

const PrivacyPolicyPage = () => (
  <>
    <Helmet>
      <title>Privacy Policy — e-KoopMart</title>
      <meta name="description" content="Learn how Barbaza MPC collects, uses, and protects your personal information on e-KoopMart." />
    </Helmet>

    {/* Page header */}
    <div className="border-b border-[#dfe7f4] bg-white">
      <div className="section py-8">
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Link to="/" className="hover:text-[#2954C8]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-slate-600">Privacy Policy</span>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3fb] text-[#2954C8]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0b1739] sm:text-3xl">Privacy Policy</h1>
            <p className="mt-0.5 text-sm text-slate-500">Last updated: June 2025</p>
          </div>
        </div>
      </div>
    </div>

    <div className="section py-12">
      <div className="mx-auto max-w-3xl space-y-10">

        {/* Intro */}
        <p className="text-sm leading-relaxed text-slate-600">
          Barbaza Multi-Purpose Cooperative (<strong>"Barbaza MPC"</strong>, <strong>"we"</strong>,{' '}
          <strong>"our"</strong>, or <strong>"us"</strong>) operates the e-KoopMart online marketplace
          at this website. We are committed to protecting the privacy and personal information of our
          members, customers, and visitors. This Privacy Policy explains what information we collect,
          how we use it, and your rights regarding that information.
        </p>

        <Section title="1. Information We Collect">
          <p>We collect information you provide directly to us, including:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Account information</strong> — name, email address, password, and contact number when you register or log in.</li>
            <li><strong>Order & transaction data</strong> — delivery address, items purchased, payment method, and order history.</li>
            <li><strong>Merchant information</strong> — store name, business details, product listings, and bank/payment details for member-sellers.</li>
            <li><strong>Communications</strong> — messages sent through store inquiry forms or our contact page.</li>
          </ul>
          <p className="mt-2">We also collect certain information automatically when you use our site:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Browser type, device, and operating system</li>
            <li>IP address and general location</li>
            <li>Pages visited, time spent, and links clicked</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Process and fulfill your orders and transactions</li>
            <li>Create and manage your account</li>
            <li>Connect buyers with member-merchant stores</li>
            <li>Send order confirmations, updates, and support messages</li>
            <li>Improve the marketplace and develop new features</li>
            <li>Detect and prevent fraud or unauthorized access</li>
            <li>Comply with legal obligations under Philippine law, including the Data Privacy Act of 2012 (Republic Act 10173)</li>
          </ul>
        </Section>

        <Section title="3. Legal Basis for Processing">
          <p>
            We process your personal data on the following legal grounds under the Data Privacy Act of 2012:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Contractual necessity</strong> — to fulfill orders you place with us</li>
            <li><strong>Consent</strong> — where you have explicitly agreed, such as when creating an account</li>
            <li><strong>Legitimate interest</strong> — to operate, secure, and improve our platform</li>
            <li><strong>Legal compliance</strong> — where we are required by law to process your data</li>
          </ul>
        </Section>

        <Section title="4. Sharing of Information">
          <p>
            We do not sell your personal information. We may share your data only in the following circumstances:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Member-merchants</strong> — your name, delivery address, and order details are shared with the merchant fulfilling your order.</li>
            <li><strong>Service providers</strong> — trusted third parties who help us operate the platform (e.g., hosting, payment processing), bound by confidentiality agreements.</li>
            <li><strong>Legal requirements</strong> — when required by law, court order, or government authority.</li>
            <li><strong>Cooperative governance</strong> — limited aggregated data may be reported internally for cooperative management purposes, without identifying individual users.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your personal information for as long as your account is active or as needed to provide services. Transaction records are retained for a minimum of five (5) years as required by Philippine accounting and cooperative regulations. You may request deletion of non-legally-required data at any time.
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            We use cookies and similar technologies to keep you logged in, remember your cart, and understand how visitors use the site. You can control cookies through your browser settings, though disabling them may affect site functionality.
          </p>
        </Section>

        <Section title="7. Data Security">
          <p>
            We implement reasonable technical and organizational safeguards — including encrypted connections (HTTPS), access controls, and regular security reviews — to protect your personal data against unauthorized access, disclosure, or loss. However, no system is completely secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>Under the Data Privacy Act of 2012, you have the right to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Correction</strong> — request correction of inaccurate or incomplete data</li>
            <li><strong>Erasure</strong> — request deletion of your personal data where no legal basis remains</li>
            <li><strong>Object</strong> — object to processing based on legitimate interest</li>
            <li><strong>Data portability</strong> — receive your data in a structured, commonly used format</li>
            <li><strong>Lodge a complaint</strong> — file a complaint with the National Privacy Commission (NPC) at <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-[#2954C8] underline hover:text-[#1f44a5]">www.privacy.gov.ph</a></li>
          </ul>
          <p className="mt-2">To exercise any of these rights, contact us using the details below.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            e-KoopMart is not directed to children under 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with their data, please contact us immediately.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will post the revised policy on this page with an updated effective date. Continued use of the platform after any changes constitutes your acceptance of the updated policy.
          </p>
        </Section>

        {/* Contact block */}
        <div className="rounded-2xl border border-[#dfe7f4] bg-[#f8fafd] p-6">
          <h2 className="mb-4 text-lg font-bold text-[#0b1739]">11. Contact Us</h2>
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            For questions, requests, or concerns about this Privacy Policy or how we handle your personal data, please contact our Data Privacy Officer:
          </p>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-[#2954C8]" />
              Barbaza Multi-Purpose Cooperative, Cubay, Barbaza, Antique, Philippines
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-[#2954C8]" />
              <a href="mailto:marketing@barbazampc.coop" className="text-[#2954C8] hover:underline">marketing@barbazampc.coop</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-[#2954C8]" />
              0919 065 4532
            </li>
          </ul>
        </div>

      </div>
    </div>
  </>
);

export default PrivacyPolicyPage;
