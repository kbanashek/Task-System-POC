/**
 * Tests for fileSystemUtils
 */

import * as FileSystemUtils from "@utils/system/fileSystemUtils";
import * as FileSystem from "expo-file-system/legacy";

// Mock expo-file-system
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///mock/documents/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  EncodingType: {
    Base64: "base64",
  },
}));

// Mock service logger
jest.mock("@utils/logging/serviceLogger", () => ({
  getServiceLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock global fetch
global.fetch = jest.fn();

describe("fileSystemUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getImageDirectory", () => {
    it("should return correct image directory path", () => {
      const result = FileSystemUtils.getImageDirectory();

      expect(result).toBe("file:///mock/documents/ImageCapture/");
    });

    it("should include trailing slash", () => {
      const result = FileSystemUtils.getImageDirectory();

      expect(result).toMatch(/\/$/);
    });
  });

  describe("generateImageFilename", () => {
    const mockTimestamp = 1704211200000;

    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValue(mockTimestamp);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should generate filename with taskId and questionId", () => {
      const result = FileSystemUtils.generateImageFilename("q7", "task123");

      expect(result).toBe("task123_q7_1704211200000.jpg");
    });

    it("should generate filename without taskId", () => {
      const result = FileSystemUtils.generateImageFilename("q7");

      expect(result).toBe("q7_1704211200000.jpg");
    });

    it("should include timestamp", () => {
      const result = FileSystemUtils.generateImageFilename("q7");

      expect(result).toContain("1704211200000");
    });

    it("should have .jpg extension", () => {
      const result = FileSystemUtils.generateImageFilename("q7");

      expect(result).toMatch(/\.jpg$/);
    });
  });

  describe("getLocalImagePath", () => {
    it("should return full path for filename", () => {
      const result = FileSystemUtils.getLocalImagePath("image.jpg");

      expect(result).toBe("file:///mock/documents/ImageCapture/image.jpg");
    });

    it("should concatenate directory and filename", () => {
      const result = FileSystemUtils.getLocalImagePath("task123_q7.jpg");

      expect(result).toContain("ImageCapture/task123_q7.jpg");
    });
  });

  describe("ensureImageDirectoryExists", () => {
    it("should not create directory if it exists", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      await FileSystemUtils.ensureImageDirectoryExists();

      expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });

    it("should create directory if it does not exist", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      await FileSystemUtils.ensureImageDirectoryExists();

      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        "file:///mock/documents/ImageCapture/",
        { intermediates: true }
      );
    });

    it("should throw error if directory creation fails", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });
      (FileSystem.makeDirectoryAsync as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      await expect(
        FileSystemUtils.ensureImageDirectoryExists()
      ).rejects.toThrow("Permission denied");
    });
  });

  describe("copyImageToPermanentStorage", () => {
    beforeEach(() => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
    });

    it("should copy image to permanent storage", async () => {
      const sourceUri = "file:///tmp/image.jpg";
      const filename = "task123_q7.jpg";

      const result = await FileSystemUtils.copyImageToPermanentStorage(
        sourceUri,
        filename
      );

      expect(FileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: "file:///mock/documents/ImageCapture/task123_q7.jpg",
      });

      expect(result).toBe("file:///mock/documents/ImageCapture/task123_q7.jpg");
    });

    it("should ensure directory exists before copying", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });
      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);

      await FileSystemUtils.copyImageToPermanentStorage(
        "file:///tmp/image.jpg",
        "test.jpg"
      );

      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
      expect(FileSystem.copyAsync).toHaveBeenCalled();
    });

    it("should throw error if copy fails", async () => {
      (FileSystem.copyAsync as jest.Mock).mockRejectedValue(
        new Error("Copy failed")
      );

      await expect(
        FileSystemUtils.copyImageToPermanentStorage(
          "file:///tmp/image.jpg",
          "test.jpg"
        )
      ).rejects.toThrow("Copy failed");
    });
  });

  describe("readImageAsBase64", () => {
    it("should read image as base64 string", async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        "base64data"
      );

      const result = await FileSystemUtils.readImageAsBase64(
        "file:///path/to/image.jpg"
      );

      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        "file:///path/to/image.jpg",
        { encoding: "base64" }
      );

      expect(result).toBe("base64data");
    });

    it("should throw error if read fails", async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error("Read failed")
      );

      await expect(
        FileSystemUtils.readImageAsBase64("file:///path/to/image.jpg")
      ).rejects.toThrow("Read failed");
    });
  });

  describe("createBlobFromLocalFile", () => {
    it("should create blob from local file URI", async () => {
      const mockBlob = new Blob(["image data"], { type: "image/jpeg" });

      (global.fetch as jest.Mock).mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const result = await FileSystemUtils.createBlobFromLocalFile(
        "file:///path/to/image.jpg"
      );

      expect(global.fetch).toHaveBeenCalledWith("file:///path/to/image.jpg");
      expect(result).toBe(mockBlob);
      expect(result.type).toBe("image/jpeg");
    });

    it("should use custom content type", async () => {
      const mockBlob = new Blob(["image data"], { type: "image/png" });

      (global.fetch as jest.Mock).mockResolvedValue({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      await FileSystemUtils.createBlobFromLocalFile(
        "file:///path/to/image.png",
        "image/png"
      );

      expect(global.fetch).toHaveBeenCalledWith("file:///path/to/image.png");
    });

    it("should throw error if fetch fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Fetch failed"));

      await expect(
        FileSystemUtils.createBlobFromLocalFile("file:///path/to/image.jpg")
      ).rejects.toThrow("Fetch failed");
    });

    it("should throw error if blob creation fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: jest.fn().mockRejectedValue(new Error("Blob creation failed")),
      });

      await expect(
        FileSystemUtils.createBlobFromLocalFile("file:///path/to/image.jpg")
      ).rejects.toThrow("Blob creation failed");
    });
  });

  describe("deleteLocalImage", () => {
    it("should delete existing image file", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      await FileSystemUtils.deleteLocalImage("test.jpg");

      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        "file:///mock/documents/ImageCapture/test.jpg"
      );
    });

    it("should not attempt to delete non-existent file", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      await FileSystemUtils.deleteLocalImage("test.jpg");

      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it("should throw error if deletion fails", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      await expect(
        FileSystemUtils.deleteLocalImage("test.jpg")
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("localImageExists", () => {
    it("should return true if file exists", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });

      const result = await FileSystemUtils.localImageExists("test.jpg");

      expect(result).toBe(true);
    });

    it("should return false if file does not exist", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await FileSystemUtils.localImageExists("test.jpg");

      expect(result).toBe(false);
    });

    it("should return false if check fails", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error("Check failed")
      );

      const result = await FileSystemUtils.localImageExists("test.jpg");

      expect(result).toBe(false);
    });
  });

  describe("getLocalImageInfo", () => {
    it("should return file info if file exists", async () => {
      const mockFileInfo = {
        exists: true,
        size: 12345,
        modificationTime: 1704211200000,
        uri: "file:///mock/documents/ImageCapture/test.jpg",
      };

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue(mockFileInfo);

      const result = await FileSystemUtils.getLocalImageInfo("test.jpg");

      expect(result).toEqual(mockFileInfo);
    });

    it("should return null if file does not exist", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await FileSystemUtils.getLocalImageInfo("test.jpg");

      expect(result).toBeNull();
    });

    it("should return null if check fails", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error("Check failed")
      );

      const result = await FileSystemUtils.getLocalImageInfo("test.jpg");

      expect(result).toBeNull();
    });
  });

  describe("clearAllLocalImages", () => {
    it("should delete all images in directory", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
        "image1.jpg",
        "image2.jpg",
        "image3.jpg",
      ]);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await FileSystemUtils.clearAllLocalImages();

      expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(3);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        "file:///mock/documents/ImageCapture/image1.jpg"
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        "file:///mock/documents/ImageCapture/image2.jpg"
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        "file:///mock/documents/ImageCapture/image3.jpg"
      );

      expect(result).toBe(3);
    });

    it("should return 0 if directory does not exist", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await FileSystemUtils.clearAllLocalImages();

      expect(FileSystem.readDirectoryAsync).not.toHaveBeenCalled();
      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("should return 0 if directory is empty", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);

      const result = await FileSystemUtils.clearAllLocalImages();

      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("should throw error if directory read fails", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readDirectoryAsync as jest.Mock).mockRejectedValue(
        new Error("Read failed")
      );

      await expect(FileSystemUtils.clearAllLocalImages()).rejects.toThrow(
        "Read failed"
      );
    });

    it("should throw error if deletion fails", async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
      });
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
        "image1.jpg",
      ]);
      (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(
        new Error("Delete failed")
      );

      await expect(FileSystemUtils.clearAllLocalImages()).rejects.toThrow(
        "Delete failed"
      );
    });
  });

  describe("IMAGE_STORAGE_CONFIG", () => {
    it("should have correct directory name", () => {
      expect(FileSystemUtils.IMAGE_STORAGE_CONFIG.DIRECTORY).toBe(
        "ImageCapture"
      );
    });

    it("should have correct extension", () => {
      expect(FileSystemUtils.IMAGE_STORAGE_CONFIG.EXTENSION).toBe(".jpg");
    });

    it("should have correct quality", () => {
      expect(FileSystemUtils.IMAGE_STORAGE_CONFIG.QUALITY).toBe(0.8);
    });
  });
});
