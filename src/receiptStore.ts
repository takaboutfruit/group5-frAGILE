// Store blobs, never object URLs: URLs are recreated and revoked by the view.
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("fragile-images", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("receipts");
    request.onerror = () =>
      reject(
        Error("Could not open receipt storage. Your previous image is safe."),
      );
    request.onblocked = () =>
      reject(
        Error("Receipt storage is blocked. Close other app tabs and retry."),
      );
    request.onsuccess = () => resolve(request.result);
  });
}
async function operation<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("receipts", mode);
      let value: T;
      const request = action(tx.objectStore("receipts"));
      request.onsuccess = () => {
        value = request.result;
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () =>
        reject(
          Error(
            "Could not save or read receipt storage. Your previous image is safe.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function putReceipt(blob: Blob) {
  const id = crypto.randomUUID();
  await operation("readwrite", (s) => s.put(blob, id));
  return id;
}
export async function getReceipt(id: string): Promise<Blob> {
  const blob = await operation("readonly", (s) => s.get(id));
  if (!(blob instanceof Blob))
    throw Error("Receipt image is missing. Retake it before submitting.");
  return blob;
}
export async function deleteReceipt(id: string) {
  await operation("readwrite", (s) => s.delete(id));
}
