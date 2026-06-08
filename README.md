# Sales Channel Snippets

Shopware 6 plugin for Admin-managed snippet overrides per sales channel and language.

## What it does

- Adds a custom `sales_channel_snippet` entity.
- Stores one override per sales channel, language, and snippet key.
- Adds an Administration settings module.
- Decorates the Symfony/Shopware translator in storefront requests.
- Falls back to the default Shopware snippet when no override exists.

## Example

| Sales channel | Language | Snippet key | Custom value |
| --- | --- | --- | --- |
| B2C Storefront | English | `checkout.confirmSubmit` | `Buy now` |
| B2B Storefront | English | `checkout.confirmSubmit` | `Request order` |

## Installation

Copy the plugin into `custom/plugins/SalesChannelSnippets`, then run:

```bash
bin/console plugin:refresh
bin/console plugin:install --activate SalesChannelSnippets
bin/console database:migrate SalesChannelSnippets
bin/console cache:clear
bin/console administration:build
```

The module appears under Settings > Extensions > Sales Channel Snippets.

## Notes

This plugin intentionally keeps the default snippet system as the fallback source. Only keys saved in the custom module are overridden for the active storefront sales channel and language.
