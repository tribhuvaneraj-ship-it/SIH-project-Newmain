CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`customerId` int NOT NULL,
	`workerId` int NOT NULL,
	`status` enum('scheduled','on_the_way','arrived','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`totalAmount` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`customerId` int NOT NULL,
	`workerId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`groupName` varchar(80) NOT NULL,
	`icon` varchar(40) NOT NULL,
	`accent` varchar(40) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `serviceCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `serviceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`workerId` int,
	`categoryId` int,
	`serviceName` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`address` text NOT NULL,
	`preferredDate` varchar(32) NOT NULL,
	`preferredTime` varchar(32) NOT NULL,
	`budget` int,
	`status` enum('open','accepted','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`category` varchar(120) NOT NULL,
	`bio` text,
	`neighborhood` varchar(120) NOT NULL,
	`city` varchar(120) NOT NULL,
	`yearsExperience` int NOT NULL DEFAULT 1,
	`rating` int NOT NULL DEFAULT 480,
	`totalJobs` int NOT NULL DEFAULT 0,
	`verified` int NOT NULL DEFAULT 0,
	`available` int NOT NULL DEFAULT 1,
	`hourlyRate` int NOT NULL DEFAULT 450,
	`avatarUrl` text,
	`skills` text,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workerProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('customer','worker','cooperative') DEFAULT 'customer' NOT NULL;