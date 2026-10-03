#!/usr/bin/env python3
"""Installer for the asd-ste100 skill. One command arms every layer.

    node hooks/run-python.cjs install.py              install or repair
    node hooks/run-python.cjs install.py --dry-run    show the plan, write nothing
    node hooks/run-python.cjs install.py --uninstall  remove what this script added
    node hooks/run-python.cjs install.py --no-output-style   skip the output style

What it wires, for Claude Code:

1. ~/.claude/skills/asd-ste100        symlink to this directory
2. ~/.claude/output-styles/asd-ste100.md   symlink to output-style.md
3. ~/.claude/settings.json             four hook entries plus outputStyle

The four hooks:

- UserPromptSubmit  ste-inject.py   the rule card, every turn
- PostToolUse       ste-refresh.py  a short card every 12 tool calls, and a
                                    score report after a Write of an md file
- PreToolUse        ste-pregate.py  lints a commit message before it runs
- Stop              ste-gate.py     lints the final reply, three bands

The script is idempotent. A second run repairs the install. An entry that
points at an older copy of a hook (any command that names the same script
file) is replaced, not duplicated. The previous settings.json is saved next
to it as settings.json.ste-backup before the first change.
"""
import argparse
import json
import os
import sys

SRC = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.expanduser("~")
CLAUDE = os.path.join(HOME, ".claude")
SETTINGS = os.path.join(CLAUDE, "settings.json")
STYLE_NAME = "asd-ste100"

HOOK_DIR = os.path.join(CLAUDE, "skills", "asd-ste100", "hooks")
RUNNER = os.path.join(HOOK_DIR, "run-python.cjs")


def command_hook(script, timeout, status_message=None):
    hook = {
        "type": "command",
        "command": "node",
        "args": [RUNNER, os.path.join(HOOK_DIR, script)],
        "timeout": timeout,
    }
    if status_message:
        hook["statusMessage"] = status_message
    return hook


HOOKS = {
    "UserPromptSubmit": {
        "marker": "ste-inject",
        "entry": {"hooks": [command_hook("ste-inject.py", 10)]},
    },
    "PreToolUse": {
        "marker": "ste-pregate",
        "entry": {"matcher": "Bash|mcp__elliptic__.*",
                  "hooks": [command_hook("ste-pregate.py", 15)]},
    },
    "PostToolUse": {
        "marker": "ste-refresh",
        "entry": {"matcher": "*",
                  "hooks": [command_hook("ste-refresh.py", 15)]},
    },
    "Stop": {
        "marker": "ste-gate",
        "entry": {
            "hooks": [command_hook(
                "ste-gate.py", 30, "Checking ASD-STE100")],
        },
    },
}
MARKERS = tuple(spec["marker"] for spec in HOOKS.values())


def is_ste_hook(hook):
    if not isinstance(hook, dict):
        return False
    cmd = " ".join([hook.get("command", "")] + (hook.get("args") or []))
    return any(m in cmd for m in MARKERS)


def strip_ste(groups):
    """Remove every ste-* command hook from an event's entry list."""
    kept = []
    removed = 0
    for group in groups or []:
        inner = [h for h in group.get("hooks", []) if not is_ste_hook(h)]
        removed += len(group.get("hooks", [])) - len(inner)
        if inner:
            kept.append({**group, "hooks": inner})
    return kept, removed


def ensure_link(link, target, actions, dry):
    if os.path.exists(link) and os.path.realpath(link) == os.path.realpath(target):
        # Already in place. This also covers the skills CLI, which puts the
        # directory at the agent path itself - never link a path to itself.
        actions.append("ok       {} already points here".format(link))
        return
    if os.path.islink(link):
        actions.append("relink   {} (pointed elsewhere)".format(link))
        if not dry:
            os.remove(link)
    elif os.path.isdir(link) or os.path.isfile(link):
        backup = link + ".pre-ste-backup"
        actions.append("backup   {} -> {}".format(link, backup))
        if not dry:
            if os.path.exists(backup):
                actions.append("skip     backup exists, remove {} by hand".format(link))
                return
            os.rename(link, backup)
    else:
        actions.append("link     {} -> {}".format(link, target))
    if not dry:
        os.makedirs(os.path.dirname(link), exist_ok=True)
        if not os.path.islink(link):
            os.symlink(target, link)


def drop_link(link, actions, dry):
    if os.path.islink(link) and os.path.realpath(link).startswith(os.path.realpath(SRC)):
        actions.append("unlink   {}".format(link))
        if not dry:
            os.remove(link)


def main():
    parser = argparse.ArgumentParser(description="Install the asd-ste100 skill.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--uninstall", action="store_true")
    parser.add_argument("--no-output-style", action="store_true")
    args = parser.parse_args()
    dry = args.dry_run
    actions = []

    skill_link = os.path.join(CLAUDE, "skills", "asd-ste100")
    style_link = os.path.join(CLAUDE, "output-styles", STYLE_NAME + ".md")

    try:
        with open(SETTINGS, encoding="utf-8") as fh:
            settings = json.load(fh)
    except FileNotFoundError:
        settings = {}
    except json.JSONDecodeError:
        print("error: {} is not valid JSON. Fix it first.".format(SETTINGS))
        return 1
    hooks = settings.setdefault("hooks", {})

    if args.uninstall:
        drop_link(style_link, actions, dry)
        drop_link(skill_link, actions, dry)
        for event in HOOKS:
            kept, removed = strip_ste(hooks.get(event))
            if removed:
                actions.append("remove   {} ste hook from {}".format(removed, event))
            if kept:
                hooks[event] = kept
            else:
                hooks.pop(event, None)
        if settings.get("outputStyle") == STYLE_NAME:
            actions.append("remove   outputStyle")
            settings.pop("outputStyle")
    else:
        ensure_link(skill_link, SRC, actions, dry)
        if not args.no_output_style:
            ensure_link(style_link, os.path.join(SRC, "output-style.md"), actions, dry)
        for event, spec in HOOKS.items():
            kept, removed = strip_ste(hooks.get(event))
            if removed:
                actions.append("replace  {} older ste hook in {}".format(removed, event))
            else:
                actions.append("add      {} hook ({})".format(event, spec["marker"]))
            hooks[event] = kept + [spec["entry"]]
        if args.no_output_style:
            pass
        elif settings.get("outputStyle") in (None, STYLE_NAME, "ste-writing"):
            actions.append("set      outputStyle = {}".format(STYLE_NAME))
            settings["outputStyle"] = STYLE_NAME
        else:
            actions.append("keep     outputStyle = {} (yours; set it to {} by hand "
                           "if you want the style layer)".format(
                               settings["outputStyle"], STYLE_NAME))

    if not dry:
        os.makedirs(CLAUDE, exist_ok=True)
        backup = SETTINGS + ".ste-backup"
        if os.path.exists(SETTINGS) and not os.path.exists(backup):
            with open(SETTINGS, encoding="utf-8") as fh:
                data = fh.read()
            with open(backup, "w", encoding="utf-8") as fh:
                fh.write(data)
            actions.append("backup   settings.json -> settings.json.ste-backup")
        with open(SETTINGS, "w", encoding="utf-8") as fh:
            json.dump(settings, fh, indent=2)
            fh.write("\n")

    for line in actions:
        print(line)
    print("{}{}. Restart the Claude Code session to load the hooks.".format(
        "planned " if dry else "",
        "uninstalled" if args.uninstall else "installed"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
