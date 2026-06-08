<?php declare(strict_types=1);

namespace SalesChannelSnippets\Core\Content\SalesChannelSnippet;

use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;

/**
 * @extends EntityCollection<SalesChannelSnippetEntity>
 */
class SalesChannelSnippetCollection extends EntityCollection
{
    protected function getExpectedClass(): string
    {
        return SalesChannelSnippetEntity::class;
    }
}
