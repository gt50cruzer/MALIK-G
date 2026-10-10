<?php
/**
 * MALIK G COLLECTION — ADMIN SALES & INVENTORY DASHBOARD ENDPOINT
 * Computes real-time statistics directly from MySQL:
 * - Total Orders, Pending, Confirmed, Processing, Shipped, Delivered, Cancelled
 * - Total Products, Out-of-Stock Products
 * - Total Sales / Revenue, Delivered Revenue, Pending Order Value
 * - Date-based Sales Summaries: Today, This Week, This Month, All Time
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

requireAdminAuth();
$pdo = getDBConnection();

// 1. Order counts & revenue by status (excluding Cancelled and Pending from completed sales revenue)
$statusStmt = $pdo->query(
    'SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = "Pending" THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN status = "Confirmed" THEN 1 ELSE 0 END) AS confirmed_orders,
        SUM(CASE WHEN status = "Processing" THEN 1 ELSE 0 END) AS processing_orders,
        SUM(CASE WHEN status = "Shipped" THEN 1 ELSE 0 END) AS shipped_orders,
        SUM(CASE WHEN status = "Delivered" THEN 1 ELSE 0 END) AS delivered_orders,
        SUM(CASE WHEN status = "Cancelled" THEN 1 ELSE 0 END) AS cancelled_orders,
        COALESCE(SUM(CASE WHEN status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN total_amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN status = "Delivered" THEN total_amount ELSE 0 END), 0) AS delivered_revenue,
        COALESCE(SUM(CASE WHEN status = "Pending" THEN total_amount ELSE 0 END), 0) AS pending_value,
        COALESCE(SUM(CASE WHEN status = "Cancelled" THEN total_amount ELSE 0 END), 0) AS cancelled_value
     FROM orders'
);
$orderStats = $statusStmt->fetch();

// 2. Product counts
$prodStmt = $pdo->query(
    'SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN stock_status = "out_of_stock" THEN 1 ELSE 0 END) AS out_of_stock_products,
        SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END) AS published_products
     FROM products'
);
$prodStats = $prodStmt->fetch();

// 3. Date-based sales summaries (Today, This Week, This Month, All Time) for non-cancelled confirmed orders
$periodStmt = $pdo->query(
    'SELECT
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN total_amount ELSE 0 END), 0) AS today_sales,
        SUM(CASE WHEN DATE(created_at) = CURDATE() AND status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN 1 ELSE 0 END) AS today_orders,
        COALESCE(SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN total_amount ELSE 0 END), 0) AS week_sales,
        SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN 1 ELSE 0 END) AS week_orders,
        COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN total_amount ELSE 0 END), 0) AS month_sales,
        SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) AND status IN ("Confirmed", "Processing", "Shipped", "Delivered") THEN 1 ELSE 0 END) AS month_orders
     FROM orders'
);
$periodStats = $periodStmt->fetch();

$confirmedSalesOrders =
    (int)($orderStats['confirmed_orders'] ?? 0) +
    (int)($orderStats['processing_orders'] ?? 0) +
    (int)($orderStats['shipped_orders'] ?? 0) +
    (int)($orderStats['delivered_orders'] ?? 0);

sendJson([
    'success' => true,
    'stats'   => [
        'totalOrders'          => (int)($orderStats['total_orders'] ?? 0),
        'pendingOrders'        => (int)($orderStats['pending_orders'] ?? 0),
        'confirmedOrders'      => (int)($orderStats['confirmed_orders'] ?? 0),
        'processingOrders'     => (int)($orderStats['processing_orders'] ?? 0),
        'shippedOrders'        => (int)($orderStats['shipped_orders'] ?? 0),
        'deliveredOrders'      => (int)($orderStats['delivered_orders'] ?? 0),
        'cancelledOrders'      => (int)($orderStats['cancelled_orders'] ?? 0),
        'confirmedSalesOrders' => $confirmedSalesOrders,
        'totalProducts'        => (int)($prodStats['total_products'] ?? 0),
        'outOfStockProducts'   => (int)($prodStats['out_of_stock_products'] ?? 0),
        'publishedProducts'    => (int)($prodStats['published_products'] ?? 0),
        'totalRevenue'         => (float)($orderStats['total_revenue'] ?? 0),
        'confirmedRevenue'     => (float)($orderStats['total_revenue'] ?? 0),
        'deliveredRevenue'     => (float)($orderStats['delivered_revenue'] ?? 0),
        'pendingOrderValue'    => (float)($orderStats['pending_value'] ?? 0),
        'cancelledOrderValue'  => (float)($orderStats['cancelled_value'] ?? 0),
        'periods'              => [
            'today' => [
                'sales'  => (float)($periodStats['today_sales'] ?? 0),
                'orders' => (int)($periodStats['today_orders'] ?? 0),
            ],
            'thisWeek' => [
                'sales'  => (float)($periodStats['week_sales'] ?? 0),
                'orders' => (int)($periodStats['week_orders'] ?? 0),
            ],
            'thisMonth' => [
                'sales'  => (float)($periodStats['month_sales'] ?? 0),
                'orders' => (int)($periodStats['month_orders'] ?? 0),
            ],
            'allTime' => [
                'sales'  => (float)($orderStats['total_revenue'] ?? 0),
                'orders' => $confirmedSalesOrders,
            ],
        ],
    ],
]);
