/**
 * Unit tests for utils/logger.ts
 * @group utils
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

const hoisted = vi.hoisted(() => ({
  infoSpy: vi.fn(),
  transportsCreated: [] as any[],
  fs: {
    existsReturn: true,
    mkdirSpy: vi.fn(),
    existsSpy: vi.fn(),
  },
}));

vi.mock('winston', () => {
  class ConsoleTransport {
    options: any;
    constructor(options: any) {
      this.options = options;
      hoisted.transportsCreated.push({ type: 'console', options });
    }
  }
  class FileTransport {
    options: any;
    constructor(options: any) {
      this.options = options;
      hoisted.transportsCreated.push({ type: 'file', options });
    }
  }
  return {
    format: {
      timestamp: vi.fn(() => (x: unknown) => x),
      errors: vi.fn(() => (x: unknown) => x),
      splat: vi.fn(() => (x: unknown) => x),
      printf: vi.fn(() => (x: unknown) => x),
      combine: vi.fn((...args: unknown[]) => args),
    },
    transports: { Console: ConsoleTransport, File: FileTransport },
    createLogger: vi.fn(({ level, format, transports }: any) => ({
      level,
      format,
      transports,
      info: hoisted.infoSpy,
    })),
  };
});

vi.mock('fs', () => ({
  existsSync: (p: string) => {
    hoisted.fs.existsSpy(p);
    return hoisted.fs.existsReturn;
  },
  mkdirSync: (p: string) => hoisted.fs.mkdirSpy(p),
}));

function setupEnv(logDir: string, logLevel: string) {
  process.env.LOG_DIR = logDir;
  process.env.LOG_LEVEL = logLevel;
}

describe('utils/logger', () => {
  beforeEach(() => {
    vi.resetModules();
    hoisted.transportsCreated.length = 0;
    hoisted.infoSpy.mockReset();
    hoisted.fs.existsReturn = true;
    hoisted.fs.mkdirSpy.mockReset();
    hoisted.fs.existsSpy.mockReset();
  });

  it('creates logger with transports and honors LOG_DIR and LOG_LEVEL', async () => {
    setupEnv('test-logs', 'debug');
    const mod: any = await import('../../src/utils/logger');
    const logger = mod.default;

    expect(logger.level).toBe('debug');
    // Three transports created: 1 console, 2 files
    expect(hoisted.transportsCreated.length).toBe(3);
    const files = hoisted.transportsCreated.filter(t => t.type === 'file').map(t => t.options);
    const consoleT = hoisted.transportsCreated.find(t => t.type === 'console')!.options;

    expect(consoleT.handleExceptions).toBe(true);
    expect(files).toHaveLength(2);
    const expectedErr = path.join('test-logs', 'error.log');
    const expectedCombined = path.join('test-logs', 'combined.log');
    const normalize = (p: unknown) => String(p).replace(/\\/g, '/');
    const errorFile = files.find(
      f =>
        normalize(f.filename).endsWith('test-logs/error.log') ||
        String(f.filename).endsWith(expectedErr),
    );
    const combinedFile = files.find(
      f =>
        normalize(f.filename).endsWith('test-logs/combined.log') ||
        String(f.filename).endsWith(expectedCombined),
    );
    expect(errorFile).toBeTruthy();
    expect(errorFile.level).toBe('error');
    expect(combinedFile).toBeTruthy();
  });

  it('creates log directory when not exists', async () => {
    setupEnv('will-create-logs', 'info');
    hoisted.fs.existsReturn = false;
    await import('../../src/utils/logger');
    expect(hoisted.fs.existsSpy).toHaveBeenCalledWith('will-create-logs');
    expect(hoisted.fs.mkdirSpy).toHaveBeenCalledWith('will-create-logs');
  });

  it('request() logs structured message', async () => {
    setupEnv('logs', 'info');
    const mod: any = await import('../../src/utils/logger');
    const logger = mod.default as { request: (req: any, res: any, message: string) => void };

    const req = {
      method: 'GET',
      url: '/ping',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
    };
    const res = { statusCode: 200, get: vi.fn().mockReturnValue('15ms') };

    logger.request(req, res, 'hello');
    expect(hoisted.infoSpy).toHaveBeenCalledTimes(1);
    const logged = hoisted.infoSpy.mock.calls[0][0] as string;
    expect(logged).toContain('GET');
    expect(logged).toContain('/ping');
    expect(logged).toContain('200');
    expect(logged).toContain('15ms');
    expect(logged).toContain('127.0.0.1');
    expect(logged).toContain('vitest');
    expect(logged).toContain('hello');
  });
});
