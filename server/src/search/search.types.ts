export enum GlobalSearchResultType {
  TASK = 'task',
  PROJECT = 'project',
  USER = 'user',
}

export type GlobalSearchQuery = {
  q: string;
  page: number;
  limit: number;
  type?: GlobalSearchResultType;
};

export type GlobalSearchTaskResult = {
  type: GlobalSearchResultType.TASK;
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: string;
};

export type GlobalSearchProjectResult = {
  type: GlobalSearchResultType.PROJECT;
  id: string;
  name: string;
  status: string;
};

export type GlobalSearchUserResult = {
  type: GlobalSearchResultType.USER;
  id: string;
  name: string;
  email: string;
};

export type GlobalSearchResult =
  | GlobalSearchTaskResult
  | GlobalSearchProjectResult
  | GlobalSearchUserResult;

export type GlobalSearchResponse = {
  results: GlobalSearchResult[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
