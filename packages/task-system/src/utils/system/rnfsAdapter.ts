/**
 * RNFS adapter backed by expo-file-system
 *
 * Provides a small subset of the RNFS API used in the host app so we can
 * prototype replacing RNFS with Expo's FileSystem. This file intentionally
 * implements only the methods required by our codebase: readFile (base64),
 * writeFile, readDir, mkdir, unlink, copyFile, exists, and getInfo.
 */
import * as FileSystem from "expo-file-system/legacy";

export const DocumentDirectoryPath: string = FileSystem.documentDirectory ?? "";

export const readFile = async (
  filepath: string,
  encoding?: "utf8" | "base64"
): Promise<string> => {
  if (encoding === "base64") {
    return FileSystem.readAsStringAsync(filepath, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return FileSystem.readAsStringAsync(filepath);
};

export const writeFile = async (
  filepath: string,
  contents: string,
  encoding?: "utf8" | "base64"
): Promise<void> => {
  if (encoding === "base64") {
    await FileSystem.writeAsStringAsync(filepath, contents, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return;
  }

  await FileSystem.writeAsStringAsync(filepath, contents);
};

export const mkdir = async (directory: string): Promise<void> => {
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
};

export const readDir = async (directory: string): Promise<string[]> => {
  return FileSystem.readDirectoryAsync(directory);
};

export const unlink = async (filepath: string): Promise<void> => {
  await FileSystem.deleteAsync(filepath, { idempotent: true });
};

export const copyFile = async (from: string, to: string): Promise<void> => {
  await FileSystem.copyAsync({ from, to });
};

export const exists = async (filepath: string): Promise<boolean> => {
  const info = await FileSystem.getInfoAsync(filepath);
  return !!info.exists;
};

export const getInfo = async (
  filepath: string
): Promise<FileSystem.FileInfo | null> => {
  try {
    return await FileSystem.getInfoAsync(filepath);
  } catch (err) {
    return null;
  }
};

export default {
  DocumentDirectoryPath,
  readFile,
  writeFile,
  mkdir,
  readDir,
  unlink,
  copyFile,
  exists,
  getInfo,
};
