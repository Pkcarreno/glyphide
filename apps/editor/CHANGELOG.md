# Changelog

## [4.0.0](https://github.com/Pkcarreno/glyphide/compare/v3.0.0...v4.0.0) (2026-07-31)


### ⚠ BREAKING CHANGES

* The application's URL structure and data encoding format have been completely redesigned.

### Features

* complete architectural rewrite ([e131644](https://github.com/Pkcarreno/glyphide/commit/e1316441db08036a314849548b1516d721dee35b))
* **editor:** add compound popover and compactNumberInput primitives ([62e61cf](https://github.com/Pkcarreno/glyphide/commit/62e61cf7e1af2eafba95fb722d58bb4ed60f09f0))
* **editor:** add DropdownPrimitive compound component ([0c5b971](https://github.com/Pkcarreno/glyphide/commit/0c5b97188c2a36a7bf3b8d04e06dd6f1c3d9e8be))
* **editor:** add file load/download as URL sharing backup ([0af7e14](https://github.com/Pkcarreno/glyphide/commit/0af7e1484d06a0f532f5cc7a3b9df3df48f69809))
* **editor:** add granular reset buttons to settings modal ([c12b0a0](https://github.com/Pkcarreno/glyphide/commit/c12b0a0c13102904c7a1a1202ddddd022d870450))
* **editor:** add Input primitive component ([f2ebe17](https://github.com/Pkcarreno/glyphide/commit/f2ebe17e821fbc1d8083a91a2a580848a0d3ab4a))
* **editor:** add per-engine default code snippets with settings toggle ([eabc1f1](https://github.com/Pkcarreno/glyphide/commit/eabc1f17594e1d9fec3d8b23aad4d65c5f5012c5))
* **editor:** add project rename modal ([2336ff3](https://github.com/Pkcarreno/glyphide/commit/2336ff3df073eb25241c8d899fdac509618884cc))
* **editor:** add PWA support with offline capability ([e691d18](https://github.com/Pkcarreno/glyphide/commit/e691d18dd93d06ce933d5d1bbb9b3e11ff9dce4a))
* **editor:** add read-only mode to CodeField ([cc303fb](https://github.com/Pkcarreno/glyphide/commit/cc303fb3bfc564217011e614cb54b87fcc23c4cb))
* **editor:** add ready-state gating to EngineSettingsModal ([b473f84](https://github.com/Pkcarreno/glyphide/commit/b473f84bb9f2bcf2f7fa09c7a8741b6e6a86497c))
* **editor:** add SEO, social sharing, and PWA baseline ([ab5924b](https://github.com/Pkcarreno/glyphide/commit/ab5924bb80852d0172fa7e64af5c2076e27c5f4c))
* **editor:** add share modal overlay with link and iframe options ([914b1f1](https://github.com/Pkcarreno/glyphide/commit/914b1f1b4ccd8f1ace4cfca6e1e530fa192be019))
* **editor:** add StepperInput and InputGroup components ([ef96254](https://github.com/Pkcarreno/glyphide/commit/ef96254e0eea068a37319785593505cacba63370))
* **editor:** add structured output rendering to ConsolePane ([d014632](https://github.com/Pkcarreno/glyphide/commit/d0146322af9ac0d94bcfd10000a6554be6c5e1f9))
* **editor:** add Tabs primitive component and integrate in SettingsModal ([c34eed0](https://github.com/Pkcarreno/glyphide/commit/c34eed0e4f62a1144f3d452fe98187ff5f8d31df))
* **editor:** add transparent URL migration for legacy v1/v2 links ([a55e9eb](https://github.com/Pkcarreno/glyphide/commit/a55e9eb7834381ca747e6b13c6e9594cc9634d58))
* **editor:** add trust mode for shared code from URL ([8c942ea](https://github.com/Pkcarreno/glyphide/commit/8c942ea7e5c2852caee7d2faab347accf4817f66))
* **editor:** add word wrap toggle support to code editor ([d5d42ed](https://github.com/Pkcarreno/glyphide/commit/d5d42eddfeae365279f4603f635b2a5f997b21dd))
* **editor:** display execution stale indicator in status bar ([98c9e5c](https://github.com/Pkcarreno/glyphide/commit/98c9e5c19a85e2d0132706c13dc97759a1ee4d62))
* **editor:** enable dynamic engine parameter configuration via registry ([8762373](https://github.com/Pkcarreno/glyphide/commit/87623732736acb8feef8791078e9b5115a3273b9))
* **editor:** enhance console rendering for complex AST tokens ([c090702](https://github.com/Pkcarreno/glyphide/commit/c090702ede362cb321fac991a3b4d8dc664e0e7c))
* **editor:** implement autorun debouncing and execution stale tracking ([780440f](https://github.com/Pkcarreno/glyphide/commit/780440f5ddcfdb4101bf1001ac3edcecee4b6ec3))
* **editor:** implement base UI layout and design system primitives ([d867158](https://github.com/Pkcarreno/glyphide/commit/d86715803e6ebfa13279a01cde78efbdd685696d))
* **editor:** implement cmdk-like command menu and engine selector ([20b57b5](https://github.com/Pkcarreno/glyphide/commit/20b57b534b0b5ab791d8cb7b3dbb0f5b44799b63))
* **editor:** implement CodeField component with CodeMirror ([d2a34aa](https://github.com/Pkcarreno/glyphide/commit/d2a34aadabad9946b221a5a228e8ed4f8b6cf80d))
* **editor:** implement EditorCore business logic and models ([a43e82d](https://github.com/Pkcarreno/glyphide/commit/a43e82d9d5a836bfbe2096ebd82709e863d00241))
* **editor:** implement engine output formatters and fix cross-engine output ([eced3f3](https://github.com/Pkcarreno/glyphide/commit/eced3f3b32ecf394e9dbd2404797a83a99d974f3))
* **editor:** implement engine settings popover ([ecdc20e](https://github.com/Pkcarreno/glyphide/commit/ecdc20e826eadf769911a364b903d6453b9ad6fe))
* **editor:** implement ephemeral toast notification system ([106d58e](https://github.com/Pkcarreno/glyphide/commit/106d58e3d3520d39133ec0c95001ecbfaf2318bf))
* **editor:** implement FileDrop primitive with drag-and-drop support ([cb6c589](https://github.com/Pkcarreno/glyphide/commit/cb6c5890f0c90bac98c2dfc007be361fce33dc53))
* **editor:** implement hybrid Mayu/Ayu color palette with brand accent ([558d8c0](https://github.com/Pkcarreno/glyphide/commit/558d8c045408012a7fd1d82b18b8fb28f86420ea))
* **editor:** implement interactive expansion for console tokens ([9d88932](https://github.com/Pkcarreno/glyphide/commit/9d88932472867c832457d280f993664add776770))
* **editor:** implement recursive rendering for console groups ([55a362e](https://github.com/Pkcarreno/glyphide/commit/55a362ec2c4c3d64f86432c23fea34af613c3276))
* **editor:** implement robust UI mapping for extended console methods ([3f226f1](https://github.com/Pkcarreno/glyphide/commit/3f226f176f6b5c221b5a176991b6a7106bda3814))
* **editor:** implement scalable and dynamic typography ([15d8218](https://github.com/Pkcarreno/glyphide/commit/15d82180a386e7596bebfcebc51fe23174cc58b7))
* **editor:** implement scalable overlay architecture ([7ed6513](https://github.com/Pkcarreno/glyphide/commit/7ed6513ccc4f1360e1df3e260b0279924b857c13))
* **editor:** implement table and debug rendering in console pane ([f1d07aa](https://github.com/Pkcarreno/glyphide/commit/f1d07aa476e46a3e2400e0e3d7b0cf172dc77222))
* **editor:** implement VirtualList for high-performance ConsolePane rendering ([e62c349](https://github.com/Pkcarreno/glyphide/commit/e62c34924ba0d25640886dbe8d205b0fab3e0ef8))
* **editor:** improve SettingsModal layout and spacing ([b8ad962](https://github.com/Pkcarreno/glyphide/commit/b8ad962c935263ee6badc0336a40ee48e9afdcdc))
* **editor:** inline Logo SVG as LogoSquare component ([aab8dc1](https://github.com/Pkcarreno/glyphide/commit/aab8dc1fe2b48a9437cedb31a6fd03fb4095935d))
* **editor:** integrate micropython engine into editor ([f6ef036](https://github.com/Pkcarreno/glyphide/commit/f6ef0361fbb44319ed4fb06680e6a20907f4622c))
* **editor:** introduce accesible Select atom primitive ([baf57fd](https://github.com/Pkcarreno/glyphide/commit/baf57fd454d11e2cc27641a248366819baecf44f))
* **editor:** scaffold SolidJS SPA package with Vite, Tailwind and vitest ([e0211b8](https://github.com/Pkcarreno/glyphide/commit/e0211b8acc5492ed76204ad2dfcfd25f819025aa))
* **editor:** sync document title and header with project display name ([3e440d7](https://github.com/Pkcarreno/glyphide/commit/3e440d7fca34231411d0cbe38f452f7ada7acca3))
* **editor:** track and display cursor and text selection length and lines ([bcbc9cd](https://github.com/Pkcarreno/glyphide/commit/bcbc9cd9bd55b96dbb619da7a142d21039771308))
* **editor:** wire ui components to dynamic engine state ([d3279f9](https://github.com/Pkcarreno/glyphide/commit/d3279f9b4ffec9eb14cb82e933106c483492e646))


### Bug Fixes

* **app:** merging conflict ([189f566](https://github.com/Pkcarreno/glyphide/commit/189f566450e54c1b37b4a871fb6bffd99af6c9a6))
* **editor:** add missing ::selection styles ([a393123](https://github.com/Pkcarreno/glyphide/commit/a39312337ffadeb4f5f0e66f7a1bb998c72c94cd))
* **editor:** add safe-area container for mobile viewport ([0b501e9](https://github.com/Pkcarreno/glyphide/commit/0b501e9340a8c203391afcba907370902b66e124))
* **editor:** align test RAF mock with browser async semantics ([22cd158](https://github.com/Pkcarreno/glyphide/commit/22cd158ccc7e7c08148423120e10eb43acf1686c))
* **editor:** bind global keyboard shortcuts in capture phase ([4c068ae](https://github.com/Pkcarreno/glyphide/commit/4c068ae49320fe36556ae71ef0131409562b0af7))
* **editor:** bind select value as property to reflect correct state ([d65221e](https://github.com/Pkcarreno/glyphide/commit/d65221ebd9ee786c074932b9f357caa99f6989cf))
* **editor:** correct SettingsModal tab layout and add missing autoRunDelay ([b0bafd3](https://github.com/Pkcarreno/glyphide/commit/b0bafd361c9037b8e2e2ce15c2b551a39963e1b3))
* **editor:** disable copy controls when URL exceeds share limit ([8e42f70](https://github.com/Pkcarreno/glyphide/commit/8e42f70bb6b53915ff0ce63b7c89d8529df1acc8))
* **editor:** dropdown group vertical padding ([9a41942](https://github.com/Pkcarreno/glyphide/commit/9a41942b98e20fc2cf60d9ac209d1fd6ede002df))
* **editor:** dropdown separator set border color to none ([3062bc6](https://github.com/Pkcarreno/glyphide/commit/3062bc64e0b4700627b20c842f01128d3f82ad3a))
* **editor:** enforce typography system consistency across UI shell ([c94a5e4](https://github.com/Pkcarreno/glyphide/commit/c94a5e4df6b8b7fcc91eeb59987309c5c08adce0))
* **editor:** force full width expansion through all container layers ([31267aa](https://github.com/Pkcarreno/glyphide/commit/31267aa8ff4078bb3a9b1a73059c26e75f742bec))
* **editor:** implement conditional URL persistence to prevent feedback loop ([68e085f](https://github.com/Pkcarreno/glyphide/commit/68e085f26321df5d3358d5d37e9ffe4ab011a4f4))
* **editor:** improve header menu button affordance with Button component and chevron icon ([70b9c95](https://github.com/Pkcarreno/glyphide/commit/70b9c954652c7cf8836c9397dc32241126f599b1))
* **editor:** make ExpandableNode chevron rotate via button group ([7d4e1f0](https://github.com/Pkcarreno/glyphide/commit/7d4e1f04c31a0198fadd5ccbbeb112a8ae7588c8))
* **editor:** make PWA update button visually prominent and self-explanatory ([3b1bd77](https://github.com/Pkcarreno/glyphide/commit/3b1bd77f213cddfd2652c15c069d00b2af37c9e3))
* **editor:** move header & statusbar controls into project dropdown on mobile ([f6952a0](https://github.com/Pkcarreno/glyphide/commit/f6952a089507b5b1933416063ba37a93de612c1f))
* **editor:** move Update App button to dropdown on mobile ([54b1931](https://github.com/Pkcarreno/glyphide/commit/54b1931ca8de315590cf6b6255e92670e605f9da))
* **editor:** prevent auto-run execution on engine switch ([5fd4644](https://github.com/Pkcarreno/glyphide/commit/5fd46446b4942545fec246882be70bfae6fe907b))
* **editor:** prevent console items vertical collapse ([71952f3](https://github.com/Pkcarreno/glyphide/commit/71952f367dce9e7ca07a8d9e08f4008e0b1890e4))
* **editor:** prevent file load from bypassing trust gate ([31bd5ab](https://github.com/Pkcarreno/glyphide/commit/31bd5ab06b152f12a3888b730b329f20528dbeac))
* **editor:** prevent white background flash and correct overscroll color ([0e3880b](https://github.com/Pkcarreno/glyphide/commit/0e3880bb9d1757b24583e36e09acdd3fcda4878d))
* **editor:** reduce top padding and remove top border in settings content ([df20ea8](https://github.com/Pkcarreno/glyphide/commit/df20ea8db9ff29b53b9973e7bbbe7875af96d455))
* **editor:** remove .focus-ring utility and inline focus classes ([17e956d](https://github.com/Pkcarreno/glyphide/commit/17e956d03d543eb21d46537602880dcb0ee65d9d))
* **editor:** replace custom class property for a tailwind standard one ([08929c5](https://github.com/Pkcarreno/glyphide/commit/08929c53092cba2972535f2f509129b1b9fd5a46))
* **editor:** resolve codemirror blank text rendering on scroll ([e70ad68](https://github.com/Pkcarreno/glyphide/commit/e70ad681c8734ac1c6073b27bb6f30245682e479))
* **editor:** resolve lucide-solid barrel import to prevent full bundle load ([725ba83](https://github.com/Pkcarreno/glyphide/commit/725ba83918a8476f26d1a165d23a614dd5706d6a))
* **editor:** resolve text contrast issue in search panel inputs ([f3adac0](https://github.com/Pkcarreno/glyphide/commit/f3adac00473b4990380315cdf856aecd953c7c1e))
* **editor:** responsive SettingsModal close button ([c1cb9ee](https://github.com/Pkcarreno/glyphide/commit/c1cb9ee80e06876f8f85063c22d4a311683293d6))
* **editor:** set default text align in ExpandableNode button to left ([81d75d0](https://github.com/Pkcarreno/glyphide/commit/81d75d0471e0c0e1732494cfc100eb29ecb82e6c))
* **editor:** show real app info in Header dropdown instead of placeholder ([2e650c9](https://github.com/Pkcarreno/glyphide/commit/2e650c993f6a8a1fb2848f1a9b95913c01484d79))
* **editor:** tweak PWA manifest parameters ([2d27808](https://github.com/Pkcarreno/glyphide/commit/2d278083976fd62085f456729ac7a7494606b40b))
* **editor:** update default ui font size and enable auto-run ([bcd2265](https://github.com/Pkcarreno/glyphide/commit/bcd22650b1baff1f99da13043fe4738af63157fa))
* **editor:** update theme dynamically when Browser color scheme changes ([9f8bcaf](https://github.com/Pkcarreno/glyphide/commit/9f8bcafe919d711c283fcc5a4b63ff252c78b05f))
* lint files from biome update ([f846f04](https://github.com/Pkcarreno/glyphide/commit/f846f043325dc8d0a5625eb991ccc42651c05ed6))
* resolve ultracite linter rules across workspace ([1f7521e](https://github.com/Pkcarreno/glyphide/commit/1f7521e679358d5d35254713a384203115308244))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @glyphide/micropython-engine bumped to 1.0.0
    * @glyphide/orchestrator bumped to 2.0.0
    * @glyphide/quickjs-engine bumped to 1.0.0
    * @glyphide/rpc-protocol bumped to 2.0.0
    * @glyphide/url-migration bumped to 2.0.0
