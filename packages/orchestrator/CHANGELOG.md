# Changelog

## [2.0.0](https://github.com/Pkcarreno/glyphide/compare/@glyphide/orchestrator-v1.0.0...@glyphide/orchestrator-v2.0.0) (2026-08-01)


### ⚠ BREAKING CHANGES

* The application's URL structure and data encoding format have been completely redesigned.

### Features

* complete architectural rewrite ([e131644](https://github.com/Pkcarreno/glyphide/commit/e1316441db08036a314849548b1516d721dee35b))
* **orchestrator:** implement engine orchestrator and message bus ([53f073f](https://github.com/Pkcarreno/glyphide/commit/53f073f91c2cc5aaf94639d43dc7acb9e319cb29))
* **protocol:** add asynchronous input request flow to engine rpc ([3255cf2](https://github.com/Pkcarreno/glyphide/commit/3255cf2b5580505b5dabdb1d539ff7cf6e8091f0))
* **rpc:** formalize init handshake and capability negotiation ([6c09394](https://github.com/Pkcarreno/glyphide/commit/6c093940f2bb0a4f931cfd849c3d616e532015a6))


### Bug Fixes

* **app:** merging conflict ([189f566](https://github.com/Pkcarreno/glyphide/commit/189f566450e54c1b37b4a871fb6bffd99af6c9a6))
* **deps:** bump the all group across 1 directory with 15 updates ([4b8dc82](https://github.com/Pkcarreno/glyphide/commit/4b8dc82d74a7132b55f2b790b91bc5ec034a5e2a))
* **deps:** bump the all group across 1 directory with 15 updates ([1c64d40](https://github.com/Pkcarreno/glyphide/commit/1c64d401ca5ae1940daf827e05d50397b2f1ac8d))
* enforce engine interruption on timeout and resolve restart loops ([6cc7b8a](https://github.com/Pkcarreno/glyphide/commit/6cc7b8a28633459fc89c36a4ea233bc8e8e0d4be))
* **engine:** resolve execution interruption leaks and state reset ([eee2413](https://github.com/Pkcarreno/glyphide/commit/eee24139e4feb06eb52867ef4cf101580aa6b2ff))
* **orchestrator:** force terminate freezing worker on interrupt and respawn ([bf24e16](https://github.com/Pkcarreno/glyphide/commit/bf24e160039b654c09f7d797076081ed5def08e6))
* resolve ultracite linter rules across workspace ([1f7521e](https://github.com/Pkcarreno/glyphide/commit/1f7521e679358d5d35254713a384203115308244))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @glyphide/rpc-protocol bumped to 2.0.0
