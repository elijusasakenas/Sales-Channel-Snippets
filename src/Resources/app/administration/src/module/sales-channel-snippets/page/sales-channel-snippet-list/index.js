import template from './sales-channel-snippet-list.html.twig';
import './sales-channel-snippet-list.scss';

const { Component, Context, Mixin } = Shopware;
const { Criteria } = Shopware.Data;

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
            repository: null,
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
        this.repository = this.repositoryFactory.create('sales_channel_snippet');
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

            const criteria = new Criteria(1, 100);
            criteria.addFilter(Criteria.equals('salesChannelId', this.filters.salesChannelId));
            criteria.addFilter(Criteria.equals('languageId', this.filters.languageId));
            criteria.addSorting(Criteria.sort('translationKey', 'ASC'));

            try {
                this.snippets = await this.repository.search(criteria, Context.api);
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
            const snippet = this.repository.create(Context.api);
            snippet.salesChannelId = this.filters.salesChannelId;
            snippet.languageId = this.filters.languageId;
            snippet.translationKey = defaults.translationKey || '';
            snippet.value = defaults.value || '';

            return snippet;
        },

        onSnippetKeyInput(snippet) {
            const searchKey = this.getSnippetSearchKey(snippet);
            const term = (snippet.translationKey || '').trim();

            this.clearSnippetSearchTimer(searchKey);

            if (!this.filters.languageId || term.length < 2) {
                this.setSnippetSearchResults(searchKey, []);
                this.setSnippetSearchLoading(searchKey, false);
                return;
            }

            this.setSnippetSearchLoading(searchKey, true);

            this.snippetSearchTimers = {
                ...this.snippetSearchTimers,
                [searchKey]: window.setTimeout(() => {
                    this.searchExistingSnippets(snippet, searchKey, term);
                }, 300),
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
                await Promise.all(this.deletedSnippetIds.map((id) => this.deleteSnippet(id)));

                const snippetsToSave = this.snippets.filter((snippet) => {
                    return snippet.translationKey && snippet.translationKey.trim() && snippet.value !== null;
                });

                snippetsToSave.forEach((snippet) => {
                    snippet.salesChannelId = this.filters.salesChannelId;
                    snippet.languageId = this.filters.languageId;
                    snippet.translationKey = snippet.translationKey.trim();
                });

                await Promise.all(snippetsToSave.map((snippet) => this.repository.save(snippet, Context.api)));

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
            const criteria = new Criteria(1, 25);

            criteria.addAssociation('snippetSet');
            criteria.addFilter(Criteria.equals('snippetSet.iso', localeCode));
            criteria.addFilter(Criteria.multi('OR', [
                Criteria.contains('translationKey', term),
                Criteria.contains('value', term),
            ]));
            criteria.addSorting(Criteria.sort('translationKey', 'ASC'));

            const result = await this.snippetRepository.search(criteria, Context.api);

            return result.map((snippet) => {
                return {
                    translationKey: snippet.translationKey,
                    value: snippet.value,
                    snippetSetName: snippet.snippetSet ? snippet.snippetSet.name : '',
                    locale: snippet.snippetSet ? snippet.snippetSet.iso : localeCode,
                };
            });
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
                await this.repository.delete(id, Context.api);
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

        saveFinish() {
            this.processSuccess = false;
        },
    },
});
