from typing import TypedDict


class FileMetadata(TypedDict):
    """Describe a local media file without transferring its contents."""

    name: str
    size: int
    type: str
    absolutePath: str
