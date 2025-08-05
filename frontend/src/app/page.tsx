"use client"

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Script from "next/script";

export default function LandingPage() {
  const router = useRouter();

  // Aether logo component
  const AetherLogo = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/images/aether-logo.png" 
        alt="æther logo" 
        width="32" 
        height="32" 
        className="mr-2"
      />
      <span className="font-bold text-2xl">æther</span>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F6F5F4' }}>
      {/* Navigation */}
      <nav className="border-b border-gray-100 sticky top-0 z-50" style={{ backgroundColor: '#F6F5F4' }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <AetherLogo />
              <div className="text-sm text-gray-900 font-bold">
                v1.1
              </div>
              <div className="hidden md:block text-sm text-gray-900 font-bold">
                Development Finance Information, Simplified.
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Button 
                onClick={() => router.push('/login')}
                className="bg-gray-900 hover:bg-black text-white border-0"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-2 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Content */}
            <div>
              <div className="mb-8">
                <AetherLogo className="text-gray-900 mb-2" />
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                Track Development Finance Flows <span className="text-gray-600">with Precision and Transparency</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-12 leading-relaxed max-w-xl">
                <span className="font-bold">æther</span> is a purpose-built Development Finance Information Management System (DFMIS) for recipient governments and 
                development partners. It enables you to plan activities, track transactions, analyse financial flows, and publish data in line with 
                the IATI Standard.
              </p>

              {/* Email Signup - Mailchimp */}
              <div className="mb-12">
                <p className="text-sm text-gray-600 mb-4">
                  Sign up to receive updates on new features, release timelines, and early access opportunities
                </p>
                
                {/* Mailchimp Embedded Form */}
                <div id="mc_embed_signup" className="max-w-md">
                   <style jsx>{`
                     #mc_embed_signup {
                       background: transparent;
                       clear: left;
                       font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                       width: 100%;
                     }
                     #mc_embed_signup form {
                       padding: 0;
                       margin: 0;
                     }
                     #mc_embed_signup h2 {
                       display: none;
                     }
                     #mc_embed_signup .indicates-required {
                       display: none;
                     }
                     #mc_embed_signup .mc-field-group {
                       margin-bottom: 12px;
                     }
                     #mc_embed_signup .mc-field-group label {
                       display: block;
                       font-size: 14px;
                       font-weight: 500;
                       color: #374151;
                       margin-bottom: 4px;
                       font-family: inherit;
                     }
                     #mc_embed_signup .mc-field-group input {
                       width: 100%;
                       padding: 8px 12px;
                       border: 1px solid #d1d5db;
                       border-radius: 6px;
                       font-size: 14px;
                       font-family: inherit;
                       transition: border-color 0.2s;
                       background-color: white;
                     }
                     #mc_embed_signup .mc-field-group input:focus {
                       outline: none;
                       border-color: #3b82f6;
                       box-shadow: 0 0 0 1px #3b82f6;
                     }
                     #mc_embed_signup .button {
                       background-color: #111827;
                       color: white;
                       border: none;
                       padding: 10px 24px;
                       border-radius: 6px;
                       font-size: 14px;
                       font-weight: 500;
                       font-family: inherit;
                       cursor: pointer;
                       transition: background-color 0.2s;
                       width: 100%;
                     }
                     #mc_embed_signup .button:hover {
                       background-color: #1f2937;
                     }
                     #mc_embed_signup .optionalParent {
                       margin-top: 16px;
                     }
                     #mc_embed_signup .foot {
                       margin: 0;
                     }
                     #mc_embed_signup .refferal_badge {
                       display: none !important;
                     }
                     #mc_embed_signup .foot p {
                       display: none !important;
                     }
                     #mc_embed_signup #mce-responses {
                       margin: 12px 0;
                     }
                     #mc_embed_signup .response {
                       padding: 8px 12px;
                       border-radius: 4px;
                       font-size: 14px;
                       font-family: inherit;
                     }
                     #mc_embed_signup #mce-error-response {
                       background-color: #fef2f2;
                       color: #b91c1c;
                       border: 1px solid #fecaca;
                     }
                     #mc_embed_signup #mce-success-response {
                       background-color: #f0fdf4;
                       color: #166534;
                       border: 1px solid #bbf7d0;
                     }
                     .mc-field-group-row {
                       display: flex;
                       gap: 12px;
                     }
                     .mc-field-group-row .mc-field-group {
                       flex: 1;
                     }
                   `}</style>
                   <form 
                     action="https://leighmitchell.us5.list-manage.com/subscribe/post?u=2f7f1de1e65f08db9de00f2b1&id=f23e64b79b&f_id=00ae41edf0" 
                     method="post" 
                     id="mc-embedded-subscribe-form" 
                     name="mc-embedded-subscribe-form" 
                     className="validate" 
                     target="_self"
                     noValidate
                   >
                     <div id="mc_embed_signup_scroll">
                       <div className="mc-field-group-row">
                         <div className="mc-field-group">
                           <label htmlFor="mce-FNAME">First Name</label>
                           <input 
                             type="text" 
                             name="FNAME" 
                             className="text" 
                             id="mce-FNAME"
                             placeholder="First name"
                           />
                         </div>
                         <div className="mc-field-group">
                           <label htmlFor="mce-LNAME">Last Name</label>
                           <input 
                             type="text" 
                             name="LNAME" 
                             className="text" 
                             id="mce-LNAME"
                             placeholder="Last name"
                           />
                         </div>
                       </div>
                       <div className="mc-field-group">
                         <label htmlFor="mce-EMAIL">Email Address *</label>
                         <input 
                           type="email" 
                           name="EMAIL" 
                           className="required email" 
                           id="mce-EMAIL" 
                           required 
                           placeholder="Enter your email address"
                         />
                       </div>
                       
                       <div id="mce-responses" className="clear foot">
                         <div className="response" id="mce-error-response" style={{display: 'none'}}></div>
                         <div className="response" id="mce-success-response" style={{display: 'none'}}></div>
                       </div>
                       
                       <div aria-hidden="true" style={{position: 'absolute', left: '-5000px'}}>
                         <input 
                           type="text" 
                           name="b_2f7f1de1e65f08db9de00f2b1_f23e64b79b" 
                           tabIndex={-1} 
                         />
                       </div>
                       
                       <div className="optionalParent">
                         <div className="clear foot">
                           <input 
                             type="submit" 
                             name="subscribe" 
                             id="mc-embedded-subscribe" 
                             className="button" 
                             value="Sign Up for Updates"
                           />
                         </div>
                       </div>
                     </div>
                   </form>
                </div>
                {/* End Mailchimp Form */}
              </div>
            </div>

            {/* Right side - Activity Editor Screenshot */}
            <div className="flex justify-center">
              <img 
                src="/images/Activity Editor NEW.png" 
                alt="æther Activity Editor" 
                className="w-full max-w-lg h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Designed for Coordination Section */}
      <section className="py-20 px-2 sm:px-4 lg:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Designed for Coordination, Built for Scale
              </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              <span className="font-bold">æther</span> supports effective public financial management and development coordination. It provides the tools you need to monitor external financing, engage with partners, and make evidence-based decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-2 sm:px-4 lg:px-6" style={{ backgroundColor: '#F6F5F4' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="mb-8">
              <AetherLogo className="text-gray-900 justify-center" />
            </div>

            <div className="text-center text-gray-500 text-sm">
              © 2025 <span className="font-bold">æther</span>. Built for recipient governments and development partners.
            </div>
          </div>
        </div>
      </footer>
      
      {/* Mailchimp validation setup - no jQuery dependency */}
      <Script 
        id="mailchimp-validation" 
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.fnames = new Array(); 
            window.ftypes = new Array();
            window.fnames[0] = 'EMAIL';
            window.ftypes[0] = 'email';
            window.fnames[1] = 'FNAME';
            window.ftypes[1] = 'text';
            window.fnames[2] = 'LNAME';
            window.ftypes[2] = 'text';
            window.fnames[3] = 'ADDRESS';
            window.ftypes[3] = 'address';
            window.fnames[4] = 'PHONE';
            window.ftypes[4] = 'phone';
            window.fnames[5] = 'BIRTHDAY';
            window.ftypes[5] = 'birthday';
          `
        }}
      />
    </div>
  );
}