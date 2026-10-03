#!/usr/bin/env python3
"""PreToolUse hook for the asd-ste100 skill. The pre-send gate.

The Stop gate has a structural cost: it runs after the reply is on the
reader's screen, so a block puts a second copy there. This gate has no such
cost. It runs BEFORE the tool call, so a deny reaches the model only. The
model corrects the text and makes the same call again, and the reader sees
one clean result. This makes commit messages and board text deterministic in
a way the reply itself can never be.

Gated text:

- Bash        the commit message, from -m arguments and the heredoc body
- Elliptic    title, description, and body fields on create and update calls

Everything fails open. A parse miss, a broken linter, or a short text lets
the call through. The deny fires only over the same ceiling the Stop gate
uses, so the two gates agree on what is bad enough to stop.

Canonical copy: the ep01 kit, asd-ste100/hooks/ste-pregate.py
"""
import json
import os
import re
import subprocess
import sys

def find_lint():
    """The linter ships next to this skill. Look there first, then at the
    installed path, so the plugin cache, a skills-CLI copy, and the
    settings-route install all resolve."""
    root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    for path in (os.path.join(root, "scripts", "ste-lint.py"),
                 os.path.expanduser("~/.claude/skills/asd-ste100/scripts/ste-lint.py")):
        if os.path.exists(path):
            return path
    return None


LINT = find_lint()

BLOCK_AT = 4.0        # same ceiling as the Stop gate
SHAPE_BLOCK_AT = 4
MIN_WORDS = 30        # a short message scores as noise - let it through

TEXT_FIELDS = ("title", "description", "body", "content")


def commit_message(command):
    """The message text of a git commit command, or None.

    Covers -m arguments (single or double quoted) and a heredoc body. An
    amend, fixup, or squash with no new message passes untouched.
    """
    # "git", then at most four arguments, then "commit". The lookbehind
    # stops a match inside ".git", so prose like "--exclude .git ... then
    # commit and push" cannot turn a non-commit command into a gated one.
    # The bounded chain still covers "git -c key=value commit".
    if not re.search(r"(?<![\w./-])git\s+(?:[^\s|;&]+\s+){0,4}commit\b", command):
        return None
    if re.search(r"--(?:no-edit|fixup|squash)\b", command):
        return None
    parts = []
    for m in re.finditer(r"<<-?\s*'?([A-Za-z_][A-Za-z0-9_]*)'?\n(.*?)\n\1\b",
                         command, re.S):
        parts.append(m.group(2))
    for m in re.finditer(r"-m\s+'([^']*)'", command, re.S):
        parts.append(m.group(1))
    for m in re.finditer(r'-m\s+"([^"]*)"', command, re.S):
        parts.append(m.group(1))
    text = "\n\n".join(p for p in parts if p.strip())
    return text or None


def elliptic_text(tool_input):
    parts = [v for k, v in (tool_input or {}).items()
             if k in TEXT_FIELDS and isinstance(v, str) and v.strip()]
    return "\n\n".join(parts) or None


def strip_noise(text):
    text = re.sub(r"^\s*\|.*\|\s*$", " ", text, flags=re.M)
    text = re.sub(r"https?://\S+", " ", text)
    return text


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    if not LINT:
        return 0
    tool = payload.get("tool_name") or ""
    tool_input = payload.get("tool_input") or {}

    if tool == "Bash":
        text = commit_message(tool_input.get("command") or "")
        what = "commit message"
        retry = "run the same command again with the corrected message"
    elif tool.startswith("mcp__elliptic__"):
        text = elliptic_text(tool_input)
        what = "task text"
        retry = "make the same call again with the corrected text"
    else:
        return 0
    if not text:
        return 0

    prose = strip_noise(text)
    if len(prose.split()) < MIN_WORDS:
        return 0
    try:
        proc = subprocess.run([sys.executable, LINT], input=prose,
                              capture_output=True, text=True, timeout=15)
        report = json.loads(proc.stdout)
    except Exception:
        return 0                      # never block on a broken linter

    score = report.get("total_per100w", 0)
    shape_total = report.get("shape_total", 0)
    if score <= BLOCK_AT and shape_total <= SHAPE_BLOCK_AT:
        return 0

    hits = {k: v for k, v in (report.get("violations") or {}).items() if v}
    shape = {k: v for k, v in (report.get("shape") or {}).items() if v}
    longs = report.get("sample_long_sentence") or []
    reason = (
        "ASD-STE100 pre-send gate. The {} scored {:.2f} violations per 100 "
        "words. The ceiling is {}. Counts: {}. Shape counts: {}.{} "
        "Nothing was sent - this gate runs before the call. Rewrite the text "
        "in STE. Fix the listed categories. Keep every fact and every "
        "identifier. Then {}."
    ).format(what, score, BLOCK_AT, hits, shape,
             " Longest: {}.".format(" | ".join(longs)) if longs else "",
             retry)
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
