import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LINTER = ROOT / "scripts" / "ste-lint.py"
SPEC = importlib.util.spec_from_file_location("ste_lint", LINTER)
STE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(STE)

WRAPPED = (
    "This library builds one finite state machine from the usage\n"
    "string, and it walks that machine to match the command line."
)
FRONT_MATTER = (
    "---\n"
    "title: A powerful guide\n"
    "description: Ensure the tools work\n"
    "author: The user's team\n"
    "status: published\n"
    "version: 2\n"
    "tags: [docs, guide]\n"
    "date: 2026-09-22\n"
    "---\n\n"
)


class ContractionTests(unittest.TestCase):
    def test_possessive_nouns_do_not_count_as_contractions(self):
        for text in (
            "Check the Spec's Before Hook.",
            "Read the user's guide.",
            "Read Alice’s notes.",
            "The team's plan works.",
            "Read the children's books.",
            "Check the users' files.",
            "The company's service works.",
        ):
            with self.subTest(text=text):
                self.assertEqual(STE.lint(text)["violations"]["contraction"], 0)

    def test_common_contractions_still_count(self):
        for word in (
            "it's", "he's", "she's", "that's", "what's", "who's", "where's",
            "when's", "why's", "how's", "there's", "here's", "let's",
            "don't", "can't", "won't", "we're", "they've", "you'll", "I'd", "I'm",
        ):
            for token in (word, word.upper(), word.replace("'", "’")):
                with self.subTest(token=token):
                    self.assertEqual(STE.lint(token)["violations"]["contraction"], 1)


