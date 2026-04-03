import { promises as fs } from "node:fs";
import path from "node:path";

export const HOME_IMAGE_KEYS = ["quem-somos"] as const;

export type HomeImageKey = (typeof HOME_IMAGE_KEYS)[number];

export type HomeImageRecord = {
  sectionKey: HomeImageKey;
  imageUrl: string;
  updatedAt: string;
  driveFileId?: string;
  driveFileName?: string;
};

type HomeImageStore = Partial<Record<HomeImageKey, HomeImageRecord>>;

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE_PATH = path.join(DATA_DIR, "home-images.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "home");

function isHomeImageKey(value: string): value is HomeImageKey {
  return HOME_IMAGE_KEYS.includes(value as HomeImageKey);
}

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_FILE_PATH);
  } catch {
    await fs.writeFile(STORE_FILE_PATH, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readStore(): Promise<HomeImageStore> {
  await ensureStoreFile();

  try {
    const raw = await fs.readFile(STORE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const safeStore: HomeImageStore = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (!isHomeImageKey(key) || !value || typeof value !== "object") {
        continue;
      }

      const candidate = value as Partial<HomeImageRecord>;

      if (typeof candidate.imageUrl !== "string" || !candidate.imageUrl.trim()) {
        continue;
      }

      if (typeof candidate.updatedAt !== "string" || !candidate.updatedAt.trim()) {
        continue;
      }

      safeStore[key] = {
        sectionKey: key,
        imageUrl: candidate.imageUrl,
        updatedAt: candidate.updatedAt,
        driveFileId: typeof candidate.driveFileId === "string" ? candidate.driveFileId : undefined,
        driveFileName: typeof candidate.driveFileName === "string" ? candidate.driveFileName : undefined,
      };
    }

    return safeStore;
  } catch {
    return {};
  }
}

async function writeStore(store: HomeImageStore): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getHomeImage(sectionKey: HomeImageKey): Promise<HomeImageRecord | null> {
  const store = await readStore();
  return store[sectionKey] ?? null;
}

export async function setHomeImage(record: HomeImageRecord): Promise<void> {
  const store = await readStore();
  store[record.sectionKey] = record;
  await writeStore(store);
}

export async function removeLocalHomeImageFile(imageUrl: string): Promise<void> {
  const normalizedPrefix = "/uploads/home/";

  if (!imageUrl.startsWith(normalizedPrefix)) {
    return;
  }

  const relativePath = imageUrl.replace(/^\/+/, "");
  const absolutePath = path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  const uploadsBasePath = path.resolve(UPLOADS_DIR);
  const targetPath = path.resolve(absolutePath);

  if (!targetPath.startsWith(uploadsBasePath)) {
    return;
  }

  try {
    await fs.unlink(targetPath);
  } catch {
    // Ignore if file does not exist.
  }
}

export async function saveHomeImageFile(params: {
  sectionKey: HomeImageKey;
  buffer: Buffer;
  extension: string;
}): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const safeExtension = params.extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const fileName = `${params.sectionKey}-${Date.now()}.${safeExtension}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  await fs.writeFile(filePath, params.buffer);

  return `/uploads/home/${fileName}`;
}
