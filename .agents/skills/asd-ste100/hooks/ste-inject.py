#!/usr/bin/env python3
"""UserPromptSubmit hook for the asd-ste100 skill. Three jobs:

1. Put the rule card into context on every turn, so the discipline does not
   depend on the model remembering to load the skill.
2. Show the score of the last reply, when the Stop gate wrote a warning
   instead of blocking. That is the feedback path that costs no second copy
   of the reply on screen.
3. Reset the turn's tool-call counter, which ste-refresh.py increments.

Canonical copy: the ep01 kit, asd-ste100/hooks/ste-inject.py
"""
import hashlib
import json
import os
import sys

STATE = os.path.expanduser("~/.claude/ste-gate")


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

RUNNER = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                      "run-python.cjs")
LINT = find_lint() or "scripts/ste-lint.py"

CARD = """<asd-ste100-standing-rule>
ASD-STE100 governs every word the reader sees in this reply, and in any prose
you write to a file: chat text, commit messages, docs, code comments, PR text,
error messages, task trackers, wiki pages. It never applies to code,
identifiers, or command syntax. Default mode: STE-flavored. Use strict mode for
runbooks, procedures, error messages, and safety text.

LAYER 1 - the words
- Active voice. Simple tenses only. No present perfect, no stacked modals.
- One instruction per sentence. Max 20 words for an instruction, 25 otherwise.
- No contractions. No semicolons. Keep the articles.
- Short common words: use, start, make sure, do, give, show, before, about.
- No phrasal verbs: spin up, dive into, kick off, roll out, reach out.
- No marketing adjectives: seamless, robust, powerful, effortless, elegant.
- One name for one thing. Do not rotate synonyms for the same action.
- Use a verb for an action. Write "analyze the log", not "perform an analysis".
- Multi-word nouns: three words maximum.

LAYER 2 - the shape (a reply to a person, a task, a PR description)
- The reader has ADHD. Lead with the action, the command, or the path.
- Number a multi-step task. One bounded action for each step.
- No preamble, no recap, no closer. Start with the answer, stop when it is done.
- Cap an action list at five items. A reference table has no cap.
- Restate the state each turn: step N of M, what is done, what is next.
- Give an estimate in minutes, hours, or days. Never "a while".
- Show what now works, in concrete terms. Stay matter-of-fact about an error.
- Finish one issue. Offer the second one as a separate question.
- Cut a hedge that carries no fact. Keep a qualifier that bounds a claim.

Lint the draft BEFORE you send it. A Stop hook lints it after, and a block puts
a second copy of the same answer on the reader's screen:
  node "{runner}" "{lint}" --fail-over 2.5 FILE
Full rules, both modes, and the four layer conflicts: load the asd-ste100 skill.
</asd-ste100-standing-rule>""".format(runner=RUNNER, lint=LINT)


def key_for(session):
    return hashlib.sha1((session or "none").encode()).hexdigest()[:16]


def feedback(session):
    path = os.path.join(STATE, "{}.warn.json".format(key_for(session)))
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            warn = json.load(fh)
    except Exception:
        warn = None
    try:
        os.remove(path)
    except OSError:
        pass
    if not warn:
        return None
    lines = ["<asd-ste100-feedback>",
             "Your last reply scored {} violations per 100 words. The target "
             "is {}.".format(warn.get("score"), warn.get("limit"))]
    if warn.get("top"):
        lines.append("Worst Layer 1 categories: {}.".format(", ".join(warn["top"])))
    if warn.get("shape_total"):
        lines.append("Layer 2 shape hits: {} ({}).".format(
            warn["shape_total"], ", ".join(warn.get("shape_top") or [])))
    if warn.get("long_samples"):
        lines.append("Longest offenders: {}.".format(" | ".join(warn["long_samples"])))
    lines.append("Longest sentence: {} words.".format(
        warn.get("longest_sentence_words", 0)))
    lines.append("Lint the draft of this reply before you send it.")
    lines.append("</asd-ste100-feedback>")
    return "\n".join(lines)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}
    session = payload.get("session_id") or ""
    try:
        os.makedirs(STATE, exist_ok=True)
        with open(os.path.join(STATE, "{}.count".format(key_for(session))),
                  "w", encoding="utf-8") as fh:
            fh.write("0")
    except Exception:
        pass
    parts = [CARD]
    warn = feedback(session)
    if warn:
        parts.append(warn)
    print(json.dumps({
        "suppressOutput": True,
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": "\n\n".join(parts),
        },
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
