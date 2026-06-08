<?php declare(strict_types=1);

namespace SalesChannelSnippets\Core\Content\SalesChannelSnippet;

use Shopware\Core\Framework\DataAbstractionLayer\EntityDefinition;
use Shopware\Core\Framework\DataAbstractionLayer\Field\CreatedAtField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\FkField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\ApiAware;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\PrimaryKey;
use Shopware\Core\Framework\DataAbstractionLayer\Field\Flag\Required;
use Shopware\Core\Framework\DataAbstractionLayer\Field\IdField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\LongTextField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\ManyToOneAssociationField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\StringField;
use Shopware\Core\Framework\DataAbstractionLayer\Field\UpdatedAtField;
use Shopware\Core\Framework\DataAbstractionLayer\FieldCollection;
use Shopware\Core\System\Language\LanguageDefinition;
use Shopware\Core\System\SalesChannel\SalesChannelDefinition;

class SalesChannelSnippetDefinition extends EntityDefinition
{
    public const ENTITY_NAME = 'sales_channel_snippet';
    public const TABLE_NAME = 'sales_channel_snippet';
    public const CACHE_TAG = 'sales-channel-snippet';

    public function getEntityName(): string
    {
        return self::ENTITY_NAME;
    }

    public function getEntityClass(): string
    {
        return SalesChannelSnippetEntity::class;
    }

    public function getCollectionClass(): string
    {
        return SalesChannelSnippetCollection::class;
    }

    protected function defineFields(): FieldCollection
    {
        return new FieldCollection([
            (new IdField('id', 'id'))->addFlags(new Required(), new PrimaryKey(), new ApiAware()),
            (new FkField('sales_channel_id', 'salesChannelId', SalesChannelDefinition::class))->addFlags(new Required(), new ApiAware()),
            (new FkField('language_id', 'languageId', LanguageDefinition::class))->addFlags(new Required(), new ApiAware()),
            (new StringField('translation_key', 'translationKey'))->addFlags(new Required(), new ApiAware()),
            (new LongTextField('value', 'value'))->addFlags(new Required(), new ApiAware()),
            (new ManyToOneAssociationField('salesChannel', 'sales_channel_id', SalesChannelDefinition::class, 'id', false))->addFlags(new ApiAware()),
            (new ManyToOneAssociationField('language', 'language_id', LanguageDefinition::class, 'id', false))->addFlags(new ApiAware()),
            (new CreatedAtField())->addFlags(new ApiAware()),
            (new UpdatedAtField())->addFlags(new ApiAware()),
        ]);
    }
}
