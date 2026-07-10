<?php
/**
 * Script de test pour l'API Analytics
 * À supprimer après les tests
 *
 * Usage: Copier ce fichier sur le serveur et accéder via:
 * https://tests.arcanes.ca/omk/test-analytics.php?action=getOverview
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Connexion à la base de données (adapter les credentials)
$host = 'localhost';
$dbname = 'omeka_s';  // À adapter
$username = 'root';    // À adapter
$password = '';        // À adapter

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Connexion DB échouée: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

// Templates des ressources
$templates = [
    'seminaire' => 71,
    'recit_artistique' => 103,
    'annotation' => 101,
    'experimentation' => 106,
    'outil' => 118,
    'bibliography' => 81,
    'mediagraphie' => 83,
    'actant' => 72,
    'keyword' => 73,
];

switch ($action) {
    case 'getOverview':
        $counts = [];
        foreach ($templates as $type => $templateId) {
            $sql = "SELECT COUNT(*) as count FROM resource WHERE resource_template_id = :templateId AND is_public = 1";
            $stmt = $conn->prepare($sql);
            $stmt->execute(['templateId' => $templateId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $counts[] = [
                'type' => $type,
                'count' => (int)$row['count'],
                'templateId' => $templateId
            ];
        }
        echo json_encode(['types' => $counts, 'success' => true]);
        break;

    case 'getActivityByDay':
        $year = $_GET['year'] ?? date('Y');
        $sql = "
            SELECT
                DATE(created) as date,
                COUNT(*) as count
            FROM resource
            WHERE YEAR(created) = :year
            AND is_public = 1
            GROUP BY DATE(created)
            ORDER BY date
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute(['year' => $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['year' => $year, 'days' => $rows, 'success' => true]);
        break;

    case 'testConnection':
        $sql = "SELECT COUNT(*) as total FROM resource";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode([
            'success' => true,
            'message' => 'Connexion OK',
            'totalResources' => (int)$row['total']
        ]);
        break;

    default:
        echo json_encode([
            'error' => 'Action non reconnue',
            'availableActions' => ['getOverview', 'getActivityByDay', 'testConnection'],
            'usage' => 'test-analytics.php?action=getOverview'
        ]);
}
