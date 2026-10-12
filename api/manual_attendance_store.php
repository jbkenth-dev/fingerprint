<?php
function ensure_manual_attendance_store(PDO $pdo): void {
    $pdo->exec('CREATE TABLE IF NOT EXISTS faculty_manual_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        scheduleId INT NOT NULL,
        userId INT NOT NULL,
        idNumber VARCHAR(128) DEFAULT NULL,
        name VARCHAR(384) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT "student",
        logDate DATE NOT NULL,
        logTime TIME NOT NULL,
        status VARCHAR(8) NOT NULL,
        deviceId VARCHAR(64) NOT NULL,
        fingerprintId VARCHAR(64) NOT NULL,
        smartCardId VARCHAR(64) NOT NULL,
        source VARCHAR(32) NOT NULL,
        localRecordId VARCHAR(128) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY manual_record (deviceId, localRecordId),
        INDEX manual_date (logDate),
        INDEX manual_class (scheduleId, userId, logDate)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
}

function manual_public_record(array $record): array {
    $record['id'] = 'manual-' . $record['id'];
    return $record;
}