class MarkdownTests(unittest.TestCase):
    def test_hard_wrap_does_not_change_the_report(self):
        expected = STE.lint(WRAPPED.replace("\n", " "))
        self.assertEqual(expected["words"], 21)
        self.assertEqual(expected["sentences"], 1)
        self.assertEqual(expected["violations"]["long_sentence(>20w)"], 1)
        for newline in ("\n", "\r\n"):
            with self.subTest(newline=newline):
                self.assertEqual(STE.lint(WRAPPED.replace("\n", newline)), expected)

    def test_wrapped_phrases_keep_the_same_counts(self):
        for phrase in ("in order\nto", "is\nbuilt", "has\nbeen made", "spin\nup"):
            with self.subTest(phrase=phrase):
                self.assertEqual(STE.lint(phrase), STE.lint(phrase.replace("\n", " ")))

    def test_blank_lines_keep_paragraphs_apart(self):
        self.assertEqual(STE.sentences("Read the guide\n\nCheck the result"),
                         ["Read the guide", "Check the result"])

    def test_headings_and_list_items_keep_their_boundaries(self):
        text = "## Steps\n1. Read the guide\n   before you start\n2. Check the result"
        self.assertEqual(STE.sentences(text),
                         ["Steps", "Read the guide before you start", "Check the result"])
        for marker in ("-", "*", "+", "1.", "1)"):
            with self.subTest(marker=marker):
                text = f"{marker} Read the guide\n{marker} Check the result"
                self.assertEqual(STE.sentences(text), ["Read the guide", "Check the result"])

    def test_table_rows_and_horizontal_rules_keep_boundaries(self):
        self.assertEqual(STE.sentences("Read this\n---\nCheck that"), ["Read this", "Check that"])
        self.assertEqual(STE.sentences("| First | Second |\n| Third | Fourth |"),
                         ["| First | Second |", "| Third | Fourth |"])

    def test_wrapped_blockquote_keeps_one_sentence(self):
        quoted = "> " + WRAPPED.replace("\n", "\n> ")
        self.assertEqual(STE.lint(quoted), STE.lint(WRAPPED.replace("\n", " ")))

    def test_real_sentence_ends_still_split(self):
        text = "Read this. Check that! Is it ready? Yes: Start here."
        self.assertEqual(len(STE.sentences(text)), 5)

    def test_emphasis_does_not_hide_sentence_ends(self):
        expected = STE.lint("Short. Then the next one follows.")
        for marker in ("*", "**", "***", "_", "__", "___"):
            with self.subTest(marker=marker):
                self.assertEqual(STE.lint(f"{marker}Short.{marker} Then the next one follows."), expected)
                self.assertEqual(STE.sentences(f"{marker}Short.{marker} Then the next one follows."),
                                 ["Short.", "Then the next one follows."])

    def test_emphasis_does_not_hide_a_long_sentence(self):
        plain = WRAPPED.replace("\n", " ") + " Read the guide."
        bold = "**" + WRAPPED + "** Read the guide."
        self.assertEqual(STE.lint(bold), STE.lint(plain))

    def test_nested_emphasis_keeps_sentence_ends(self):
        self.assertEqual(STE.lint("**Short. _Next._** Then read this."),
                         STE.lint("Short. Next. Then read this."))

    def test_emphasis_preserves_identifiers_and_unpaired_markers(self):
        self.assertEqual(STE.sentences("Read snake_case and file_name."),
                         ["Read snake_case and file_name."])
        self.assertEqual(STE.sentences("Read *this guide."), ["Read *this guide."])

    def test_leading_front_matter_does_not_change_either_score(self):
        for strict in (False, True):
            for ending in ("---", "..."):
                for prefix in ("", "\ufeff"):
                    with self.subTest(strict=strict, ending=ending, prefix=prefix):
                        front = FRONT_MATTER.rsplit("---", 1)[0] + ending + "\n\n"
                        text = prefix + front + "Read the guide."
                        self.assertEqual(STE.lint(text, strict=strict),
                                         STE.lint("Read the guide.", strict=strict))

    def test_front_matter_accepts_crlf(self):
        self.assertEqual(STE.lint((FRONT_MATTER + "Read the guide.").replace("\n", "\r\n")),
                         STE.lint("Read the guide."))

    def test_front_matter_only_applies_at_the_start(self):
        result = STE.lint("Read the guide.\n\n" + FRONT_MATTER + "Check the result.")
        self.assertGreater(result["violations"]["banned_word"], 0)
        self.assertGreater(result["words"], 6)

    def test_front_matter_is_removed_only_once(self):
        body = "---\nGreat question.\n---\nRead the guide."
        result = STE.lint("---\ntitle: Guide\n---\n" + body)
        self.assertEqual(result["words"], 5)
        self.assertEqual(result["shape"]["preamble_opener"], 1)

    def test_unclosed_front_matter_keeps_its_text(self):
        result = STE.lint("---\ntitle: Ensure the guide works\nRead the guide.")
        self.assertEqual(result["violations"]["banned_word"], 1)

    def test_fenced_code_keeps_prose_apart(self):
        source = "Read the guide\n```python\nensure = 1\n\nprovide = 2\n```\nCheck the result"
        self.assertEqual(STE.lint(source), STE.lint("Read the guide\n\nCheck the result"))

    def test_inline_code_stays_out_of_the_score(self):
        result = STE.lint("Read `ensure provide it's` the guide.")
        self.assertEqual(result["words"], 3)
        self.assertEqual(result["total"], 0)

    def test_long_paragraph_still_counts(self):
        result = STE.lint(" ".join(["Read the guide."] * 7))
        self.assertEqual(result["violations"]["long_paragraph(>6s)"], 1)

    def test_shape_counts_stay_separate(self):
        result = STE.lint("\n".join(f"{n}. Read the guide." for n in range(1, 7)))
        self.assertEqual(result["shape"]["action_list(>5)"], 1)
        self.assertEqual(result["total"], 0)


