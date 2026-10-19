-- CreateTable
CREATE TABLE `cow_identity_queries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requested_by` INTEGER NOT NULL,
    `photo_path` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cow_identity_queries_requested_by_idx`(`requested_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cow_identity_candidates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `query_id` INTEGER NOT NULL,
    `animal_id` INTEGER NOT NULL,
    `rank` INTEGER NOT NULL,
    `similarity` DOUBLE NOT NULL,
    `reference_index` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cow_identity_candidates_query_id_idx`(`query_id`),
    INDEX `cow_identity_candidates_animal_id_idx`(`animal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cow_identity_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NOT NULL,
    `decision` ENUM('same_animal', 'different_animals', 'inconclusive') NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cow_identity_reviews_candidate_id_idx`(`candidate_id`),
    INDEX `cow_identity_reviews_reviewer_id_idx`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

