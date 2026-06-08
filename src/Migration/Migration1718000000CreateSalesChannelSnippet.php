<?php declare(strict_types=1);

namespace SalesChannelSnippets\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration1718000000CreateSalesChannelSnippet extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1718000000;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement('
            CREATE TABLE IF NOT EXISTS `sales_channel_snippet` (
                `id` BINARY(16) NOT NULL,
                `sales_channel_id` BINARY(16) NOT NULL,
                `language_id` BINARY(16) NOT NULL,
                `translation_key` VARCHAR(255) NOT NULL,
                `value` LONGTEXT NOT NULL,
                `created_at` DATETIME(3) NOT NULL,
                `updated_at` DATETIME(3) NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uniq.sales_channel_snippet.assignment` (`sales_channel_id`, `language_id`, `translation_key`),
                KEY `idx.sales_channel_snippet.sales_channel_id` (`sales_channel_id`),
                KEY `idx.sales_channel_snippet.language_id` (`language_id`),
                CONSTRAINT `fk.sales_channel_snippet.sales_channel_id`
                    FOREIGN KEY (`sales_channel_id`) REFERENCES `sales_channel` (`id`)
                    ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT `fk.sales_channel_snippet.language_id`
                    FOREIGN KEY (`language_id`) REFERENCES `language` (`id`)
                    ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ');
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
