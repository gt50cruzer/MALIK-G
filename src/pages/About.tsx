import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { BRAND_INFO } from '../data/products';
import { SafeImage } from '../components/SafeImage';

export const About: React.FC = () => {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-20">
      {/* Page Hero & Lead Paragraph */}
      <section className="max-w-3xl space-y-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
          <span>Sialkot, Punjab, Pakistan</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F5F5F0] tracking-tight">
          ABOUT MALIK G COLLECTION
        </h1>
        <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed">
          Malik G Collection is a fashion and lifestyle store based in Sialkot, Pakistan, offering stylish clothing, footwear, watches, fragrances and accessories for customers looking for modern quality and everyday style.
        </p>
      </section>

      {/* Section 1: OUR STORE (Featuring Actual Storefront Imagery) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-[#121214] border border-white/10 overflow-hidden">
        <div className="lg:col-span-7 bg-[#18181B] h-full min-h-[340px] sm:min-h-[460px]">
          <SafeImage
            src={BRAND_INFO.storefrontImage}
            alt="Malik G Collection Storefront in Sialkot, Pakistan"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="lg:col-span-5 p-8 sm:p-12 space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">01. Sialkot Retail</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
            OUR STORE
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
            Located in Sialkot, Punjab, Malik G Collection welcomes customers with a curated retail environment designed around clarity, comfort, and personal service. Whether you visit our storefront in person or shop with us online from anywhere in Pakistan, every item is inspected with care before dispatch.
          </p>
          <div className="pt-3 border-t border-white/10 space-y-2 text-sm text-[#F5F5F0]">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              <span>{BRAND_INFO.location}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#D4AF37]" />
              <span className="font-mono-num">{BRAND_INFO.phoneDisplay}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 & 3: OUR COLLECTION & OUR STYLE */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#121214] border border-white/10 p-8 sm:p-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">02. Complete Wardrobe</p>
          <h2 className="font-display text-3xl font-bold text-[#F5F5F0]">
            OUR COLLECTION
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
            We bring together five core pillars of men&apos;s fashion under one roof: crisp formal and casual shirts, tailored trousers and stretch denim, genuine leather shoes and sneakers, distinctive wristwatches, and long-lasting Eau de Parfum fragrances alongside essential leather accessories.
          </p>
        </div>

        <div className="bg-[#121214] border border-white/10 p-8 sm:p-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">03. Modern Aesthetic</p>
          <h2 className="font-display text-3xl font-bold text-[#F5F5F0]">
            OUR STYLE
          </h2>
          <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
            Our philosophy centers on clean tailoring, versatile color palettes, and reliable fabrics suited to Pakistan&apos;s seasons. From structured Oxford shirts for professional settings to signature Oud and Musk fragrances for evening gatherings, every piece is chosen to elevate your daily wardrobe.
          </p>
        </div>
      </section>

      {/* Section 4: WHY SHOP WITH US */}
      <section className="bg-[#121214] border border-white/10 p-8 sm:p-12 space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">04. Customer Promise</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#F5F5F0]">
            WHY SHOP WITH US
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {[
            {
              title: 'Curated Quality',
              desc: 'Every shirt, trouser, shoe, watch, and fragrance is selected for durability, fit, and refined presentation.',
            },
            {
              title: 'Free Delivery Over Rs. 5,000',
              desc: 'Enjoy complimentary nationwide delivery on orders above Rs. 5,000, or flat Rs. 250 standard shipping.',
            },
            {
              title: 'Cash on Delivery',
              desc: 'Shop with confidence across Pakistan and pay conveniently at your doorstep upon receiving your order.',
            },
            {
              title: 'Direct WhatsApp Support',
              desc: 'Speak directly with our Sialkot store team on WhatsApp at 0321 7126828 for sizing advice or quick orders.',
            },
          ].map((item) => (
            <div key={item.title} className="space-y-2 border-l-2 border-[#D4AF37] pl-4">
              <div className="flex items-center gap-2 text-[#F5F5F0] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <h3>{item.title}</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#D4AF37] hover:bg-[#e5c247] text-[#0B0B0C] text-xs sm:text-sm font-bold uppercase tracking-[0.15em] transition-colors"
          >
            <span>SHOP COLLECTION</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};