class RuleCompatibilityTests(unittest.TestCase):
    def test_existing_rule_counts_stay_intact(self):
        cases = (
            ("Read this; check that.", "semicolon", 1),
            ("The guide is written by Alice.", "passive_voice", 1),
            ("The valve is closed.", "passive_voice", 0),
            ("The valve is closed by Alice.", "passive_voice", 1),
            ("The team has made the guide.", "complex_tense", 1),
            ("The team is reading the guide.", "ing_main_verb", 1),
            ("Perform an analysis.", "nominalization", 1),
            ("Spin up the service.", "phrasal_verb", 1),
            ("Ensure the guide works.", "banned_word", 1),
            ("Use the powerful tool.", "marketing_adjective", 1),
            ("It is worth noting the result.", "modal_hedge", 1),
        )
        for text, rule, count in cases:
            with self.subTest(rule=rule, text=text):
                self.assertEqual(STE.lint(text)["violations"][rule], count)

    def test_strict_rules_and_month_exception_stay_intact(self):
        self.assertNotIn("strict_banned_word", STE.lint("You should read this.")["violations"])
        self.assertEqual(STE.lint("You should read this.", strict=True)["violations"]["strict_banned_word"], 1)
        self.assertEqual(STE.lint("Read the May guide.", strict=True)["violations"]["strict_banned_word"], 0)

    def test_empty_input_keeps_a_finite_score(self):
        result = STE.lint("")
        self.assertEqual(result["words"], 1)
        self.assertEqual(result["sentences"], 0)
        self.assertEqual(result["total_per100w"], 0)


class CommandLineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ste-input-tests-")
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def write(self, name, text):
        path = self.directory / name
        path.write_text(text, encoding="utf-8")
        return path

    def run_lint(self, *args, text=None):
        return subprocess.run([sys.executable, str(LINTER), *map(str, args)],
                              input=text, encoding="utf-8", capture_output=True, timeout=10)

    def test_missing_file_does_not_stop_later_files(self):
        first = self.write("first.md", "Read the guide.")
        last = self.write("last.md", "Check the result.")
        result = self.run_lint(first, self.directory / "missing.md", last)
        self.assertEqual(result.returncode, 1)
        self.assertIn("first.md", result.stdout)
        self.assertIn("last.md", result.stdout)
        self.assertIn("missing.md", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_directory_error_does_not_stop_later_files(self):
        last = self.write("last.md", "Check the result.")
        result = self.run_lint(self.directory, last)
        self.assertEqual(result.returncode, 1)
        self.assertIn("last.md", result.stdout)
        self.assertNotIn("Traceback", result.stderr)

    def test_invalid_utf8_does_not_stop_later_files(self):
        bad = self.directory / "invalid.md"
        bad.write_bytes(b"\xff\xfe")
        last = self.write("last.md", "Check the result.")
        result = self.run_lint(bad, last)
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid.md", result.stderr)
        self.assertIn("last.md", result.stdout)
        self.assertNotIn("Traceback", result.stderr)

    def test_unmatched_glob_fails_and_continues(self):
        last = self.write("last.md", "Check the result.")
        result = self.run_lint(self.directory / "missing-*.md", last)
        self.assertEqual(result.returncode, 1)
        self.assertIn("missing-*.md", result.stderr)
        self.assertIn("last.md", result.stdout)

    def test_json_output_stays_parseable_after_a_file_error(self):
        good = self.write("good.md", "Read the guide.")
        result = self.run_lint("--json", self.directory / "missing.md", good)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stdout)["file"], str(good))
        self.assertIn("missing.md", result.stderr)

    def test_file_and_stdin_reports_match(self):
        text = FRONT_MATTER + "**Read the user’s guide.**\n\n" + WRAPPED
        path = self.write("unicode.md", text)
        file_result = self.run_lint("--json", path)
        stdin_result = self.run_lint(text=text)
        self.assertEqual(file_result.returncode, 0, file_result.stderr)
        self.assertEqual(stdin_result.returncode, 0, stdin_result.stderr)
        file_report = json.loads(file_result.stdout)
        del file_report["file"]
        self.assertEqual(file_report, json.loads(stdin_result.stdout))

    def test_score_and_shape_thresholds_keep_their_exit_codes(self):
        self.assertEqual(self.run_lint("--fail-over", 0, text="Read the guide.").returncode, 0)
        self.assertEqual(self.run_lint("--fail-over", 0, text=WRAPPED).returncode, 1)
        self.assertEqual(self.run_lint("--fail-shape", 0, text="Great question. Read the guide.").returncode, 1)
        result = self.run_lint("--strict", text="Read the guide—then check it.")
        self.assertEqual(json.loads(result.stdout)["violations"]["em_dash"], 1)


if __name__ == "__main__":
    unittest.main()
