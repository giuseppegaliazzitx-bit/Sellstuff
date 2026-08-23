"""Operator CLI. version | create-admin."""

from __future__ import annotations

import argparse
import sys

from app.core.config import get_settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="northstar")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("version", help="Print app version")
    create = sub.add_parser("create-admin", help="Create an admin user")
    create.add_argument("--email", required=True)
    create.add_argument("--password", required=True)
    create.add_argument("--name", default="Admin")
    args = parser.parse_args(argv)
    settings = get_settings()
    if args.cmd == "version" or args.cmd is None:
        print(f"{settings.app_version} ({settings.app_commit})")
        return 0
    if args.cmd == "create-admin":
        from app.services.bootstrap import create_admin

        created = create_admin(settings, email=args.email, password=args.password, name=args.name)
        print("created" if created else "exists")
        return 0
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
