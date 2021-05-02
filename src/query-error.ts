const INTERNAL_STACK_REGEX = /puppeteer-testing-library\/dist\//;
class QueryError extends Error {
  constructor(name: string, message: string) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryError);
    }

    this.name = name;
  }
}

class QueryEmptyError extends QueryError {
  constructor(message: string) {
    super('QueryEmptyError', message);
  }
}

class QueryMultipleError extends QueryError {
  constructor(message: string) {
    super('QueryMultipleError', message);
  }
}

function stackPrettifier(parentError: Error) {
  const parentStacks = parentError.stack?.split('\n').slice(1) || [];

  return (error: Error | undefined) => {
    if (!error) return error;

    const stacks = error.stack?.split('\n') || [];

    const stackLines = Array.from(new Set([...stacks, ...parentStacks]));
    const stack = stackLines.join('\n');

    const messageLastIndex =
      stack.indexOf(error.message) + error.message.length + 1;
    let traceLines = stack.slice(messageLastIndex).split('\n').reverse();

    const firstInternalIndex = traceLines.findIndex((line) =>
      INTERNAL_STACK_REGEX.test(line)
    );
    if (firstInternalIndex > -1) {
      traceLines = traceLines.slice(0, firstInternalIndex);
    }
    const trace = traceLines.reverse().join('\n');

    error.stack = [error.message, trace].join('\n');

    return error;
  };
}

export { QueryError, QueryEmptyError, QueryMultipleError, stackPrettifier };
