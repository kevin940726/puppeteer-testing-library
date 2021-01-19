import path from 'path';

const PACKAGE_NAME = 'puppeteer-testing-library';

class QueryError extends Error {
  constructor(name: string, message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryError);
    }

    this.name = name;

    const stack = this.stack || '';
    const lines = stack.split('\n');
    const tracesStartIndex = lines.findIndex((line) =>
      line.startsWith('    at')
    );
    let traces = lines.slice(tracesStartIndex).reverse();
    const firstInternalIndex = traces.findIndex((line) =>
      line.includes(path.join(PACKAGE_NAME, 'dist'))
    );
    if (firstInternalIndex !== -1) {
      traces = traces.slice(0, firstInternalIndex);
    }
    traces = traces.reverse();
    this.stack = [...lines.slice(0, tracesStartIndex), ...traces].join('\n');
  }
}

export { QueryError };
