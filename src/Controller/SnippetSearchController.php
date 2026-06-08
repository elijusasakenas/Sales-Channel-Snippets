<?php declare(strict_types=1);

namespace SalesChannelSnippets\Controller;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Uuid\Uuid;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route(defaults: ['_routeScope' => ['api']])]
class SnippetSearchController extends AbstractController
{
    public function __construct(private readonly Connection $connection)
    {
    }

    #[Route(
        path: '/api/_action/sales-channel-snippets/snippet-search',
        name: 'api.action.sales_channel_snippets.snippet_search',
        defaults: ['_acl' => ['system.system_config']],
        methods: ['GET']
    )]
    public function search(Request $request): JsonResponse
    {
        $term = trim((string) $request->query->get('term', ''));
        $languageId = (string) $request->query->get('languageId', '');

        if ($term === '' || !Uuid::isValid($languageId)) {
            return new JsonResponse(['data' => []]);
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT
                `snippet`.`translation_key` AS `translationKey`,
                `snippet`.`value` AS `value`,
                `snippet_set`.`name` AS `snippetSetName`,
                `snippet_set`.`iso` AS `locale`
             FROM `snippet`
             INNER JOIN `snippet_set` ON `snippet`.`snippet_set_id` = `snippet_set`.`id`
             INNER JOIN `language` ON `language`.`id` = :languageId
             INNER JOIN `locale` ON `language`.`locale_id` = `locale`.`id`
             WHERE `snippet_set`.`iso` = `locale`.`code`
               AND (
                    `snippet`.`translation_key` LIKE :term
                    OR `snippet`.`value` LIKE :term
               )
             ORDER BY `snippet`.`translation_key` ASC
             LIMIT 25',
            [
                'languageId' => Uuid::fromHexToBytes($languageId),
                'term' => '%' . $term . '%',
            ]
        );

        return new JsonResponse(['data' => $rows]);
    }
}
