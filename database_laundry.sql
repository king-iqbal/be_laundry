-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: db_cucian
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `antar_jemput`
--

DROP TABLE IF EXISTS `antar_jemput`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `antar_jemput` (
  `Nomor_id` int NOT NULL AUTO_INCREMENT,
  `pesanan_id` int NOT NULL,
  `tipe` enum('jemput','antar') NOT NULL,
  `status_aj` enum('perlu_dijemput','siap_diantar','selesai') DEFAULT 'perlu_dijemput',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Nomor_id`),
  KEY `pesanan_id` (`pesanan_id`),
  CONSTRAINT `antar_jemput_ibfk_1` FOREIGN KEY (`pesanan_id`) REFERENCES `pesanan` (`Nomor_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `antar_jemput`
--

LOCK TABLES `antar_jemput` WRITE;
/*!40000 ALTER TABLE `antar_jemput` DISABLE KEYS */;
INSERT INTO `antar_jemput` VALUES (1,1,'jemput','siap_diantar','2026-05-09 06:00:18');
/*!40000 ALTER TABLE `antar_jemput` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nota`
--

DROP TABLE IF EXISTS `nota`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nota` (
  `nomor_id` int NOT NULL AUTO_INCREMENT,
  `pesanan_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nomor_id`),
  UNIQUE KEY `pesanan_id` (`pesanan_id`),
  CONSTRAINT `nota_ibfk_1` FOREIGN KEY (`pesanan_id`) REFERENCES `pesanan` (`Nomor_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nota`
--

LOCK TABLES `nota` WRITE;
/*!40000 ALTER TABLE `nota` DISABLE KEYS */;
INSERT INTO `nota` VALUES (1,1,'2026-05-09 06:00:18'),(2,5,'2026-05-18 15:54:28');
/*!40000 ALTER TABLE `nota` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pesanan`
--

DROP TABLE IF EXISTS `pesanan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pesanan` (
  `Nomor_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `jenis_layanan` enum('reguler','kilat') NOT NULL,
  `metode_pembayaran` enum('tunai','qris') NOT NULL,
  `berat_kg` decimal(5,2) DEFAULT '0.00',
  `harga_per_kg` int DEFAULT '0',
  `total_harga` int GENERATED ALWAYS AS (round((`berat_kg` * `harga_per_kg`),0)) STORED,
  `tgl_masuk` date NOT NULL,
  `tgl_selesai` date DEFAULT NULL,
  `status` enum('belum_dicuci','sedang_dicuci','belum_bayar','siap_diantar','selesai') DEFAULT 'belum_dicuci',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Nomor_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `pesanan_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pesanan`
--

LOCK TABLES `pesanan` WRITE;
/*!40000 ALTER TABLE `pesanan` DISABLE KEYS */;
INSERT INTO `pesanan` (`Nomor_id`, `user_id`, `jenis_layanan`, `metode_pembayaran`, `berat_kg`, `harga_per_kg`, `tgl_masuk`, `tgl_selesai`, `status`, `created_at`) VALUES (1,2,'kilat','qris',3.00,7000,'2026-06-29',NULL,'selesai','2026-05-09 06:00:18'),(4,5,'reguler','tunai',3.50,6000,'2026-05-18',NULL,'belum_dicuci','2026-05-18 14:27:53'),(5,5,'reguler','tunai',5.00,6000,'2026-05-18',NULL,'belum_dicuci','2026-05-18 15:54:28');
/*!40000 ALTER TABLE `pesanan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `no_hp` varchar(20) DEFAULT NULL,
  `alamat` text,
  `role` enum('admin','customer') DEFAULT 'customer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'Naufal Hilmi','naufal@gmail.com','hashed_password','0815-2579-8763','Jln. Taman Siswa No. 10, Sekaran','customer','2026-05-09 06:00:18'),(4,'Ridwan','ridwanajah@gmail.com','apacoba','0888777666','Jln, Asolole','admin','2026-05-09 06:12:18'),(5,'Jidad','admin77@cucian.com','hashed_password','081999999','Jl. Laundry No. 77','admin','2026-05-09 06:14:23'),(7,'Dede','customer666@cucian.com','hashed_password','081111111','Jl. Laundry No. 65','customer','2026-05-09 06:15:12'),(8,'Ray','rayray@cucian.com','hashed_password','08666666','Jl. Laundry No. 456','customer','2026-05-09 06:16:00'),(9,'Iqbals','customer7878@cucian.com','hashed_password','08456456','Jl. Laundry No. 76','customer','2026-05-09 06:21:24'),(10,'Kamto','kamtogaming@cucian.com','hashed_password','08123123','Jl. Laundry No. 67','customer','2026-05-09 06:00:18');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-26  7:45:28
