#!/usr/bin/env python3
"""PostToolUse hook for the asd-ste100 skill. Two jobs:

1. The distance problem. The turn-start card injects the rule, but a long
   working turn puts dozens of tool calls between that card and the final
   reply. By the time the model writes the reply, the card sits far back in
   context. This hook counts the tool calls in the turn and re-injects a short
   card every EVERY calls, so the rule is always near the reply.

2. The file problem. The Stop gate lints the chat reply only. Prose written to
   an md file never meets it. After a Write or an Edit of a prose md file,
   this hook lints the file and reports the score into context, so the model
   fixes the file in the same turn.

Both jobs inject context. Neither blocks. The turn counter is reset by
ste-inject.py on each user prompt.

Canonical copy: the ep01 kit, asd-ste100/hooks/ste-refresh.py
"""
import hashlib
import json
import os
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
RUNNER = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                      "run-python.cjs")
STATE = os.path.expanduser("~/.claude/ste-gate")

EVERY = 12          # tool calls between two cards
TARGET = 2.5        # flavored target for a written md file
MIN_WORDS = 40      # skip a stub file - the score is noise below this
MAX_BYTES = 200_000

# Paths where the advisory stays silent. Blog posts and episode pages have a
# voice. The experiment files are published data. The skill files quote
# violations on purpose. A scratchpad draft is linted by the model itself.
SKIP = ["/blog/", "(episode)", "/experiment/", "/asd-ste100/",
        "/scratchpad/", "/memory/", "/ste-gate/", "/output-styles/"]

CARD = (
    "ste check-in, mid-turn: the standing rule still governs the reply you "
    "write at the end of this turn. Layer 1: active voice, simple tenses, "
    "max 20 words for an instruction, no contractions, no semicolons, keep "
    "the articles. Layer 2: the next action first, numbered steps, no "
    "preamble, no recap, no closer. If the reply runs over 60 words, lint "
    "the draft first: node \"{}\" \"{}\" --fail-over 2.5 FILE"
).format(RUNNER, LINT or "scripts/ste-lint.py")


def count_path(session):
    os.makedirs(STATE, exist_ok=True)
    key = hashlib.sha1((session or "none").encode()).hexdigest()[:16]
    return os.path.join(STATE, "{}.count".format(key))


def bump(session):
    path = count_path(session)
    try:
        with open(path, encoding="utf-8") as fh:
            n = int(fh.read().strip() or 0)
    except Exception:
        n = 0
    n += 1
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(str(n))
    except Exception:
        pass
    return n


def md_report(payload):
    if payload.get("tool_name") not in ("Write", "Edit"):
        return None
    path = (payload.get("tool_input") or {}).get("file_path") or ""
    if not path.endswith(".md") or any(s in path for s in SKIP):
        return None
    try:
        if os.path.getsize(path) > MAX_BYTES:
            return None
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        proc = subprocess.run([sys.executable, LINT], input=text,
                              capture_output=True, text=True, timeout=15)
        report = json.loads(proc.stdout)
    except Exception:
        return None
    if report.get("words", 0) < MIN_WORDS:
        return None
    score = report.get("total_per100w", 0)
    if score <= TARGET:
        return None
    hits = {k: v for k, v in (report.get("violations") or {}).items() if v}
    top = sorted(hits.items(), key=lambda kv: -kv[1])[:3]
    longs = report.get("sample_long_sentence") or []
    return (
        "ste: {} scored {} violations per 100 words. The target is {}. "
        "Worst: {}.{} Fix the file before you finish this task."
    ).format(os.path.basename(path), score, TARGET,
             ", ".join("{} {}".format(k, v) for k, v in top),
             " Longest: {}.".format(" | ".join(longs)) if longs else "")


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    if not LINT:
        return 0
    notes = []
    if bump(payload.get("session_id") or "") % EVERY == 0:
        notes.append(CARD)
    report = md_report(payload)
    if report:
        notes.append(report)
    if notes:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": "\n\n".join(notes),
        }}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
