import Importer from './Importer.js';
import GuildSettings from '../../settings/GuildSettings.js';
import ChannelSettings from '../../settings/ChannelSettings.js';
import AutoResponse from '../AutoResponse.js';
import BadWord from '../BadWord.js';
import Moderation from '../Moderation.js';
import {EmbedBuilder} from 'discord.js';

export default class ModBotImporter extends Importer {

    /**
     * @type {Client}
     */
    bot;

    /**
     * @type {import('discord.js').Snowflake}
     */
    guildID;

    /**
     * @type {Exporter}
     */
    data;
    
    /**
     * @param {Client} bot
     * @param {import('discord.js').Snowflake} guildID
     * @param {Exporter} data JSON exported data (modbot-1.0.0)
     */
    constructor(bot, guildID, data) {
        super();
        this.bot = bot;
        this.guildID = guildID;
        this.data = data;
    }

    /**
     * verify that all data is of correct types before importing
     * @throws {TypeError}
     */
    checkAllTypes() {
        GuildSettings.checkTypes(this.data.guildConfig);

        if (!(this.data.channels instanceof Array)) {
            throw new TypeError('Channels must be an array');
        }
        this.data.channels.forEach(c => ChannelSettings.checkTypes(c));

        if (!(this.data.responses instanceof Array)) {
            throw new TypeError('Responses must be an array');
        }
        this.data.responses.forEach(r => AutoResponse.checkTypes(r));

        if (!(this.data.badWords instanceof Array)) {
            throw new TypeError('BadWords must be an array');
        }
        this.data.badWords.forEach(b => BadWord.checkTypes(b));

        if (!(this.data.moderations instanceof Array)) {
            throw new TypeError('Moderations must be an array');
        }
        for (const moderation of this.data.moderations) {
            moderation.guildid = this.guildID;
            Moderation.checkTypes(moderation);
        }
    }

    /**
     * import all data to the DB
     * @return {Promise<void>}
     */
    async import() {
        await Promise.all([
            this._importGuildConfig(),
            this._importChannelConfigs(),
            this._importModerations(),
            this._importResponses(),
            this._importBadWords()
        ]);
    }

    _importGuildConfig() {
        const guildConfig = new GuildSettings(this.guildID, this.data.guildConfig);
        return guildConfig.save();
    }

    async _importChannelConfigs() {
        const channels = this.data.channels;
        return this.data.channels = await Promise.all(channels.map(c => ChannelSettings.import(this.bot, this.guildID, c)));
    }

    _importModerations() {
        const moderations = this.data.moderations;
        return Moderation.bulkSave(moderations.map(m => {
            m.guildid = this.guildID;
            return new Moderation(m);
        }));
    }

    _importResponses() {
        const responses = this.data.responses;
        return Promise.all(responses.map(r => (new AutoResponse(this.guildID, r)).save()));
    }

    _importBadWords() {
        const badWords = this.data.badWords;
        return Promise.all(badWords.map(b => (new BadWord(this.guildID, b)).save()));
    }

    generateEmbed() {
        return new EmbedBuilder()
            .setTitle('Imported Data')
            .addFields(
                /** @type {any} */{ name: 'Channel Configs', value: this.data.channels.filter(c => c !== null).length.toString(), inline: true },
                /** @type {any} */{ name: 'Moderations', value: this.data.moderations.length.toString(), inline: true },
                /** @type {any} */{ name: 'Responses', value: this.data.responses.length.toString(), inline: true },
                /** @type {any} */{ name: 'BadWords', value: this.data.badWords.length.toString(), inline: true },
            );
    }
}