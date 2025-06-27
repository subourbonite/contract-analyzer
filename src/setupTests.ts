import '@testing-library/jest-dom'

// Mock AWS Amplify for tests
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(() =>
    Promise.resolve({
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token'
      }
    })
  ),
  fetchUserAttributes: jest.fn(() =>
    Promise.resolve({
      email: 'test@example.com',
      name: 'Test User'
    })
  )
}))

jest.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: jest.fn(() => ({
    user: { username: 'testuser' },
    signOut: jest.fn()
  }))
}))

// Mock file operations
global.File = class MockFile {
  constructor(
    public chunks: BlobPart[],
    public name: string,
    public options: FilePropertyBag = {}
  ) {}

  get type() { return this.options.type || '' }
  get size() { return this.chunks.reduce((size, chunk) => size + chunk.toString().length, 0) }

  text() {
    return Promise.resolve(this.chunks.join(''))
  }

  arrayBuffer() {
    const text = this.chunks.join('')
    const buffer = new ArrayBuffer(text.length)
    const view = new Uint8Array(buffer)
    for (let i = 0; i < text.length; i++) {
      view[i] = text.charCodeAt(i)
    }
    return Promise.resolve(buffer)
  }
} as any

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
