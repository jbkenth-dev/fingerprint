-- Create database and users table for Francis Key demo
CREATE DATABASE IF NOT EXISTS francis_key CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE francis_key;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Active',
  firstName VARCHAR(128) NOT NULL,
  middleName VARCHAR(128) DEFAULT NULL,
  lastName VARCHAR(128) NOT NULL,
  idNumber VARCHAR(128) DEFAULT NULL UNIQUE,
  username VARCHAR(128) DEFAULT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(64) DEFAULT NULL,
  smartCardId VARCHAR(64) DEFAULT NULL,
  fingerprintId VARCHAR(64) DEFAULT NULL,
  department VARCHAR(255) DEFAULT NULL
);

-- Insert initial sample users (matching mockData.js)
INSERT INTO users (role, status, firstName, middleName, lastName, idNumber, username, email, password, phone, smartCardId, fingerprintId, department) VALUES
('admin','Active','Francis','Santos','Key','ADM-0001','admin','admin@franciskey.local','francis123','09171234567','FK-ADM-001','BIO-ADM-01','System Administration'),
('faculty','Active','Andrea','Lopez','Mendoza','FAC-0102','andrea.mendoza','andrea.mendoza@franciskey.local','andrea123','09181234567','FK-FAC-102','BIO-FAC-12','College of Computing'),
('faculty','Active','Luis','Garcia','Ramos','FAC-0215','luis.ramos','luis.ramos@franciskey.local','luis123','09192345678','FK-FAC-215','BIO-FAC-24','Engineering'),
('student','Active','Mika','Cruz','Santos','STU-0901','mika.santos','mika.santos@student.franciskey.local','mika123','09981234567','FK-STU-901','BIO-STU-93','BSIT 3A'),
('student','Inactive','Paolo','Diaz','Reyes','STU-0774','paolo.reyes','paolo.reyes@student.franciskey.local','paolo123','09992345678','FK-STU-774','BIO-STU-74','BSCS 2B');

CREATE TABLE IF NOT EXISTS class_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subjectCode VARCHAR(100) NOT NULL UNIQUE,
  subjectName VARCHAR(255) NOT NULL,
  yearLevel VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sectionName VARCHAR(1) NOT NULL,
  yearLevel VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  days VARCHAR(64) NOT NULL,
  subjectId INT NOT NULL,
  subjectCode VARCHAR(100) NOT NULL,
  subjectName VARCHAR(255) NOT NULL,
  startTime TIME NOT NULL,
  endTime TIME NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_schedule_subject (sectionName, yearLevel, semester, subjectId),
  CONSTRAINT fk_class_schedules_subject FOREIGN KEY (subjectId) REFERENCES class_subjects(id) ON DELETE CASCADE
);
