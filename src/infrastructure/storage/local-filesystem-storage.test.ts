import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalFilesystemStorageDriver } from "./local-filesystem-storage.driver";
import { Readable } from "stream";
import fs from "fs";
import path from "path";

describe("LocalFilesystemStorageDriver", () => {
  const testStorageDir = path.resolve("./test-storage-tmp");
  let driver: LocalFilesystemStorageDriver;

  beforeEach(() => {
    driver = new LocalFilesystemStorageDriver(testStorageDir);
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it("should write stream and read stream correctly", async () => {
    const key = "org-1/sol-1/case-1/doc-1.txt";
    const content = "Test document stream payload";
    const stream = Readable.from([content]);

    await driver.writeStream(key, stream);
    expect(await driver.exists(key)).toBe(true);

    const readStream = await driver.readStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of readStream) {
      chunks.push(Buffer.from(chunk));
    }
    const readContent = Buffer.concat(chunks).toString("utf-8");
    expect(readContent).toBe(content);
  });

  it("should throw error on path traversal attempt", async () => {
    const maliciousKey = "../../../etc/passwd";
    const stream = Readable.from(["evil"]);
    await expect(driver.writeStream(maliciousKey, stream)).rejects.toThrow("Path traversal detected");
  });
});
