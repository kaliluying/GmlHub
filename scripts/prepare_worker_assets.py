"""Extract and verify the CI artifact without rebuilding the tested frontend."""
import sys
from pathlib import Path
from deploy_release import unpack, validate_release


def prepare(archive, commit, destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    unpack(Path(archive), destination)
    validate_release(destination, commit)


if __name__ == '__main__':
    prepare(*sys.argv[1:])
