let safariTested = false;
let safariResult = false;

export function isSafari(): boolean {
  if (safariTested) return safariResult;
  safariTested = true;
  const ua = navigator.userAgent;
  const isSafariDesktop = /^((?!chrome|android).)*safari/i.test(ua);
  const isIos = /iphone|ipad|ipod/i.test(ua);
  safariResult = isSafariDesktop || isIos;
  return safariResult;
}

export function isMac(): boolean {
  return /mac/i.test(navigator.platform || '');
}

export function triggerPrint(): void {
  window.print();

  if (isSafari()) {
    setTimeout(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'p',
          code: 'KeyP',
          metaKey: isMac(),
          ctrlKey: !isMac(),
          bubbles: true,
          cancelable: true,
        }),
      );
    }, 300);
  }
}

(window as any).__ipscscore_printSafe = triggerPrint;
