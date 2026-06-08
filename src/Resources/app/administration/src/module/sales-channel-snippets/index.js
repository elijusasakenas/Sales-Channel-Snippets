import './page/sales-channel-snippet-list';
import enGB from './snippet/en-GB.json';
import deDE from './snippet/de-DE.json';

const { Module } = Shopware;

Module.register('sales-channel-snippets', {
    type: 'plugin',
    name: 'SalesChannelSnippets',
    title: 'sales-channel-snippets.general.mainMenuItemGeneral',
    description: 'sales-channel-snippets.general.descriptionTextModule',
    color: '#0f766e',
    icon: 'regular-comments',

    snippets: {
        'en-GB': enGB,
        'de-DE': deDE,
    },

    routes: {
        index: {
            component: 'sales-channel-snippet-list',
            path: 'index',
            meta: {
                privilege: 'system.system_config',
            },
        },
    },

    navigation: [{
        id: 'sales-channel-snippets',
        label: 'sales-channel-snippets.general.mainMenuItemGeneral',
        color: '#0f766e',
        path: 'sales.channel.snippets.index',
        icon: 'regular-comments',
        parent: 'sw-settings',
        position: 110,
        privilege: 'system.system_config',
    }],

    settingsItem: [{
        group: 'plugins',
        to: 'sales.channel.snippets.index',
        icon: 'regular-comments',
        privilege: 'system.system_config',
    }],
});
