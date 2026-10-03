#!/usr/bin/env python3
"""Stop hook for the asd-ste100 skill. Lints the final assistant message and
decides what to do about the score.

Why this file is more than one `if`:

The hook runs AFTER the reply is on the reader's screen. A block does not
retract that text - it makes the model send a corrected reply below the first
one, so the reader sees the same answer two times. Version 1 blocked at the
target, so a reply that scored 2.54 against a limit of 2.50 cost a full
duplicate. That trade is wrong.

Version 2 keeps three bands:

  score <= TARGET                    silent pass
  TARGET < score <= BLOCK_AT         warn, no block, no duplicate reply
  score > BLOCK_AT                   block one time for this user turn

A warn goes to a per-session file. The UserPromptSubmit hook reads that file on
the next turn, shows the score, then deletes it. The model learns without a
second reply on screen.

The real fix is in the skill: lint the draft before you send it. Then the gate
stays silent.

Canonical copy: the ep01 kit, asd-ste100/hooks/ste-gate.py
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time

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
STATE = os.path.expanduser("~/.claude/ste-gate")

TARGET = 2.5           # flavored target, violations per 100 words
BLOCK_AT = 4.0         # hard ceiling - only over this does the gate block
SHAPE_TARGET = 1       # Layer 2 hits that pass without a word
SHAPE_BLOCK_AT = 4     # Layer 2 hits that force a block on their own
MIN_WORDS = 60         # skip a short reply - the score is noise below this
KEEP_DAYS = 7          # delete a state file older than this


# --- state -----------------------------------------------------------------

def state_path(session, suffix):
    os.makedirs(STATE, exist_ok=True)
    key = hashlib.sha1((session or "none").encode()).hexdigest()[:16]
    return os.path.join(STATE, "{}.{}".format(key, suffix))


def sweep():
    """Delete an old state file. A session id never repeats."""
    try:
        cutoff = time.time() - KEEP_DAYS * 86400
        for name in os.listdir(STATE):
            path = os.path.join(STATE, name)
            if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                os.remove(path)
    except Exception:
        pass


def write_warn(session, report):
    hits = {k: v for k, v in (report.get("violations") or {}).items() if v}
    shape = {k: v for k, v in (report.get("shape") or {}).items() if v}
    top = sorted(hits.items(), key=lambda kv: -kv[1])[:3]
    payload = {
        "score": report.get("total_per100w", 0),
        "limit": TARGET,
        "top": ["{} {}".format(k, v) for k, v in top],
        "shape_total": report.get("shape_total", 0),
        "shape_top": list(shape)[:3],
        "long_samples": (report.get("sample_long_sentence") or [])[:2],
        "longest_sentence_words": report.get("longest_sentence_words", 0),
    }
    try:
        with open(state_path(session, "warn.json"), "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
    except Exception:
        pass


def clear_warn(session):
    try:
        os.remove(state_path(session, "warn.json"))
    except OSError:
        pass


def blocked_turn(session):
    try:
        with open(state_path(session, "lock"), encoding="utf-8") as fh:
            return int(fh.read().strip())
    except Exception:
        return -1


def mark_blocked(session, turn):
    try:
        with open(state_path(session, "lock"), "w", encoding="utf-8") as fh:
            fh.write(str(turn))
    except Exception:
        pass


# --- transcript ------------------------------------------------------------

def read_records(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def scan(path):
    """Return the last assistant text, and the count of real user turns.

    A tool result also arrives as a user record, and so does the gate's own
    block feedback. Neither is a turn. If the feedback counted, the lock would
    release on the same turn it was set, and the gate could block again.
    """
    text = None
    turns = 0
    for rec in read_records(path):
        kind = rec.get("type")
        content = rec.get("message", {}).get("content")
        if kind == "assistant":
            if not isinstance(content, list):
                continue
            parts = [b.get("text", "") for b in content
                     if isinstance(b, dict) and b.get("type") == "text"]
            joined = "\n".join(p for p in parts if p.strip())
            if joined.strip():
                text = joined
        elif kind == "user":
            if isinstance(content, list):
                if any(isinstance(b, dict) and b.get("type") == "tool_result"
                       for b in content):
                    continue
                body = " ".join(b.get("text", "") for b in content
                                if isinstance(b, dict) and b.get("type") == "text")
            elif isinstance(content, str):
                body = content
            else:
                continue
            body = body.strip()
            if not body or body.startswith("Stop hook feedback"):
                continue
            turns += 1
    return text, turns


def strip_noise(text):
    # ste-lint strips fenced and inline code itself. Drop table rows and URLs,
    # which are labels rather than prose and would skew the score.
    text = re.sub(r"^\s*\|.*\|\s*$", " ", text, flags=re.M)
    text = re.sub(r"https?://\S+", " ", text)
    return text


# --- main ------------------------------------------------------------------

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    session = payload.get("session_id") or ""
    path = payload.get("transcript_path")
    if not path or not os.path.exists(path) or not LINT:
        return 0

    sweep()
    text, turn = scan(path)
    if not text:
        return 0
    prose = strip_noise(text)
    if len(prose.split()) < MIN_WORDS:
        clear_warn(session)
        return 0

    try:
        proc = subprocess.run([sys.executable, LINT], input=prose,
                              capture_output=True, text=True, timeout=20)
        report = json.loads(proc.stdout)
    except Exception:
        return 0                      # never block on a broken linter

    score = report.get("total_per100w", 0)
    shape_total = report.get("shape_total", 0)
    if score <= TARGET and shape_total <= SHAPE_TARGET:
        clear_warn(session)
        return 0

    # Over the target but under the ceiling: say it on the next turn instead of
    # forcing a second copy of this reply onto the screen.
    over_ceiling = score > BLOCK_AT or shape_total > SHAPE_BLOCK_AT
    already = payload.get("stop_hook_active") or blocked_turn(session) == turn
    if not over_ceiling or already:
        write_warn(session, report)
        return 0

    mark_blocked(session, turn)
    hits = {k: v for k, v in (report.get("violations") or {}).items() if v}
    shape = {k: v for k, v in (report.get("shape") or {}).items() if v}
    samples = (report.get("sample_banned") or []) + (report.get("sample_marketing") or []) \
        + (report.get("sample_long_sentence") or [])
    print(json.dumps({
        "decision": "block",
        "reason": (
            "ASD-STE100 gate. The reply scored {:.2f} violations per 100 words. "
            "The ceiling is {}. Layer 1 counts: {}. Layer 2 shape counts: {}. "
            "Words flagged: {}. Longest sentence: {} words.\n"
            "Send the corrected reply and nothing else. Keep every fact and "
            "every number from the first draft. Add no apology, no note about "
            "this gate, and no summary of what you changed. Change no code, no "
            "identifier, and no command syntax.\n"
            "The first draft is already on the reader's screen, so a long "
            "second copy costs them twice. Rewrite it tight."
        ).format(score, BLOCK_AT, hits, shape, samples[:6],
                 report.get("longest_sentence_words", 0)),
        "systemMessage": "STE gate: {:.2f}/100w over the {} ceiling. Rewriting one time.".format(score, BLOCK_AT),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
