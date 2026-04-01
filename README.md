# glyphide

A web app for executing JavaScript code locally. It requires no login, works offline, and allows you to share your scripts easily.

## usage

Navigate to [glyphide.com](https://glyphide.com) and start coding.

To send data to the output window use the global `console` object. It supports the following methods:

- log
- warn
- error
- info
- debug

Use them exactly as you would in any standard JavaScript environment. For example:

```javascript
// Calculate compound interest
const principal = 1000;
const rate = 0.05;
const years = 10;

const result = principal * Math.pow(1 + rate, years);
console.log(`$${principal} becomes $${result.toFixed(2)} after ${years} years`);
```

[**Check this example on Glyphide**](https://glyphide.com/?c=Ly8gQ2FsY3VsYXRlIGNvbXBvdW5kIGludGVyZXN0CmNvbnN0IHByaW5jaXBhbCA9IDEwMDA7CmNvbnN0IHJhdGUgPSAwLjA1Owpjb25zdCB5ZWFycyA9IDEwOwoKY29uc3QgcmVzdWx0ID0gcHJpbmNpcGFsICogTWF0aC5wb3coMSArIHJhdGUsIHllYXJzKTsKY29uc29sZS5sb2coYCQke3ByaW5jaXBhbH0gYmVjb21lcyAkJHtyZXN1bHQudG9GaXhlZCgyKX0gYWZ0ZXIgJHt5ZWFyc30geWVhcnNgKTs&t=Q29tcG91bmQgaW50ZXJlc3QgY2FsY3VsYXRvcg) 

When you run code in Glyphide, it automatically generates a shareable URL like the one above. Send it to anyone and they'll see your working code.

### configuration

Access the settings panel from the menu in the top-left corner (the app icon) and click on settings in the dropdown. From here, you can customize several aspects of the editor:

- Adjust runtime environment parameters.
- Modify interaction behavior.
- Enable or disable editor features.

**NOTE:** The runtime environment is set with safe defaults. In some cases, a functional script might trigger an error if it hits these limits, similar to how a faulty script would.

### share

Use the share button located at the top, near the right corner. Here you have two options: copy the script's current URL or copy an embeddable version (iframe) for your site. Both options use the same URL.

### limitations

- Does not output `return` statements.
- No TypeScript support.
- Cannot import npm packages.

### migrate from JSoD

If you have old links from when this project was called JSoD, use the [migration tool](https://glyphide.com/migrate) to convert them. Your code will be exactly the same, just the URL format changes.

## internals

The project is structured as a monorepo, split between the frontend and a dedicated package for preprocessing the `@sebastianwessel/quickjs` library.

### core

At its core, the project relies on `quickjs` as its JavaScript engine. It is loaded via the [@sebastianwessel/quickjs](https://github.com/sebastianwessel/quickjs) library, which utilizes [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten) to run quickjs through WebAssembly.

The execution layer is isolated within a web worker to reduce main thread overhead and provide an extra layer of security. I implemented an asynchronous communication strategy based on the MessageChannel API, paired with Zod schemas to validate data consistency and handle errors.

### frontend architecture

The frontend is built with Astro, based on my [astro-minimal-template](https://www.pkcarreno.com/projects/astro-minimal-template), using React for interactive elements via Astro Islands. This allows me to delegate parts of the shipped code directly to the HTML.

For state management, I use Zustand alongside null-return components. This pattern integrates state into the React flow as an alternative to React Context within the scope of Astro Islands.

#### persistence

Code is stored in URL query params, simplifying the sharing process while maintaining a login-free experience. To manage this, I use Nanostores for the code state, which is Base64 encoded before updating the URL to ensure compatibility.

I previously used Zustand for URL persistence, but its serialization method resulted in unnecessarily long strings. Since URL length is a constraint, I opted for a more concise implementation using Nanostores without radically changing the frontend logic.

## faq

### is it safe?

While Glyphide runs code in a sandboxed environment, be careful with code from untrusted sources. The local-first approach means your code stays on your device, but malicious code could still do browser-level damage.
