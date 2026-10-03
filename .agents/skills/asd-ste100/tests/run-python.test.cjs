"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const skillRoot = path.resolve(__dirname, "..");
const runner = path.join(skillRoot, "hooks", "run-python.cjs");
const { interpreterCandidates } = require(runner);

function temporaryHome(t) {
	const directory = mkdtempSync(path.join(os.tmpdir(), "asd-ste100-"));
	t.after(() => rmSync(directory, { force: true, recursive: true }));
	return directory;
}

function hookEnvironment(home) {
	return { ...process.env, HOME: home, USERPROFILE: home };
}

test("selects Windows Python commands in safe order", () => {
	assert.deepEqual(interpreterCandidates("win32"), [
		{ command: "py", prefixArgs: ["-3"] },
		{ command: "python", prefixArgs: [] },
		{ command: "python3", prefixArgs: [] },
	]);
});

test("selects Unix Python commands in safe order", () => {
	for (const platform of ["darwin", "linux"]) {
		assert.deepEqual(interpreterCandidates(platform), [
			{ command: "python3", prefixArgs: [] },
			{ command: "python", prefixArgs: [] },
		]);
	}
});

test("passes arguments, standard input, output, and the exit code", (t) => {
	const home = temporaryHome(t);
	const script = path.join(home, "probe.py");
	writeFileSync(
		script,
		[
			"import json",
			"import sys",
			"print(json.dumps({'args': sys.argv[1:], 'stdin': sys.stdin.read()}))",
			"raise SystemExit(7)",
		].join("\n"),
	);
	const result = spawnSync(process.execPath, [runner, script, "one", "two"], {
		encoding: "utf8",
		env: hookEnvironment(home),
		input: "payload",
	});
	assert.equal(result.status, 7);
	assert.deepEqual(JSON.parse(result.stdout), {
		args: ["one", "two"],
		stdin: "payload",
	});
});

test("reports a missing Python 3 interpreter", () => {
	const result = spawnSync(process.execPath, [runner, "unused.py"], {
		encoding: "utf8",
		env: { ...process.env, PATH: "" },
	});
	assert.equal(result.status, 1);
	assert.match(result.stderr, /No Python 3 interpreter is available/);
});

test("declares all plugin hooks in cross-platform exec form", () => {
	const config = JSON.parse(
		readFileSync(path.join(skillRoot, "hooks", "hooks.json"), "utf8"),
	);
	const hooks = Object.values(config.hooks).flatMap((groups) =>
		groups.flatMap((group) => group.hooks),
	);
	assert.equal(hooks.length, 4);
	for (const hook of hooks) {
		assert.equal(hook.command, "node");
		assert.equal(hook.args.length, 2);
		assert.match(hook.args[0], /\/hooks\/run-python\.cjs$/);
		assert.match(
			hook.args[1],
			/\/hooks\/ste-(inject|pregate|refresh|gate)\.py$/,
		);
	}
});

test("runs all four plugin hooks through the launcher", (t) => {
	const home = temporaryHome(t);
	const env = hookEnvironment(home);
	for (const script of [
		"ste-inject.py",
		"ste-pregate.py",
		"ste-refresh.py",
		"ste-gate.py",
	]) {
		const result = spawnSync(
			process.execPath,
			[runner, path.join(skillRoot, "hooks", script)],
			{ encoding: "utf8", env, input: '{"session_id":"test"}' },
		);
		assert.equal(result.status, 0, `${script}: ${result.stderr}`);
	}
});

test("writes cross-platform hooks from the standalone installer", (t) => {
	const home = temporaryHome(t);
	const inspector = path.join(home, "inspect.py");
	writeFileSync(
		inspector,
		[
			"import importlib.util",
			"import json",
			"import sys",
			"spec = importlib.util.spec_from_file_location('installer', sys.argv[1])",
			"module = importlib.util.module_from_spec(spec)",
			"spec.loader.exec_module(module)",
			"legacy = {'command': 'python3 \\\"$HOME/.claude/skills/asd-ste100/hooks/ste-inject.py\\\"'}",
			"print(json.dumps({'hooks': module.HOOKS, 'legacy_recognized': module.is_ste_hook(legacy), 'recognized': [module.is_ste_hook(value['entry']['hooks'][0]) for value in module.HOOKS.values()]}))",
		].join("\n"),
	);
	const result = spawnSync(
		process.execPath,
		[runner, inspector, path.join(skillRoot, "install.py")],
		{ encoding: "utf8", env: hookEnvironment(home) },
	);
	assert.equal(result.status, 0, result.stderr);
	const output = JSON.parse(result.stdout);
	assert.equal(output.legacy_recognized, true);
	assert.deepEqual(output.recognized, [true, true, true, true]);
	for (const value of Object.values(output.hooks)) {
		const hook = value.entry.hooks[0];
		assert.equal(hook.command, "node");
		assert.equal(hook.args.length, 2);
		assert.match(
			hook.args[0].replaceAll("\\", "/"),
			/\/hooks\/run-python\.cjs$/,
		);
		assert.match(hook.args[1].replaceAll("\\", "/"), /\/hooks\/ste-.*\.py$/);
	}
});
