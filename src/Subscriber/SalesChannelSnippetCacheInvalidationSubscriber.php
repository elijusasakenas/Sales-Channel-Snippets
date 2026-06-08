<?php declare(strict_types=1);

namespace SalesChannelSnippets\Subscriber;

use SalesChannelSnippets\Core\Content\SalesChannelSnippet\SalesChannelSnippetDefinition;
use Shopware\Core\Framework\Adapter\Cache\CacheInvalidator;
use Shopware\Core\Framework\DataAbstractionLayer\Event\EntityWrittenContainerEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class SalesChannelSnippetCacheInvalidationSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly CacheInvalidator $cacheInvalidator)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            EntityWrittenContainerEvent::class => 'invalidate',
        ];
    }

    public function invalidate(EntityWrittenContainerEvent $event): void
    {
        foreach ($event->getEvents() as $nestedEvent) {
            if (!\method_exists($nestedEvent, 'getEntityName')) {
                continue;
            }

            if ($nestedEvent->getEntityName() !== SalesChannelSnippetDefinition::ENTITY_NAME) {
                continue;
            }

            $this->cacheInvalidator->invalidate([
                'sales-channel-snippet',
                'translation',
                'snippet',
            ]);

            return;
        }
    }
}
