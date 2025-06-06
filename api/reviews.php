<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

require_once 'config.php';

$type = $_GET['type'] ?? '';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($type === 'product') {
        $query = "SELECT ap.*, p.nom_produit, d.nom_dmj, d.photo_profil_dmj 
                 FROM avis_produit ap 
                 JOIN produit p ON ap.produit_id = p.produit_id 
                 JOIN dmj d ON ap.dmj_id = d.dmj_id 
                 ORDER BY ap.avis_id DESC";
    } else if ($type === 'shop') {
        $query = "SELECT as.*, d.nom_dmj, d.photo_profil_dmj 
                 FROM avis_shop as 
                 JOIN dmj d ON as.dmj_id = d.dmj_id 
                 ORDER BY as.avis_shop_id DESC";
    } else {
        throw new Exception('Invalid review type');
    }

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($reviews);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?> 