# Glyphide

> [!IMPORTANT]
>
> The project is under development, so bugs or missing important features are expected.

Write, run, and share JavaScript code instantly.

It's:

- Open Source
- Run 100% on your device
- Powered by QuickJS (via [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten))
- Shareable
- Installable
- Offline first

> [!CAUTION]
>
> Although Glyphide aims to provide a safe environment, there may be inappropriate or malicious behavior when executing third-party code.

## Motivation

I wanted to have a tool where I could create and run JS code with no extra friction, no text editors, no login screens, no opening the browser console. Plus, I wanted my code to not run on an external server and to be able to share my creations with others privately.

Glyphide is a super flexible calculator if you already know JS. You can do data manipulation without having to start your development environment, great for testing logic as you create. Or you can even create a calculator tailored to your needs and share it with your friends or embed it in your web page as a demo.

## Limitations

For JavaScript execution, [QuickJS-NG](https://quickjs-ng.github.io/quickjs/) is used via [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten). QuickJS-NG aims to be compatible with the latest ECMAScript specifications (for reference, [here you can see the progress of these features](https://quickjs-ng.github.io/quickjs/es_features)).

As for the APIs provided by the environment (browser/Node.js) they depend on the implementation of **quickjs-emscripten** in the project and is currently work in progress. Below is the list of priority APIs to be integrated:

- [ ] fetch
- [ ] timeout
- [ ] interval

Note: You can open an issue and suggest any other API you consider necessary.

## Folder Structure

Follow [Bulletproof-react project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md).

## Development

To get a local copy of the code, clone it using git:

```bash
git clone https://github.com/Pkcarreno/jsod
cd jsod
```

Install dependencies:

```bash
 pnpm i
```

Now, you can start a local web server by running:

```bash
pnpm dev
```

And then open [http://localhost:4000](http://localhost:4000) to view it in the browser.

## Thanks to

- [Vite Template React](https://github.com/SafdarJamal/vite-template-react): Template used in this project.
- [quickjs-emscripten](https://github.com/justjake/quickjs-emscripten) and [quickjs-emscripten-sync](https://github.com/reearth/quickjs-emscripten-sync): Quickjs wrapper, the engine of this app.
- [codi.link](http://codi.link): Web editor, made in community. Great inspiration.
- [borrowed.nvim](https://github.com/MyyPo/borrowed.nvim): Neovim color scheme, take the naming convention to create a color scheme under the Glyphide color palette.

## License

This project is licensed under the terms of the [MIT license](https://github.com/Pkcarreno/jsod/blob/main/LICENSE).
