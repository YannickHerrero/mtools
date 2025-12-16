export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Collection {
  id?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id?: number;
  collectionId: number;
  parentFolderId?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedRequest {
  id?: number;
  collectionId: number;
  folderId?: number;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestHistory {
  id?: number;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body?: string;
  responseStatus?: number;
  responseStatusText?: string;
  responseTime?: number;
  responseBody?: string;
  responseHeaders?: KeyValue[];
  executedAt: Date;
}

export interface RequestState {
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
}

export interface ResponseState {
  status: number;
  statusText: string;
  headers: KeyValue[];
  body: string;
  time: number;
}

// Export/Import types
export interface ExportedRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Omit<KeyValue, 'id'>[];
  params: Omit<KeyValue, 'id'>[];
  body?: string;
}

export interface ExportedFolder {
  name: string;
  folders: ExportedFolder[];
  requests: ExportedRequest[];
}

export interface ExportedCollection {
  version: string;
  exportedAt: string;
  collection: {
    name: string;
    folders: ExportedFolder[];
    requests: ExportedRequest[];
  };
}
