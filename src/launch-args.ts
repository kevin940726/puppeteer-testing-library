export function launchArgs(args: string[] = []) {
  const enableBlinkFeaturesIndex = args.findIndex((arg) =>
    arg.startsWith('--enable-blink-features=')
  );

  if (enableBlinkFeaturesIndex === -1) {
    return [...args, '--enable-blink-features=ComputedAccessibilityInfo'];
  }

  if (args[enableBlinkFeaturesIndex].includes('ComputedAccessibilityInfo')) {
    return args;
  }

  const copied = args.slice();
  copied[enableBlinkFeaturesIndex] += ',ComputedAccessibilityInfo';

  return copied;
}
