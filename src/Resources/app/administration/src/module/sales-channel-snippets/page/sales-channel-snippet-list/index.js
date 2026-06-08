import template from './sales-channel-snippet-list.html.twig';
import './sales-channel-snippet-list.scss';

const { Component, Context } = Shopware;
const { Criteria } = Shopware.Data;

Component.register('sales-channel-snippet-list', {
    template,

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
            isLoading: false,
            processSuccess: false,
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
                return;
            }

            this.isLoading = true;

            const criteria = new Criteria(1, 100);
            criteria.addFilter(Criteria.equals('salesChannelId', this.filters.salesChannelId));
            criteria.addFilter(Criteria.equals('languageId', this.filters.languageId));
            criteria.addSorting(Criteria.sort('translationKey', 'ASC'));

            try {
                this.snippets = await this.repository.search(criteria, Context.api);
            } finally {
                this.isLoading = false;
            }
        },

        onFilterChange() {
            this.deletedSnippetIds = [];
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
            if (snippet.id) {
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

            try {
                await Promise.all(this.deletedSnippetIds.map((id) => this.repository.delete(id, Context.api)));

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
            } finally {
                this.isLoading = false;
            }
        },

        saveFinish() {
            this.processSuccess = false;
        },
    },
});
