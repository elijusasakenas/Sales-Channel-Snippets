# Contributing

Thanks for helping improve Sales Channel Snippets.

## Maintainer

This plugin is maintained by Elijus Asakenas.

## How to contribute

1. Fork the repository and create a focused branch.
2. Keep changes small and related to one topic.
3. Follow the existing Shopware 6 plugin structure and coding style.
4. Test the plugin in a local Shopware 6.6 or 6.7 installation.
5. Open a pull request with a short description of the change and the checks you ran.

## Local checks

Before opening a pull request, run the checks that apply to your change:

```bash
composer validate --no-check-publish
php -l src/SalesChannelSnippets.php
bin/console cache:clear
bin/console administration:build
```

If a check cannot be run, mention why in the pull request.

## Bug reports

When reporting a bug, include:

- Shopware version
- PHP version
- Plugin version or commit
- Steps to reproduce
- Expected and actual behavior

## License

By contributing, you agree that your contribution will be licensed under the MIT License.
