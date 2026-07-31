import { Readable } from "stream";

export interface StorageService {
  writeStream(storageKey: string, stream: Readable): Promise<void>;
  readStream(storageKey: string): Promise<Readable>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
