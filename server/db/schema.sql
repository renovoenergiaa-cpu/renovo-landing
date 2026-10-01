CREATE TABLE IF NOT EXISTS `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`active` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tracking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`name` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`status` text NOT NULL,
	`consent` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `leads_request_id_unique` ON `leads` (`request_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `webhook_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `calculator_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `simulations` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`result` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `idx_outbox_status` ON `webhook_outbox` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_simulations_lead_id` ON `simulations` (`lead_id`);