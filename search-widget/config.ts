import { ImmutableObject } from 'jimu-core';

export interface Config {
  baseUrl: string;
  token: string;
  pageSize: number;
  descriptionLength: number;
}

export type IMConfig = ImmutableObject<Config>;

export const defaultConfig: Config = {
  baseUrl: 'https://fme-docker.tensing.app:443/fmedatastreaming/embeddings/search.fmw',
  token: '067e63151ac94654d38a7c5d23832396073317cb',
  pageSize: 40,
  descriptionLength: 100
};
