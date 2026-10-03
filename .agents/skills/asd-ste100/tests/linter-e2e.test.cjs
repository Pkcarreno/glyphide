"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const skillRoot = path.resolve(__dirname, "..");
const runner = path.join(skillRoot, "hooks", "run-python.cjs");
const linter = path.join(skillRoot, "scripts", "ste-lint.py");
const config = JSON.parse(
	readFileSync(path.join(skillRoot, "hooks", "hooks.json"), "utf8"),
);
const wrapped =
	"This library builds one finite state machine from the usage\n" +
	"string, and it walks that machine to match the command line.";
const clean = Array(12)
	.fill("Read the user's guide before each test.")
	.join("\n\n");
const tooLong = Array(4).fill(wrapped).join("\n\n");

function fixture(t) {
	const directory = mkdtempSync(path.join(os.tmpdir(), "ste-e2e-"));
	t.after(() => rmSync(directory, { recursive: true, force: true }));
	const env = {
		...process.env,
		HOME: directory,
		USERPROFILE: directory,
		PYTHONDONTWRITEBYTECODE: "1",
		PYTHONIOENCODING: "utf-8",
	};
	const run = (args, input) =>
		spawnSync(process.execPath, args, {
			input,
			encoding: "utf8",
			env,
			timeout: 30_000,
		});
	return {
		directory,
		run,
		hook(event, payload) {
			const hook = config.hooks[event][0].hooks[0];
			assert.equal(hook.command, "node");
			const args = hook.args.map((arg) =>
				arg.replace("${CLAUDE_PLUGIN_ROOT}", skillRoot),
			);
			const result = run(args, JSON.stringify(payload));
			assert.equal(result.status, 0, result.stderr);
			assert.equal(result.stderr, "");
			return result.stdout.trim() ? JSON.parse(result.stdout) : null;
		},
		transcript(text) {
			const transcript = path.join(directory, "transcript.jsonl");
			writeFileSync(
				transcript,
				[
					{ type: "user", message: { content: "Write the guide." } },
					{
						type: "assistant",
						message: { content: [{ type: "text", text }] },
					},
				]
					.map((record) => JSON.stringify(record))
					.join("\n"),
			);
			return { session_id: "e2e", transcript_path: transcript };
		},
	};
}

test("the launcher preserves JSON output and failed batch status", (t) => {
	const f = fixture(t);
	const file = path.join(f.directory, "guide.md");
	writeFileSync(
		file,
		"---\ntitle: Ensure powerful tools\n---\n\n**Read the user’s guide.** Check the result.",
	);
	const result = f.run([
		runner,
		linter,
		"--json",
		"--fail-over",
		"0",
		path.join(f.directory, "missing.md"),
		file,
	]);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /missing\.md/);
	assert.doesNotMatch(result.stderr, /Traceback/);
	const report = JSON.parse(result.stdout);
	assert.equal(report.file, file);
	assert.equal(report.total, 0);
	assert.equal(report.sentences, 2);
});

test("the Stop hook accepts a reply with possessive nouns", (t) => {
	const f = fixture(t);
	assert.equal(f.hook("Stop", f.transcript(clean)), null);
});

test("the Stop hook blocks wrapped long sentences once and reports feedback", (t) => {
	const f = fixture(t);
	const payload = f.transcript(tooLong);
	const blocked = f.hook("Stop", payload);
	assert.equal(blocked.decision, "block");
	assert.match(blocked.reason, /4\.76 violations per 100 words/);
	assert.match(blocked.reason, /Longest sentence: 21 words/);
	assert.equal(f.hook("Stop", payload), null);
	const feedback = f.hook("UserPromptSubmit", { session_id: "e2e" });
	assert.match(
		feedback.hookSpecificOutput.additionalContext,
		/Your last reply scored 4\.76/,
	);
	const next = f.hook("UserPromptSubmit", { session_id: "e2e" });
	assert.doesNotMatch(
		next.hookSpecificOutput.additionalContext,
		/Your last reply scored/,
	);
});

test("the PreToolUse hook accepts possessives and rejects wrapped violations", (t) => {
	const f = fixture(t);
	const payload = {
		tool_name: "mcp__elliptic__create_task",
		tool_input: { description: clean },
	};
	assert.equal(f.hook("PreToolUse", payload), null);
	payload.tool_input.description = tooLong;
	const denied = f.hook("PreToolUse", payload).hookSpecificOutput;
	assert.equal(denied.permissionDecision, "deny");
	assert.match(denied.permissionDecisionReason, /4\.76/);
});

test("the PostToolUse hook ignores metadata and reports wrapped violations", (t) => {
	const f = fixture(t);
	const file = path.join(f.directory, "guide.md");
	const front = `---\ndescription: ${Array(60).fill("ensure").join(" ")}\n---\n\n`;
	const payload = {
		session_id: "e2e",
		tool_name: "Write",
		tool_input: { file_path: file },
	};
	writeFileSync(file, front + clean);
	assert.equal(f.hook("PostToolUse", payload), null);
	writeFileSync(file, front + tooLong);
	const result = f.hook("PostToolUse", payload);
	assert.match(
		result.hookSpecificOutput.additionalContext,
		/guide\.md scored 4\.76 violations per 100 words/,
	);
});
