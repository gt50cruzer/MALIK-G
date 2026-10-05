<?php
/**
 * MALIK G COLLECTION — ADMIN SETTINGS PAGE
 * Route: /admin/settings.php
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

renderAdminHeader('Settings', 'settings');
?>
<div class="max-w-3xl space-y-6">
  <div class="border-b border-white/10 pb-4">
    <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Store Configuration</p>
    <h1 class="font-display text-3xl font-bold text-[#F5F5F0]">Malik G Collection Store Settings</h1>
  </div>

  <div class="bg-[#121214] border border-white/10 p-6 space-y-4 text-sm">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p class="text-xs uppercase text-[#A1A1AA]">Store Name</p>
        <p class="font-semibold text-[#F5F5F0] mt-1">MALIK G COLLECTION</p>
      </div>
      <div>
        <p class="text-xs uppercase text-[#A1A1AA]">WhatsApp Orders Number</p>
        <p class="font-mono-num text-[#D4AF37] mt-1">+92 321 7126828 (0321 7126828)</p>
      </div>
      <div>
        <p class="text-xs uppercase text-[#A1A1AA]">Store Location</p>
        <p class="text-[#F5F5F0] mt-1">Sialkot, Punjab, Pakistan</p>
      </div>
      <div>
        <p class="text-xs uppercase text-[#A1A1AA]">Order Flow</p>
        <p class="text-emerald-300 mt-1">MySQL Order Snapshot Saved &rarr; WhatsApp Confirmation</p>
      </div>
    </div>
    <div class="pt-4 border-t border-white/10">
      <a href="/admin/change-password.php" class="inline-block px-5 py-2.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">Change Owner Password</a>
    </div>
  </div>
</div>
<?php renderAdminFooter(); ?>
