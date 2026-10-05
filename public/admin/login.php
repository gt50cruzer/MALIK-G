<?php
/**
 * MALIK G COLLECTION — OWNER ADMIN LOGIN PAGE
 * Route: /admin/login.php
 * Authenticates owner using PHP sessions and password_verify() against MySQL `admins` table.
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/bootstrap.php';

if (isAdminAuthenticated()) {
    header('Location: /admin/index.php');
    exit;
}

$error = '';
$emailInput = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $emailInput = strtolower(trim((string)($_POST['email'] ?? '')));
    $password = (string)($_POST['password'] ?? '');

    if ($emailInput === '' || $password === '') {
        $error = 'Please enter both Email / Gmail and Password.';
    } else {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare('SELECT id, email, password_hash FROM admins WHERE LOWER(email) = :email LIMIT 1');
        $stmt->execute([':email' => $emailInput]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            $error = 'Invalid email or password.';
        } else {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int)$admin['id'];
            $_SESSION['admin_email'] = $admin['email'];
            $_SESSION['last_activity'] = time();
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

            header('Location: /admin/index.php');
            exit;
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In | Malik G Collection</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0B0B0C; color: #F5F5F0; }
    .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0B0B0C]">
  <div class="w-full max-w-md bg-[#121214] border border-white/10 p-8 sm:p-10 space-y-6">
    <div class="text-center space-y-2 border-b border-white/10 pb-6">
      <h1 class="font-display text-2xl sm:text-3xl font-bold tracking-[0.12em] text-[#D4AF37]">MALIK G COLLECTION</h1>
      <p class="text-base font-medium text-[#F5F5F0]">Sign In</p>
    </div>

    <?php if ($error !== ''): ?>
      <div class="p-3.5 bg-red-500/10 border border-red-500/40 text-xs text-red-300">
        <?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?>
      </div>
    <?php endif; ?>

    <form method="POST" action="/admin/login.php" class="space-y-5">
      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider text-[#F5F5F0]">Email / Gmail</label>
        <input type="email" name="email" required value="<?= htmlspecialchars($emailInput, ENT_QUOTES, 'UTF-8') ?>"
               placeholder="name@gmail.com"
               class="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none" />
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs uppercase tracking-wider text-[#F5F5F0]">Password</label>
        <input type="password" name="password" required placeholder="••••••••"
               class="w-full bg-[#18181B] border border-white/15 focus:border-[#D4AF37] px-4 py-3 text-sm text-[#F5F5F0] focus:outline-none" />
      </div>

      <button type="submit"
              class="w-full py-3.5 bg-[#D4AF37] hover:bg-[#e3be42] text-[#0B0B0C] text-xs font-bold uppercase tracking-[0.15em] transition-colors">
        SIGN IN
      </button>
    </form>

    <div class="pt-4 border-t border-white/10 text-center">
      <a href="/" class="text-xs text-[#A1A1AA] hover:text-[#D4AF37] uppercase tracking-wider">&larr; Return to Store</a>
    </div>
  </div>
</body>
</html>
