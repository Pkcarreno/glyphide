# Changelog

## [2.0.0](https://github.com/Pkcarreno/glyphide/compare/v1.8.4...v2.0.0) (2025-07-02)


### ⚠ BREAKING CHANGES

* **repo:** monorepo project structure
* new url pattern for scripts
* Major UI upgrade
* migrate from react vite SPA to Astro.js

### Features

* add disabled prop to codemirror editor component ([af968cd](https://github.com/Pkcarreno/glyphide/commit/af968cd904dda4bf86f6356a75249a83de4481bd))
* **app:** add astro button component ([450302d](https://github.com/Pkcarreno/glyphide/commit/450302d6b3e316aeb30b80ebe55e10660eb97f66))
* **app:** add dim variant ([268f948](https://github.com/Pkcarreno/glyphide/commit/268f948ffe24f406b0d956544c7a360d7b8d1cea))
* **app:** add migrate url feature ([f3f9f20](https://github.com/Pkcarreno/glyphide/commit/f3f9f20ee3d88ec601c95beedec22888e31d5961))
* **app:** enable service worker registration ([5003453](https://github.com/Pkcarreno/glyphide/commit/50034531e0c1ba7ae51b2842e8726b49feedf403))
* **app:** improve metadata ([e9a634d](https://github.com/Pkcarreno/glyphide/commit/e9a634d7c075655cc03603dca31ad1f09888928b))
* **app:** improve textarea component ([7283d21](https://github.com/Pkcarreno/glyphide/commit/7283d215de37f2dcffb9926b3796657b0ce410c7))
* **app:** improve ui ([bd5a5e9](https://github.com/Pkcarreno/glyphide/commit/bd5a5e9a468770d8b5d4bc5ca6ada3988ee783c5))
* **app:** sync theme-color to app theme state ([88fba0a](https://github.com/Pkcarreno/glyphide/commit/88fba0a9f6afbf37e494d4f0fa91aed7ae679f9a))
* **app:** wrap main components in error boundary ([e9770bd](https://github.com/Pkcarreno/glyphide/commit/e9770bd19d19f0beaabb578e5918ac4325078fd7))
* improve CI/CD ([6b8be9a](https://github.com/Pkcarreno/glyphide/commit/6b8be9a04704cb37c2d231ff82a8ecc83032dfef))
* major Update ([8e74124](https://github.com/Pkcarreno/glyphide/commit/8e74124be9958af5e4f213c56229dddcd15a15db))
* migrate config and tooling ([8ae8eb9](https://github.com/Pkcarreno/glyphide/commit/8ae8eb9113a5fd10d67c53c7bcf2fa5c11633056))
* migrate to biome v2 ([926e32a](https://github.com/Pkcarreno/glyphide/commit/926e32afc6fb6e475bc9c6c891e0928249c9098a))
* **repo:** migrate to monorepo ([8a53f40](https://github.com/Pkcarreno/glyphide/commit/8a53f40267d81ac1d137f20bd9619d540db60ca8))
* **turbo:** set ui to tui ([9b9dee9](https://github.com/Pkcarreno/glyphide/commit/9b9dee9b04538d68721044f9b38e9acc36c9c16a))
* upgrade public assets ([c32991a](https://github.com/Pkcarreno/glyphide/commit/c32991a3086e45a87494d50c7237f36d1284d926))
* use url queryparams instead of zustand with url hash for better script state management ([35097dd](https://github.com/Pkcarreno/glyphide/commit/35097dd4b0af511bb3f125c8917f6fe06918580f))


### Bug Fixes

* add shamefully hoist at CI level ([dd37f13](https://github.com/Pkcarreno/glyphide/commit/dd37f13af4785305d6b7bfe9d295988324a592e9))
* **app:** add astro types in tsconfig ([bcf914b](https://github.com/Pkcarreno/glyphide/commit/bcf914baaf3dd4efe40e45ff921e923d18c3bc93))
* **app:** add importMeta types ([ea8cc4c](https://github.com/Pkcarreno/glyphide/commit/ea8cc4c2705a0628e1f2867eecace743b888cffa))
* **app:** comment Documentation link ([af934a0](https://github.com/Pkcarreno/glyphide/commit/af934a006ecd8e3a4099c6b84fb39539e9725dda))
* **app:** content ([038e91d](https://github.com/Pkcarreno/glyphide/commit/038e91db11701fa5046d6b2f1ca4daf8085c0b6d))
* **app:** edit new script link ([79c810d](https://github.com/Pkcarreno/glyphide/commit/79c810dccc2fc19ffd2a899c521ac1be81a8513d))
* **app:** improve input features ([9778a8c](https://github.com/Pkcarreno/glyphide/commit/9778a8c1c4fde89d0e65e05f8f5956ec31dc7d7a))
* **app:** improve migration form ux ([5e1743b](https://github.com/Pkcarreno/glyphide/commit/5e1743bd2472f5ed027e5a23f2f738544c629449))
* **app:** merging conflict ([189f566](https://github.com/Pkcarreno/glyphide/commit/189f566450e54c1b37b4a871fb6bffd99af6c9a6))
* **app:** padding on migration header ([0164d75](https://github.com/Pkcarreno/glyphide/commit/0164d75b044e6e46702d974c09073191f9435a81))
* **app:** use main package.json to retrieve app version ([d70e34b](https://github.com/Pkcarreno/glyphide/commit/d70e34bfe0d1e03b2b4b2af02b0af25603fa6031))
* ignore not supported languages ([3161b64](https://github.com/Pkcarreno/glyphide/commit/3161b64b21452b1183c72567631afb7b0e45ada1))
* improve types related to log ([3cc5537](https://github.com/Pkcarreno/glyphide/commit/3cc553785c5e98f014efd49adb269ff5dab5d8d4))
* **lint:** biome v2 fixes ([15df27e](https://github.com/Pkcarreno/glyphide/commit/15df27ec610e8a8a9bee96bb2c949d86a866c0e4))
* remove comment ([14f842a](https://github.com/Pkcarreno/glyphide/commit/14f842a99e615f5e1a0e8d2606525b212d49c686))
* remove shamefully hoist ref ([64c7791](https://github.com/Pkcarreno/glyphide/commit/64c7791e77741d2aaa46bc0a7784aabede0f3660))
* rules ([b856ca4](https://github.com/Pkcarreno/glyphide/commit/b856ca4e847be8fe716594e8fe62287cf665c0b7))
* set shamefully hoist on workspace ([26c4294](https://github.com/Pkcarreno/glyphide/commit/26c4294aca3040bcf55f98ccf029c5c40b096003))

## [1.8.4](https://github.com/Pkcarreno/jsod/compare/v1.8.3...v1.8.4) (2025-03-15)


### Bug Fixes

* main route start from `/` base path ([bcf1a55](https://github.com/Pkcarreno/jsod/commit/bcf1a559da001533f4e2f038f927280f1d0ff65b))
* new redirect page for old links ([45684d5](https://github.com/Pkcarreno/jsod/commit/45684d51c7b45984d643b4e780fcecaf6653c502))

## [1.8.3](https://github.com/Pkcarreno/jsod/compare/v1.8.2...v1.8.3) (2025-03-15)


### Bug Fixes

* change base url to domain level ([f836f2a](https://github.com/Pkcarreno/jsod/commit/f836f2ac109213725beec18c1fc2b2403bd7198f))
* new domain ([2990f4e](https://github.com/Pkcarreno/jsod/commit/2990f4eaaf02161a248748d159233c53b0d101f1))
* new domain ([549ebaf](https://github.com/Pkcarreno/jsod/commit/549ebaf1861613f5f5fb3a3a3b52cc9ff8701847))

## [1.8.2](https://github.com/Pkcarreno/jsod/compare/v1.8.1...v1.8.2) (2025-01-20)


### Bug Fixes

* **ui:** hide layout toggler on mobile view ([ce7ca99](https://github.com/Pkcarreno/jsod/commit/ce7ca99f8cc65cb08807e7ca529639e4ea79ffb1))

## [1.8.1](https://github.com/Pkcarreno/jsod/compare/v1.8.0...v1.8.1) (2025-01-20)


### Bug Fixes

* **header:** new title label/input ([5215cad](https://github.com/Pkcarreno/jsod/commit/5215cad95a991dd417cae07205961aacee4079cb))
* remove unused elements ([9de48d1](https://github.com/Pkcarreno/jsod/commit/9de48d107dc969ba9f8c64e0a6d40b21473fda38))

## [1.8.0](https://github.com/Pkcarreno/jsod/compare/v1.7.2...v1.8.0) (2025-01-17)


### Features

* migrate to lucide icons ([c5b7bfe](https://github.com/Pkcarreno/jsod/commit/c5b7bfef73b60094812368b9a08a55558391a6e8))


### Bug Fixes

* add verticacl margin to open panel buttons ([eac30c2](https://github.com/Pkcarreno/jsod/commit/eac30c26423b6688021ba0bb65528b716671db90))
* simpler toggle layout text ([ed980e0](https://github.com/Pkcarreno/jsod/commit/ed980e0fedbd9f6ce195b27a262a1fec047246a1))

## [1.7.2](https://github.com/Pkcarreno/jsod/compare/v1.7.1...v1.7.2) (2025-01-10)


### Bug Fixes

* **store:** default settings ([334305c](https://github.com/Pkcarreno/jsod/commit/334305c885e129497d322d399a20dfe8acb410d3))

## [1.7.1](https://github.com/Pkcarreno/jsod/compare/v1.7.0...v1.7.1) (2025-01-08)


### Bug Fixes

* action button styles ([5ec8d49](https://github.com/Pkcarreno/jsod/commit/5ec8d49f5e6cf64ad236d8451babdafd4af3852d))
* add placeholder setting ([e5aa8df](https://github.com/Pkcarreno/jsod/commit/e5aa8df821fb18f52161c0d5ef5a0abf7bcdc6ca))
* animate action button ([c07a1a0](https://github.com/Pkcarreno/jsod/commit/c07a1a0a5365602af76253ba5344a15c97bee57a))
* implement placeholder on editor with a 'how to use' guide ([0ff7c34](https://github.com/Pkcarreno/jsod/commit/0ff7c34a806ac8a9c6f76520d0847b7f82d4970d))
* improve action button animation & add execution layer provider ([c5a9826](https://github.com/Pkcarreno/jsod/commit/c5a9826b19a13cdc5d34663cde583088b1b2f9f1))
* layout button styles ([d946457](https://github.com/Pkcarreno/jsod/commit/d946457f692ffedbc997caf2fb8813c4208e21bb))
* prevent multiple executions ([71a9c3f](https://github.com/Pkcarreno/jsod/commit/71a9c3f6a4f848a4184e96ef4f51f746228eef30))

## [1.7.0](https://github.com/Pkcarreno/jsod/compare/v1.6.0...v1.7.0) (2025-01-01)


### Features

* change autorun modifier location ([b09375d](https://github.com/Pkcarreno/jsod/commit/b09375ded29d79d1d1755e2e5a7d8d8a96510ca3))
* improve script details section ([4a2bbab](https://github.com/Pkcarreno/jsod/commit/4a2bbab52f9a829b86ddb3ce82f31ea6ab415311))
* **settings:** make autorun setting true by default ([99b5301](https://github.com/Pkcarreno/jsod/commit/99b530178eddc220fa2096995e72e2edb5429f0a))
* use react document metadata instead of react-helmet-async ([6c2c3fc](https://github.com/Pkcarreno/jsod/commit/6c2c3fc6e6a8de1647cda5cd60c5f7904d351f75))
* **workflow:** rework desktop footer and on panels collapse action buttons location ([47514fb](https://github.com/Pkcarreno/jsod/commit/47514fb780c260cd8dd960041eb8e9d49c45742c))


### Bug Fixes

* **config:** workaround to codemirror 'unrecognized extension value in' ([d0dde9d](https://github.com/Pkcarreno/jsod/commit/d0dde9df75d7d1acf1b6c5876c15927d2369930d))
* **deps:** remove unused component and related: tabs ([2043a2d](https://github.com/Pkcarreno/jsod/commit/2043a2d6fd5a94c8475cb9413bc402356e420f7d))
* hide layout button on mobile screen size ([f026faf](https://github.com/Pkcarreno/jsod/commit/f026faf9e557223a1f97a157fc18dd06c967b7f8))
* **types:** upgrade to react 19 types ([fb1e1cc](https://github.com/Pkcarreno/jsod/commit/fb1e1cceb3d058c3c846dc107d9545be0b614e5b))
* **vite:** disable basic ssl in order to run dev enviroment ([245dc9c](https://github.com/Pkcarreno/jsod/commit/245dc9c8ec07ddfc41eac5ed5857f1d6353b8828))
* **workflow:** remove first time dialog and place about content on FAQ ([5e7226a](https://github.com/Pkcarreno/jsod/commit/5e7226a0ffb2c50d34f7aa2cf7f7710a455d4c29))

## [1.6.0](https://github.com/Pkcarreno/jsod/compare/v1.5.0...v1.6.0) (2024-11-02)


### Features

* add helmet & script title and description ([318eb2c](https://github.com/Pkcarreno/jsod/commit/318eb2c7b713ae9ca1d3ea1296617f0c77511453))


### Bug Fixes

* **engine:** increase memory limit & max stack size in quickjs runtime ([faf64a0](https://github.com/Pkcarreno/jsod/commit/faf64a0ff9d5528076264a5c50cec7453513deec))
* improve clickability of untrusted mode sign ([7f5d322](https://github.com/Pkcarreno/jsod/commit/7f5d322747187391dc1c860949bfbcae32a979bd))
* **meta:** improve metatags ([0b7d36d](https://github.com/Pkcarreno/jsod/commit/0b7d36dc384358984de9ded69916aa1cccd6274a))

## [1.5.0](https://github.com/Pkcarreno/jsod/compare/v1.4.0...v1.5.0) (2024-10-12)


### Features

* **editor:** vim motions ([1ed8e1d](https://github.com/Pkcarreno/jsod/commit/1ed8e1dcff5ce8307f1c1d44b6d4efa5cb5d334e))
* **log:** add debug mode ([c3f1765](https://github.com/Pkcarreno/jsod/commit/c3f1765c2962a58e1b2519e7fdc45e57a14e3929))
* **output:** rework output workflow ([c2de00b](https://github.com/Pkcarreno/jsod/commit/c2de00b43c8f00c510bdf31b693e1c70c67cce68))


### Bug Fixes

* **engine:** insert loop threshold in runtime ([ebfeec8](https://github.com/Pkcarreno/jsod/commit/ebfeec8aaa0748e55d5b651db6c2d47b5275ceff))
* **settings:** increase loop threshold interval ([b04e18d](https://github.com/Pkcarreno/jsod/commit/b04e18d8da5346b00ddb98412850a87e34662386))
* **settings:** increase runtime timeout interval ([05fcaef](https://github.com/Pkcarreno/jsod/commit/05fcaeff7b5e49a05e8cfd02f0a99dc148edd44d))
* **settings:** update loop threshold defaults ([798d1c9](https://github.com/Pkcarreno/jsod/commit/798d1c97a7bc7b25e7e475084688eb41037562fe))
* **ui:** tab inactive illegible on dark mode ([c1c9230](https://github.com/Pkcarreno/jsod/commit/c1c9230b4cd5bcb34057acfc1a19ab727d085c15))

## [1.4.0](https://github.com/Pkcarreno/jsod/compare/v1.3.4...v1.4.0) (2024-10-06)


### Features

* add embed option on share menu ([f47885c](https://github.com/Pkcarreno/jsod/commit/f47885c4339f5ca267f3350ff12f38bcfa2001b0))
* **embeded:** make app embedable ([00258f0](https://github.com/Pkcarreno/jsod/commit/00258f0a8fe507296ed184c47074f1852d5bdaf8))


### Bug Fixes

* **output:** improve render value behavior ([81e6e13](https://github.com/Pkcarreno/jsod/commit/81e6e137640ed3b0c374cffbf31deee3162d9718))
* **ui:** make dialog scrollable ([02f1d8e](https://github.com/Pkcarreno/jsod/commit/02f1d8e7274e8f85663c44b25a5a9233e8b2a5f2))

## [1.3.4](https://github.com/Pkcarreno/jsod/compare/v1.3.3...v1.3.4) (2024-09-05)


### Bug Fixes

* modules incompatibility ([c5a13a2](https://github.com/Pkcarreno/jsod/commit/c5a13a2d54f3a92e6389aa45f30189d838fd0613))

## [1.3.3](https://github.com/Pkcarreno/jsod/compare/v1.3.2...v1.3.3) (2024-08-06)


### Bug Fixes

* increase workbox maximum file size to cache on buildtime ([ac8f178](https://github.com/Pkcarreno/jsod/commit/ac8f17861cdeee9f27906d2ef6ed7e749c15bb18))

## [1.3.2](https://github.com/Pkcarreno/jsod/compare/v1.3.1...v1.3.2) (2024-07-16)


### Bug Fixes

* **sonner:** add important modifier to button styles ([150108a](https://github.com/Pkcarreno/jsod/commit/150108ab7331049a9bd1640d7004ec9050f2ce3b))

## [1.3.1](https://github.com/Pkcarreno/jsod/compare/v1.3.0...v1.3.1) (2024-07-08)


### Bug Fixes

* issue at resolving packages ([ab184d1](https://github.com/Pkcarreno/jsod/commit/ab184d1322cac3c41c5f2be5b7d481e8f9e7c953))

## [1.3.0](https://github.com/Pkcarreno/jsod/compare/v1.2.1...v1.3.0) (2024-07-07)


### Features

* expose globals to codemirror eslint ([78661f8](https://github.com/Pkcarreno/jsod/commit/78661f8badf01e401bb4e61aa230ab0c4e3b2e47))


### Bug Fixes

* codemirror eslint incompatible type ([e2a8138](https://github.com/Pkcarreno/jsod/commit/e2a8138d031cec0948d620925459465d283618ad))

## [1.2.1](https://github.com/Pkcarreno/jsod/compare/v1.2.0...v1.2.1) (2024-06-29)


### Bug Fixes

* handle long output ([6b57469](https://github.com/Pkcarreno/jsod/commit/6b57469d5cdfd3134298b4ad14c2b336a595d7d4))
* tweak scrollbar on chromium based browsers ([3e4d255](https://github.com/Pkcarreno/jsod/commit/3e4d255675b196742698ed42678bc51e9b15915a))

## [1.2.0](https://github.com/Pkcarreno/jsod/compare/v1.1.0...v1.2.0) (2024-06-08)


### Features

* show badge on bottom bar in mobile view ([02dcefd](https://github.com/Pkcarreno/jsod/commit/02dcefdf5c84614bd1585b80223b02a108840cf5))
* shows repeated log counter ([bea17ec](https://github.com/Pkcarreno/jsod/commit/bea17ec675181aab5480b13a29ac526618359331))

## [1.1.0](https://github.com/Pkcarreno/jsod/compare/v1.0.2...v1.1.0) (2024-06-05)


### Features

* **pwa:** prompt offline ready and new update ([d15a49f](https://github.com/Pkcarreno/jsod/commit/d15a49f6380b3a4226c725c28f56dfc8c43e90e5))


### Bug Fixes

* improve app icon ([6ecd3f1](https://github.com/Pkcarreno/jsod/commit/6ecd3f13723ce6adbe92a327b8a2766759ba8d1a))
* improve url compatibility ([9b2a41a](https://github.com/Pkcarreno/jsod/commit/9b2a41ad6818c9ba9c460385bed7703b277d7bb0))

## [1.0.2](https://github.com/Pkcarreno/jsod/compare/v1.0.1...v1.0.2) (2024-06-03)


### Bug Fixes

* add screenshots to manifest ([4e8cf1f](https://github.com/Pkcarreno/jsod/commit/4e8cf1f01bd877a7c7d98304c5e1c992a728c4d2))
* add wasm to files to be cached ([d4cdfbd](https://github.com/Pkcarreno/jsod/commit/d4cdfbdb1af4ce3f77e29749c6c7022086eb2a76))
* path to icons ([b769360](https://github.com/Pkcarreno/jsod/commit/b769360aa96a2704f28bff0899c2d39d82738df3))
* shared link refresh on time ([d609569](https://github.com/Pkcarreno/jsod/commit/d609569a8216c60108a2d286b9f0bccb458fcce2))

## [1.0.1](https://github.com/Pkcarreno/jsod/compare/v1.0.0...v1.0.1) (2024-06-02)


### Bug Fixes

* limited fonts to be exported ([de55270](https://github.com/Pkcarreno/jsod/commit/de55270c508a7f94251f86b7425bfdcd73fd13eb))
* resolve worker format ([107cd58](https://github.com/Pkcarreno/jsod/commit/107cd586e5853844a973ff8b9e0ccbcdb319d8ca))

## 1.0.0 (2024-06-02)


### Features

* first commit ([1b32fd3](https://github.com/Pkcarreno/jsod/commit/1b32fd32fa605e9d5b342e40d07083a591952350))
