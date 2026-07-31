# Changelog

## [1.0.0](https://github.com/Pkcarreno/glyphide/compare/v0.1.0...v1.0.0) (2026-07-31)


### ⚠ BREAKING CHANGES

* The application's URL structure and data encoding format have been completely redesigned.

### Features

* complete architectural rewrite ([e131644](https://github.com/Pkcarreno/glyphide/commit/e1316441db08036a314849548b1516d721dee35b))
* **micropython-engine:** add synchronous HTTP client support ([0280044](https://github.com/Pkcarreno/glyphide/commit/028004435bce4683e9bf0ede409aab9b2403de27))
* **micropython-engine:** implement micropython execution engine ([a84ac95](https://github.com/Pkcarreno/glyphide/commit/a84ac95d85ca8f170e0819a343a48d4272eb0632))


### Bug Fixes

* **app:** merging conflict ([189f566](https://github.com/Pkcarreno/glyphide/commit/189f566450e54c1b37b4a871fb6bffd99af6c9a6))
* **build:** add orchestrator to devDependencies for turborepo topological sort ([47ee2b8](https://github.com/Pkcarreno/glyphide/commit/47ee2b8e593a5a4e933fc5acf5b756c58817bcf8))
* enforce engine interruption on timeout and resolve restart loops ([6cc7b8a](https://github.com/Pkcarreno/glyphide/commit/6cc7b8a28633459fc89c36a4ea233bc8e8e0d4be))
* **micropython-engine:** fix engine reset failure on repeated execution ([3b8a371](https://github.com/Pkcarreno/glyphide/commit/3b8a37167291bb5c5b1d80844a355108fb6b0fd7))
* **micropython-engine:** resolve memory leaks and implement proper execution resets ([206e773](https://github.com/Pkcarreno/glyphide/commit/206e773af8ff768c848a29f57d264543f28abc70))
* resolve ultracite linter rules across workspace ([1f7521e](https://github.com/Pkcarreno/glyphide/commit/1f7521e679358d5d35254713a384203115308244))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @glyphide/rpc-protocol bumped to 2.0.0
  * devDependencies
    * @glyphide/orchestrator bumped to 2.0.0
  * peerDependencies
    * @glyphide/orchestrator bumped to 2.0.0
