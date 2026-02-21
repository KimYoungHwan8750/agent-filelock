export const acquireLockSchema = {
  body: {
    type: 'object' as const,
    required: ['filePath', 'owner', 'ownerName'],
    properties: {
      filePath: { type: 'string' as const },
      owner: { type: 'string' as const },
      ownerName: { type: 'string' as const },
      ttlMinutes: { type: 'number' as const },
      force: { type: 'boolean' as const },
      metadata: { type: 'object' as const },
    },
  },
};

export const releaseLockSchema = {
  body: {
    type: 'object' as const,
    required: ['filePath', 'owner'],
    properties: {
      filePath: { type: 'string' as const },
      owner: { type: 'string' as const },
      force: { type: 'boolean' as const },
    },
  },
};

export const releaseAllSchema = {
  body: {
    type: 'object' as const,
    required: ['owner'],
    properties: {
      owner: { type: 'string' as const },
    },
  },
};

export const heartbeatSchema = {
  body: {
    type: 'object' as const,
    required: ['owner'],
    properties: {
      owner: { type: 'string' as const },
      ttlMinutes: { type: 'number' as const },
    },
  },
};

export const statusQuerySchema = {
  querystring: {
    type: 'object' as const,
    required: ['filePath'],
    properties: {
      filePath: { type: 'string' as const },
    },
  },
};

export const listQuerySchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      owner: { type: 'string' as const },
      prefix: { type: 'string' as const },
    },
  },
};

export const recordChangeSchema = {
  body: {
    type: 'object' as const,
    required: ['filePath', 'developerUuid', 'developerName'],
    properties: {
      filePath: { type: 'string' as const },
      developerUuid: { type: 'string' as const },
      developerName: { type: 'string' as const },
    },
  },
};

export const checkChangesSchema = {
  querystring: {
    type: 'object' as const,
    required: ['filePath', 'developerUuid'],
    properties: {
      filePath: { type: 'string' as const },
      developerUuid: { type: 'string' as const },
    },
  },
};

export const acquireBatchSchema = {
  body: {
    type: 'object' as const,
    required: ['filePaths', 'owner', 'ownerName'],
    properties: {
      filePaths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 1,
      },
      owner: { type: 'string' as const },
      ownerName: { type: 'string' as const },
      ttlMinutes: { type: 'number' as const },
      metadata: { type: 'object' as const },
    },
  },
};

export const releaseBatchSchema = {
  body: {
    type: 'object' as const,
    required: ['filePaths', 'owner'],
    properties: {
      filePaths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        minItems: 1,
      },
      owner: { type: 'string' as const },
    },
  },
};

export const acknowledgeSchema = {
  body: {
    type: 'object' as const,
    required: ['filePath', 'developerUuid'],
    properties: {
      filePath: { type: 'string' as const },
      developerUuid: { type: 'string' as const },
    },
  },
};
