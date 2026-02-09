import * as FileSystem from "expo-file-system/legacy";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/doc/",
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  EncodingType: { Base64: "base64" },
}));

import RNFSAdapter, {
  DocumentDirectoryPath,
  readFile,
  writeFile,
  mkdir,
  readDir,
  unlink,
  copyFile,
  exists,
  getInfo,
} from "../rnfsAdapter";

describe("rnfsAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports DocumentDirectoryPath from FileSystem", () => {
    expect(DocumentDirectoryPath).toBe("/doc/");
    expect(RNFSAdapter.DocumentDirectoryPath).toBe("/doc/");
  });

  it("readFile uses base64 encoding when requested", async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue("YmFzZTY0");
    const res = await readFile("/doc/file.jpg", "base64");
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith("/doc/file.jpg", {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(res).toBe("YmFzZTY0");
  });

  it("writeFile writes base64 when requested", async () => {
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    await writeFile("/doc/out.jpg", "YmFzZTY0", "base64");
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      "/doc/out.jpg",
      "YmFzZTY0",
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );
  });

  it("mkdir calls makeDirectoryAsync with intermediates", async () => {
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    await mkdir("/doc/newdir");
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith("/doc/newdir", {
      intermediates: true,
    });
  });

  it("readDir returns directory listing", async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(["a", "b"]);
    const files = await readDir("/doc/some");
    expect(FileSystem.readDirectoryAsync).toHaveBeenCalledWith("/doc/some");
    expect(files).toEqual(["a", "b"]);
  });

  it("unlink calls deleteAsync idempotently", async () => {
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    await unlink("/doc/x");
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith("/doc/x", {
      idempotent: true,
    });
  });

  it("copyFile calls copyAsync with from/to", async () => {
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
    await copyFile("/doc/a", "/doc/b");
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: "/doc/a",
      to: "/doc/b",
    });
  });

  it("exists returns boolean from getInfoAsync", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    const ok = await exists("/doc/x");
    expect(FileSystem.getInfoAsync).toHaveBeenCalledWith("/doc/x");
    expect(ok).toBe(true);
  });

  it("getInfo returns FileInfo or null on error", async () => {
    const info = { exists: true, uri: "/doc/x" } as any;
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(info);
    const res = await getInfo("/doc/x");
    expect(res).toEqual(info);

    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error("nope"));
    const res2 = await getInfo("/doc/x");
    expect(res2).toBeNull();
  });
});
