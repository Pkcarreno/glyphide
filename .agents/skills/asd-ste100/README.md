# asd-ste100

[![skills.sh](https://skills.sh/b/woosal1337/blog)](https://www.skills.sh/woosal1337/blog/asd-ste100)

Listed at [skills.sh/woosal1337/blog/asd-ste100](https://www.skills.sh/woosal1337/blog/asd-ste100).

An agent skill that removes AI slop with a writing system, not a banned-word
list. Layer 1 rewrites the words into ASD-STE100 Simplified Technical English,
the controlled language built in the 1980s so an aircraft mechanic could never
misread a repair manual. Layer 2 shapes the reply for a reader with ADHD: the
next action first, numbered steps, real time estimates, no preamble and no
closer.

The claim behind it was tested: six engineering writing tasks, four
conditions, two model families, scored as violations per 100 words.

| Condition | Claude sonnet | gpt-5.5 |
|---|---|---|
| baseline | 4.36 | 3.54 |
| banned-words list | 4.21 (-3%) | 2.14 (-40%) |
| Orwell's six rules | 2.48 (-43%) | 1.69 (-52%) |
| **this skill** | **1.12 (-74%)** | **1.76 (-50%)** |

The full experiment, the data, and the 17-minute episode:
[chele.bi/videos/the-cure-for-ai-slop](https://chele.bi/videos/the-cure-for-ai-slop)

## Install

Pick one route. Do not stack them - two routes double the hooks.

**Claude Code, as a plugin.** This folder is a standard plugin: the skill at
the root, the hooks declared in `hooks/hooks.json`. They self-register on
install, no settings edit:

```
/plugin marketplace add woosal1337/blog
/plugin install asd-ste100@chele-bi
```

**Any agent the [skills CLI](https://skills.sh) supports.** This installs the
skill files. On Claude Code, `install.py` then arms the hooks and the output
style through settings:

```
bunx skills add woosal1337/blog
node "$HOME/.claude/skills/asd-ste100/hooks/run-python.cjs" "$HOME/.claude/skills/asd-ste100/install.py"
```

The registry page for that command is the listing above. It reads this repo
directly, so the page and the folder never drift apart.

**No tooling at all.** Paste `SKILL.md` into the system prompt. The skill
works without the linter. The linter closes the loop.

## Layout

The folder follows the [Agent Skills spec](https://agentskills.io) and the
Claude Code plugin format at the same time:

```
SKILL.md                     the skill - name, description, the two layers
scripts/ste-lint.py          executable code, per the spec convention
references/ste-recurring-errors.md   docs loaded on demand
hooks/hooks.json             the plugin's hook declarations
hooks/run-python.cjs         cross-platform Python 3 launcher
hooks/ste-*.py               the four hook programs
.claude-plugin/plugin.json   the plugin manifest
install.py, output-style.md  the settings route, for non-plugin installs
```

## What the enforcement stack adds

A skill is advisory. The model can forget it on a long turn. `install.py`
therefore arms every deterministic layer Claude Code offers. It symlinks the
skill and the output style, adds four hook entries to
`~/.claude/settings.json`, and backs the old file up first. A second run
repairs the install. `--uninstall` removes exactly what it added.

The hook commands use `hooks/run-python.cjs`. On Windows, it first tries the
Python launcher and `python`. On macOS and Linux, it first tries `python3`.

| Layer | File | When it fires | What it guarantees |
|---|---|---|---|
| style | `output-style.md` | every request | the rule sits in the system prompt |
| card | `hooks/ste-inject.py` | every user turn | the rule enters context, with the last score |
| refresh | `hooks/ste-refresh.py` | every 12 tool calls | the rule stays near the reply on a long turn |
| pre-send | `hooks/ste-pregate.py` | before a commit runs | a sloppy commit message never lands |
| file check | `hooks/ste-refresh.py` | after a Write of an md file | a written doc gets its score in the same turn |
| gate | `hooks/ste-gate.py` | when the reply ends | every finished reply is linted |

The gate keeps three bands. A clean reply passes in silence. A reply over the
target gets its score shown on the next turn. Only a reply over a hard
ceiling forces one rewrite, one time per turn.

## The linter

```
node hooks/run-python.cjs scripts/ste-lint.py draft.md            # flavored: general prose, target under 2.5
node hooks/run-python.cjs scripts/ste-lint.py --strict draft.md   # strict: procedures and error messages
node hooks/run-python.cjs scripts/ste-lint.py --shape draft.md    # add the Layer 2 reply-shape counts
```

The score is violations per 100 words. `--json` gives machine-readable
output. `--fail-over N` exits 1 over the threshold, for CI gates and hooks.
The linter uses only the Python 3 standard library. The launcher has no Node
package dependencies.

Version 2.0.3 fixes Markdown input handling. Leading YAML front matter stays
outside both scores. The linter joins wrapped prose within each block.
Headings, list items, table rows, and blank lines keep their boundaries.
Bold and italic markers do not hide sentence ends.

Possessive nouns do not count as contractions. The apostrophe-s check counts
common forms such as "it's", "she's", and "let's". It leaves ambiguous noun
forms such as "John's" for human review.

File errors go to standard error. The linter checks the remaining files and
exits 1 after the batch. Unmatched file patterns also cause exit 1.
JSON reports for readable files keep the same format.

The rule sets remain `score_version: 2` and `shape_version: 1`.
These fixes can change scores for the same document. Use the same Git revision
of the linter for both sides of a comparison. The episode tables keep their
historical measurements.

## Tests

From the repository root, run both suites:

```sh
python3 -m unittest discover -s videos/ep01-the-cure-for-ai-slop/asd-ste100/tests -p 'test_*.py' -v
node --test videos/ep01-the-cure-for-ai-slop/asd-ste100/tests/run-python.test.cjs videos/ep01-the-cure-for-ai-slop/asd-ste100/tests/linter-e2e.test.cjs
```

The tests cover Markdown input, batch errors, score thresholds, and all four
hooks through the Node launcher. CI runs both suites on Windows, macOS, and
Linux. No test calls an agent service or writes to the real agent settings.

## Scope

Layer 1 governs every word a human reads: docs, commit messages, PR text,
comments, error messages. Layer 2 governs a reply to a person. Neither layer
touches code, identifiers, or command syntax. Writing that needs a voice — a
blog post, an essay, marketing copy — is out of scope on purpose. STE is
deliberately flat.

The hooks and the installer are Claude Code only. The skill file itself works
with every agent the skills CLI supports.

## License

MIT, see [LICENSE](LICENSE). This project is unofficial and not affiliated
with ASD. ASD-STE100 is a registered EU trademark (No. 017966390). The
specification is free from [asd-ste100.org](https://asd-ste100.org).

## Provenance

Built for the episode "The cure for AI slop is a 1986 aircraft manual". This
folder lives in the blog repo at `videos/ep01-the-cure-for-ai-slop/asd-ste100/`
and is the canonical source. The skills CLI installs it straight from there —
no mirror, no second repo.
