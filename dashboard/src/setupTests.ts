// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

/** axios 1.x est ESM : mock global pour Jest (CRA) sans transformer node_modules. */
jest.mock('axios', () => {
  function createMockClient() {
    return {
      get: jest.fn(() => Promise.resolve({ data: [], status: 200 })),
      post: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
      put: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
      delete: jest.fn(() => Promise.resolve({ status: 200 })),
      patch: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
      request: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), handlers: [] },
        response: { use: jest.fn(), eject: jest.fn(), handlers: [] },
      },
      isAxiosError: jest.fn(() => false),
      defaults: { headers: { common: {} } },
    };
  }
  const mockAxios = createMockClient();
  mockAxios.create = jest.fn(function createMockClientFactory() {
    return createMockClient();
  });
  return {
    __esModule: true,
    default: mockAxios,
  };
});
