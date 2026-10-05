import React, { useState } from 'react';
import { Phone, MessageCircle, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { BRAND_INFO } from '../data/products';
import { useStore } from '../context/StoreContext';

export const Contact: React.FC = () => {
  const { saveContactMessage, showToast } = useStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Please enter your name.';
    if (!phone.trim()) nextErrors.phone = 'Please enter your phone number.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!message.trim() || message.trim().length < 5) {
      nextErrors.message = 'Please enter your message.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    saveContactMessage({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
    });

    setSubmitted(true);
    setName('');
    setPhone('');
    setEmail('');
    setMessage('');
    showToast('Thank you! Your message has been received.', 'success');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-14">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
          Get in Touch
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#F5F5F0]">
          CONTACT US
        </h1>
        <p className="text-sm sm:text-base text-[#A1A1AA]">
          Have a question about sizing, availability, or your order? Reach out to Malik G Collection directly by phone, WhatsApp, or our contact form below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Store Information & Direct Action Buttons */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
                Official Store
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0] mt-1">
                {BRAND_INFO.name}
              </h2>
            </div>

            <div className="space-y-4 pt-2 border-t border-white/10 text-sm">
              <div className="flex items-start gap-3.5">
                <Phone className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Phone
                  </span>
                  <a
                    href={`tel:${BRAND_INFO.phoneRaw}`}
                    className="font-mono-num text-base font-semibold text-[#F5F5F0] hover:text-[#D4AF37]"
                  >
                    {BRAND_INFO.phoneDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MessageCircle className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                    WhatsApp
                  </span>
                  <a
                    href={BRAND_INFO.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-num text-base font-semibold text-[#F5F5F0] hover:text-[#D4AF37]"
                  >
                    {BRAND_INFO.whatsappDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#A1A1AA]">
                    Location
                  </span>
                  <span className="text-base font-semibold text-[#F5F5F0]">
                    {BRAND_INFO.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Required Direct Action Buttons: CALL NOW, WHATSAPP US, GET DIRECTIONS */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <a
                href={`tel:${BRAND_INFO.phoneRaw}`}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>CALL NOW</span>
              </a>

              <a
                href={BRAND_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-[#18181B] border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WHATSAPP US</span>
              </a>

              <a
                href={BRAND_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-[#18181B] border border-white/20 text-[#F5F5F0] hover:border-[#D4AF37] hover:text-[#D4AF37] text-xs font-semibold uppercase tracking-[0.15em] transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span>GET DIRECTIONS</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="lg:col-span-7">
          <div className="bg-[#121214] border border-white/10 p-6 sm:p-10 space-y-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F5F0]">
              Send Us a Message
            </h2>

            {submitted && (
              <div className="bg-[#D4AF37]/15 border border-[#D4AF37] p-4 flex items-center gap-3 text-sm text-[#F5F5F0]">
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <span>Thank you! Your message has been received.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-name"
                    className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                  >
                    Name <span className="text-[#D4AF37]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSubmitted(false);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    placeholder="Your Full Name"
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                  />
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-phone"
                    className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                  >
                    Phone <span className="text-[#D4AF37]">*</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setSubmitted(false);
                      if (errors.phone) setErrors({ ...errors, phone: '' });
                    }}
                    placeholder="0321 7126828"
                    className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm font-mono-num text-[#F5F5F0] focus:outline-none"
                  />
                  {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contact-email"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSubmitted(false);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="you@example.com"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contact-message"
                  className="block text-xs uppercase tracking-wider text-[#F5F5F0]"
                >
                  Message <span className="text-[#D4AF37]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setSubmitted(false);
                    if (errors.message) setErrors({ ...errors, message: '' });
                  }}
                  placeholder="How can we help you today?"
                  className="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none"
                />
                {errors.message && (
                  <p className="text-xs text-red-400">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="px-8 py-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
              >
                SEND MESSAGE
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
