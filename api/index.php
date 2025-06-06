<?php
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class API {
    private $db;
    private $jwt_secret;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
        $this->jwt_secret = $_ENV['JWT_SECRET'] ?? 'OJcKiz4NByB2wVjnreWM30M9/UfkaTaJUNyxU/+I6UY=';
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
        $resource = $path[0] ?? '';
        $id = $path[1] ?? null;

        error_log("Handling request: $method /$resource" . ($id ? "/$id" : ""));

        try {
            switch ($resource) {
                case 'produits':
                    $this->handleProduits($method, $id);
                    break;
                case 'categories':
                    $this->handleCategories($method, $id);
                    break;
                case 'commandes':
                    $this->handleCommandes($method, $id);
                    break;
                case 'paniers':
                    $this->handlePaniers($method, $id);
                    break;
                case 'auth':
                    $this->handleAuth($method);
                    break;
                case 'compte_utilisateurs':
                    if ($id === 'current') {
                        $this->handleCurrentUser($method);
                    } else {
                        $this->handleUsers($method, $id);
                    }
                    break;
                case 'chatbot':
                    $this->handleChatbot($method);
                    break;
                // ... existing cases ...
                default:
                    http_response_code(404);
                    echo json_encode(["error" => "Resource not found"], JSON_PRETTY_PRINT);
            }
        } catch (Exception $e) {
            error_log("Request handling error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["error" => "Server error: " . $e->getMessage()], JSON_PRETTY_PRINT);
        }
    }

    private function handleProductReviews($method, $id = null) {
        $jwt = $this->validateJWT();
        if ($method !== 'GET' && $jwt->role !== 'dmj') {
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized: DMJ access required"], JSON_PRETTY_PRINT);
            return;
        }

        try {
            if ($method === 'GET') {
                if ($id) {
                    $stmt = $this->db->prepare("
                        SELECT 
                            ap.avis_id as id,
                            ap.note as rating,
                            ap.commentaire as comment,
                            ap.date_avis as date,
                            p.nom_produit as productName,
                            d.nom_dmj as nom,
                            d.prenom_dmj as prenom,
                            d.photo_profil_dmj as photo_profil
                        FROM avis_produit ap
                        JOIN produit p ON ap.produit_id = p.produit_id
                        JOIN dmj d ON ap.dmj_id = d.dmj_id
                        WHERE ap.avis_id = ?
                    ");
                    $stmt->execute([$id]);
                    $review = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($review) {
                        $review['user'] = [
                            'name' => $review['prenom'] . ' ' . $review['nom'],
                            'avatar' => $review['photo_profil'] ?? '/default-avatar.png'
                        ];
                        unset($review['nom'], $review['prenom'], $review['photo_profil']);
                        echo json_encode($review, JSON_PRETTY_PRINT);
                    } else {
                        http_response_code(404);
                        echo json_encode(["error" => "Review not found"], JSON_PRETTY_PRINT);
                    }
                } else {
                    $stmt = $this->db->prepare("
                        SELECT 
                            ap.avis_id as id,
                            ap.note as rating,
                            ap.commentaire as comment,
                            ap.date_avis as date,
                            p.nom_produit as productName,
                            d.nom_dmj as nom,
                            d.prenom_dmj as prenom,
                            d.photo_profil_dmj as photo_profil
                        FROM avis_produit ap
                        JOIN produit p ON ap.produit_id = p.produit_id
                        JOIN dmj d ON ap.dmj_id = d.dmj_id
                        ORDER BY ap.date_avis DESC
                    ");
                    $stmt->execute();
                    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Format the reviews to match the expected structure
                    $formattedReviews = array_map(function($review) {
                        return [
                            'id' => $review['id'],
                            'rating' => (int)$review['rating'],
                            'comment' => $review['comment'],
                            'date' => $review['date'],
                            'type' => 'product',
                            'productName' => $review['productName'],
                            'user' => [
                                'name' => $review['prenom'] . ' ' . $review['nom'],
                                'avatar' => $review['photo_profil'] ?? '/default-avatar.png'
                            ]
                        ];
                    }, $reviews);
                    
                    echo json_encode($formattedReviews, JSON_PRETTY_PRINT);
                }
            } elseif ($method === 'POST') {
                $data = $this->getInputData();
                if (!isset($data['produit_id'], $data['note'], $data['commentaire']) ||
                    !is_numeric($data['produit_id']) || !is_numeric($data['note']) ||
                    $data['note'] < 1 || $data['note'] > 5) {
                    http_response_code(400);
                    echo json_encode(["error" => "Invalid review data"], JSON_PRETTY_PRINT);
                    return;
                }

                $stmt = $this->db->prepare("
                    INSERT INTO avis_produit (produit_id, dmj_id, note, commentaire)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$data['produit_id'], $jwt->sub, $data['note'], $data['commentaire']]);
                echo json_encode(["success" => true, "id" => $this->db->lastInsertId()], JSON_PRETTY_PRINT);
            } elseif ($method === 'PUT' && $id) {
                $data = $this->getInputData();
                if (!isset($data['note'], $data['commentaire']) ||
                    !is_numeric($data['note']) || $data['note'] < 1 || $data['note'] > 5) {
                    http_response_code(400);
                    echo json_encode(["error" => "Invalid review data"], JSON_PRETTY_PRINT);
                    return;
                }

                $stmt = $this->db->prepare("
                    UPDATE avis_produit 
                    SET note = ?, commentaire = ?
                    WHERE avis_id = ? AND dmj_id = ?
                ");
                $stmt->execute([$data['note'], $data['commentaire'], $id, $jwt->sub]);
                echo json_encode(["success" => true], JSON_PRETTY_PRINT);
            } elseif ($method === 'DELETE' && $id) {
                $stmt = $this->db->prepare("DELETE FROM avis_produit WHERE avis_id = ? AND dmj_id = ?");
                $stmt->execute([$id, $jwt->sub]);
                echo json_encode(["success" => true], JSON_PRETTY_PRINT);
            } else {
                http_response_code(405);
                echo json_encode(["error" => "Method not allowed"], JSON_PRETTY_PRINT);
            }
        } catch (PDOException $e) {
            error_log("Product reviews database error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["error" => "Database error"], JSON_PRETTY_PRINT);
        }
    }

    private function handleShopReviews($method, $id = null) {
        $jwt = $this->validateJWT();
        if ($method !== 'GET' && $jwt->role !== 'dmj') {
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized: DMJ access required"], JSON_PRETTY_PRINT);
            return;
        }

        try {
            if ($method === 'GET') {
                if ($id) {
                    $stmt = $this->db->prepare("
                        SELECT 
                            as.avis_shop_id as id,
                            as.note as rating,
                            as.commentaire as comment,
                            as.date_avis as date,
                            d.nom_dmj as nom,
                            d.prenom_dmj as prenom,
                            d.photo_profil_dmj as photo_profil
                        FROM avis_shop as
                        JOIN dmj d ON as.dmj_id = d.dmj_id
                        WHERE as.avis_shop_id = ?
                    ");
                    $stmt->execute([$id]);
                    $review = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($review) {
                        $review['user'] = [
                            'name' => $review['prenom'] . ' ' . $review['nom'],
                            'avatar' => $review['photo_profil'] ?? '/default-avatar.png'
                        ];
                        unset($review['nom'], $review['prenom'], $review['photo_profil']);
                        echo json_encode($review, JSON_PRETTY_PRINT);
                    } else {
                        http_response_code(404);
                        echo json_encode(["error" => "Review not found"], JSON_PRETTY_PRINT);
                    }
                } else {
                    $stmt = $this->db->prepare("
                        SELECT 
                            as.avis_shop_id as id,
                            as.note as rating,
                            as.commentaire as comment,
                            as.date_avis as date,
                            d.nom_dmj as nom,
                            d.prenom_dmj as prenom,
                            d.photo_profil_dmj as photo_profil
                        FROM avis_shop as
                        JOIN dmj d ON as.dmj_id = d.dmj_id
                        ORDER BY as.date_avis DESC
                    ");
                    $stmt->execute();
                    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Format the reviews to match the expected structure
                    $formattedReviews = array_map(function($review) {
                        return [
                            'id' => $review['id'],
                            'rating' => (int)$review['rating'],
                            'comment' => $review['comment'],
                            'date' => $review['date'],
                            'type' => 'shop',
                            'user' => [
                                'name' => $review['prenom'] . ' ' . $review['nom'],
                                'avatar' => $review['photo_profil'] ?? '/default-avatar.png'
                            ]
                        ];
                    }, $reviews);
                    
                    echo json_encode($formattedReviews, JSON_PRETTY_PRINT);
                }
            } elseif ($method === 'POST') {
                $data = $this->getInputData();
                if (!isset($data['note'], $data['commentaire']) ||
                    !is_numeric($data['note']) || $data['note'] < 1 || $data['note'] > 5) {
                    http_response_code(400);
                    echo json_encode(["error" => "Invalid review data"], JSON_PRETTY_PRINT);
                    return;
                }

                $stmt = $this->db->prepare("
                    INSERT INTO avis_shop (dmj_id, note, commentaire)
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([$jwt->sub, $data['note'], $data['commentaire']]);
                echo json_encode(["success" => true, "id" => $this->db->lastInsertId()], JSON_PRETTY_PRINT);
            } elseif ($method === 'PUT' && $id) {
                $data = $this->getInputData();
                if (!isset($data['note'], $data['commentaire']) ||
                    !is_numeric($data['note']) || $data['note'] < 1 || $data['note'] > 5) {
                    http_response_code(400);
                    echo json_encode(["error" => "Invalid review data"], JSON_PRETTY_PRINT);
                    return;
                }

                $stmt = $this->db->prepare("
                    UPDATE avis_shop 
                    SET note = ?, commentaire = ?
                    WHERE avis_shop_id = ? AND dmj_id = ?
                ");
                $stmt->execute([$data['note'], $data['commentaire'], $id, $jwt->sub]);
                echo json_encode(["success" => true], JSON_PRETTY_PRINT);
            } elseif ($method === 'DELETE' && $id) {
                $stmt = $this->db->prepare("DELETE FROM avis_shop WHERE avis_shop_id = ? AND dmj_id = ?");
                $stmt->execute([$id, $jwt->sub]);
                echo json_encode(["success" => true], JSON_PRETTY_PRINT);
            } else {
                http_response_code(405);
                echo json_encode(["error" => "Method not allowed"], JSON_PRETTY_PRINT);
            }
        } catch (PDOException $e) {
            error_log("Shop reviews database error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["error" => "Database error"], JSON_PRETTY_PRINT);
        }
    }
} 