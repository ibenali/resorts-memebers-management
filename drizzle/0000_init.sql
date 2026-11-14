CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`member_id` int,
	`action` varchar(50) NOT NULL,
	`ip` varchar(45),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`member_id` int NOT NULL,
	`resort_id` int,
	`category` enum('general','resort','booking','website','other') NOT NULL,
	`subject` varchar(150) NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','read','answered') NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`member_no` varchar(20) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255),
	`password_hash` varchar(255) NOT NULL,
	`must_change_password` boolean NOT NULL DEFAULT false,
	`street` varchar(200),
	`postal_code` varchar(20),
	`city` varchar(100),
	`country` char(2),
	`failed_logins` int NOT NULL DEFAULT 0,
	`locked_until` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_member_no_unique` UNIQUE(`member_no`)
);
--> statement-breakpoint
CREATE TABLE `resorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(150) NOT NULL,
	`location` varchar(150) NOT NULL,
	`country` char(2) NOT NULL,
	`description` text NOT NULL,
	`amenities` json NOT NULL,
	`check_in_time` time NOT NULL DEFAULT '15:00:00',
	`check_out_time` time NOT NULL DEFAULT '10:00:00',
	`contact_phone` varchar(50),
	`contact_email` varchar(255),
	`image_url` varchar(500),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `resorts_id` PRIMARY KEY(`id`),
	CONSTRAINT `resorts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resort_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`type` enum('peak','high','low') NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`member_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`user_agent` varchar(255),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vacation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`member_id` int NOT NULL,
	`resort_id` int NOT NULL,
	`season_id` int,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`guests` tinyint unsigned NOT NULL,
	`note` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `vacation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_resort_id_resorts_id_fk` FOREIGN KEY (`resort_id`) REFERENCES `resorts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seasons` ADD CONSTRAINT `seasons_resort_id_resorts_id_fk` FOREIGN KEY (`resort_id`) REFERENCES `resorts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_member_id_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_resort_id_resorts_id_fk` FOREIGN KEY (`resort_id`) REFERENCES `resorts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_season_id_seasons_id_fk` FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_member_idx` ON `audit_log` (`member_id`);--> statement-breakpoint
CREATE INDEX `audit_ip_action_created_idx` ON `audit_log` (`ip`,`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `feedback_member_created_idx` ON `feedback` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `seasons_resort_start_idx` ON `seasons` (`resort_id`,`start_date`);--> statement-breakpoint
CREATE INDEX `sessions_member_idx` ON `sessions` (`member_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `vacation_member_created_idx` ON `vacation_requests` (`member_id`,`created_at`);