CREATE DATABASE IF NOT EXISTS `nsbm_event_hub` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `nsbm_event_hub`;

-- --------------------------------------------------------
-- Drop existing tables in correct dependency order
-- --------------------------------------------------------
DROP TABLE IF EXISTS `registrations`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `admins`;
-- Legacy cleanup (in case upgrading from old schema)
DROP TABLE IF EXISTS `users`;

-- --------------------------------------------------------
-- Table structure for `students`
-- Only students are stored here. Public registration inserts into this table.
-- --------------------------------------------------------
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `student_id` VARCHAR(50) NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT 'default-avatar.png',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `admins`
-- Only admins are stored here. Admins are manually created (no public registration).
-- --------------------------------------------------------
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT 'default-avatar.png',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `categories`
-- --------------------------------------------------------
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `icon` VARCHAR(50) DEFAULT 'bi-bookmark-star',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `events`
-- --------------------------------------------------------
CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `event_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `venue` VARCHAR(150) NOT NULL,
  `organizer` VARCHAR(150) NOT NULL,
  `max_participants` INT NOT NULL DEFAULT 100,
  `registration_deadline` DATETIME NOT NULL,
  `image` VARCHAR(500) NULL,
  `status` ENUM('upcoming', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_events_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `registrations`
-- Only students register for events, so user_id references students(id)
-- --------------------------------------------------------
CREATE TABLE `registrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `event_id` INT NOT NULL,
  `registration_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('confirmed', 'attended', 'cancelled') NOT NULL DEFAULT 'confirmed',
  `ticket_code` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_registrations_student` FOREIGN KEY (`user_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registrations_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uq_user_event` UNIQUE (`user_id`, `event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `announcements`
-- --------------------------------------------------------
CREATE TABLE `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(250) NOT NULL,
  `content` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- SEED DATA
-- --------------------------------------------------------

-- Insert Admin (manually created, password: Admin@123)
INSERT INTO `admins` (`id`, `full_name`, `email`, `password`) VALUES
(1, 'NSBM System Administrator', 'admin@nsbmeventhub.com', '$2y$10$K/giP6K380Z63oZvjN1lYOdn0H425eT5ugdVsgmCGLJueEXYZcUx6');

-- Insert Sample Student (password: Student@123)
INSERT INTO `students` (`id`, `full_name`, `student_id`, `email`, `phone`, `password`) VALUES
(1, 'Kasun Perera', 'NSBM-2024-0891', 'kasun.p@nsbmeventhub.com', '+94 77 123 4567', '$2y$10$Hg/q0PI24Sko6YVdBEIQBe5MJUL1YkjcDnIR7jOlahvOx38VQHxrK');

-- Insert Categories
INSERT INTO `categories` (`id`, `name`, `description`, `icon`) VALUES
(1, 'Technology & AI', 'Hackathons, coding summits, AI conferences, and tech innovation expos.', 'bi-cpu'),
(2, 'Academic & Research', 'Research symposia, guest lectures, curriculum seminars, and defense presentations.', 'bi-mortarboard'),
(3, 'Sports & Fitness', 'Inter-faculty tournaments, cricket matches, swimming galas, and marathons.', 'bi-trophy'),
(4, 'Cultural & Arts', 'Musical nights, drama productions, art exhibitions, and traditional celebrations.', 'bi-palette'),
(5, 'Career & Industry', 'Career fairs, internship drives, resume building workshops, and corporate networking.', 'bi-briefcase'),
(6, 'Workshops & Bootcamps', 'Hands-on practical training, cloud computing bootcamps, and design thinking workshops.', 'bi-tools'),
(7, 'Club Activities', 'Rotaract, IEEE, Leo Club, Gavel Club, and volunteer community initiatives.', 'bi-people');

-- Insert Sample Event (1 Event Only)
INSERT INTO `events` (`id`, `category_id`, `title`, `description`, `event_date`, `start_time`, `end_time`, `venue`, `organizer`, `max_participants`, `registration_deadline`, `image`, `status`) VALUES
(1, 1, 'NSBM Hackfest 2026: AI & Web3 Innovation Summit', 'Join the largest university hackathon of the year! Build ground-breaking AI, blockchain, and full-stack solutions over a 24-hour sprint. Mentorship from top industry tech leads, cash prizes worth over LKR 500,000, and direct internship opportunities.', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00:00', '18:00:00', 'Computing Faculty Auditorium (FOC-Aud 01)', 'Faculty of Computing & IEEE Student Branch', 120, DATE_ADD(NOW(), INTERVAL 6 DAY), 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80', 'upcoming');

-- Insert Sample Registration (1 Registration Only)
INSERT INTO `registrations` (`id`, `user_id`, `event_id`, `registration_date`, `status`, `ticket_code`) VALUES
(1, 1, 1, DATE_SUB(NOW(), INTERVAL 2 DAY), 'confirmed', 'TKT-NSBM-2026-HACK01');

-- Insert Sample Announcement (1 Announcement Only)
INSERT INTO `announcements` (`id`, `title`, `content`, `priority`, `status`, `created_at`) VALUES
(1, 'NSBM Hackfest 2026 Team Registrations Open', 'Attention all Computing and Engineering students: The registration portal for NSBM Hackfest 2026 is officially open. Teams of up to 4 members are encouraged. Limited to 120 participants due to laboratory capacity.', 'high', 'published', DATE_SUB(NOW(), INTERVAL 2 DAY));
