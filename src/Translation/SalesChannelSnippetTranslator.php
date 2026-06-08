<?php declare(strict_types=1);

namespace SalesChannelSnippets\Translation;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\PlatformRequest;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Translation\MessageCatalogueInterface;
use Symfony\Component\Translation\TranslatorBagInterface;
use Symfony\Contracts\Translation\LocaleAwareInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class SalesChannelSnippetTranslator implements TranslatorInterface, LocaleAwareInterface, TranslatorBagInterface
{
    /**
     * @var array<string, string|null>
     */
    private array $snippetCache = [];

    public function __construct(
        private readonly TranslatorInterface $inner,
        private readonly Connection $connection,
        private readonly RequestStack $requestStack
    ) {
    }

    public function trans($id, array $parameters = [], $domain = null, $locale = null): string
    {
        if (!\is_string($id) || $id === '') {
            return $this->inner->trans($id, $parameters, $domain, $locale);
        }

        $request = $this->requestStack->getCurrentRequest();
        $salesChannelId = $this->getSalesChannelId($request);
        $languageId = $this->getLanguageId($request);

        if ($salesChannelId === null || $languageId === null) {
            return $this->inner->trans($id, $parameters, $domain, $locale);
        }

        $snippet = $this->findSnippet($salesChannelId, $languageId, $id);

        if ($snippet === null) {
            return $this->inner->trans($id, $parameters, $domain, $locale);
        }

        return $this->replaceParameters($snippet, $parameters);
    }

    public function setLocale($locale): void
    {
        if ($this->inner instanceof LocaleAwareInterface) {
            $this->inner->setLocale($locale);
        }
    }

    public function getLocale(): string
    {
        if ($this->inner instanceof LocaleAwareInterface) {
            return $this->inner->getLocale();
        }

        return 'en-GB';
    }

    public function getCatalogue($locale = null): MessageCatalogueInterface
    {
        if (!$this->inner instanceof TranslatorBagInterface) {
            throw new \BadMethodCallException('The decorated translator does not expose catalogues.');
        }

        return $this->inner->getCatalogue($locale);
    }

    public function getCatalogues(): array
    {
        if (!$this->inner instanceof TranslatorBagInterface) {
            return [];
        }

        return $this->inner->getCatalogues();
    }

    private function findSnippet(string $salesChannelId, string $languageId, string $translationKey): ?string
    {
        $cacheKey = $salesChannelId . ':' . $languageId . ':' . $translationKey;

        if (\array_key_exists($cacheKey, $this->snippetCache)) {
            return $this->snippetCache[$cacheKey];
        }

        if (!Uuid::isValid($salesChannelId) || !Uuid::isValid($languageId)) {
            $this->snippetCache[$cacheKey] = null;

            return $this->snippetCache[$cacheKey];
        }

        try {
            $snippet = $this->connection->fetchOne(
                'SELECT `value`
                 FROM `sales_channel_snippet`
                 WHERE `sales_channel_id` = :salesChannelId
                   AND `language_id` = :languageId
                   AND `translation_key` = :translationKey
                 LIMIT 1',
                [
                    'salesChannelId' => Uuid::fromHexToBytes($salesChannelId),
                    'languageId' => Uuid::fromHexToBytes($languageId),
                    'translationKey' => $translationKey,
                ]
            );
        } catch (\Throwable) {
            $this->snippetCache[$cacheKey] = null;

            return $this->snippetCache[$cacheKey];
        }

        $this->snippetCache[$cacheKey] = \is_string($snippet) ? $snippet : null;

        return $this->snippetCache[$cacheKey];
    }

    private function getSalesChannelId(?Request $request): ?string
    {
        if ($request === null) {
            return null;
        }

        $salesChannelId = $request->attributes->get(PlatformRequest::ATTRIBUTE_SALES_CHANNEL_ID);

        if (\is_string($salesChannelId)) {
            return $salesChannelId;
        }

        $salesChannelContext = $request->attributes->get(PlatformRequest::ATTRIBUTE_SALES_CHANNEL_CONTEXT_OBJECT);

        if ($salesChannelContext instanceof SalesChannelContext) {
            return $salesChannelContext->getSalesChannelId();
        }

        return null;
    }

    private function getLanguageId(?Request $request): ?string
    {
        if ($request === null) {
            return null;
        }

        $salesChannelContext = $request->attributes->get(PlatformRequest::ATTRIBUTE_SALES_CHANNEL_CONTEXT_OBJECT);

        if (!$salesChannelContext instanceof SalesChannelContext) {
            return null;
        }

        return $salesChannelContext->getLanguageId();
    }

    /**
     * Shopware/Symfony snippets commonly use placeholders such as %count% or %name%.
     */
    private function replaceParameters(string $message, array $parameters): string
    {
        $replacements = [];

        foreach ($parameters as $key => $value) {
            if (\is_scalar($value) || $value === null) {
                $replacements[$key] = (string) $value;
            }
        }

        return strtr($message, $replacements);
    }
}
