import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Privacy Policy - [Company Name]',
  description: 'GDPR-compliant privacy policy explaining data collection, usage, and user rights',
}

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              At [Company Name], we are committed to protecting your privacy and ensuring the security of your personal data. 
              This Privacy Policy explains how we collect, use, store, and protect your information when you use our SaaS platform.
            </p>
            <p className="text-muted-foreground">
              This policy applies to all users of our services and complies with the General Data Protection Regulation (GDPR) 
              and other applicable privacy laws.
            </p>
          </CardContent>
        </Card>

        {/* Data Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Data We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, such as when you create an account, 
                update your profile, or contact us for support. This includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Name and email address</li>
                <li>Job title and company information</li>
                <li>Communication preferences</li>
                <li>Account credentials</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Usage Data</h3>
              <p className="text-muted-foreground">
                We automatically collect information about how you use our services, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Pages visited and time spent on our platform</li>
                <li>Features used and actions performed</li>
                <li>Device information and browser type</li>
                <li>IP address and approximate location</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Cookies and Tracking</h3>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                and maintain security. You can control cookie settings through your browser preferences.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">How We Use Your Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We use your personal data for the following purposes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Providing and maintaining our SaaS platform</li>
              <li>Processing subscription payments and managing your account</li>
              <li>Communicating with you about service updates and support</li>
              <li>Analyzing usage patterns to improve our services</li>
              <li>Ensuring platform security and preventing fraud</li>
              <li>Complying with legal obligations</li>
            </ul>
            <p className="text-muted-foreground">
              Our legal basis for processing your data includes your consent, contractual necessity, 
              legitimate business interests, and legal compliance requirements.
            </p>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Data Sharing and Third Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We may share your data with trusted third-party service providers who assist us in operating our platform:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Payment Processors:</strong> Stripe for subscription billing</li>
              <li><strong>Infrastructure Providers:</strong> Supabase for database hosting</li>
              <li><strong>Analytics Services:</strong> For usage analysis and improvement</li>
              <li><strong>Email Services:</strong> For transactional communications</li>
            </ul>
            <p className="text-muted-foreground">
              We never sell your personal data to third parties. All data sharing is conducted under 
              strict confidentiality agreements and only as necessary for service provision.
            </p>
          </CardContent>
        </Card>

        {/* User Rights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Under GDPR and applicable privacy laws, you have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Automated Decision-Making:</strong> Opt-out of automated profiling</li>
            </ul>
            <p className="text-muted-foreground">
              To exercise these rights, contact us at [Data Protection Officer Email].
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We retain your personal data only as long as necessary for the purposes outlined in this policy:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Payment Data:</strong> Retained for 7 years for tax compliance</li>
              <li><strong>Usage Analytics:</strong> Retained for 24 months for service improvement</li>
              <li><strong>Support Communications:</strong> Retained for 3 years for quality assurance</li>
            </ul>
            <p className="text-muted-foreground">
              When data is no longer needed, it is securely deleted or anonymized.
            </p>
          </CardContent>
        </Card>

        {/* International Transfers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your data may be transferred to and processed in countries outside your residence. 
              We ensure appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Standard Contractual Clauses with third-party processors</li>
              <li>Adequacy decisions from relevant authorities</li>
              <li>Compliance with GDPR transfer mechanisms</li>
            </ul>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>End-to-end encryption for data in transit and at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Incident response procedures for data breaches</li>
            </ul>
            <p className="text-muted-foreground">
              While we take reasonable precautions, no method of transmission over the internet is 100% secure.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or want to exercise your rights, please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Email:</strong> [Data Protection Officer Email]</p>
              <p><strong>Support:</strong> [Support Email]</p>
              <p><strong>Address:</strong> [Company Address]</p>
            </div>
            <p className="text-muted-foreground">
              We will respond to your inquiry within 30 days as required by GDPR.
            </p>
          </CardContent>
        </Card>

        {/* Policy Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time to reflect changes in our practices 
              or applicable law. We will notify you of significant changes via email or prominent 
              platform notifications.
            </p>
            <p className="text-muted-foreground">
              Your continued use of our services after such changes constitutes acceptance of the updated policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
