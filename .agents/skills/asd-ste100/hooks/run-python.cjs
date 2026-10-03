#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

function interpreterCandidates(platform = process.platform) {
	if (platform === "win32") {
		return [
			{ command: "py", prefixArgs: ["-3"] },
			{ command: "python", prefixArgs: [] },
			{ command: "python3", prefixArgs: [] },
		];
	}
	return [
		{ command: "python3", prefixArgs: [] },
		{ command: "python", prefixArgs: [] },
	];
}

function findPython(platform = process.platform, env = process.env) {
	for (const candidate of interpreterCandidates(platform)) {
		const result = spawnSync(
			candidate.command,
			[
				...candidate.prefixArgs,
				"-c",
				"import sys; raise SystemExit(0 if sys.version_info.major == 3 else 1)",
			],
			{ env, stdio: "ignore", windowsHide: true },
		);
		if (result.status === 0) return candidate;
	}
	return null;
}

function main(argv = process.argv.slice(2)) {
	if (argv.length === 0) {
		console.error("asd-ste100: Supply the path of a Python script.");
		return 2;
	}

	const python = findPython();
	if (!python) {
		console.error(
			"asd-ste100: No Python 3 interpreter is available. Install Python 3 or add it to PATH, then restart Claude Code.",
		);
		return 1;
	}

	const result = spawnSync(python.command, [...python.prefixArgs, ...argv], {
		stdio: "inherit",
		windowsHide: true,
	});
	if (result.error) {
		console.error(
			`asd-ste100: Python 3 did not start: ${result.error.message}`,
		);
		return 1;
	}
	return result.status ?? 1;
}

if (require.main === module) process.exitCode = main();

module.exports = { findPython, interpreterCandidates, main };
