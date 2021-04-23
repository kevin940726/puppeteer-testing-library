import { setTimeout, clearTimeout } from 'timers';
import { config } from './configure';

interface WaitOptions {
  timeout?: number | false;
}

const INITIAL_RESULT = {} as const;

async function waitFor<Type>(
  callback: () => Promise<Type>,
  { timeout = config.timeout }: WaitOptions = {}
): Promise<Type> {
  return new Promise(async (resolve, reject) => {
    let timerID;
    let result: Type | typeof INITIAL_RESULT = INITIAL_RESULT;
    let error: Error;
    let hasRejected = false;
    const hasTimeout = timeout > 0;

    if (hasTimeout) {
      timerID = setTimeout(() => {
        reject(error);
        hasRejected = true;
      }, timeout as number);
    }

    while (result === INITIAL_RESULT) {
      try {
        result = await callback();
      } catch (err) {
        error = err;

        if (!hasTimeout) {
          reject(error);
          hasRejected = true;
          break;
        }
      } finally {
        if (hasRejected) {
          break;
        }

        if (hasTimeout && result === INITIAL_RESULT) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    if (hasRejected) {
      return;
    }

    if (timerID) {
      clearTimeout(timerID);
    }

    resolve(result as Type);
  });
}

export { waitFor };
