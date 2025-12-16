import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Terms of Service - [Company Name]',
  description: 'User agreement governing SaaS platform usage and subscription terms',
}

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to [Company Name]. These Terms of Service ("Terms") govern your access to and use of 
              our SaaS platform, services, and website (collectively, the "Service").
            </p>
            <p className="text-muted-foreground">
              By creating an account, accessing, or using our Service, you agree to be bound by these Terms. 
              If you disagree with any part of these terms, then you may not access the Service.
            </p>
            <p className="text-muted-foreground">
              These Terms constitute a legally binding agreement between you and [Company Name], 
              a [Company Jurisdiction] company.
            </p>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Service Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              [Company Name] provides a subscription-based SaaS platform that enables users to [brief service description]. 
              Our Service is offered on a subscription basis with different feature tiers and pricing plans.
            </p>
            <p className="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time 
              with or without notice. We will not be liable to you or to any third-party for any modification, 
              suspension, or discontinuation of the Service.
            </p>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Account Creation</h3>
              <p className="text-muted-foreground">
                To use our Service, you must create an account and provide accurate, complete, and current information. 
                You are responsible for safeguarding the password that you use to access the Service and for any 
                activities or actions under your password.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Account Responsibilities</h3>
              <p className="text-muted-foreground">
                You agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Provide truthful and accurate information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Account Termination</h3>
              <p className="text-muted-foreground">
                You may terminate your account at any time by following the account deletion process 
                in your account settings or by contacting our support team. We may suspend or terminate 
                your account for violation of these Terms or for any other reason at our sole discretion.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription and Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Subscription Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Subscription Plans</h3>
              <p className="text-muted-foreground">
                We offer various subscription plans with different features and pricing. 
                Plan details and pricing are available on our website and may change over time. 
                Existing subscribers will be notified of significant price changes at least 30 days in advance.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Billing and Payment</h3>
              <p className="text-muted-foreground">
                Subscription fees are billed in advance on a monthly or annual basis. 
                Payment is processed through our third-party payment processor, Stripe. 
                You agree to provide accurate payment information and authorize us to charge 
                your chosen payment method for subscription fees.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Refunds</h3>
              <p className="text-muted-foreground">
                We offer a [X]-day free trial for new users. Refunds for paid subscriptions 
                are handled on a case-by-case basis and are not guaranteed. Please review our 
                refund policy or contact support for assistance.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Cancellation</h3>
              <p className="text-muted-foreground">
                You may cancel your subscription at any time. Cancellation takes effect at the end 
                of your current billing period, and you will retain access until that time. 
                No refunds are provided for partial months or unused portions of your subscription.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Acceptable Use */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You agree not to use the Service for any purpose that is unlawful or prohibited by these Terms. 
              Prohibited activities include:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Violating any applicable laws or regulations</li>
              <li>Infringing on intellectual property rights</li>
              <li>Transmitting harmful, offensive, or inappropriate content</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Interfering with or disrupting the Service or servers</li>
              <li>Using the Service for spam, phishing, or malware distribution</li>
              <li>Reverse engineering, decompiling, or disassembling the Service</li>
              <li>Using automated tools to access the Service without permission</li>
            </ul>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Our Intellectual Property</h3>
              <p className="text-muted-foreground">
                The Service and its original content, features, and functionality are and will remain 
                the exclusive property of [Company Name] and its licensors. The Service is protected 
                by copyright, trademark, and other laws.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Your Content</h3>
              <p className="text-muted-foreground">
                You retain ownership of any content you upload, submit, or store in the Service. 
                You grant us a limited, non-exclusive, royalty-free license to use, reproduce, and 
                process your content solely to provide and improve the Service.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Trademarks</h3>
              <p className="text-muted-foreground">
                [Company Name] and related graphics, logos, and service names are trademarks of 
                [Company Name] and may not be used without our prior written consent.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy and Data Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your privacy is important to us. Our use of your personal data is governed by our 
              Privacy Policy, which explains how we collect, use, store, and protect your information. 
              By using our Service, you consent to the collection and use of information as described 
              in our Privacy Policy.
            </p>
            <p className="text-muted-foreground">
              We comply with applicable data protection laws, including GDPR, and implement appropriate 
              technical and organizational measures to protect your personal data.
            </p>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, [COMPANY NAME] SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT 
              LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING 
              FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-muted-foreground">
              OUR TOTAL LIABILITY TO YOU FOR ANY CAUSE OF ACTION WHATSOEVER, AND REGARDLESS OF THE 
              FORM OF THE ACTION, WILL AT ALL TIMES BE LIMITED TO THE AMOUNT PAID BY YOU FOR THE 
              SERVICE DURING THE PRECEDING THREE (3) MONTHS.
            </p>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE MAKE NO WARRANTIES, 
              EXPRESS OR IMPLIED, AND WE DISCLAIM ALL OTHER WARRANTIES, INCLUDING WITHOUT LIMITATION 
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </CardContent>
        </Card>

        {/* Indemnification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You agree to defend, indemnify, and hold harmless [Company Name] and its directors, 
              employees, and agents from and against any and all claims, damages, obligations, losses, 
              liabilities, costs, or debt, and expenses (including but not limited to attorney's fees).
            </p>
            <p className="text-muted-foreground">
              This includes, but is not limited to, claims made by third parties arising from or related 
              to your use of the Service, your violation of these Terms, or your violation of the rights 
              of any third party, including intellectual property rights.
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We may terminate or suspend your account and bar access to the Service immediately, 
              without prior notice or liability, under our sole discretion, for any reason whatsoever 
              and without limitation.
            </p>
            <p className="text-muted-foreground">
              Upon termination, your right to use the Service will cease immediately. All provisions 
              of the Terms which by their nature should survive termination shall survive, including 
              ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Governing Law and Dispute Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              These Terms shall be interpreted and governed by the laws of [Governing Jurisdiction] 
              without regard to conflict of law provisions.
            </p>
            <p className="text-muted-foreground">
              Any dispute relating to these Terms or the Service will be resolved through binding 
              arbitration in accordance with the rules of [Arbitration Organization]. The arbitration 
              will be conducted in [City, State] and the language will be English.
            </p>
            <p className="text-muted-foreground">
              You waive any right to a jury trial and to bring or participate in a class action.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Changes to These Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. If we make material changes, 
              we will notify you by email or by posting a notice on our website prior to the effective 
              date of the changes.
            </p>
            <p className="text-muted-foreground">
              Your continued use of the Service after such modifications constitutes acceptance of 
              the updated Terms. It is your responsibility to review these Terms periodically for changes.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Email:</strong> [Legal Email]</p>
              <p><strong>Support:</strong> [Support Email]</p>
              <p><strong>Address:</strong> [Company Address]</p>
              <p><strong>Phone:</strong> [Company Phone]</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
