import logging
import time
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
)
logger = logging.getLogger("pruner")

MOVIES_DIR = Path("/media/Movies")
TV_DIR = Path("/media/TV")
MOVIES_MAX_GB = 30
TV_MAX_GB = 30
CHECK_INTERVAL = 3600
GB = 1024 * 1024 * 1024


def get_media_files(directory: Path) -> list[dict]:
    files = []
    for ext in ("*.mp4", "*.mkv"):
        for f in directory.rglob(ext):
            try:
                s = f.stat()
                files.append({"path": f, "size": s.st_size, "mtime": s.st_mtime})
            except OSError:
                pass
    return files


def prune(directory: Path, max_bytes: int, label: str) -> None:
    files = get_media_files(directory)
    if not files:
        return

    total = sum(f["size"] for f in files)
    logger.info("%s: %.2fGB / %dGB (%d files)", label, total / GB, max_bytes / GB, len(files))

    if total <= max_bytes:
        return

    files.sort(key=lambda f: f["mtime"])
    to_free = total - max_bytes
    freed = 0
    deleted = 0

    for f in files:
        if freed >= to_free:
            break
        try:
            f["path"].unlink()
            logger.info("  Deleted: %s", f["path"])
            freed += f["size"]
            deleted += 1
        except OSError as e:
            logger.error("  Failed to delete %s: %s", f["path"], e)

    logger.info("%s: %d files deleted, %.2fGB freed", label, deleted, freed / GB)


def main() -> None:
    logger.info("Pruner started — Movies <= %dGB, TV <= %dGB", MOVIES_MAX_GB, TV_MAX_GB)
    while True:
        prune(MOVIES_DIR, MOVIES_MAX_GB * GB, "Movies")
        prune(TV_DIR, TV_MAX_GB * GB, "TV")
        logger.info("Sleeping %ds...", CHECK_INTERVAL)
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
