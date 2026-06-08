import template from './sales-channel-snippet-list.html.twig';
import './sales-channel-snippet-list.scss';

const { Component, Context, Mixin } = Shopware;
const { Criteria } = Shopware.Data;

const SALES_CHANNEL_SNIPPET_ENTITY = 'sales_channel_snippet';
const SALES_CHANNEL_SNIPPET_API_ROUTE = 'sales-channel-snippet';
const INLINE_SEARCH_DELAY = 300;
const INLINE_SEARCH_MIN_LENGTH = 2;
const SNIPPET_SEARCH_LIMIT = 50;
const SNIPPET_RESULT_LIMIT = 25;
const OVERRIDE_LIST_LIMIT = 100;

Component.register('sales-channel-snippet-list', {
    template,

    mixins: [
        Mixin.getByName('notification'),
    ],

    inject: [
        'repositoryFactory',
    ],

    data() {
        return {
            filters: {
                salesChannelId: null,
                languageId: null,
            },
            snippets: [],
            deletedSnippetIds: [],
            persistedSnippetIds: [],
            isLoading: false,
            processSuccess: false,
            loadError: false,
            snippetSearchResults: {},
            snippetSearchLoading: {},
            snippetSearchTimers: {},
            selectedLocaleCode: null,
        };
    },

    computed: {
        canEdit() {
            return this.filters.salesChannelId && this.filters.languageId;
        },
    },

    created() {
        this.httpClient = Shopware.Application.getContainer('init').httpClient;
        this.languageRepository = this.repositoryFactory.create('language');
        this.snippetRepository = this.repositoryFactory.create('snippet');
    },

    methods: {
        async loadSnippets() {
            if (!this.canEdit) {
                this.snippets = [];
                this.persistedSnippetIds = [];
                this.isLoading = false;
                this.loadError = false;
                return;
            }

            this.isLoading = true;
            this.loadError = false;

            const criteria = new Criteria(1, OVERRIDE_LIST_LIMIT);
            criteria.addFilter(Criteria.equals('salesChannelId', this.filters.salesChannelId));
            criteria.addFilter(Criteria.equals('languageId', this.filters.languageId));
            criteria.addSorting(Criteria.sort('translationKey', 'ASC'));

            try {
                this.snippets = await this.searchSalesChannelSnippets(criteria);
                this.persistedSnippetIds = this.snippets.map((snippet) => snippet.id);
                this.clearSnippetSearchState();
            } catch (error) {
                this.snippets = [];
                this.persistedSnippetIds = [];
                this.loadError = true;
                this.createNotificationError({
                    message: this.$tc('sales-channel-snippets.notifications.loadError'),
                });
            } finally {
                this.isLoading = false;
            }
        },

        onFilterChange() {
            this.deletedSnippetIds = [];
            this.persistedSnippetIds = [];
            this.selectedLocaleCode = null;
            this.clearSnippetSearchState();
            this.loadSnippets();
        },

        addSnippet() {
            if (!this.canEdit) {
                return;
            }

            this.snippets.unshift(this.createSnippet());
        },

        createSnippet(defaults = {}) {
            return {
                id: defaults.id || this.createEntityId(),
                salesChannelId: defaults.salesChannelId || this.filters.salesChannelId,
                languageId: defaults.languageId || this.filters.languageId,
                translationKey: defaults.translationKey || '',
                value: defaults.value || '',
            };
        },

        onSnippetKeyInput(snippet) {
            const searchKey = this.getSnippetSearchKey(snippet);
            const term = (snippet.translationKey || '').trim();

            this.clearSnippetSearchTimer(searchKey);

            if (!this.filters.languageId || term.length < INLINE_SEARCH_MIN_LENGTH) {
                this.setSnippetSearchResults(searchKey, []);
                this.setSnippetSearchLoading(searchKey, false);
                return;
            }

            this.setSnippetSearchLoading(searchKey, true);

            this.snippetSearchTimers = {
                ...this.snippetSearchTimers,
                [searchKey]: window.setTimeout(() => {
                    this.searchExistingSnippets(snippet, searchKey, term);
                }, INLINE_SEARCH_DELAY),
            };
        },

        removeSnippet(snippet) {
            if (snippet.id && this.persistedSnippetIds.includes(snippet.id)) {
                this.deletedSnippetIds.push(snippet.id);
            }

            this.clearSnippetSearchTimer(this.getSnippetSearchKey(snippet));
            this.snippets = this.snippets.filter((candidate) => candidate !== snippet);
        },

        async onSave() {
            if (!this.canEdit) {
                return;
            }

            this.isLoading = true;
            this.processSuccess = false;
            this.loadError = false;

            try {
                const snippetsToSave = this.snippets.filter((snippet) => {
                    return snippet.translationKey && snippet.translationKey.trim() && snippet.value !== null;
                });

                await Promise.all(this.deletedSnippetIds.map((id) => this.deleteSnippet(id)));

                await this.upsertSalesChannelSnippets(snippetsToSave);

                this.deletedSnippetIds = [];
                this.processSuccess = true;
                await this.loadSnippets();
            } catch (error) {
                this.createNotificationError({
                    message: this.$tc('sales-channel-snippets.notifications.saveError'),
                });
            } finally {
                this.isLoading = false;
            }
        },

        async searchSalesChannelSnippets(criteria) {
            const response = await this.httpClient.post(
                `/search/${SALES_CHANNEL_SNIPPET_API_ROUTE}`,
                criteria.parse(),
                {
                    headers: this.getJsonHeaders(),
                },
            );

            return (response.data.data || []).map((item) => {
                const attributes = item.attributes || {};

                return this.createSnippet({
                    id: item.id,
                    salesChannelId: attributes.salesChannelId,
                    languageId: attributes.languageId,
                    translationKey: attributes.translationKey,
                    value: attributes.value,
                });
            });
        },

        async upsertSalesChannelSnippets(snippets) {
            const payload = snippets.map((snippet) => {
                return {
                    id: snippet.id,
                    salesChannelId: this.filters.salesChannelId,
                    languageId: this.filters.languageId,
                    translationKey: snippet.translationKey.trim(),
                    value: snippet.value,
                };
            });

            if (payload.length === 0) {
                return;
            }

            await this.httpClient.post(
                '/_action/sync',
                {
                    'sales-channel-snippet-upsert': {
                        entity: SALES_CHANNEL_SNIPPET_ENTITY,
                        action: 'upsert',
                        payload,
                    },
                },
                {
                    headers: this.getJsonHeaders(),
                },
            );
        },

        async searchExistingSnippets(snippet, searchKey, term) {
            try {
                const localeCode = await this.getSelectedLocaleCode();
                const results = await this.searchSnippetRepository(localeCode, term);

                if ((snippet.translationKey || '').trim() !== term) {
                    return;
                }

                this.setSnippetSearchResults(searchKey, results);
            } catch (error) {
                this.setSnippetSearchResults(searchKey, []);
                this.createNotificationError({
                    message: this.$tc('sales-channel-snippets.notifications.searchError'),
                });
            } finally {
                this.setSnippetSearchLoading(searchKey, false);
            }
        },

        async getSelectedLocaleCode() {
            if (this.selectedLocaleCode) {
                return this.selectedLocaleCode;
            }

            const criteria = new Criteria(1, 1);
            criteria.addAssociation('locale');

            const language = await this.languageRepository.get(
                this.filters.languageId,
                Context.api,
                criteria,
            );

            this.selectedLocaleCode = language.locale.code;

            return this.selectedLocaleCode;
        },

        async searchSnippetRepository(localeCode, term) {
            const normalizedTerm = this.normalizeSearchTerm(term);
            const [keyResults, valueResults] = await Promise.all([
                this.searchSnippetField(localeCode, normalizedTerm, 'translationKey'),
                this.searchSnippetField(localeCode, normalizedTerm, 'value'),
            ]);

            return this.rankSnippetSearchResults(
                this.mergeSnippetSearchResults([...keyResults, ...valueResults]),
                normalizedTerm,
            ).slice(0, SNIPPET_RESULT_LIMIT);
        },

        async searchSnippetField(localeCode, term, field) {
            const criteria = new Criteria(1, SNIPPET_SEARCH_LIMIT);

            criteria.addAssociation('set');
            criteria.addFilter(Criteria.equals('set.iso', localeCode));
            criteria.addFilter(Criteria.contains(field, term));
            criteria.addSorting(Criteria.sort('translationKey', 'ASC'));

            const result = await this.snippetRepository.search(criteria, Context.api);

            return result.map((snippet) => {
                return {
                    translationKey: snippet.translationKey,
                    value: snippet.value,
                    snippetSetName: snippet.set ? snippet.set.name : '',
                    locale: snippet.set ? snippet.set.iso : localeCode,
                };
            });
        },

        mergeSnippetSearchResults(results) {
            return Object.values(results.reduce((merged, result) => {
                merged[`${result.locale}:${result.translationKey}`] = result;

                return merged;
            }, {}));
        },

        rankSnippetSearchResults(results, term) {
            const lowerTerm = term.toLowerCase();

            return results.sort((first, second) => {
                const firstScore = this.getSnippetSearchScore(first, lowerTerm);
                const secondScore = this.getSnippetSearchScore(second, lowerTerm);

                if (firstScore !== secondScore) {
                    return firstScore - secondScore;
                }

                return first.translationKey.localeCompare(second.translationKey);
            });
        },

        getSnippetSearchScore(result, lowerTerm) {
            const key = (result.translationKey || '').toLowerCase();
            const value = (result.value || '').toLowerCase();

            if (key === lowerTerm) {
                return 0;
            }

            if (key.startsWith(`${lowerTerm}.`) || key.startsWith(lowerTerm)) {
                return 1;
            }

            if (key.includes(lowerTerm)) {
                return 2;
            }

            if (value.includes(lowerTerm)) {
                return 3;
            }

            return 4;
        },

        normalizeSearchTerm(term) {
            return term.trim().replace(/\s+/g, '.');
        },

        useExistingSnippet(snippet, result) {
            if (!this.canEdit) {
                return;
            }

            snippet.translationKey = result.translationKey;
            snippet.value = result.value;
            this.setSnippetSearchResults(this.getSnippetSearchKey(snippet), []);
        },

        getSnippetSearchKey(snippet) {
            if (!snippet._salesChannelSnippetSearchKey) {
                snippet._salesChannelSnippetSearchKey = `snippet-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }

            return snippet.id || snippet._uniqueIdentifier || snippet._salesChannelSnippetSearchKey;
        },

        getSnippetSearchResults(snippet) {
            return this.snippetSearchResults[this.getSnippetSearchKey(snippet)] || [];
        },

        isSnippetSearchLoading(snippet) {
            return this.snippetSearchLoading[this.getSnippetSearchKey(snippet)] || false;
        },

        setSnippetSearchResults(searchKey, results) {
            this.snippetSearchResults = {
                ...this.snippetSearchResults,
                [searchKey]: results,
            };
        },

        setSnippetSearchLoading(searchKey, isLoading) {
            this.snippetSearchLoading = {
                ...this.snippetSearchLoading,
                [searchKey]: isLoading,
            };
        },

        clearSnippetSearchTimer(searchKey) {
            if (!this.snippetSearchTimers[searchKey]) {
                return;
            }

            window.clearTimeout(this.snippetSearchTimers[searchKey]);
            const timers = { ...this.snippetSearchTimers };
            delete timers[searchKey];
            this.snippetSearchTimers = timers;
        },

        clearSnippetSearchState() {
            Object.keys(this.snippetSearchTimers).forEach((searchKey) => {
                window.clearTimeout(this.snippetSearchTimers[searchKey]);
            });

            this.snippetSearchTimers = {};
            this.snippetSearchResults = {};
            this.snippetSearchLoading = {};
        },

        async deleteSnippet(id) {
            try {
                await this.httpClient.post(
                    '/_action/sync',
                    {
                        'sales-channel-snippet-delete': {
                            entity: SALES_CHANNEL_SNIPPET_ENTITY,
                            action: 'delete',
                            payload: [{ id }],
                        },
                    },
                    {
                        headers: this.getJsonHeaders(),
                    },
                );
            } catch (error) {
                if (!this.isNotFoundError(error)) {
                    throw error;
                }
            }
        },

        isNotFoundError(error) {
            const errors = (((error || {}).response || {}).data || {}).errors || [];

            return errors.some((apiError) => {
                return apiError.status === '404' || apiError.code === 'FRAMEWORK__RESOURCE_NOT_FOUND';
            });
        },

        getJsonHeaders() {
            return {
                Accept: 'application/vnd.api+json',
                'Content-Type': 'application/json',
            };
        },

        createEntityId() {
            if (Shopware.Utils && Shopware.Utils.createId) {
                return Shopware.Utils.createId();
            }

            return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
                return Math.floor(Math.random() * 16).toString(16);
            });
        },

        saveFinish() {
            this.processSuccess = false;
        },
    },
});
