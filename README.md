# Glyphide 🟢

**Local JavaScript editor that runs entirely in your browser**

**[Try Glyphide →](https://glyphide.com)** | **[Migrate old links](https://glyphide.com/migrate)** | **[Issues](https://github.com/Pkcarreno/glyphide/issues)**

Write, run, and share JavaScript code instantly. No servers, no accounts, just code.

## What is this?

Glyphide is a JavaScript editor that runs completely in your browser. I built it because I needed something simple but powerful - no login screens, no external servers, no complexity.

Your code runs locally on your machine and gets encoded in the URL for sharing. That's it.

**Good for:**

- Quick prototyping without opening your IDE
- Building custom calculators
- Learning JavaScript with immediate feedback
- Sharing working code examples
- Embedding demos in documentation

## The story behind it

I needed to help my partner calculate international shipping costs. The courier had rules but no calculator, so I wanted to write a quick JavaScript solution for her to use easily.

Problem: there wasn't a good place to run JavaScript that was both simple and powerful. Everything required accounts, had paywalls, or was too basic.

So I built Glyphide. It's basically a super flexible calculator if you know JavaScript.

## How it works

**Technical stuff:**

- Uses QuickJS engine (via [sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs) & [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten))
- Everything runs client-side in your browser
- Code gets encoded in the URL for sharing
- No backend servers or databases involved
- Works offline after first load

**What I can promise:**

- Your code stays on your device during execution
- I don't store or process your code on servers
- No user tracking or analytics from my side

**What I can't control:**

- GitHub Pages (where it's hosted) probably collects standard web analytics

## Coming from JSoD?

If you have old links from when this project was called JSoD, use the [migration tool](https://glyphide.com/migrate) to convert them. Your code will be exactly the same, just the URL format changes.

## Quick example

```javascript
// Calculate compound interest
const principal = 1000;
const rate = 0.05;
const years = 10;

const result = principal * Math.pow(1 + rate, years);
console.log(`$${principal} becomes $${result.toFixed(2)} after ${years} years`);
```

[**Try this example →**](https://glyphide.com/?c=Ly8gQ2FsY3VsYXRlIGNvbXBvdW5kIGludGVyZXN0CmNvbnN0IHByaW5jaXBhbCA9IDEwMDA7CmNvbnN0IHJhdGUgPSAwLjA1Owpjb25zdCB5ZWFycyA9IDEwOwoKY29uc3QgcmVzdWx0ID0gcHJpbmNpcGFsICogTWF0aC5wb3coMSArIHJhdGUsIHllYXJzKTsKY29uc29sZS5sb2coYCQke3ByaW5jaXBhbH0gYmVjb21lcyAkJHtyZXN1bHQudG9GaXhlZCgyKX0gYWZ0ZXIgJHt5ZWFyc30geWVhcnNgKTs&t=Q29tcG91bmQgaW50ZXJlc3QgY2FsY3VsYXRvcg)

When you run code in Glyphide, it automatically generates a shareable URL like the one above. Send it to anyone and they'll see your working code.

## Contributing

This is an open source project and I appreciate help:

- Found a bug? [Report it](https://github.com/Pkcarreno/glyphide/issues)
- Want a feature? [Ask for it](https://github.com/Pkcarreno/glyphide/issues)
- Want to code? Fork it and send a PR

### Running locally

```bash
git clone https://github.com/Pkcarreno/glyphide.git
cd glyphide
pnpm install
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000) and you're ready.

## What's next

**Working on right now:**

- Documentation page to make everything clearer

**Maybe later:**

- TypeScript support
- Import from npm packages
- More sharing options

No strict roadmap - I build what seems useful or what people ask for.

## Security note

While Glyphide runs code in a sandboxed environment, be careful with code from untrusted sources. The local-first approach means your code stays on your device, but malicious code could still do browser-level damage.

## Thanks

This project builds on great open source work:

- [[sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs) & [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten) - makes JavaScript execution possible
- [codi.link](http://codi.link) - inspiration for browser-based editors

## License

[MIT License](https://github.com/Pkcarreno/glyphide/blob/main/LICENSE)

---

_Glyphide - JavaScript that stays local_
