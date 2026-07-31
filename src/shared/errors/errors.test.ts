import { describe, it, expect } from "vitest";
import { AppError, NotFoundError } from "./index";

describe("Shared AppError Primitives", () => {
  it("should create AppError with statusCode and code", () => {
    const err = new AppError("Test error", 400, "TEST_CODE", { foo: "bar" });
    expect(err.message).toBe("Test error");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("TEST_CODE");
    expect(err.details).toEqual({ foo: "bar" });
  });

  it("should correctly instantiate NotFoundError", () => {
    const err = new NotFoundError("Item not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Item not found");
  });
});
