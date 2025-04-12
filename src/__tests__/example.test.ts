describe("Basic test suite", () => {
  it("should pass a simple test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle basic string operations", () => {
    expect("hello").toEqual("hello");
    expect("hello world").toContain("world");
  });
});
