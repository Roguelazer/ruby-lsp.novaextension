class RubyLanguageServer {
  constructor() {
    // Observe the configuration setting for the server's location, and restart the server on change
    nova.config.observe(
      "ruby.language-server-path",
      function (path) {
        this.start(path);
      },
      this
    );
  }

  deactivate() {
    this.stop();
  }

  async findInPath(command) {
    const process = new Process("/bin/bash", {
      args: ["-c", `which ${command}`],
      stdio: "pipe",
    });
    try {
      console.log(process);
      process.start();
      const reader = new Promise((resolve) => process.onStdout(resolve));
      const which = new Promise((resolve) => process.onDidExit(resolve));
      let path = await reader;
      let status = await which;
      if (status != 0) {
        throw new Error(`unable to find ruby-lsp in path: got ${status}`);
      }
      return path.trim();
    } catch (err) {
      if (nova.inDevMode()) {
        console.log(`oops while reading ruby-lsp path: ${err}`);
      }
      return null;
    }
  }

  async start(path) {
    if (this.languageClient) {
      this.languageClient.stop();
      nova.subscriptions.remove(this.languageClient);
    }

    // Use the default server path
    if (!path) {
      path = await this.findInPath("ruby-lsp");
    }

    // Create the client
    const serverOptions = {
      path,
      cwd: nova.workspace.path,
    };
    const clientOptions = {
      // The set of document syntaxes for which the server is valid
      syntaxes: ["ruby", "erb"],
    };
    const client = new LanguageClient(
      "ruby-lsp",
      "Ruby Language Server",
      serverOptions,
      clientOptions
    );

    try {
      // Start the client
      client.start();

      // Add the client to the subscriptions to be cleaned up
      nova.subscriptions.add(client);
      this.languageClient = client;
    } catch (err) {
      // If the .start() method throws, it's likely because the path to the language server is invalid

      if (nova.inDevMode()) {
        console.error(err);
      }
    }
  }

  stop() {
    if (this.languageClient) {
      this.languageClient.stop();
      nova.subscriptions.remove(this.languageClient);
      this.languageClient = null;
    }
  }
}

module.exports = RubyLanguageServer;
