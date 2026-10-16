-- CreateTable
CREATE TABLE `image_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source` ENUM('animal_photo', 'market_photo') NOT NULL,
    `source_id` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `animal_id` INTEGER NULL,
    `listing_id` INTEGER NULL,
    `farm_id` INTEGER NULL,
    `uploader_id` INTEGER NULL,
    `sha256` CHAR(64) NULL,
    `phash` CHAR(16) NULL,
    `mime_type` VARCHAR(50) NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `file_size` INTEGER NULL,
    `metadata_status` VARCHAR(20) NOT NULL DEFAULT 'unknown',
    `camera_make` VARCHAR(100) NULL,
    `camera_model` VARCHAR(100) NULL,
    `software` VARCHAR(150) NULL,
    `captured_at` DATETIME(3) NULL,
    `has_gps` BOOLEAN NOT NULL DEFAULT false,
    `c2pa_present` BOOLEAN NOT NULL DEFAULT false,
    `exif_json` JSON NULL,
    `quality` JSON NULL,
    `ai_status` VARCHAR(20) NOT NULL DEFAULT 'not_run',
    `ai_detector` VARCHAR(100) NULL,
    `ai_detector_version` VARCHAR(50) NULL,
    `ai_score` DOUBLE NULL,
    `ai_threshold` DOUBLE NULL,
    `flags` VARCHAR(500) NOT NULL DEFAULT '',
    `analysis_status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `analysis_version` VARCHAR(40) NULL,
    `analysis_error` VARCHAR(255) NULL,
    `analyzed_at` DATETIME(3) NULL,
    `review_status` ENUM('pending', 'needs_review', 'reviewed', 'confirmed_issue', 'inconclusive') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `image_records_sha256_idx`(`sha256`),
    INDEX `image_records_phash_idx`(`phash`),
    INDEX `image_records_review_status_idx`(`review_status`),
    INDEX `image_records_metadata_status_idx`(`metadata_status`),
    INDEX `image_records_animal_id_idx`(`animal_id`),
    INDEX `image_records_listing_id_idx`(`listing_id`),
    INDEX `image_records_farm_id_idx`(`farm_id`),
    UNIQUE INDEX `image_records_source_source_id_key`(`source`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image_matches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image_id` INTEGER NOT NULL,
    `matched_image_id` INTEGER NOT NULL,
    `match_type` ENUM('exact', 'perceptual') NOT NULL,
    `method` VARCHAR(40) NOT NULL,
    `score` DOUBLE NOT NULL,
    `evidence` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `image_matches_matched_image_id_idx`(`matched_image_id`),
    UNIQUE INDEX `image_matches_image_id_matched_image_id_match_type_key`(`image_id`, `matched_image_id`, `match_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NOT NULL,
    `decision` VARCHAR(20) NOT NULL,
    `from_status` ENUM('pending', 'needs_review', 'reviewed', 'confirmed_issue', 'inconclusive') NOT NULL,
    `to_status` ENUM('pending', 'needs_review', 'reviewed', 'confirmed_issue', 'inconclusive') NOT NULL,
    `reason` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `image_reviews_image_id_idx`(`image_id`),
    INDEX `image_reviews_reviewer_id_idx`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

