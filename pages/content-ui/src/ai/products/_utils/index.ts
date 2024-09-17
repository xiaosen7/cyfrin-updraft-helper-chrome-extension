export function selectFile(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const elem = document.createElement('input');
    elem.type = 'file';
    elem.accept = 'video/*';
    elem.oninput = event => {
      // Make sure we have files to use
      const files = (event.target as HTMLInputElement).files;
      if (!files) return;

      const reader = new FileReader();
      reader.addEventListener('load', async e => {
        const arrayBuffer = e.target?.result as ArrayBuffer; // Get the ArrayBuffer
        if (!arrayBuffer) return;

        resolve(arrayBuffer);
      });
      reader.readAsArrayBuffer(files[0]);

      reader.onerror = reject;

      // Reset files
      elem.value = '';
    };

    elem.click();
  });
}

export async function arrayBufferToText(arrayBuffer: ArrayBuffer) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([arrayBuffer]);
    const reader = new FileReader();

    reader.onload = event => {
      if (event.target && event.target.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read array buffer'));
      }
    };

    reader.onerror = error => reject(error);
    reader.readAsText(blob);
  });
}

export function downloadUri(uri: string, fileName?: string) {
  const link = document.createElement('a');
  link.href = uri;
  if (fileName) {
    link.download = fileName;
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function promisePool<T>(data: T[], cb: (item: T, index: number) => Promise<void>, concurrency: number) {
  return new Promise<void>((resolve, reject) => {
    let index = 0;
    let running = 0;
    let completed = 0;

    function runNext() {
      if (index >= data.length && running === 0) {
        return;
      }

      while (running < concurrency && index < data.length) {
        const item = data[index];
        running++;

        cb(item, index)
          .then(() => {
            running--;
            completed++;
            if (completed === data.length) {
              resolve();
            }
            runNext();
          })
          .catch(reject);

        index++;
      }
    }

    runNext();
  });
}
