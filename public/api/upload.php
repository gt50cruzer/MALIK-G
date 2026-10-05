<?php
/**
 * MALIK G COLLECTION — SECURE PRODUCT IMAGE UPLOAD ENDPOINT
 * Admin-only. Validates MIME type, file extension, and file size (max 5MB).
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

requireAdminAuth();
verifyCsrfToken();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['success' => false, 'error' => 'Method not allowed.'], 405);
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    sendJson(['success' => false, 'error' => 'Please select a valid image file to upload.'], 400);
}

$file = $_FILES['image'];
$maxSize = 5 * 1024 * 1024; // 5 MB

if ($file['size'] > $maxSize) {
    sendJson(['success' => false, 'error' => 'Image file size must be under 5 MB.'], 400);
}

// Validate actual MIME type using finfo
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

$allowedMimes = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

if (!isset($allowedMimes[$mimeType])) {
    sendJson(['success' => false, 'error' => 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.'], 400);
}

// Validate original extension
$originalExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
if (!in_array($originalExt, $allowedExtensions, true)) {
    sendJson(['success' => false, 'error' => 'Invalid image file extension.'], 400);
}

$uploadDir = __DIR__ . '/../uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$safeFilename = 'mgc_prod_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $allowedMimes[$mimeType];
$destination = $uploadDir . '/' . $safeFilename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    sendJson(['success' => false, 'error' => 'Failed to save uploaded image on server.'], 500);
}

sendJson([
    'success'  => true,
    'imageUrl' => '/uploads/' . $safeFilename,
]);
