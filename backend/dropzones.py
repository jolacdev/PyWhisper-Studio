from enum import Enum


# NOTE: Inheriting from (str, Enum) allows direct string comparison.
# (e.g., "Value1" == SomeEnum.Value1)
class AllowedDropzoneId(str, Enum):
    FILE_DROPZONE = "file-dropzone"
