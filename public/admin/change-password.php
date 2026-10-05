<?php
/**
 * MALIK G COLLECTION — OWNER CHANGE PASSWORD PAGE
 * Route: /admin/change-password.php
 * Verifies current password with password_verify() and updates MySQL `admins` table with password_hash().
 */

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';

$pdo = getDBConnection();
$msg = '';
$msgType = 'error';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $currentPassword = (string)($_POST['current_password'] ?? '');
    $newPassword = (string)($_POST['new_password'] ?? '');
    $confirmPassword = (string)($_POST['confirm_password'] ?? '');

    if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
        $msg = 'All password fields are required.';
    } elseif (strlen($newPassword) < 8) {
        $msg = 'New password must be at least 8 characters long.';
    } elseif ($newPassword !== $confirmPassword) {
        $msg = 'New password and confirmation do not match.';
    } else {
        $adminId = (int)$_SESSION['admin_id'];
        $stmt = $pdo->prepare('SELECT id, password_hash FROM admins WHERE id = ? LIMIT 1');
        $stmt->execute([$adminId]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($currentPassword, $admin['password_hash'])) {
            $msg = 'Current password is incorrect.';
        } else {
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $upd = $pdo->prepare('UPDATE admins SET password_hash = ?, updated_at = NOW() WHERE id = ?');
            $upd->execute([$newHash, $adminId]);
            session_regenerate_id(true);
            $msgType = 'success';
            $msg = 'Owner password updated in MySQL successfully. Your old password is no longer valid.';
        }
    }
}

renderAdminHeader('Change Password', 'change-password');
?>
<div class="max-w-xl space-y-6">
  <div class="border-b border-white/10 pb-4">
    <p class="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Owner Security</p>
    <h1 class="font-display text-3xl font-bold text-[#F5F5F0]">Change Owner Password</h1>
  </div>

  <?php if ($msg !== ''): ?>
    <div class="p-4 border text-xs <?= $msgType === 'success' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-red-500/10 border-red-500/40 text-red-300' ?>">
      <?= htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') ?>
    </div>
  <?php endif; ?>

  <form method="POST" action="/admin/change-password.php" class="bg-[#121214] border border-white/10 p-6 sm:p-8 space-y-5">
    <div class="space-y-1.5">
      <label class="block text-xs uppercase tracking-wider">Current Password *</label>
      <input type="password" name="current_password" required class="w-full bg-[#18181B] border border-white/15 px-4 py-3 text-sm text-[#F5F5F0]" />
    </div>
    <div class="space-y-1.5">
      <label class="block text-xs uppercase tracking-wider">New Password (min 8 chars) *</label>
      <input type="password" name="new_password" required minlength="8" class="w-full bg-[#18181B] border border-white/15 px-4 py-3 text-sm text-[#F5F5F0]" />
    </div>
    <div class="space-y-1.5">
      <label class="block text-xs uppercase tracking-wider">Confirm New Password *</label>
      <input type="password" name="confirm_password" required minlength="8" class="w-full bg-[#18181B] border border-white/15 px-4 py-3 text-sm text-[#F5F5F0]" />
    </div>
    <button type="submit" class="px-8 py-3.5 bg-[#D4AF37] text-[#0B0B0C] text-xs font-bold uppercase tracking-wider">Update Password</button>
  </form>
</div>
<?php renderAdminFooter(); ?>
