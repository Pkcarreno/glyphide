# Changelog

## [1.0.0](https://github.com/Pkcarreno/glyphide/compare/@glyphide/quickjs-engine-v0.1.0...@glyphide/quickjs-engine-v1.0.0) (2026-08-01)


### ⚠ BREAKING CHANGES

* The application's URL structure and data encoding format have been completely redesigned.

### Features

* complete architectural rewrite ([e131644](https://github.com/Pkcarreno/glyphide/commit/e1316441db08036a314849548b1516d721dee35b))
* implement structured console output serialization ([8e2d210](https://github.com/Pkcarreno/glyphide/commit/8e2d2106115353a29378beee4315e87edc0c85d3))
* **quickjs-engine:** add support for console grouping methods ([c3abcc6](https://github.com/Pkcarreno/glyphide/commit/c3abcc6b7c1207607eceb8da393304926577cb99))
* **quickjs-engine:** expand AST builder to support debug and table ([74cadad](https://github.com/Pkcarreno/glyphide/commit/74cadad430ecf2f8e4b842dd4aae2b143c4a8505))
* **quickjs-engine:** expand AST serialization to support complex native objects ([f7c7f73](https://github.com/Pkcarreno/glyphide/commit/f7c7f7339c04c9ea03c1696aca440ffbc45f8008))
* **quickjs-engine:** implement extended console methods and serialization ([d8dad97](https://github.com/Pkcarreno/glyphide/commit/d8dad9770f5d3a55121d869e4c3129af44dcf25c))
* **quickjs:** implement webassembly quickjs engine adapter ([ff5e934](https://github.com/Pkcarreno/glyphide/commit/ff5e934d54043abef5d68cbdb13be8e99d4ec807))
* **rpc:** formalize init handshake and capability negotiation ([6c09394](https://github.com/Pkcarreno/glyphide/commit/6c093940f2bb0a4f931cfd849c3d616e532015a6))


### Bug Fixes

* **app:** merging conflict ([189f566](https://github.com/Pkcarreno/glyphide/commit/189f566450e54c1b37b4a871fb6bffd99af6c9a6))
* **build:** add orchestrator to devDependencies for turborepo topological sort ([47ee2b8](https://github.com/Pkcarreno/glyphide/commit/47ee2b8e593a5a4e933fc5acf5b756c58817bcf8))
* enforce engine interruption on timeout and resolve restart loops ([6cc7b8a](https://github.com/Pkcarreno/glyphide/commit/6cc7b8a28633459fc89c36a4ea233bc8e8e0d4be))
* **engine:** resolve execution interruption leaks and state reset ([eee2413](https://github.com/Pkcarreno/glyphide/commit/eee24139e4feb06eb52867ef4cf101580aa6b2ff))
* lint files from biome update ([f846f04](https://github.com/Pkcarreno/glyphide/commit/f846f043325dc8d0a5625eb991ccc42651c05ed6))
* **orchestrator:** force terminate freezing worker on interrupt and respawn ([bf24e16](https://github.com/Pkcarreno/glyphide/commit/bf24e160039b654c09f7d797076081ed5def08e6))
* **quickjs-engine:** lint issues ([57a8b7b](https://github.com/Pkcarreno/glyphide/commit/57a8b7b746945c578a22be96e27e8edad851017f))
* **quickjs-engine:** prevent lifetime not alife crash on Promise dump ([eea9139](https://github.com/Pkcarreno/glyphide/commit/eea9139cc546ba31242558d8ffcaa068f5e456b1))
* **quickjs-engine:** proxy fetch RequestInit arguments to native engine ([5f40f3c](https://github.com/Pkcarreno/glyphide/commit/5f40f3cd0a8859408f33fc07e2e070821ebf1632))
* resolve ultracite linter rules across workspace ([1f7521e](https://github.com/Pkcarreno/glyphide/commit/1f7521e679358d5d35254713a384203115308244))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @glyphide/rpc-protocol bumped to 2.0.0
  * devDependencies
    * @glyphide/orchestrator bumped to 2.0.0
  * peerDependencies
    * @glyphide/orchestrator bumped to 2.0.0
