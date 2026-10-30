import {
  cp,
  mkdir,
  readdir,
  lstat,
  chown,
  access,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

const destination = "/uploads";
await mkdir(destination, { recursive: true });
let seeded = false;
try {
  await access(join(destination, ".seeded"));
  seeded = true;
} catch {
  /* primeiro uso */
}
if (!seeded) {
  // force:false preserva arquivos já existentes no volume.
  await cp("/backup", destination, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
  async function own(path) {
    const entry = await lstat(path);
    if (entry.isSymbolicLink())
      throw new Error("Links simbólicos não são aceitos no backup de uploads.");
    await chown(path, 1000, 1000);
    if (entry.isDirectory())
      for (const name of await readdir(path)) await own(join(path, name));
  }
  await own(destination);
  await writeFile(
    join(destination, ".seeded"),
    "Uploads iniciais importados.\n",
  );
  await chown(join(destination, ".seeded"), 1000, 1000);
}
console.log("Volume de uploads pronto.");
