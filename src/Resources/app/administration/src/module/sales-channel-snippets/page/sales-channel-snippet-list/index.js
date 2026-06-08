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
        };
    },

    computed: {
        canEdit() {
            return this.filters.salesChannelId && this.filters.languageId;
        },
    },

    created() {
        this.repository = this.repositoryFactory.create('sales_channel_snippet');
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
            this.loadSnippets();
        },

        addSnippet() {
            if (!this.canEdit) {
                return;
            }

            const snippet = this.repository.create(Context.api);
            snippet.salesChannelId = this.filters.salesChannelId;
            snippet.languageId = this.filters.languageId;
            snippet.translationKey = '';
            snippet.value = '';

            this.snippets.unshift(snippet);
        },

        removeSnippet(snippet) {
            if (snippet.id && this.persistedSnippetIds.includes(snippet.id)) {
                this.deletedSnippetIds.push(snippet.id);
            }

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
