import { Readable } from "stream";
import fs from "fs";
import path from "path";
import { StorageService } from "./storage-service.interface";
import { AppError, NotFoundError } from "../../shared/errors";

export class LocalFilesystemStorageDriver implements StorageService {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true, mode: 0o700 });
    }
  }

  private resolveKeyPath(storageKey: string): string {
    const normalizedKey = path.normalize(storageKey);
    const fullPath = path.resolve(this.basePath, normalizedKey);
    if (!fullPath.startsWith(this.basePath + path.sep)) {
      throw new AppError("Invalid storage path: Path traversal detected", 400, "PATH_TRAVERSAL");
    }
    return fullPath;
  }

  public async writeStream(storageKey: string, stream: Readable): Promise<void> {
    const filePath = this.resolveKeyPath(storageKey);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath, { mode: 0o600 });
      stream.pipe(writeStream);
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(new AppError(`Storage write failed: ${err.message}`, 500, "STORAGE_WRITE_ERROR")));
      stream.on("error", (err) => reject(new AppError(`Storage stream error: ${err.message}`, 500, "STORAGE_STREAM_ERROR")));
    });
  }

  public async readStream(storageKey: string): Promise<Readable> {
    const filePath = this.resolveKeyPath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`Storage object not found: ${storageKey}`);
    }
    return fs.createReadStream(filePath);
  }

  public async delete(storageKey: string): Promise<void> {
    const filePath = this.resolveKeyPath(storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  public async exists(storageKey: string): Promise<boolean> {
    const filePath = this.resolveKeyPath(storageKey);
    return fs.existsSync(filePath);
  }
}
