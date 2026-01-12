import { ImmutableObject } from 'jimu-core';

export interface Config {
    apiUrl: string;
    apiToken: string;
}

export type IMConfig = ImmutableObject<Config>;

export const defaultConfig: Config = {
    apiUrl: 'https://fme-docker.tensing.app:443/fmedatastreaming/embeddings/search.fmw',
    apiToken: '067e63151ac94654d38a7c5d23832396073317cb'
};
