import { setTimeout, clearTimeout } from 'timers';
import { config } from './configure';
import { stackPrettifier } from './query-error';

interface WaitOptions {
  timeout?: number | false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<Type>(
  callback: () => Promise<Type>,
  { timeout = config.timeout }: WaitOptions = {}
): Promise<Type> {
  const prettifyStack = stackPrettifier(new Error());

  let timerID: NodeJS.Timeout;
  const hasTimeout = timeout > 0;
  let isSettled = false;
  let revokeTimeout: () => void;

  const promises: Promise<Type>[] = [
    new Promise((resolve, reject) => {
      revokeTimeout = reject;

      async function runOnce() {
        try {
          const result = await callback();

          resolve(result);
        } catch (err) {
          reject(err);
        }
      }

      if (hasTimeout) {
        timerID = setTimeout(runOnce, timeout as number);
      } else {
        runOnce();
      }
    }),
  ];

  if (hasTimeout) {
    promises.push(
      new Promise(async (resolve) => {
        do {
          try {
            const result = await callback();

            resolve(result);
            clearTimeout(timerID);
            revokeTimeout?.();
            break;
          } catch (err) {
            await sleep(50);
          }
        } while (!isSettled);
      })
    );
  }

  return Promise.race(promises)
    .finally(() => {
      isSettled = true;
    })
    .catch((err) => {
      throw prettifyStack(err);
    });
}

export { waitFor };
